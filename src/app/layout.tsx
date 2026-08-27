import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/auth-provider";

export const metadata: Metadata = {
  title: "Credit Calculator BPR",
  description: "Aplikasi Simulasi & Kalkulator Kredit BPR Terstandarisasi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
