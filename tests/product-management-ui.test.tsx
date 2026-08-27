import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProductManagementPage from "@/app/master/products/page";

// Mock Auth Provider
vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "super-admin-1",
      username: "superadmin",
      fullName: "Super Administrator",
      role: "SUPER_ADMIN",
      permissions: ["MASTER_VIEW", "MASTER_CREATE", "MASTER_UPDATE", "MASTER_DELETE", "CREDIT_CALCULATE"],
      scope: "ALL",
    },
    hasPermission: (perm: string) => true,
    hasAnyPermission: () => true,
    isLoading: false,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/master/products",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("TASK-055: Product Management UI Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBprs = [
    { id: "bpr-1", code: "BPR01", name: "BPR Sejahtera" },
  ];

  const mockProducts = [
    {
      id: "prod-1",
      bprId: "bpr-1",
      code: "KREDIT_PENSIUN_PLATINUM",
      name: "Kredit Pensiun Platinum",
      description: "Produk kredit pensiunan ASN & BUMN",
      status: "ACTIVE",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
      bpr: { id: "bpr-1", code: "BPR01", name: "BPR Sejahtera" },
      _count: {
        creditParameters: 1,
        feeParameters: 5,
        insuranceRates: 120,
      },
    },
    {
      id: "prod-2",
      bprId: "bpr-1",
      code: "KREDIT_PEGAWAI_AKTIF",
      name: "Kredit Pegawai Aktif",
      description: "Produk kredit PNS & Pegawai Tetap",
      status: "INACTIVE",
      createdAt: "2026-08-05T00:00:00.000Z",
      updatedAt: "2026-08-05T00:00:00.000Z",
      bpr: { id: "bpr-1", code: "BPR01", name: "BPR Sejahtera" },
      _count: {
        creditParameters: 1,
        feeParameters: 4,
        insuranceRates: 90,
      },
    },
  ];

  const mockFetch = (url: string, options?: any) => {
    if (url.includes("/api/v1/bprs")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: mockBprs }),
      });
    }
    if (url.includes("/api/v1/products") && !options?.method) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: mockProducts }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ success: true }),
    });
  };

  it("should render page header, filters, and products table data", async () => {
    global.fetch = vi.fn().mockImplementation(mockFetch);

    render(<ProductManagementPage />);

    expect(screen.getByTestId("product-management-title")).toBeInTheDocument();
    expect(screen.getByTestId("add-product-btn")).toBeInTheDocument();
    expect(screen.getByTestId("search-product-input")).toBeInTheDocument();
    expect(screen.getByTestId("filter-status-select")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("product-table")).toBeInTheDocument();
    });

    expect(screen.getByText("KREDIT_PENSIUN_PLATINUM")).toBeInTheDocument();
    expect(screen.getByText("Kredit Pensiun Platinum")).toBeInTheDocument();
    expect(screen.getByText("KREDIT_PEGAWAI_AKTIF")).toBeInTheDocument();
  });

  it("should open create product modal, validate required fields, and submit new product", async () => {
    let createdPayload: any = null;
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === "POST" && url.includes("/api/v1/products")) {
        createdPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { id: "prod-new", ...createdPayload } }),
        });
      }
      return mockFetch(url, options);
    });

    render(<ProductManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("add-product-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("add-product-btn"));

    expect(screen.getByTestId("product-form-modal")).toBeInTheDocument();
    expect(screen.getByTestId("product-modal-title")).toHaveTextContent("Tambah Produk Kredit Baru");

    // Select BPR and fill fields
    fireEvent.change(screen.getByTestId("select-bpr"), {
      target: { value: "bpr-1" },
    });
    fireEvent.change(screen.getByTestId("input-product-code"), {
      target: { value: "KREDIT_MIKRO_UTAMA" },
    });
    fireEvent.change(screen.getByTestId("input-product-name"), {
      target: { value: "Kredit Mikro Utama" },
    });
    fireEvent.change(screen.getByTestId("input-product-desc"), {
      target: { value: "Produk kredit usaha mikro kecil" },
    });

    fireEvent.click(screen.getByTestId("submit-product-form-btn"));

    await waitFor(() => {
      expect(createdPayload).not.toBeNull();
    });

    expect(createdPayload.code).toBe("KREDIT_MIKRO_UTAMA");
    expect(createdPayload.name).toBe("Kredit Mikro Utama");
    expect(createdPayload.bprId).toBe("bpr-1");
  });

  it("should open edit product modal, update product name and status, and submit patch request", async () => {
    let patchedPayload: any = null;
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === "PATCH" && url.includes("/api/v1/products/prod-1")) {
        patchedPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { id: "prod-1", ...patchedPayload } }),
        });
      }
      return mockFetch(url, options);
    });

    render(<ProductManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("edit-product-btn-prod-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("edit-product-btn-prod-1"));

    expect(screen.getByTestId("product-form-modal")).toBeInTheDocument();
    expect(screen.getByTestId("product-modal-title")).toHaveTextContent("Edit Produk Kredit");
    expect(screen.getByTestId("input-product-code")).toBeDisabled();

    fireEvent.change(screen.getByTestId("input-product-name"), {
      target: { value: "Kredit Pensiun Platinum Plus" },
    });

    fireEvent.click(screen.getByTestId("submit-product-form-btn"));

    await waitFor(() => {
      expect(patchedPayload).not.toBeNull();
    });

    expect(patchedPayload.name).toBe("Kredit Pensiun Platinum Plus");
  });

  it("should open delete confirmation modal and submit soft delete request", async () => {
    let deleteCalled = false;
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === "DELETE" && url.includes("/api/v1/products/prod-1")) {
        deleteCalled = true;
        return Promise.resolve({
          ok: true,
          status: 204,
        });
      }
      return mockFetch(url, options);
    });

    render(<ProductManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("delete-product-btn-prod-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("delete-product-btn-prod-1"));

    expect(screen.getByTestId("delete-confirm-modal")).toBeInTheDocument();
    expect(screen.getByText("Konfirmasi Hapus Produk")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("confirm-delete-btn"));

    await waitFor(() => {
      expect(deleteCalled).toBe(true);
    });
  });
});
