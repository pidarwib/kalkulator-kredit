import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased">{children}</body>
    </html>
  );
}
