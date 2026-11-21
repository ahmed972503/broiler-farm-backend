import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, Shed } from "../models";
import { config } from "../config";
import { AuthRequest } from "../middleware/auth";
import { logAuditEvent } from "../services/auditService";
import { NeonUserRepository } from "../config/postgres";

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      const cleanUsername = (username || "").toLowerCase().trim();

      // 1. Check Neon PostgreSQL first
      const neonUser = await NeonUserRepository.findByUsername(cleanUsername);
      if (neonUser) {
        if (!neonUser.isActive) {
          res.status(403).json({
            success: false,
            error: "Account is deactivated. Contact farm admin.",
          });
          return;
        }

        const isMatch = await bcrypt.compare(password, neonUser.passwordHash);
        if (!isMatch) {
          res
            .status(401)
            .json({ success: false, error: "Invalid username or password" });
          return;
        }

        const accessToken = jwt.sign(
          { userId: neonUser.id, role: neonUser.role, username: neonUser.username },
          config.jwtSecret,
          { expiresIn: config.jwtAccessExpiresIn as any }
        );

        const refreshToken = jwt.sign(
          { userId: neonUser.id },
          config.jwtRefreshSecret,
          { expiresIn: config.jwtRefreshExpiresIn as any }
        );

        await NeonUserRepository.updateRefreshToken(neonUser.id, refreshToken);

        res.json({
          success: true,
          data: {
            accessToken,
            refreshToken,
            user: {
              id: neonUser.id,
              username: neonUser.username,
              name: neonUser.name,
              phone: neonUser.phone,
              role: neonUser.role,
              assignedShedId: neonUser.assignedShedId,
              shed: null,
            },
          },
        });
        return;
      }

      // 2. Fallback to MongoDB
      const user = await User.findOne({ username: cleanUsername });
      if (!user) {
        res
          .status(401)
          .json({ success: false, error: "Invalid username or password" });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({
          success: false,
          error: "Account is deactivated. Contact farm admin.",
        });
        return;
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        res
          .status(401)
          .json({ success: false, error: "Invalid username or password" });
        return;
      }

      const accessToken = jwt.sign(
        { userId: user._id, role: user.role, username: user.username },
        config.jwtSecret,
        { expiresIn: config.jwtAccessExpiresIn as any }
      );

      const refreshToken = jwt.sign(
        { userId: user._id },
        config.jwtRefreshSecret,
        { expiresIn: config.jwtRefreshExpiresIn as any }
      );

      user.refreshToken = refreshToken;
      await user.save();

      let shedInfo = null;
      if (user.assignedShedId) {
        const shed = await Shed.findById(user.assignedShedId);
        if (shed) {
          shedInfo = {
            id: shed._id,
            name: shed.name,
            shedNumber: shed.shedNumber,
            currentBatchId: shed.currentBatchId,
          };
        }
      }

      res.json({
        success: true,
        data: {
          accessToken,
          refreshToken,
          user: {
            id: user._id,
            username: user.username,
            name: user.name,
            phone: user.phone,
            role: user.role,
            assignedShedId: user.assignedShedId,
            shed: shedInfo,
          },
        },
      });
    } catch (err: any) {
      res
        .status(500)
        .json({ success: false, error: err.message || "Login failed" });
    }
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        res
          .status(400)
          .json({ success: false, error: "Refresh token required" });
        return;
      }

      const decoded = jwt.verify(refreshToken, config.jwtRefreshSecret) as {
        userId: string;
      };

      // 1. Check Neon PostgreSQL
      const neonUser = await NeonUserRepository.findById(decoded.userId);
      if (neonUser) {
        if (!neonUser.isActive || neonUser.refreshToken !== refreshToken) {
          res
            .status(401)
            .json({ success: false, error: "Invalid or revoked refresh token" });
          return;
        }

        const newAccessToken = jwt.sign(
          { userId: neonUser.id, role: neonUser.role, username: neonUser.username },
          config.jwtSecret,
          { expiresIn: config.jwtAccessExpiresIn as any }
        );

        const newRefreshToken = jwt.sign(
          { userId: neonUser.id, nonce: Date.now() + Math.random() },
          config.jwtRefreshSecret,
          { expiresIn: config.jwtRefreshExpiresIn as any }
        );

        await NeonUserRepository.updateRefreshToken(neonUser.id, newRefreshToken);

        res.json({
          success: true,
          data: {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          },
        });
        return;
      }

      // 2. Fallback to MongoDB
      const user = await User.findById(decoded.userId);
      if (!user || user.refreshToken !== refreshToken || !user.isActive) {
        res
          .status(401)
          .json({ success: false, error: "Invalid or revoked refresh token" });
        return;
      }

      const newAccessToken = jwt.sign(
        { userId: user._id, role: user.role, username: user.username },
        config.jwtSecret,
        { expiresIn: config.jwtAccessExpiresIn as any }
      );

      const newRefreshToken = jwt.sign(
        { userId: user._id, nonce: Date.now() + Math.random() },
        config.jwtRefreshSecret,
        { expiresIn: config.jwtRefreshExpiresIn as any }
      );

      user.refreshToken = newRefreshToken;
      await user.save();

      res.json({
        success: true,
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (err: any) {
      res.status(401).json({ success: false, error: "Invalid refresh token" });
    }
  }

  static async logout(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (req.user) {
        const id = req.user.id || req.user._id;
        if (id) {
          await NeonUserRepository.updateRefreshToken(id.toString(), null);
        }
        if (req.user.save) {
          req.user.refreshToken = null;
          await req.user.save();
        }
      }
      res.json({ success: true, message: "Logged out successfully" });
    } catch (err: any) {
      res
        .status(500)
        .json({ success: false, error: err.message || "Logout failed" });
    }
  }

  static async me(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      let shedInfo = null;
      if (req.user.assignedShedId) {
        try {
          const shed = await Shed.findById(req.user.assignedShedId);
          if (shed) {
            shedInfo = {
              id: shed._id,
              name: shed.name,
              shedNumber: shed.shedNumber,
              currentBatchId: shed.currentBatchId,
            };
          }
        } catch (e) {}
      }

      res.json({
        success: true,
        data: {
          id: req.user.id || req.user._id,
          username: req.user.username,
          name: req.user.name,
          phone: req.user.phone,
          role: req.user.role,
          assignedShedId: req.user.assignedShedId,
          shed: shedInfo,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async createUser(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { username, password, name, phone, role, assignedShedId } = req.body;
      const cleanUsername = (username || "").toLowerCase().trim();

      // Check Neon first
      const neonExisting = await NeonUserRepository.findByUsername(cleanUsername);
      if (neonExisting) {
        res.status(409).json({ success: false, error: "Username already exists" });
        return;
      }

      const existing = await User.findOne({ username: cleanUsername });
      if (existing) {
        res.status(409).json({ success: false, error: "Username already exists" });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // Create in Neon Postgres
      let createdUser: any;
      if (config.databaseUrl) {
        createdUser = await NeonUserRepository.create({
          username: cleanUsername,
          passwordHash,
          name,
          phone,
          role,
          assignedShedId,
        });
      }

      // Also create in Mongo if connected
      try {
        const mongoUser = await User.create({
          username: cleanUsername,
          passwordHash,
          name,
          phone,
          role,
          assignedShedId: assignedShedId || null,
          isActive: true,
          mustChangePassword: true,
        });
        if (!createdUser) createdUser = mongoUser;
      } catch (e) {}

      res.status(201).json({
        success: true,
        data: {
          id: createdUser?.id || createdUser?._id,
          username: createdUser?.username,
          name: createdUser?.name,
          phone: createdUser?.phone,
          role: createdUser?.role,
          assignedShedId: createdUser?.assignedShedId,
        },
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Failed to create user",
      });
    }
  }

  static async resetPassword(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { userId, newPassword } = req.body;
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        res.status(404).json({ success: false, error: "User not found" });
        return;
      }

      targetUser.passwordHash = await bcrypt.hash(newPassword, 10);
      targetUser.refreshToken = null;
      await targetUser.save();

      res.json({
        success: true,
        message: `Password for ${targetUser.username} successfully updated`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  static async listUsers(_req: AuthRequest, res: Response): Promise<void> {
    try {
      const neonUsers = await NeonUserRepository.findAll();
      if (neonUsers.length > 0) {
        const sanitized = neonUsers.map((u) => ({
          id: u.id,
          username: u.username,
          name: u.name,
          phone: u.phone,
          role: u.role,
          assignedShedId: u.assignedShedId,
          isActive: u.isActive,
          createdAt: u.createdAt,
        }));
        res.json({ success: true, data: sanitized });
        return;
      }

      const users = await User.find()
        .select("-passwordHash -refreshToken")
        .populate("assignedShedId", "name shedNumber");
      res.json({ success: true, data: users });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
