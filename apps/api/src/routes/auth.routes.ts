import { Router } from "express";
import { AuthController } from "../controllers/authController";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";
import {
  LoginSchema,
  RefreshTokenSchema,
  CreateUserSchema,
  ResetPasswordSchema,
} from "@broiler/shared";

const router = Router();

router.post("/login", validateBody(LoginSchema), AuthController.login);
router.post(
  "/refresh",
  validateBody(RefreshTokenSchema),
  AuthController.refresh,
);
router.post("/logout", authenticate, AuthController.logout);
router.get("/me", authenticate, AuthController.me);

// Admin-only user management
router.post(
  "/users",
  authenticate,
  requireAdmin,
  validateBody(CreateUserSchema),
  AuthController.createUser,
);
router.post(
  "/reset-password",
  authenticate,
  requireAdmin,
  validateBody(ResetPasswordSchema),
  AuthController.resetPassword,
);
router.get("/users", authenticate, requireAdmin, AuthController.listUsers);

export default router;
