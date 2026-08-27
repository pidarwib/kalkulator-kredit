import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "@/app/login/page";

// Mock Next.js navigation
const mockPush = vi.fn();
const mockRefresh = vi.fn();
let mockSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  useSearchParams: () => mockSearchParams,
}));

describe("TASK-041: Login Page UI & Authentication Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchParams = new URLSearchParams();
    global.fetch = vi.fn();
  });

  it("should render all clean minimal login UI elements correctly", () => {
    render(<LoginPage />);

    // Title and Header
    expect(screen.getByText("Credit Calculator BPR")).toBeDefined();
    expect(screen.getByText("Masuk ke Akun")).toBeDefined();

    // Input fields & labels
    expect(screen.getByLabelText(/username/i)).toBeDefined();
    expect(screen.getByLabelText(/password/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/masukkan username anda/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/••••••••••••/i)).toBeDefined();

    // Submit button
    const submitBtn = screen.getByTestId("login-submit-button");
    expect(submitBtn).toBeDefined();
    expect(submitBtn.textContent).toContain("Masuk ke Sistem");
  });

  it("should show validation error when submitted with empty fields", async () => {
    render(<LoginPage />);

    const submitBtn = screen.getByTestId("login-submit-button");
    fireEvent.click(submitBtn);

    const errorAlert = await screen.findByTestId("login-error-alert");
    expect(errorAlert).toBeDefined();
    expect(errorAlert.textContent).toContain("Username wajib diisi.");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("should display server error message on 401 invalid credentials", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Username atau password tidak valid.",
        },
      }),
    });

    render(<LoginPage />);

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByTestId("login-submit-button");

    fireEvent.change(usernameInput, { target: { value: "invalid_user" } });
    fireEvent.change(passwordInput, { target: { value: "wrong_password" } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/v1/auth/login", expect.any(Object));
    });

    const errorAlert = await screen.findByTestId("login-error-alert");
    expect(errorAlert.textContent).toContain("Username atau password tidak valid.");
  });

  it("should handle successful login and redirect to default / callback URL", async () => {
    mockSearchParams = new URLSearchParams({ callbackUrl: "/calculator" });

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: {
          user: {
            id: "user-123",
            username: "marketing01",
            fullName: "Marketing Officer",
            role: "MARKETING",
          },
        },
      }),
    });

    render(<LoginPage />);

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByTestId("login-submit-button");

    fireEvent.change(usernameInput, { target: { value: "marketing01" } });
    fireEvent.change(passwordInput, { target: { value: "ValidPassword123!" } });
    fireEvent.click(submitBtn);

    const successAlert = await screen.findByTestId("login-success-alert");
    expect(successAlert.textContent).toContain("Login berhasil");

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/calculator");
    }, { timeout: 2000 });
  });
});
