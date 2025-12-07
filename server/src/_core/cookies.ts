import type { Request } from "express";

export function getSessionCookieOptions(req: Request) {
  const isSecure = req.protocol === "https" || process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
}
