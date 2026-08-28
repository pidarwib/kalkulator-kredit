import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuditLogsPage from "@/app/audit-logs/page";
import { sanitizeAuditPayload } from "@/app/api/v1/audit-logs/route";

// Mock Auth Provider
vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      username: "adminbpr",
      fullName: "Admin BPR Sejahtera",
      role: "ADMIN",
      permissions: ["AUDIT_VIEW", "AUDIT_EXPORT"],
      scope: "BPR",
    },
    hasPermission: (perm: string) => true,
    hasAnyPermission: () => true,
    isLoading: false,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/audit-logs",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("TASK-059: Audit Log UI Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockLogs = [
    {
      id: "log-1",
      userId: "user-1",
      user: {
        id: "user-1",
        username: "adminbpr",
        fullName: "Admin BPR Sejahtera",
        role: "ADMIN",
        roleName: "Admin BPR",
        bpr: "BPR Sejahtera",
        branch: "Cabang Madiun",
      },
      action: "CREDIT_PARAMETER_CREATE",
      entityType: "CreditParameter",
      entityId: "cp-101",
      oldValue: {
        maximumDbr: 0.9,
        maximumTenorMonths: 120,
      },
      newValue: {
        maximumDbr: 0.85,
        maximumTenorMonths: 180,
      },
      ipAddress: "192.168.1.10",
      userAgent: "Mozilla/5.0 Chrome/120.0",
      createdAt: "2026-08-28T10:30:00.000Z",
    },
    {
      id: "log-2",
      userId: "user-2",
      user: {
        id: "user-2",
        username: "marketingsby",
        fullName: "Marketing Surabaya",
        role: "MARKETING",
        roleName: "Marketing",
        bpr: "BPR Sejahtera",
        branch: "Cabang Surabaya",
      },
      action: "SIMULATION_CREATE",
      entityType: "Simulation",
      entityId: "sim-202",
      oldValue: null,
      newValue: {
        simulationNumber: "SIM/2026/08/0001",
        requestedPrincipal: 50000000,
      },
      ipAddress: "192.168.1.25",
      userAgent: "Mozilla/5.0 Chrome/120.0",
      createdAt: "2026-08-28T11:00:00.000Z",
    },
  ];

  it("should correctly sanitize secrets and passwords in audit log payloads", () => {
    const rawPayload = {
      username: "john_doe",
      password: "SuperSecretPassword123!",
      passwordHash: "$2b$10$xyzSecretHashValue",
      apiKey: "secret_api_key_999",
      creditDetails: {
        plafon: 100000000,
        accessToken: "bearer-token-secret",
      },
    };

    const sanitized = sanitizeAuditPayload(rawPayload);

    expect(sanitized.username).toBe("john_doe");
    expect(sanitized.password).toBe("******** (REDACTED)");
    expect(sanitized.passwordHash).toBe("******** (REDACTED)");
    expect(sanitized.apiKey).toBe("******** (REDACTED)");
    expect(sanitized.creditDetails.plafon).toBe(100000000);
    expect(sanitized.creditDetails.accessToken).toBe("******** (REDACTED)");
  });

  it("should render audit log page, header, filter card, and data table", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: mockLogs,
          meta: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
        }),
      });
    });

    render(<AuditLogsPage />);

    expect(screen.getByTestId("audit-logs-title")).toBeInTheDocument();
    expect(screen.getByTestId("audit-filter-card")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("audit-logs-table")).toBeInTheDocument();
    });

    expect(screen.getByTestId("audit-row-log-1")).toBeInTheDocument();
    expect(screen.getByTestId("audit-row-log-2")).toBeInTheDocument();
    expect(screen.getAllByText("CREDIT_PARAMETER_CREATE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SIMULATION_CREATE").length).toBeGreaterThan(0);
    expect(screen.getByText("192.168.1.10")).toBeInTheDocument();
  });

  it("should open Before / After diff modal when clicking 'Lihat Diff'", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: mockLogs,
          meta: { page: 1, pageSize: 20, total: 2, totalPages: 1 },
        }),
      });
    });

    render(<AuditLogsPage />);

    await waitFor(() => {
      expect(screen.getByTestId("view-diff-btn-log-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("view-diff-btn-log-1"));

    expect(screen.getByTestId("audit-detail-modal")).toBeInTheDocument();
    expect(screen.getByTestId("audit-modal-title")).toHaveTextContent("Detail Audit Trail");
    expect(screen.getByTestId("audit-old-value")).toBeInTheDocument();
    expect(screen.getByTestId("audit-new-value")).toBeInTheDocument();

    expect(screen.getByTestId("audit-old-value")).toHaveTextContent('"maximumDbr": 0.9');
    expect(screen.getByTestId("audit-new-value")).toHaveTextContent('"maximumDbr": 0.85');

    // Close modal
    fireEvent.click(screen.getByTestId("close-audit-modal-btn"));
    expect(screen.queryByTestId("audit-detail-modal")).not.toBeInTheDocument();
  });
});
