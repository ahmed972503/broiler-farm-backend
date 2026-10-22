import { Router } from "express";
import { ExpenseController } from "../controllers/expenseController";
import { authenticate } from "../middleware/auth";
import { requireAdmin } from "../middleware/rbac";
import { validateBody } from "../middleware/validate";
import { CreateExpenseSchema } from "@broiler/shared";

const router = Router();

router.use(authenticate, requireAdmin);

router.get("/", ExpenseController.getExpenses);
router.post(
  "/",
  validateBody(CreateExpenseSchema),
  ExpenseController.createExpense,
);
router.delete("/:id", ExpenseController.deleteExpense);

export default router;
