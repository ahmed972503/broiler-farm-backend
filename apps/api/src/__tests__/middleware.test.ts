import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { errorHandler } from "../middleware/errorHandler";
import { validateBody, validateQuery } from "../middleware/validate";
import { requestLogger } from "../middleware/requestLogger";
import { requireAdmin, requireWorker, requireShedAccess } from "../middleware/rbac";

describe("Middleware Unit & Branch Coverage Tests", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockNext = jest.fn();
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      on: jest.fn(),
    };
    mockReq = {
      body: {},
      query: {},
      params: {},
    };
  });

  describe("errorHandler Middleware", () => {
    it("handles Mongoose duplicate key error (code 11000)", () => {
      const duplicateError = {
        code: 11000,
        keyValue: { username: "duplicate_user" },
      };

      errorHandler(
        duplicateError,
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.stringContaining("Duplicate entry for username"),
        }),
      );
    });

    it("handles duplicate key error with empty keyValue", () => {
      const duplicateError = {
        code: 11000,
      };

      errorHandler(
        duplicateError,
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockRes.status).toHaveBeenCalledWith(409);
    });

    it("handles Mongoose CastError (invalid ObjectId format)", () => {
      const castError = {
        name: "CastError",
        path: "batchId",
      };

      errorHandler(
        castError,
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Invalid format for field batchId",
      });
    });

    it("handles custom statusCode / status on error object", () => {
      const customError = {
        statusCode: 403,
        message: "Forbidden custom access",
      };

      errorHandler(
        customError,
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Forbidden custom access",
      });

      const altStatusError = {
        status: 422,
        message: "Unprocessable entity",
      };
      errorHandler(
        altStatusError,
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );
      expect(mockRes.status).toHaveBeenCalledWith(422);
    });

    it("falls back to 500 when no status code is present and provides default message", () => {
      const genericError = {};

      errorHandler(
        genericError,
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: "Internal server error",
      });
    });
  });

  describe("validate Middleware (validateBody & validateQuery)", () => {
    const testSchema = z.object({
      name: z.string().min(3),
      count: z.number().int().positive(),
    });

    it("passes validateBody with valid input", () => {
      mockReq.body = { name: "Test Item", count: 10 };
      const middleware = validateBody(testSchema);

      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body).toEqual({ name: "Test Item", count: 10 });
    });

    it("rejects validateBody with invalid input and returns 400 with details", () => {
      mockReq.body = { name: "ab", count: -1 };
      const middleware = validateBody(testSchema);

      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Validation failed",
          details: expect.any(Array),
        }),
      );
    });

    it("passes non-Zod unexpected errors to next() in validateBody", () => {
      const faultySchema = {
        parse: () => {
          throw new Error("Unexpected schema failure");
        },
      } as any;
      const middleware = validateBody(faultySchema);

      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });

    it("passes validateQuery with valid query params", () => {
      mockReq.query = { name: "Query Name", count: "5" };
      const querySchema = z.object({
        name: z.string(),
        count: z.string(),
      });
      const middleware = validateQuery(querySchema);

      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it("rejects validateQuery with invalid query params and returns 400", () => {
      mockReq.query = { name: 123 as any };
      const querySchema = z.object({
        name: z.string(),
      });
      const middleware = validateQuery(querySchema);

      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: "Query validation failed",
        }),
      );
    });

    it("passes non-Zod unexpected errors to next() in validateQuery", () => {
      const faultySchema = {
        parse: () => {
          throw new Error("Unexpected query parse crash");
        },
      } as any;
      const middleware = validateQuery(faultySchema);

      middleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe("requestLogger Middleware", () => {
    it("calls next() and attaches finish listener", () => {
      const onFinishCallbacks: Array<() => void> = [];
      mockRes.on = jest.fn().mockImplementation((event, callback) => {
        if (event === "finish") onFinishCallbacks.push(callback);
      });
      mockReq.method = "GET";
      mockReq.originalUrl = "/api/test";
      mockRes.statusCode = 200;

      requestLogger(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.on).toHaveBeenCalledWith("finish", expect.any(Function));

      // Trigger finish in test mode
      onFinishCallbacks.forEach((cb) => cb());

      // Trigger finish in non-test mode to cover console.log branch
      const originalEnv = process.env.NODE_ENV;
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      try {
        process.env.NODE_ENV = "development";
        onFinishCallbacks.forEach((cb) => cb());
        expect(consoleSpy).toHaveBeenCalled();
      } finally {
        process.env.NODE_ENV = originalEnv;
        consoleSpy.mockRestore();
      }
    });
  });

  describe("rbac Middleware", () => {
    it("requireAdmin rejects unauthenticated or non-admin requests", () => {
      // Missing user
      (mockReq as any).user = undefined;
      requireAdmin(mockReq as any, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);

      // Worker role
      (mockReq as any).user = { role: "worker" };
      requireAdmin(mockReq as any, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);

      // Admin role
      (mockReq as any).user = { role: "admin" };
      requireAdmin(mockReq as any, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it("requireWorker rejects unauthenticated or non-worker requests", () => {
      (mockReq as any).user = undefined;
      requireWorker(mockReq as any, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);

      (mockReq as any).user = { role: "admin" };
      requireWorker(mockReq as any, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);

      (mockReq as any).user = { role: "worker" };
      requireWorker(mockReq as any, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it("requireShedAccess handles unauthenticated, admin, assigned worker, and unassigned worker", () => {
      // 1. Unauthenticated
      (mockReq as any).user = undefined;
      requireShedAccess(mockReq as any, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(401);

      // 2. Admin has universal access
      (mockReq as any).user = { role: "admin" };
      requireShedAccess(mockReq as any, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // 3. Worker matching shed in params
      mockNext.mockClear();
      (mockReq as any).user = {
        role: "worker",
        assignedShedId: { toString: () => "shed-123" },
      };
      mockReq.params = { shedId: "shed-123" };
      requireShedAccess(mockReq as any, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // 4. Worker matching shed in body
      mockNext.mockClear();
      mockReq.params = {};
      mockReq.body = { shedId: "shed-123" };
      requireShedAccess(mockReq as any, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // 5. Worker matching shed in query
      mockNext.mockClear();
      mockReq.body = {};
      mockReq.query = { shedId: "shed-123" };
      requireShedAccess(mockReq as any, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // 6. Worker accessing different shed
      mockReq.params = { shedId: "shed-999" };
      requireShedAccess(mockReq as any, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);

      // 7. Worker with no assigned shed
      (mockReq as any).user = { role: "worker", assignedShedId: null };
      mockReq.params = { shedId: "shed-123" };
      requireShedAccess(mockReq as any, mockRes as Response, mockNext);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });
});

