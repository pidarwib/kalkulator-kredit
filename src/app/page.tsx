import { AppLayout, PageHeader } from "@/components/layout";
import { Calculator, FileSpreadsheet, PlusCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <AppLayout>
      <PageHeader
        title="Dashboard Simulasi Kredit"
        description="Pusat kerja simulasi pembiayaan dan analisis kelayakan debitur BPR."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Dashboard" }]}
        actions={
          <Link
            href="/calculator"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Mulai Simulasi Baru</span>
          </Link>
        }
      />

      {/* Quick Action / Information Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Calculator Card */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Calculator className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Kalkulator Kredit
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Hitung simulasi angsuran flat/anuitas, analisis DBR, dan cek kelayakan kredit secara real-time.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              href="/calculator"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              <span>Buka Kalkulator</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Simulations Card */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-indigo-200 hover:shadow-md">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Daftar Simulasi
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Akses riwayat simulasi yang telah disimpan, cetak ringkasan, atau lanjutkan pengajuan.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100">
            <Link
              href="/simulations"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900"
            >
              <span>Lihat Semua Simulasi</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* System Guidelines Card */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:col-span-2 lg:col-span-1">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-100">
              Standard BPR Core
            </div>
            <h2 className="mt-4 text-base font-semibold text-slate-900">
              Prinsip Perhitungan
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Perhitungan angsuran dan kelayakan debitur diproses langsung oleh authoritative calculation engine backend sesuai parameter aktif BPR.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-400">
            Versi Sistem: v1.0.0 (Foundation)
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
