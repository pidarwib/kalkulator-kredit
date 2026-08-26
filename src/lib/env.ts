import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z
    .string({
      required_error: "DATABASE_URL is required",
    })
    .min(1, "DATABASE_URL cannot be empty"),
  AUTH_SECRET: z
    .string({
      required_error: "AUTH_SECRET is required",
    })
    .min(32, "AUTH_SECRET must be at least 32 characters long for security"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL must be a valid URL")
    .default("http://localhost:3000"),
  DIRECT_URL: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional().default(""),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates an environment variable record safely without leaking secret values in logs or errors.
 */
export function validateEnv(rawEnv: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(rawEnv);

  if (!result.success) {
    const errorDetails = result.error.errors.map((err) => ({
      field: err.path.join("."),
      message: err.message,
    }));

    // Construct a sanitized error message showing ONLY field names and descriptions, never values
    const formattedErrors = errorDetails
      .map((e) => `  - [${e.field}]: ${e.message}`)
      .join("\n");

    const errorMessage = `❌ Invalid environment configuration:\n${formattedErrors}\n\nPlease check your .env or environment settings against .env.example.`;
    
    // In production or runtime, throw error to prevent running with invalid security config
    throw new Error(errorMessage);
  }

  return result.data;
}

// In test environment, allow mock / fallback values if process.env is not yet populated
const isTestEnv = process.env.NODE_ENV === "test";

export const env: Env = isTestEnv
  ? {
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgresql://postgres:postgres@localhost:5432/kalkulator_kredit_test?schema=public",
      AUTH_SECRET:
        process.env.AUTH_SECRET ||
        "test-secret-key-that-is-at-least-32-characters-long-for-testing",
      NODE_ENV: "test",
      NEXT_PUBLIC_APP_URL:
        process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
    }
  : validateEnv(process.env);
