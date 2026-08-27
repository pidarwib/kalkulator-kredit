import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ParameterManagementPage from "@/app/master/parameters/page";

// Mock Auth Provider
vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      username: "adminbpr",
      fullName: "Admin BPR Sejahtera",
      role: "ADMIN",
      permissions: ["CREDIT_PARAMETER_VIEW", "CREDIT_PARAMETER_CREATE", "PARAMETER_VIEW"],
      scope: "BPR",
    },
    hasPermission: (perm: string) => true,
    hasAnyPermission: () => true,
    isLoading: false,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/master/parameters",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("TASK-056: Parameter Management UI Tests", () => {
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

  const mockActiveParam = {
    id: "cp-1",
    productId: "prod-1",
    version: "v1.0",
    maximumAgeYears: 75,
    maximumAgeMonths: 0,
    maximumTenorMonths: 120,
    maximumPrincipal: 200000000,
    maximumDbr: 0.9,
    flatAnnualRate: 0.108,
    flatMonthlyRate: 0.009,
    principalRoundingIncrement: 100000,
    installmentDeductionPeriods: 2,
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  const mockVersions = [
    {
      id: "cp-1",
      productId: "prod-1",
      version: "v1.0",
      maximumAgeYears: 75,
      maximumAgeMonths: 0,
      maximumTenorMonths: 120,
      maximumPrincipal: 200000000,
      maximumDbr: 0.9,
      flatAnnualRate: 0.108,
      flatMonthlyRate: 0.009,
      principalRoundingIncrement: 100000,
      installmentDeductionPeriods: 2,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveTo: null,
      isActive: true,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  const mockFetch = (url: string, options?: any) => {
    if (url.includes("/api/v1/products") && !url.includes("/credit-parameters")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: mockProducts }),
      });
    }
    if (url.includes("/credit-parameters/versions") && !options?.method) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: mockVersions }),
      });
    }
    if (url.includes("/credit-parameters") && !options?.method) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: mockActiveParam }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ success: true }),
    });
  };

  it("should render page header, product selector, active parameter card, and historical versions table", async () => {
    global.fetch = vi.fn().mockImplementation(mockFetch);

    render(<ParameterManagementPage />);

    expect(screen.getByTestId("parameter-management-title")).toBeInTheDocument();
    expect(screen.getByTestId("product-selector-card")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("active-parameter-card")).toBeInTheDocument();
    });

    // Check active version badge & parameters
    expect(screen.getByTestId("active-version-badge")).toHaveTextContent("Versi v1.0 (AKTIF)");
    expect(screen.getByTestId("active-param-dbr")).toHaveTextContent(/90[.,]00%/);
    expect(screen.getByTestId("active-param-rate")).toHaveTextContent(/10[.,]80%/);
    expect(screen.getByTestId("active-param-tenor")).toHaveTextContent("120 Bulan");

    // Check versions table
    expect(screen.getByTestId("parameter-versions-table")).toBeInTheDocument();
    expect(screen.getByTestId("version-row-v1.0")).toBeInTheDocument();
  });

  it("should open create new version modal, validate, proceed to diff confirmation, and submit", async () => {
    let createdPayload: any = null;
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === "POST" && url.includes("/credit-parameters/versions")) {
        createdPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { id: "cp-2", version: "v2.0", ...createdPayload } }),
        });
      }
      return mockFetch(url, options);
    });

    render(<ParameterManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("create-version-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("create-version-btn"));

    // Modal open at step 1 (form)
    expect(screen.getByTestId("parameter-modal")).toBeInTheDocument();
    expect(screen.getByTestId("parameter-modal-title")).toHaveTextContent("Buat Versi Parameter Kredit Baru");

    // Change tenor to 180 months
    fireEvent.change(screen.getByTestId("input-max-tenor"), {
      target: { value: "180" },
    });

    // Proceed to Step 2: Confirmation Diff
    fireEvent.click(screen.getByTestId("proceed-confirm-btn"));

    // Check Confirmation step
    expect(screen.getByTestId("parameter-modal-title")).toHaveTextContent("Konfirmasi Aktivasi Parameter Baru");
    expect(screen.getByText("Perhatian Sensitivitas Parameter Finansial:")).toBeInTheDocument();
    expect(screen.getByText("180 Bulan")).toBeInTheDocument();

    // Confirm & Activate
    fireEvent.click(screen.getByTestId("confirm-activate-btn"));

    await waitFor(() => {
      expect(createdPayload).not.toBeNull();
    });

    expect(createdPayload.maximumTenorMonths).toBe(180);
    expect(createdPayload.maximumDbr).toBe(0.9);
  });
});
