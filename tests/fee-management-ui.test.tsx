import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import FeeManagementPage from "@/app/master/fees/page";

// Mock Auth Provider
vi.mock("@/lib/auth/auth-provider", () => ({
  useAuth: () => ({
    user: {
      id: "admin-1",
      username: "adminbpr",
      fullName: "Admin BPR Sejahtera",
      role: "ADMIN",
      permissions: ["CREDIT_PARAMETER_VIEW", "CREDIT_PARAMETER_CREATE", "FEE_VIEW"],
      scope: "BPR",
    },
    hasPermission: (perm: string) => true,
    hasAnyPermission: () => true,
    isLoading: false,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/master/fees",
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe("TASK-058: Fee Management UI Tests", () => {
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

  const mockPaymentOffices = [
    { id: "po-1", code: "POS", name: "PT POS INDONESIA" },
  ];

  const mockActiveFee = {
    id: "fp-1",
    productId: "prod-1",
    paymentOfficeId: null,
    version: "v1.0",
    adminRate: 0.01,
    provisionRate: 0.01,
    verificationFee: 1500000,
    flaggingFee: 38000,
    frontingRate: 0.0025,
    reserveRate: 0.005,
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    effectiveTo: null,
    isActive: true,
    paymentOffice: null,
    createdAt: "2026-01-01T00:00:00.000Z",
  };

  const mockFeeVersions = [
    {
      id: "fp-1",
      productId: "prod-1",
      paymentOfficeId: null,
      version: "v1.0",
      adminRate: 0.01,
      provisionRate: 0.01,
      verificationFee: 1500000,
      flaggingFee: 38000,
      frontingRate: 0.0025,
      reserveRate: 0.005,
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      effectiveTo: null,
      isActive: true,
      paymentOffice: null,
      createdAt: "2026-01-01T00:00:00.000Z",
    },
  ];

  const mockFetch = (url: string, options?: any) => {
    if (url.includes("/api/v1/products") && !url.includes("/fee-parameters")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: mockProducts }),
      });
    }
    if (url.includes("/api/v1/payment-offices")) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: mockPaymentOffices }),
      });
    }
    if (url.includes("/fee-parameters/versions") && !options?.method) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: mockFeeVersions }),
      });
    }
    if (url.includes("/fee-parameters") && !options?.method) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: mockActiveFee }),
      });
    }
    return Promise.resolve({
      ok: true,
      json: async () => ({ success: true }),
    });
  };

  it("should render page header, product & payment office selector, active fee card, and versions table", async () => {
    global.fetch = vi.fn().mockImplementation(mockFetch);

    render(<FeeManagementPage />);

    expect(screen.getByTestId("fee-management-title")).toBeInTheDocument();
    expect(screen.getByTestId("fee-selector-card")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("active-fee-card")).toBeInTheDocument();
    });

    expect(screen.getByTestId("active-fee-version-badge")).toHaveTextContent("Versi v1.0 (AKTIF)");
    expect(screen.getByTestId("active-fee-provision")).toHaveTextContent(/1[.,]00%/);
    expect(screen.getByTestId("active-fee-admin")).toHaveTextContent(/1[.,]00%/);
    expect(screen.getByTestId("active-fee-verification")).toHaveTextContent(/1\.500\.000/);
    expect(screen.getByTestId("active-fee-flagging")).toHaveTextContent(/38\.000/);

    expect(screen.getByTestId("fee-versions-table")).toBeInTheDocument();
    expect(screen.getByTestId("fee-version-row-v1.0")).toBeInTheDocument();
  });

  it("should open create new fee version modal, validate, proceed to diff confirmation, and submit", async () => {
    let createdPayload: any = null;
    global.fetch = vi.fn().mockImplementation((url: string, options?: any) => {
      if (options?.method === "POST" && url.includes("/fee-parameters/versions")) {
        createdPayload = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { id: "fp-2", version: "v2.0", ...createdPayload } }),
        });
      }
      return mockFetch(url, options);
    });

    render(<FeeManagementPage />);

    await waitFor(() => {
      expect(screen.getByTestId("create-fee-version-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("create-fee-version-btn"));

    // Modal open at step 1 (form)
    expect(screen.getByTestId("fee-modal")).toBeInTheDocument();
    expect(screen.getByTestId("fee-modal-title")).toHaveTextContent("Buat Versi Parameter Biaya Baru");

    // Proceed to Step 2: Confirmation Diff
    fireEvent.click(screen.getByTestId("proceed-fee-confirm-btn"));

    // Check Confirmation step
    expect(screen.getByTestId("fee-modal-title")).toHaveTextContent("Konfirmasi Aktivasi Parameter Biaya");
    expect(screen.getByText("Konfirmasi Pembaruan Parameter Biaya:")).toBeInTheDocument();

    // Confirm & Activate
    fireEvent.click(screen.getByTestId("confirm-activate-fee-btn"));

    await waitFor(() => {
      expect(createdPayload).not.toBeNull();
    });

    expect(createdPayload.provisionRate).toBe(0.01);
    expect(createdPayload.verificationFee).toBe(1500000);
  });
});
