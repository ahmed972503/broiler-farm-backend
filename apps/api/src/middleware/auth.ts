import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User, IUser } from "../models";
import { config } from "../config";
import { NeonUserRepository } from "../config/postgres";

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "Authorization token missing or malformed",
      });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: string;
      role: string;
    };

    // 1. Check Neon Postgres
    const neonUser = await NeonUserRepository.findById(decoded.userId);
    if (neonUser) {
      if (!neonUser.isActive) {
        res
          .status(401)
          .json({ success: false, error: "User is inactive or not found" });
        return;
      }
      req.user = neonUser;
      return next();
    }

    // 2. Fallback to Mongo
    const user = await User.findById(decoded.userId);
    if (!user || !user.isActive) {
      res
        .status(401)
        .json({ success: false, error: "User is inactive or not found" });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      res.status(401).json({
        success: false,
        error: "Token has expired",
        code: "TOKEN_EXPIRED",
      });
      return;
    }
    res.status(401).json({ success: false, error: "Invalid token" });
  }
};

export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Requires one of: ${allowedRoles.join(", ")}`,
      });
      return;
    }

    next();
  };
};
