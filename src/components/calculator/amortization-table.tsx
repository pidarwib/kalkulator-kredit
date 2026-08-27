"use client";

import React, { useState, useMemo } from "react";
import {
  CalendarDays,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface AmortizationRow {
  period: number;
  paymentDate?: string;
  dueDate?: string;
  openingBalance: number;
  principal: number;
  interest: number;
  installment: number;
  closingBalance: number;
}

export interface AmortizationTableProps {
  schedule: AmortizationRow[];
  calculationMethod?: string;
  className?: string;
}

export function AmortizationTable({
  schedule = [],
  calculationMethod = "FLAT",
  className,
}: AmortizationTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(12); // default 12 months (1 year view)

  const totalRows = schedule.length;
  const isShowAll = pageSize === totalRows;
  const totalPages = Math.ceil(totalRows / (pageSize || 1)) || 1;

  // Pagination slice
  const paginatedRows = useMemo(() => {
    if (pageSize === -1 || pageSize >= totalRows) {
      return schedule;
    }
    const start = (currentPage - 1) * pageSize;
    return schedule.slice(start, start + pageSize);
  }, [schedule, currentPage, pageSize, totalRows]);

  // Overall totals
  const totals = useMemo(() => {
    return schedule.reduce(
      (acc, row) => ({
        principal: acc.principal + (row.principal || 0),
        interest: acc.interest + (row.interest || 0),
        installment: acc.installment + (row.installment || 0),
      }),
      { principal: 0, interest: 0, installment: 0 }
    );
  }, [schedule]);

  const formatRupiah = (val: number | null | undefined): string => {
    if (val === undefined || val === null || isNaN(val)) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleExportCsv = () => {
    if (!schedule.length) return;
    const headers = [
      "Periode",
      "Pokok Awal",
      "Angsuran Pokok",
      "Bunga / Margin",
      "Total Angsuran",
      "Pokok Akhir",
    ];
    const rows = schedule.map((r) => [
      r.period,
      r.openingBalance,
      r.principal,
      r.interest,
      r.installment,
      r.closingBalance,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `jadwal_angsuran_${calculationMethod.toLowerCase()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!schedule || schedule.length === 0) {
    return (
      <div
        data-testid="amortization-empty"
        className={cn(
          "rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500",
          className
        )}
      >
        <TableIcon className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-2 text-xs font-semibold">Jadwal amortisasi belum tersedia.</p>
      </div>
    );
  }

  return (
    <div
      data-testid="amortization-table-container"
      className={cn(
        "rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden",
        className
      )}
    >
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:p-6 border-b border-slate-100 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <TableIcon className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Tabel Jadwal Angsuran & Amortisasi
            </h3>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
              {calculationMethod} • {totalRows} Periode
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Rincian penurunan saldo pokok, porsi bunga margin, dan total cicilan setiap bulan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Page size selector */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Tampilkan:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                const val = Number(e.target.value);
                setPageSize(val);
                setCurrentPage(1);
              }}
              data-testid="amortization-pagesize-select"
              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none"
            >
              <option value="12">12 bln (1 thn)</option>
              <option value="24">24 bln (2 thn)</option>
              <option value="60">60 bln (5 thn)</option>
              <option value={totalRows}>Semua ({totalRows})</option>
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            data-testid="export-amortization-csv-btn"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 shadow-sm"
          >
            <Download className="h-3.5 w-3.5" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Scrollable Table View */}
      <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
        <table
          data-testid="amortization-table"
          className="w-full text-left text-xs border-collapse"
        >
          <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] shadow-sm">
            <tr>
              <th className="py-3 px-4 text-center w-16 border-b border-slate-200">
                Bln
              </th>
              <th className="py-3 px-4 text-right border-b border-slate-200">
                Pokok Awal (Rp)
              </th>
              <th className="py-3 px-4 text-right border-b border-slate-200">
                Angsuran Pokok (Rp)
              </th>
              <th className="py-3 px-4 text-right border-b border-slate-200">
                Margin / Bunga (Rp)
              </th>
              <th className="py-3 px-4 text-right border-b border-slate-200 bg-indigo-50/70 text-indigo-950 font-extrabold">
                Total Angsuran (Rp)
              </th>
              <th className="py-3 px-4 text-right border-b border-slate-200">
                Pokok Akhir (Rp)
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium">
            {paginatedRows.map((row) => (
              <tr
                key={row.period}
                data-testid={`amortization-row-${row.period}`}
                className="hover:bg-slate-50/80 transition-colors"
              >
                <td className="py-2.5 px-4 text-center font-bold text-slate-700 bg-slate-50/40">
                  {row.period}
                </td>
                <td className="py-2.5 px-4 text-right text-slate-700 font-mono tabular-nums">
                  {formatRupiah(row.openingBalance)}
                </td>
                <td className="py-2.5 px-4 text-right text-slate-900 font-mono tabular-nums">
                  {formatRupiah(row.principal)}
                </td>
                <td className="py-2.5 px-4 text-right text-slate-600 font-mono tabular-nums">
                  {formatRupiah(row.interest)}
                </td>
                <td className="py-2.5 px-4 text-right font-extrabold text-indigo-900 font-mono tabular-nums bg-indigo-50/30">
                  {formatRupiah(row.installment)}
                </td>
                <td className="py-2.5 px-4 text-right text-slate-700 font-mono tabular-nums">
                  {formatRupiah(row.closingBalance)}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Summary Footer */}
          <tfoot className="bg-slate-100/90 font-extrabold text-xs text-slate-900 sticky bottom-0 z-10 border-t-2 border-slate-300">
            <tr>
              <td className="py-3 px-4 text-center uppercase tracking-wider font-bold">
                Total
              </td>
              <td className="py-3 px-4 text-right text-slate-500 font-normal">
                -
              </td>
              <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                Rp {formatRupiah(totals.principal)}
              </td>
              <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900">
                Rp {formatRupiah(totals.interest)}
              </td>
              <td className="py-3 px-4 text-right font-mono tabular-nums text-indigo-950 bg-indigo-100/60 font-black">
                Rp {formatRupiah(totals.installment)}
              </td>
              <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-800">
                Rp 0
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-100 bg-slate-50/40 text-xs">
          <div className="text-slate-500">
            Menampilkan{" "}
            <span className="font-semibold text-slate-900">
              {(currentPage - 1) * pageSize + 1} -{" "}
              {Math.min(currentPage * pageSize, totalRows)}
            </span>{" "}
            dari <span className="font-semibold text-slate-900">{totalRows}</span> bulan
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(1)}
              data-testid="amortization-page-first"
              className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Halaman Pertama"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>

            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              data-testid="amortization-page-prev"
              className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <span className="px-2 font-semibold text-slate-700">
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              data-testid="amortization-page-next"
              className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Halaman Berikutnya"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(totalPages)}
              data-testid="amortization-page-last"
              className="rounded p-1 text-slate-500 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Halaman Terakhir"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
