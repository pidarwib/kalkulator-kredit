import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";

export interface SessionPayload {
  userId: string;
  username: string;
  fullName: string;
  role: string;
  bprId?: string | null;
  branchId?: string | null;
}

function getJwtSecret(): Uint8Array {
  const secretStr =
    env.AUTH_SECRET || "default_super_secret_session_signing_key_32chars!";
  return Uint8Array.from(Buffer.from(secretStr, "utf-8"));
}

/**
 * Signs a session JWT token with a 7-day expiration.
 */
export async function signSessionToken(
  payload: SessionPayload,
  expiresIn = "7d"
): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

/**
 * Verifies and decodes a session JWT token.
 * Returns null if invalid or expired.
 */
export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  if (!token || token.trim().length === 0) {
    return null;
  }
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}
