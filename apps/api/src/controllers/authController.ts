import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, Shed } from "../models";
import { config } from "../config";
import { AuthRequest } from "../middleware/auth";
import { logAuditEvent } from "../services/auditService";

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { username, password } = req.body;
      const user = await User.findOne({
        username: username.toLowerCase().trim(),
      });
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
        { expiresIn: config.jwtAccessExpiresIn as any },
      );

      const refreshToken = jwt.sign(
        { userId: user._id },
        config.jwtRefreshSecret,
        { expiresIn: config.jwtRefreshExpiresIn as any },
      );

      user.refreshToken = refreshToken;
      await user.save();

      // If user has assigned shed, populate shed details
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
      const user = await User.findById(decoded.userId);

      if (!user || user.refreshToken !== refreshToken || !user.isActive) {
        res
          .status(401)
          .json({ success: false, error: "Invalid or revoked refresh token" });
        return;
      }

      // Rotate tokens
      const newAccessToken = jwt.sign(
        { userId: user._id, role: user.role, username: user.username },
        config.jwtSecret,
        { expiresIn: config.jwtAccessExpiresIn as any },
      );

      const newRefreshToken = jwt.sign(
        { userId: user._id, nonce: Date.now() + Math.random() },
        config.jwtRefreshSecret,
        { expiresIn: config.jwtRefreshExpiresIn as any },
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
        req.user.refreshToken = null;
        await req.user.save();
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
        const shed = await Shed.findById(req.user.assignedShedId);
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
          id: req.user._id,
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
      const { username, password, name, phone, role, assignedShedId } =
        req.body;
      const existing = await User.findOne({
        username: username.toLowerCase().trim(),
      });
      if (existing) {
        res
          .status(409)
          .json({ success: false, error: "Username already exists" });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await User.create({
        username: username.toLowerCase().trim(),
        passwordHash,
        name,
        phone,
        role,
        assignedShedId: assignedShedId || null,
        isActive: true,
        mustChangePassword: true,
      });

      if (assignedShedId) {
        await Shed.findByIdAndUpdate(assignedShedId, {
          assignedWorkerId: newUser._id,
        });
      }

      await logAuditEvent({
        entityType: "User",
        entityId: newUser._id.toString(),
        action: "CREATE",
        performedBy: req.user!._id,
        newState: {
          username: newUser.username,
          role: newUser.role,
          name: newUser.name,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          id: newUser._id,
          username: newUser.username,
          name: newUser.name,
          phone: newUser.phone,
          role: newUser.role,
          assignedShedId: newUser.assignedShedId,
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
      targetUser.refreshToken = null; // Revoke active sessions
      await targetUser.save();

      await logAuditEvent({
        entityType: "User",
        entityId: targetUser._id.toString(),
        action: "UPDATE",
        performedBy: req.user!._id,
        newState: { message: "Password reset by admin" },
      });

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
      const users = await User.find()
        .select("-passwordHash -refreshToken")
        .populate("assignedShedId", "name shedNumber");
      res.json({ success: true, data: users });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
