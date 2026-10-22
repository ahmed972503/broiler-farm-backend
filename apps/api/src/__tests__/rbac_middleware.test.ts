import { requireAdmin, requireShedAccess } from "../middleware/rbac";
import { AuthRequest } from "../middleware/auth";
import { Response, NextFunction } from "express";

describe("RBAC Middleware Tests", () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFn = jest.fn();
  });

  describe("requireAdmin", () => {
    it("returns 401 when request is unauthenticated", () => {
      mockReq = {};
      requireAdmin(mockReq as AuthRequest, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Unauthenticated" }),
      );
      expect(nextFn).not.toHaveBeenCalled();
    });

    it("returns 403 when user is a worker", () => {
      mockReq = {
        user: {
          _id: "worker-1",
          username: "worker1",
          role: "worker",
          assignedShedId: "shed-1",
        } as any,
      };

      requireAdmin(mockReq as AuthRequest, mockRes as Response, nextFn);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: "Forbidden: Admin access required" }),
      );
      expect(nextFn).not.toHaveBeenCalled();
    });

    it("calls next() when user is an admin", () => {
      mockReq = {
        user: {
          _id: "admin-1",
          username: "admin",
          role: "admin",
        } as any,
      };

      requireAdmin(mockReq as AuthRequest, mockRes as Response, nextFn);

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe("requireShedAccess", () => {
    it("returns 401 when request is unauthenticated", async () => {
      mockReq = {};
      await requireShedAccess(
        mockReq as AuthRequest,
        mockRes as Response,
        nextFn,
      );

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(nextFn).not.toHaveBeenCalled();
    });

    it("allows admin full access to any shed", async () => {
      mockReq = {
        user: {
          _id: "admin-1",
          username: "admin",
          role: "admin",
        } as any,
        params: { shedId: "shed-4" },
      };

      await requireShedAccess(
        mockReq as AuthRequest,
        mockRes as Response,
        nextFn,
      );

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("allows worker access to their own assigned shed", async () => {
      mockReq = {
        user: {
          _id: "worker-1",
          username: "worker1",
          role: "worker",
          assignedShedId: "shed-1",
        } as any,
        params: { shedId: "shed-1" },
      };

      await requireShedAccess(
        mockReq as AuthRequest,
        mockRes as Response,
        nextFn,
      );

      expect(nextFn).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it("forbids worker access to a different shed (403 Forbidden)", async () => {
      mockReq = {
        user: {
          _id: "worker-1",
          username: "worker1",
          role: "worker",
          assignedShedId: "shed-1",
        } as any,
        params: { shedId: "shed-2" },
      };

      await requireShedAccess(
        mockReq as AuthRequest,
        mockRes as Response,
        nextFn,
      );

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error:
            "Forbidden: You are only authorized to access your assigned shed",
        }),
      );
      expect(nextFn).not.toHaveBeenCalled();
    });

    it("forbids worker without an assigned shed", async () => {
      mockReq = {
        user: {
          _id: "worker-floating",
          username: "worker99",
          role: "worker",
        } as any,
        params: { shedId: "shed-1" },
      };

      await requireShedAccess(
        mockReq as AuthRequest,
        mockRes as Response,
        nextFn,
      );

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Forbidden: Worker has no assigned shed",
        }),
      );
      expect(nextFn).not.toHaveBeenCalled();
    });
  });
});
