import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import UserManagementPage from "@/app/users/page";

// Mock Auth Provider
vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "super-admin-1",
      username: "superadmin",
      fullName: "Super Administrator",
      role: "SUPER_ADMIN",
      permissions: ["USER_VIEW", "USER_CREATE", "USER_UPDATE", "USER_DELETE"],
      scope: "ALL",
    },
    hasPermission: (perm: string) => true,
    hasAnyPermission: () => true,
    isLoading: false,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/users",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("TASK-054: User Management UI Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRoles = [
    { id: "role-1", code: "SUPER_ADMIN", name: "Super Admin" },
    { id: "role-2", code: "ADMIN", name: "Admin BPR" },
    { id: "role-3", code: "MARKETING", name: "Marketing" },
  ];

  const mockBprs = [
    { id: "bpr-1", code: "BPR01", name: "BPR Sejahtera" },
  ];

  const mockBranches = [
    { id: "br-1", code: "BR01", name: "Cabang Bandung", bprId: "bpr-1" },
  ];

  const mockUsers = [
    {
      id: "u-1",
      username: "budi_marketing",
      fullName: "Budi Santoso",
      email: "budi@bpr.co.id",
      phone: "08123456789",
      roleId: "role-3",
      bprId: "bpr-1",
      branchId: "br-1",
      status: "ACTIVE",
      lastLoginAt: "2026-08-25T10:00:00.000Z",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      role: { id: "role-3", code: "MARKETING", name: "Marketing" },
      bpr: { id: "bpr-1", code: "BPR01", name: "BPR Sejahtera" },
      branch: { id: "br-1", code: "BR01", name: "Cabang Bandung" },
    },
    {
      id: "u-2",
      username: "siti_admin",
      fullName: "Siti Rahmawati",
      email: "siti@bpr.co.id",
      phone: "08198765432",
      roleId: "role-2",
      bprId: "bpr-1",
      branchId: null,
      status: "ACTIVE",
      lastLoginAt: null,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      role: { id: "role-2", code: "ADMIN", name: "Admin BPR" },
      bpr: { id: "bpr-1", code: "BPR01", name: "BPR Sejahtera" },
      branch: null,
    },
  ];

  const mockFetch = (url: string, options?: any) => {
    if (url.includes("/api/v1/roles")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: mockRoles }),
      });
    }
    if (url.includes("/api/v1/bprs")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: mockBprs }),
      });
    }
    if (url.includes("/api/v1/branches")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: mockBranches }),
      });
    }
    if (url.includes("/api/v1/users") && !options?.method) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: mockUsers,
          meta: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
        }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ success: true }),
    });
  };

  it("should render page header, filters, and user table data", async () => {
    global.fetch = vi.fn().mockImplementation(mockFetch);

    render(<UserManagementPage />);

    expect(screen.getByTestId("user-management-title")).toBeInTheDocument();
    expect(screen.getByTestId("add-user-btn")).toBeInTheDocument();
    expect(screen.getByTestId("search-user-input")).toBeInTheDocument();
    expect(screen.getByTestId("filter-role-select")).toBeInTheDocument();
    expect(screen.getByTestId("filter-status-select")).toBeInTheDocument();

    // Wait for users table to render
    await waitFor(() => {
      expect(screen.getByTestId("user-table")).toBeInTheDocument();
    });

    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("budi_marketing")).toBeInTheDocument();
    expect(screen.getByText("Siti Rahmawati")).toBeInTheDocument();
    expect(screen.getByText("siti_admin")).toBeInTheDocument();
  });

  it("should open create user modal, validate required fields, and submit new user", async () => {
    let createdPayload: any = null;
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === "POST" && url.includes("/api/v1/users")) {
        createdPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { id: "u-new", ...createdPayload } }),
        });
      }
      return mockFetch(url, options);
    });

    render(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("add-user-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("add-user-btn"));

    // Modal is now open
    expect(screen.getByTestId("user-form-modal")).toBeInTheDocument();
    expect(screen.getByTestId("user-modal-title")).toHaveTextContent("Tambah Pengguna Baru");

    // Fill form
    fireEvent.change(screen.getByTestId("input-fullname"), {
      target: { value: "Ahmad Fauzi" },
    });
    fireEvent.change(screen.getByTestId("input-username"), {
      target: { value: "ahmad_fauzi" },
    });
    fireEvent.change(screen.getByTestId("input-email"), {
      target: { value: "ahmad@bpr.co.id" },
    });
    fireEvent.change(screen.getByTestId("input-password"), {
      target: { value: "P@ssword123" },
    });
    fireEvent.change(screen.getByTestId("select-role"), {
      target: { value: "role-3" },
    });

    // Submit form
    fireEvent.click(screen.getByTestId("submit-user-form-btn"));

    await waitFor(() => {
      expect(createdPayload).not.toBeNull();
    });

    expect(createdPayload.fullName).toBe("Ahmad Fauzi");
    expect(createdPayload.username).toBe("ahmad_fauzi");
    expect(createdPayload.email).toBe("ahmad@bpr.co.id");
    expect(createdPayload.roleId).toBe("role-3");
  });

  it("should open edit user modal, populate user data, and submit patch request", async () => {
    let patchedPayload: any = null;
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === "PATCH" && url.includes("/api/v1/users/u-1")) {
        patchedPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { id: "u-1", ...patchedPayload } }),
        });
      }
      return mockFetch(url, options);
    });

    render(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-user-btn-u-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("edit-user-btn-u-1"));

    expect(screen.getByTestId("user-form-modal")).toBeInTheDocument();
    expect(screen.getByTestId("user-modal-title")).toHaveTextContent("Edit Pengguna");
    expect(screen.getByTestId("input-fullname")).toHaveValue("Budi Santoso");
    expect(screen.getByTestId("input-username")).toBeDisabled();

    // Modify name
    fireEvent.change(screen.getByTestId("input-fullname"), {
      target: { value: "Budi Santoso Updated" },
    });

    fireEvent.click(screen.getByTestId("submit-user-form-btn"));

    await waitFor(() => {
      expect(patchedPayload).not.toBeNull();
    });

    expect(patchedPayload.fullName).toBe("Budi Santoso Updated");
  });

  it("should open delete confirmation modal and submit soft delete request", async () => {
    let deleteCalled = false;
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === "DELETE" && url.includes("/api/v1/users/u-1")) {
        deleteCalled = true;
        return Promise.resolve({
          ok: true,
          status: 204,
        });
      }
      return mockFetch(url, options);
    });

    render(<UserManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("delete-user-btn-u-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("delete-user-btn-u-1"));

    expect(screen.getByTestId("delete-confirm-modal")).toBeInTheDocument();
    expect(screen.getByText("Konfirmasi Hapus Pengguna")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("confirm-delete-btn"));

    await waitFor(() => {
      expect(deleteCalled).toBe(true);
    });
  });
});
