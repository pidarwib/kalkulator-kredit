import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRepository } from "@/lib/repositories";
import {
  verifyPassword,
  validateUserStatus,
  signSessionToken,
  getSessionCookieOptions,
} from "@/lib/auth";
import { db } from "@/lib/db";

const loginSchema = z.object({
  username: z
    .string({
      required_error: "Username wajib diisi",
    })
    .min(1, "Username tidak boleh kosong"),
  password: z
    .string({
      required_error: "Password wajib diisi",
    })
    .min(1, "Password tidak boleh kosong"),
});

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Format JSON request body tidak valid.",
          },
        },
        { status: 400 }
      );
    }

    // 1. Validate request payload
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      const details: Record<string, string> = {};
      for (const err of parseResult.error.errors) {
        details[err.path.join(".")] = err.message;
      }
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Data yang dimasukkan tidak valid.",
            details,
          },
        },
        { status: 400 }
      );
    }

    const { username, password } = parseResult.data;

    // 2. Lookup user by username
    const user = await UserRepository.findByUsernameWithSecret(username);
    if (!user) {
      // Generic message to prevent user enumeration
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Username atau password tidak valid.",
          },
        },
        { status: 401 }
      );
    }

    // 3. Verify password hash
    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Username atau password tidak valid.",
          },
        },
        { status: 401 }
      );
    }

    // 4. Validate user status
    const statusValidation = validateUserStatus(user);
    if (!statusValidation.isAllowed) {
      return NextResponse.json(
        {
          error: {
            code: "ACCOUNT_INACTIVE",
            message:
              statusValidation.reason ||
              "Akun tidak aktif. Hubungi administrator.",
          },
        },
        { status: 401 }
      );
    }

    // 5. Update last login timestamp
    await UserRepository.updateLastLogin(user.id);

    // 6. Record audit log
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    try {
      await db.auditLog.create({
        data: {
          userId: user.id,
          action: "LOGIN",
          entityType: "User",
          entityId: user.id,
          newValue: {
            username: user.username,
            role: user.role.code,
            timestamp: new Date().toISOString(),
          },
          ipAddress,
          userAgent,
        },
      });
    } catch (auditErr) {
      // Non-blocking audit log catch
      console.error("Audit log error on login:", auditErr);
    }

    // 7. Generate JWT session token
    const token = await signSessionToken({
      userId: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role.code,
      bprId: user.bprId,
      branchId: user.branchId,
    });

    // 8. Return response with session cookie
    const cookieOpts = getSessionCookieOptions(token);
    const response = NextResponse.json(
      {
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role.code,
        },
      },
      { status: 200 }
    );

    response.cookies.set(cookieOpts.name, cookieOpts.value, {
      httpOnly: cookieOpts.httpOnly,
      secure: cookieOpts.secure,
      sameSite: cookieOpts.sameSite,
      path: cookieOpts.path,
      maxAge: cookieOpts.maxAge,
    });

    return response;
  } catch (err) {
    console.error("Unhandled error in POST /api/v1/auth/login:", err);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Terjadi kesalahan pada sistem saat memproses login.",
        },
      },
      { status: 500 }
    );
  }
}
