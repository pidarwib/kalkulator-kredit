import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InsuranceManagementPage from "@/app/master/insurance/page";

// Mock Auth Provider
vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      username: "adminbpr",
      fullName: "Admin BPR Sejahtera",
      role: "ADMIN",
      permissions: ["MASTER_VIEW", "MASTER_UPDATE", "INSURANCE_VIEW"],
      scope: "BPR",
    },
    hasPermission: (perm: string) => true,
    hasAnyPermission: () => true,
    isLoading: false,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/master/insurance",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("TASK-057: Insurance Management UI Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProducts = [
    {
      id: "prod-1",
      code: "KREDIT_PENSIUN_PLATINUM",
      name: "Kredit Pensiun Platinum",
      bprId: "bpr-1",
      bpr: { id: "bpr-1", code: "BPR01", name: "BPR Sejahtera" },
    },
  ];

  const mockRates = [
    {
      id: "ir-1",
      productId: "prod-1",
      age: 56,
      tenorYears: 1,
      premiumRate: 0.0125,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveTo: null,
      version: "v1.0",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
    {
      id: "ir-2",
      productId: "prod-1",
      age: 56,
      tenorYears: 2,
      premiumRate: 0.025,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveTo: null,
      version: "v1.0",
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  const mockFetch = (url: string, options?: any) => {
    if (url.includes("/api/v1/products") && !url.includes("/insurance-rates")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: mockProducts }),
      });
    }
    if (url.includes("/insurance-rates/lookup")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: {
            productId: "prod-1",
            age: 56,
            tenorYears: 1,
            premiumRate: 0.0125,
            rate: 0.0125,
            ruleApplied: "EXACT_MATCH",
          },
        }),
      });
    }
    if (url.includes("/insurance-rates") && !options?.method) {
      return Promise.resolve({
        ok: true,
        json: async () => ({
          data: mockRates,
          meta: { page: 1, pageSize: 50, total: 2, totalPages: 1 },
        }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ success: true }),
    });
  };

  it("should render page header, product selector, quick lookup tool, and insurance table", async () => {
    global.fetch = vi.fn().mockImplementation(mockFetch);

    render(<InsuranceManagementPage />);

    expect(screen.getByTestId("insurance-management-title")).toBeInTheDocument();
    expect(screen.getByTestId("insurance-product-selector")).toBeInTheDocument();
    expect(screen.getByTestId("insurance-lookup-card")).toBeInTheDocument();
    expect(screen.getByTestId("insurance-filter-bar")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("insurance-rates-table")).toBeInTheDocument();
    });

    expect(screen.getByTestId("rate-row-56-1")).toBeInTheDocument();
    expect(screen.getByTestId("rate-row-56-2")).toBeInTheDocument();
    expect(screen.getAllByText("56 Thn").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1[.,]2500%/).length).toBeGreaterThan(0);
  });

  it("should execute quick rate lookup and display official rate", async () => {
    global.fetch = vi.fn().mockImplementation(mockFetch);

    render(<InsuranceManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("lookup-submit-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("lookup-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("lookup-result-box")).toBeInTheDocument();
    });

    expect(screen.getByTestId("lookup-result-box")).toHaveTextContent(/1[.,]2500%/);
    expect(screen.getByText("Metode: EXACT_MATCH")).toBeInTheDocument();
  });

  it("should open import modal, parse CSV input, and submit batch import request", async () => {
    let importedPayload: any = null;
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === "POST" && url.includes("/insurance-rates/import")) {
        importedPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              insertedCount: importedPayload.rates.length,
              version: "v2.0",
            },
          }),
        });
      }
      return mockFetch(url, options);
    });

    render(<InsuranceManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("import-insurance-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("import-insurance-btn"));

    expect(screen.getByTestId("insurance-import-modal")).toBeInTheDocument();

    // Fill CSV textarea
    fireEvent.change(screen.getByTestId("import-csv-textarea"), {
      target: {
        value: "56 1 0.0150\n56 2 0.0300\n57 1 0.0160",
      },
    });

    fireEvent.change(screen.getByTestId("import-version-input"), {
      target: { value: "v2.0" },
    });

    fireEvent.click(screen.getByTestId("submit-import-btn"));

    await waitFor(() => {
      expect(importedPayload).not.toBeNull();
    });

    expect(importedPayload.rates).toHaveLength(3);
    expect(importedPayload.rates[0]).toEqual({
      age: 56,
      tenorYears: 1,
      premiumRate: 0.015,
    });
    expect(importedPayload.version).toBe("v2.0");
  });
});
