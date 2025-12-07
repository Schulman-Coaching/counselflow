import type { Request, Response } from "express";

export interface User {
  id: number;
  openId: string;
  email: string | null;
  name: string | null;
  loginMethod: string | null;
  role: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date | null;
}

export interface TrpcContext {
  req: Request;
  res: Response;
  user: User | null;
}

export function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): TrpcContext {
  return {
    req,
    res,
    user: null, // Will be populated by auth middleware
  };
}
