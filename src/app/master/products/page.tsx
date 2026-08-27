"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  Layers,
  Plus,
  Search,
  Filter,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  RefreshCw,
  X,
  Loader2,
  FileText,
  ShieldCheck,
  Percent,
  Calendar,
  Layers3,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface BprOption {
  id: string;
  code: string;
  name: string;
}

interface ProductItem {
  id: string;
  bprId: string;
  code: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE" | string;
  createdAt: string;
  updatedAt: string;
  bpr?: {
    id: string;
    code: string;
    name: string;
  } | null;
  _count?: {
    creditParameters?: number;
    feeParameters?: number;
    insuranceRates?: number;
    simulations?: number;
  };
}

export default function ProductManagementPage() {
  const { user: currentUser, hasPermission, hasAnyPermission } = useAuth();

  // State: Data
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [bprs, setBprs] = useState<BprOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State: Filters
  const [searchInput, setSearchInput] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedBpr, setSelectedBpr] = useState<string>("");

  // State: Modals
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    bprId: "",
    code: "",
    name: "",
    description: "",
    status: "ACTIVE",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // State: Delete Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Permissions
  const canCreate = hasPermission("MASTER_CREATE");
  const canUpdate = hasPermission("MASTER_UPDATE");
  const canDelete = hasPermission("MASTER_DELETE");

  // Fetch Reference BPRs
  const fetchBprs = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/bprs");
      if (res.ok) {
        const json = await res.json();
        setBprs(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load BPRs:", err);
    }
  }, []);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchInput.trim()) {
        params.set("search", searchInput.trim());
      }
      if (selectedStatus) {
        params.set("status", selectedStatus);
      }
      if (selectedBpr) {
        params.set("bprId", selectedBpr);
      }

      const res = await fetch(`/api/v1/products?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Anda tidak memiliki izin untuk melihat daftar produk.");
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Gagal memuat daftar produk.");
      }

      const json = await res.json();
      setProducts(json.data || []);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat mengambil data produk.");
    } finally {
      setLoading(false);
    }
  }, [searchInput, selectedStatus, selectedBpr]);

  useEffect(() => {
    fetchBprs();
  }, [fetchBprs]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Handlers for Filters
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSelectedStatus("");
    setSelectedBpr("");
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode("create");
    setEditingProductId(null);
    setFormError(null);
    setFieldErrors({});

    const defaultBprId = currentUser?.role === "ADMIN" ? (bprs[0]?.id || "") : (bprs[0]?.id || "");

    setFormData({
      bprId: defaultBprId,
      code: "",
      name: "",
      description: "",
      status: "ACTIVE",
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: ProductItem) => {
    setModalMode("edit");
    setEditingProductId(item.id);
    setFormError(null);
    setFieldErrors({});

    setFormData({
      bprId: item.bprId,
      code: item.code,
      name: item.name,
      description: item.description || "",
      status: item.status,
    });
    setModalOpen(true);
  };

  // Validate form fields
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (modalMode === "create") {
      if (!formData.bprId) {
        errs.bprId = "BPR wajib dipilih.";
      }
      if (!formData.code.trim()) {
        errs.code = "Kode produk wajib diisi.";
      } else if (!/^[A-Z0-9_]+$/.test(formData.code.trim())) {
        errs.code = "Kode produk hanya boleh huruf kapital (A-Z), angka (0-9), dan underscore (_).";
      } else if (formData.code.trim().length < 2) {
        errs.code = "Kode produk minimal 2 karakter.";
      }
    }

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      errs.name = "Nama produk minimal 2 karakter.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Create / Edit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormSubmitting(true);
    setFormError(null);

    try {
      if (modalMode === "create") {
        const payload = {
          bprId: formData.bprId,
          code: formData.code.trim().toUpperCase(),
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          status: formData.status,
        };

        const res = await fetch("/api/v1/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error?.message || "Gagal membuat produk baru.");
        }
      } else {
        const payload = {
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          status: formData.status,
        };

        const res = await fetch(`/api/v1/products/${editingProductId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          throw new Error(errJson.error?.message || "Gagal memperbarui data produk.");
        }
      }

      setModalOpen(false);
      fetchProducts();
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan saat menyimpan produk.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (item: ProductItem) => {
    setProductToDelete(item);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  // Execute Delete
  const handleDeleteSubmit = async () => {
    if (!productToDelete) return;

    setDeleteSubmitting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/v1/products/${productToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Gagal menghapus produk.");
      }

      setDeleteModalOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (err: any) {
      setDeleteError(err.message || "Terjadi kesalahan saat menghapus produk.");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const formatDate = (isoString?: string | null): string => {
    if (!isoString) return "-";
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const renderStatusBadge = (status: string) => {
    if (status === "ACTIVE") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          AKTIF
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        NONAKTIF
      </span>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="h-6 w-6 text-indigo-600" />
              <h1
                data-testid="product-management-title"
                className="text-xl font-bold tracking-tight text-slate-900"
              >
                Master Produk Kredit
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Kelola master katalog produk pinjaman, kode produk, parameter bunga, dan status keaktifan.
            </p>
          </div>

          {/* Action CTA */}
          {canCreate && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              data-testid="add-product-btn"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              <span>+ Tambah Produk</span>
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div
          data-testid="product-filter-bar"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
        >
          <form
            onSubmit={handleSearchSubmit}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari kode atau nama produk..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                data-testid="search-product-input"
                className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                data-testid="filter-status-select"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                <option value="">Semua Status</option>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                data-testid="apply-filter-btn"
                className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Filter className="h-3.5 w-3.5" />
                <span>Filter</span>
              </button>
              {(searchInput || selectedStatus || selectedBpr) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  data-testid="reset-filter-btn"
                  className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
                  title="Reset Filter"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>

          {/* Super Admin BPR Filter */}
          {currentUser?.role === "SUPER_ADMIN" && (
            <div className="pt-2 border-t border-slate-100">
              <select
                value={selectedBpr}
                onChange={(e) => setSelectedBpr(e.target.value)}
                data-testid="filter-bpr-select"
                className="w-full sm:w-1/2 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                <option value="">Semua BPR (Pusat)</option>
                {bprs.map((bpr) => (
                  <option key={bpr.id} value={bpr.id}>
                    {bpr.name} ({bpr.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div
            data-testid="product-list-loading"
            className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm"
          >
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            <p className="mt-3 text-xs font-semibold text-slate-700">
              Memuat katalog produk kredit...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div
            data-testid="product-list-error"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center"
          >
            <AlertTriangle className="mx-auto h-7 w-7 text-rose-600" />
            <h3 className="mt-2 text-xs font-bold text-rose-900">
              Gagal Memuat Produk Kredit
            </h3>
            <p className="mt-1 text-xs text-rose-700">{error}</p>
            <button
              type="button"
              onClick={fetchProducts}
              className="mt-3 inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Coba Lagi</span>
            </button>
          </div>
        )}

        {/* Data Table */}
        {!loading && !error && (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table
                data-testid="product-table"
                className="w-full text-left text-xs border-collapse"
              >
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Kode Produk</th>
                    <th className="py-3 px-4">Nama Produk & Deskripsi</th>
                    <th className="py-3 px-4">BPR</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Parameter Terkait</th>
                    <th className="py-3 px-4">Dibuat</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {products.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        data-testid="product-empty-state"
                        className="py-12 px-4 text-center text-slate-400"
                      >
                        <Layers className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-2 text-xs font-semibold text-slate-600">
                          Tidak ada produk kredit yang ditemukan.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Gunakan kriteria pencarian lain atau tambahkan produk baru.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    products.map((item) => (
                      <tr
                        key={item.id}
                        data-testid={`product-row-${item.id}`}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Product Code */}
                        <td className="py-3 px-4 font-mono font-bold text-indigo-950">
                          {item.code}
                        </td>

                        {/* Product Name & Description */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {item.name}
                          </div>
                          {item.description && (
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              {item.description}
                            </div>
                          )}
                        </td>

                        {/* BPR */}
                        <td className="py-3 px-4 text-slate-700">
                          <div className="font-semibold text-slate-800">
                            {item.bpr?.name || "-"}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {item.bpr?.code || ""}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {renderStatusBadge(item.status)}
                        </td>

                        {/* Related Counts */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-2 text-[11px] text-slate-600">
                            <span
                              title="Parameter Kredit"
                              className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5"
                            >
                              <SlidersHorizontal className="h-3 w-3 text-slate-400" />
                              {item._count?.creditParameters || 0}
                            </span>
                            <span
                              title="Tarif Asuransi"
                              className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5"
                            >
                              <ShieldCheck className="h-3 w-3 text-slate-400" />
                              {item._count?.insuranceRates || 0}
                            </span>
                            <span
                              title="Parameter Biaya"
                              className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5"
                            >
                              <Percent className="h-3 w-3 text-slate-400" />
                              {item._count?.feeParameters || 0}
                            </span>
                          </div>
                        </td>

                        {/* Created At */}
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {formatDate(item.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item)}
                                data-testid={`edit-product-btn-${item.id}`}
                                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
                                title="Edit Produk"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleOpenDeleteModal(item)}
                                data-testid={`delete-product-btn-${item.id}`}
                                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors shadow-sm"
                                title="Hapus Produk"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Create / Edit Modal */}
        {modalOpen && (
          <div
            data-testid="product-form-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm overflow-y-auto"
          >
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 my-8">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <h2
                      data-testid="product-modal-title"
                      className="text-base font-bold text-slate-900"
                    >
                      {modalMode === "create" ? "Tambah Produk Kredit Baru" : "Edit Produk Kredit"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {modalMode === "create"
                        ? "Definisikan produk pinjaman baru pada BPR."
                        : "Perbarui nama, deskripsi, atau status operasional produk."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  data-testid="close-modal-btn"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form Error Banner */}
              {formError && (
                <div
                  data-testid="form-error-alert"
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2"
                >
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleFormSubmit} className="mt-4 space-y-4 text-xs">
                {/* BPR Selection */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    BPR / Institusi <span className="text-rose-500">*</span>
                  </label>
                  <select
                    disabled={modalMode === "edit" || currentUser?.role === "ADMIN"}
                    value={formData.bprId}
                    onChange={(e) =>
                      setFormData({ ...formData, bprId: e.target.value })
                    }
                    data-testid="select-bpr"
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1",
                      modalMode === "edit" ? "bg-slate-100 cursor-not-allowed text-slate-600" : "bg-white",
                      fieldErrors.bprId
                        ? "border-rose-400 focus:border-rose-600 focus:ring-rose-600"
                        : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600"
                    )}
                  >
                    <option value="">Pilih BPR...</option>
                    {bprs.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.bprId && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">
                      {fieldErrors.bprId}
                    </p>
                  )}
                </div>

                {/* Product Code */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Kode Produk <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === "edit"}
                    placeholder="Contoh: KREDIT_PENSIUN_PLATINUM"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase().replace(/\s+/g, "_"),
                      })
                    }
                    data-testid="input-product-code"
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 font-mono text-xs text-slate-900 focus:outline-none focus:ring-1",
                      modalMode === "edit" ? "bg-slate-100 cursor-not-allowed text-slate-600" : "bg-white",
                      fieldErrors.code
                        ? "border-rose-400 focus:border-rose-600 focus:ring-rose-600"
                        : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600"
                    )}
                  />
                  {fieldErrors.code && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">
                      {fieldErrors.code}
                    </p>
                  )}
                  {modalMode === "create" && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Gunakan huruf kapital dan underscore (misal: KREDIT_PEGAWAI).
                    </p>
                  )}
                </div>

                {/* Product Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Produk <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Kredit Pensiun Platinum"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    data-testid="input-product-name"
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1",
                      fieldErrors.name
                        ? "border-rose-400 focus:border-rose-600 focus:ring-rose-600"
                        : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600"
                    )}
                  />
                  {fieldErrors.name && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Deskripsi Produk
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Deskripsi singkat produk pinjaman..."
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    data-testid="input-product-desc"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Status Operasional <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    data-testid="select-status"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  >
                    <option value="ACTIVE">Aktif (ACTIVE)</option>
                    <option value="INACTIVE">Nonaktif (INACTIVE)</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    data-testid="cancel-form-btn"
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    data-testid="submit-product-form-btn"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {formSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>
                      {modalMode === "create" ? "Simpan Produk" : "Perbarui Produk"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && productToDelete && (
          <div
            data-testid="delete-confirm-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="rounded-xl bg-rose-50 p-2.5">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Konfirmasi Hapus Produk
                  </h3>
                  <p className="text-xs text-slate-500">
                    Produk akan dinonaktifkan secara soft delete.
                  </p>
                </div>
              </div>

              {deleteError && (
                <div
                  data-testid="delete-error-alert"
                  className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-start gap-2"
                >
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{deleteError}</span>
                </div>
              )}

              <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 space-y-1">
                <p>
                  <strong>Kode:</strong> <span className="font-mono font-semibold">{productToDelete.code}</span>
                </p>
                <p>
                  <strong>Nama:</strong> {productToDelete.name}
                </p>
                <p>
                  <strong>BPR:</strong> {productToDelete.bpr?.name || "-"}
                </p>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  data-testid="cancel-delete-btn"
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={deleteSubmitting}
                  onClick={handleDeleteSubmit}
                  data-testid="confirm-delete-btn"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {deleteSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>Hapus Produk</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
