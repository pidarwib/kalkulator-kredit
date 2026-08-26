export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";

export interface StatusValidationResult {
  isAllowed: boolean;
  reason?: string;
}

/**
 * Validates whether a user is allowed to authenticate and access the system.
 * Rejects INACTIVE, SUSPENDED, and soft-deleted accounts.
 */
export function validateUserStatus(user: {
  status: string;
  deletedAt?: Date | null;
}): StatusValidationResult {
  if (user.deletedAt) {
    return {
      isAllowed: false,
      reason: "Akun telah dinonaktifkan atau dihapus dari sistem",
    };
  }

  switch (user.status) {
    case "ACTIVE":
      return { isAllowed: true };
    case "INACTIVE":
      return {
        isAllowed: false,
        reason: "Akun belum aktif. Hubungi administrator sistem.",
      };
    case "SUSPENDED":
      return {
        isAllowed: false,
        reason: "Akun Anda sedang ditangguhkan. Hubungi administrator sistem.",
      };
    default:
      return {
        isAllowed: false,
        reason: "Status akun tidak valid",
      };
  }
}
