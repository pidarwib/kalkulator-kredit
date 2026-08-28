/**
 * Structured Logging & Error Monitoring with Automated Sensitive Data Redaction
 * Strictly complies with SECURITY.md & PRD.md to prevent secret exposure.
 */

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";

export interface LogContext {
  requestId?: string;
  userId?: string;
  bprId?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  [key: string]: unknown;
}

export interface StructuredLogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
}

/**
 * List of sensitive key patterns to redact automatically in logs and monitoring payloads.
 */
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "token",
  "refreshtoken",
  "accesstoken",
  "authorization",
  "cookie",
  "setcookie",
  "secret",
  "jwtsecret",
  "databaseurl",
  "directurl",
  "apikey",
  "cardnumber",
  "creditcard",
  "cvv",
  "pin",
]);

/**
 * Recursively deep-redacts sensitive keys from any object or array.
 */
export function redactSensitiveData<T>(obj: T, depth = 0): T {
  if (depth > 10 || obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Redact JWT-like strings or Bearer tokens in text
    return obj.replace(/Bearer\s+[A-Za-z0-9-_=.]+/gi, "Bearer [REDACTED]") as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1)) as unknown as T;
  }

  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (SENSITIVE_KEYS.has(lowerKey)) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = redactSensitiveData(value, depth + 1);
      } else if (typeof value === "string") {
        sanitized[key] = redactSensitiveData(value, depth + 1);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized as T;
  }

  return obj;
}

export class Logger {
  private static writeLog(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error | unknown
  ): StructuredLogEntry {
    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: context ? redactSensitiveData(context) : undefined,
    };

    if (error instanceof Error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
        code: (error as { code?: string }).code,
      };
    } else if (error) {
      entry.error = {
        name: "UnknownError",
        message: String(error),
      };
    }

    const jsonOutput = JSON.stringify(entry);

    switch (level) {
      case "ERROR":
      case "FATAL":
        console.error(jsonOutput);
        break;
      case "WARN":
        console.warn(jsonOutput);
        break;
      case "DEBUG":
        if (process.env.NODE_ENV !== "production") {
          console.debug(jsonOutput);
        }
        break;
      case "INFO":
      default:
        console.log(jsonOutput);
        break;
    }

    return entry;
  }

  static debug(message: string, context?: LogContext): StructuredLogEntry {
    return this.writeLog("DEBUG", message, context);
  }

  static info(message: string, context?: LogContext): StructuredLogEntry {
    return this.writeLog("INFO", message, context);
  }

  static warn(message: string, context?: LogContext, error?: Error | unknown): StructuredLogEntry {
    return this.writeLog("WARN", message, context, error);
  }

  static error(message: string, context?: LogContext, error?: Error | unknown): StructuredLogEntry {
    return this.writeLog("ERROR", message, context, error);
  }

  static fatal(message: string, context?: LogContext, error?: Error | unknown): StructuredLogEntry {
    return this.writeLog("FATAL", message, context, error);
  }
}
