import { authenticate, AuthRequest } from "../middleware/auth";
import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { User } from "../models";

jest.mock("../models", () => ({
  User: {
    findById: jest.fn(),
  },
}));

describe("Auth Middleware Unit Tests", () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    nextFn = jest.fn();
    jest.clearAllMocks();
  });

  it("rejects requests with missing authorization header", async () => {
    mockReq = { headers: {} };
    await authenticate(mockReq as AuthRequest, mockRes as Response, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: "Authorization token missing or malformed",
      }),
    );
    expect(nextFn).not.toHaveBeenCalled();
  });

  it("rejects requests with non-Bearer authorization header", async () => {
    mockReq = { headers: { authorization: "Basic 123456" } };
    await authenticate(mockReq as AuthRequest, mockRes as Response, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(nextFn).not.toHaveBeenCalled();
  });

  it("handles expired tokens with code TOKEN_EXPIRED", async () => {
    const expiredToken = jwt.sign(
      { userId: "u1", role: "admin" },
      config.jwtSecret,
      { expiresIn: "-1s" },
    );

    mockReq = { headers: { authorization: `Bearer ${expiredToken}` } };
    await authenticate(mockReq as AuthRequest, mockRes as Response, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: "TOKEN_EXPIRED" }),
    );
    expect(nextFn).not.toHaveBeenCalled();
  });

  it("handles invalid signature with 401", async () => {
    const invalidToken = jwt.sign(
      { userId: "u1", role: "admin" },
      "wrong-secret-key-that-does-not-match",
    );

    mockReq = { headers: { authorization: `Bearer ${invalidToken}` } };
    await authenticate(mockReq as AuthRequest, mockRes as Response, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "Invalid authentication token" }),
    );
    expect(nextFn).not.toHaveBeenCalled();
  });

  it("authenticates active users and attaches user to req", async () => {
    const validToken = jwt.sign(
      { userId: "user-valid", role: "worker" },
      config.jwtSecret,
      { expiresIn: "1h" },
    );

    const mockUser = {
      _id: "user-valid",
      username: "worker1",
      role: "worker",
      isActive: true,
      assignedShedId: "shed-1",
    };

    (User.findById as jest.Mock).mockResolvedValue(mockUser);

    mockReq = { headers: { authorization: `Bearer ${validToken}` } };
    await authenticate(mockReq as AuthRequest, mockRes as Response, nextFn);

    expect(mockReq.user).toEqual(mockUser);
    expect(nextFn).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it("rejects deactivated or deleted users with 401", async () => {
    const validToken = jwt.sign(
      { userId: "user-inactive", role: "worker" },
      config.jwtSecret,
      { expiresIn: "1h" },
    );

    (User.findById as jest.Mock).mockResolvedValue({
      _id: "user-inactive",
      isActive: false,
    });

    mockReq = { headers: { authorization: `Bearer ${validToken}` } };
    await authenticate(mockReq as AuthRequest, mockRes as Response, nextFn);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: "User is inactive or not found" }),
    );
    expect(nextFn).not.toHaveBeenCalled();
  });
});
