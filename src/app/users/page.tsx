"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AppLayout, PageHeader } from "@/components/layout";
import { useAuth } from "@/lib/auth/auth-provider";
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Shield,
  Building2,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  Lock,
  Mail,
  Phone,
  Key,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Clock,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RoleOption {
  id: string;
  code: string;
  name: string;
}

interface BprOption {
  id: string;
  code: string;
  name: string;
}

interface BranchOption {
  id: string;
  code: string;
  name: string;
  bprId: string;
}

interface UserItem {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  phone: string | null;
  roleId: string;
  bprId: string | null;
  branchId: string | null;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED" | string;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  role?: {
    id: string;
    code: string;
    name: string;
  };
  bpr?: {
    id: string;
    code: string;
    name: string;
  } | null;
  branch?: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function UserManagementPage() {
  const { user: currentUser, hasPermission, isLoading: authLoading } = useAuth();

  // State: Data & Pagination
  const [users, setUsers] = useState<UserItem[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // State: Reference options
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [bprs, setBprs] = useState<BprOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);

  // State: Filters
  const [searchInput, setSearchInput] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedBpr, setSelectedBpr] = useState<string>("");
  const [selectedBranch, setSelectedBranch] = useState<string>("");

  // State: Create / Edit Modal
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Form Fields
  const [formData, setFormData] = useState({
    username: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    roleId: "",
    roleCode: "",
    bprId: "",
    branchId: "",
    status: "ACTIVE",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // State: Delete Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<UserItem | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Check permissions
  const canView = hasPermission("USER_VIEW") || currentUser?.role === "SUPER_ADMIN" || currentUser?.role === "ADMIN";
  const canCreate = hasPermission("USER_CREATE");
  const canUpdate = hasPermission("USER_UPDATE");
  const canDelete = hasPermission("USER_DELETE");

  // Fetch Reference Data (Roles, BPRs, Branches)
  const fetchReferenceData = useCallback(async () => {
    try {
      // Roles
      const rolesRes = await fetch("/api/v1/roles");
      if (rolesRes.ok) {
        const json = await rolesRes.json();
        setRoles(json.data || []);
      }

      // BPRs
      const bprsRes = await fetch("/api/v1/bprs");
      if (bprsRes.ok) {
        const json = await bprsRes.json();
        setBprs(json.data || []);
      }

      // Branches
      const branchesRes = await fetch("/api/v1/branches");
      if (branchesRes.ok) {
        const json = await branchesRes.json();
        setBranches(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load reference data:", err);
    }
  }, []);

  // Fetch Users List with filters & pagination
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", meta.page.toString());
      params.set("pageSize", meta.pageSize.toString());

      if (searchInput.trim()) {
        params.set("search", searchInput.trim());
      }
      if (selectedRole) {
        params.set("role", selectedRole);
      }
      if (selectedStatus) {
        params.set("status", selectedStatus);
      }
      if (selectedBpr) {
        params.set("bprId", selectedBpr);
      }
      if (selectedBranch) {
        params.set("branchId", selectedBranch);
      }

      const res = await fetch(`/api/v1/users?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Anda tidak memiliki izin untuk melihat daftar pengguna.");
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Gagal memuat data pengguna.");
      }

      const json = await res.json();
      setUsers(json.data || []);
      if (json.meta) {
        setMeta({
          page: json.meta.page,
          pageSize: json.meta.pageSize,
          total: json.meta.total,
          totalPages: json.meta.totalPages,
        });
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat daftar pengguna.");
    } finally {
      setLoading(false);
    }
  }, [
    meta.page,
    meta.pageSize,
    searchInput,
    selectedRole,
    selectedStatus,
    selectedBpr,
    selectedBranch,
  ]);

  useEffect(() => {
    fetchReferenceData();
  }, [fetchReferenceData]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Form branches filtered by selected form BPR
  const formBranches = useMemo(() => {
    if (!formData.bprId) return [];
    return branches.filter((b) => b.bprId === formData.bprId);
  }, [branches, formData.bprId]);

  // Filter branches filtered by selected filter BPR
  const filterBranches = useMemo(() => {
    if (!selectedBpr) return branches;
    return branches.filter((b) => b.bprId === selectedBpr);
  }, [branches, selectedBpr]);

  // Available roles for form based on caller role
  const assignableRoles = useMemo(() => {
    if (currentUser?.role === "ADMIN") {
      return roles.filter((r) => r.code === "MARKETING");
    }
    return roles;
  }, [roles, currentUser?.role]);

  // Handlers for Filter
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setSelectedRole("");
    setSelectedStatus("");
    setSelectedBpr("");
    setSelectedBranch("");
    setMeta((prev) => ({ ...prev, page: 1 }));
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setModalMode("create");
    setEditingUserId(null);
    setFormError(null);
    setFieldErrors({});
    setShowPassword(false);

    // Set default role and bpr if caller is Admin
    const defaultRole = roles.find((r) => (currentUser?.role === "ADMIN" ? r.code === "MARKETING" : r.code === "MARKETING"));
    const defaultBprId = currentUser?.role === "ADMIN" ? (bprs[0]?.id || "") : "";

    setFormData({
      username: "",
      fullName: "",
      email: "",
      phone: "",
      password: "",
      roleId: defaultRole?.id || "",
      roleCode: defaultRole?.code || "MARKETING",
      bprId: defaultBprId,
      branchId: "",
      status: "ACTIVE",
    });
    setModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (targetUser: UserItem) => {
    setModalMode("edit");
    setEditingUserId(targetUser.id);
    setFormError(null);
    setFieldErrors({});
    setShowPassword(false);

    setFormData({
      username: targetUser.username,
      fullName: targetUser.fullName,
      email: targetUser.email || "",
      phone: targetUser.phone || "",
      password: "", // blank means keep unchanged
      roleId: targetUser.roleId || targetUser.role?.id || "",
      roleCode: targetUser.role?.code || "",
      bprId: targetUser.bprId || "",
      branchId: targetUser.branchId || "",
      status: targetUser.status || "ACTIVE",
    });
    setModalOpen(true);
  };

  // Validate form fields
  const validateForm = (): boolean => {
    const errs: Record<string, string> = {};

    if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
      errs.fullName = "Nama lengkap minimal 2 karakter.";
    }

    if (modalMode === "create") {
      if (!formData.username.trim() || formData.username.trim().length < 3) {
        errs.username = "Username minimal 3 karakter.";
      } else if (!/^[a-zA-Z0-9_.-]+$/.test(formData.username)) {
        errs.username = "Username hanya boleh huruf, angka, dot, dash, atau underscore.";
      }

      if (!formData.password || formData.password.length < 8) {
        errs.password = "Password minimal 8 karakter.";
      }
    } else {
      if (formData.password && formData.password.length < 8) {
        errs.password = "Password baru minimal 8 karakter.";
      }
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errs.email = "Format email tidak valid.";
    }

    if (!formData.roleId) {
      errs.roleId = "Role wajib dipilih.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Handle Create / Edit Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setFormSubmitting(true);
    setFormError(null);

    try {
      if (modalMode === "create") {
        const payload: any = {
          username: formData.username.trim(),
          fullName: formData.fullName.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          password: formData.password,
          roleId: formData.roleId,
          bprId: formData.bprId || null,
          branchId: formData.branchId || null,
          status: formData.status,
        };

        const res = await fetch("/api/v1/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || "Gagal membuat pengguna baru.");
        }
      } else {
        const payload: any = {
          fullName: formData.fullName.trim(),
          email: formData.email.trim() || null,
          phone: formData.phone.trim() || null,
          roleId: formData.roleId,
          bprId: formData.bprId || null,
          branchId: formData.branchId || null,
          status: formData.status,
        };

        if (formData.password) {
          payload.password = formData.password;
        }

        const res = await fetch(`/api/v1/users/${editingUserId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || "Gagal memperbarui data pengguna.");
        }
      }

      setModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message || "Terjadi kesalahan saat menyimpan data.");
    } finally {
      setFormSubmitting(false);
    }
  };

  // Open Delete Modal
  const handleOpenDeleteModal = (targetUser: UserItem) => {
    setUserToDelete(targetUser);
    setDeleteError(null);
    setDeleteModalOpen(true);
  };

  // Execute Delete
  const handleDeleteSubmit = async () => {
    if (!userToDelete) return;

    setDeleteSubmitting(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/v1/users/${userToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error?.message || "Gagal menghapus pengguna.");
      }

      setDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (err: any) {
      setDeleteError(err.message || "Terjadi kesalahan saat menghapus pengguna.");
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
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const renderRoleBadge = (roleCode?: string) => {
    switch (roleCode) {
      case "SUPER_ADMIN":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-purple-200 bg-purple-50 px-2.5 py-0.5 text-[11px] font-bold text-purple-700">
            <Shield className="h-3 w-3" />
            SUPER ADMIN
          </span>
        );
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-[11px] font-bold text-blue-700">
            <Building2 className="h-3 w-3" />
            ADMIN BPR
          </span>
        );
      case "MARKETING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
            <Users className="h-3 w-3" />
            MARKETING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
            {roleCode || "USER"}
          </span>
        );
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            AKTIF
          </span>
        );
      case "INACTIVE":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            NONAKTIF
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            DITANGGUHKAN
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 pb-12">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6 text-indigo-600" />
              <h1
                data-testid="user-management-title"
                className="text-xl font-bold tracking-tight text-slate-900"
              >
                Manajemen Pengguna
              </h1>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Kelola daftar akun pengguna, peran akses (RBAC), kantor cabang, dan status operasional sistem.
            </p>
          </div>

          {/* Action Button */}
          {canCreate && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              data-testid="add-user-btn"
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <UserPlus className="h-4 w-4" />
              <span>
                {currentUser?.role === "ADMIN" ? "+ Tambah Marketing" : "+ Tambah Pengguna"}
              </span>
            </button>
          )}
        </div>

        {/* Filter Bar */}
        <div
          data-testid="user-filter-bar"
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
        >
          <form
            onSubmit={handleSearchSubmit}
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
          >
            {/* Search Input */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari nama lengkap, username, atau email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                data-testid="search-user-input"
                className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            {/* Role Filter */}
            <div>
              <select
                value={selectedRole}
                onChange={(e) => {
                  setSelectedRole(e.target.value);
                  setMeta((prev) => ({ ...prev, page: 1 }));
                }}
                data-testid="filter-role-select"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                <option value="">Semua Peran (Role)</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setMeta((prev) => ({ ...prev, page: 1 }));
                }}
                data-testid="filter-status-select"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                <option value="">Semua Status</option>
                <option value="ACTIVE">Aktif</option>
                <option value="INACTIVE">Nonaktif</option>
                <option value="SUSPENDED">Ditangguhkan</option>
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
              {(searchInput || selectedRole || selectedStatus || selectedBpr || selectedBranch) && (
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

          {/* Super Admin BPR & Branch Filter row */}
          {currentUser?.role === "SUPER_ADMIN" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div>
                <select
                  value={selectedBpr}
                  onChange={(e) => {
                    setSelectedBpr(e.target.value);
                    setSelectedBranch("");
                    setMeta((prev) => ({ ...prev, page: 1 }));
                  }}
                  data-testid="filter-bpr-select"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                >
                  <option value="">Semua BPR</option>
                  {bprs.map((bpr) => (
                    <option key={bpr.id} value={bpr.id}>
                      {bpr.name} ({bpr.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={selectedBranch}
                  onChange={(e) => {
                    setSelectedBranch(e.target.value);
                    setMeta((prev) => ({ ...prev, page: 1 }));
                  }}
                  data-testid="filter-branch-select"
                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                >
                  <option value="">Semua Cabang</option>
                  {filterBranches.map((br) => (
                    <option key={br.id} value={br.id}>
                      {br.name} ({br.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div
            data-testid="user-list-loading"
            className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm"
          >
            <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
            <p className="mt-3 text-xs font-semibold text-slate-700">
              Memuat data pengguna...
            </p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div
            data-testid="user-list-error"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center"
          >
            <AlertTriangle className="mx-auto h-7 w-7 text-rose-600" />
            <h3 className="mt-2 text-xs font-bold text-rose-900">
              Gagal Memuat Data Pengguna
            </h3>
            <p className="mt-1 text-xs text-rose-700">{error}</p>
            <button
              type="button"
              onClick={fetchUsers}
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
                data-testid="user-table"
                className="w-full text-left text-xs border-collapse"
              >
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Pengguna</th>
                    <th className="py-3 px-4">Username</th>
                    <th className="py-3 px-4">Peran (Role)</th>
                    <th className="py-3 px-4">BPR & Cabang</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Login Terakhir</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {users.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        data-testid="user-empty-state"
                        className="py-12 px-4 text-center text-slate-400"
                      >
                        <Users className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-2 text-xs font-semibold text-slate-600">
                          Tidak ada pengguna yang ditemukan.
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Ubah kriteria pencarian atau tambahkan pengguna baru.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    users.map((item) => (
                      <tr
                        key={item.id}
                        data-testid={`user-row-${item.id}`}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* Name & Contact */}
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">
                            {item.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                            {item.email && (
                              <span className="flex items-center gap-0.5">
                                <Mail className="h-3 w-3 text-slate-400" />
                                {item.email}
                              </span>
                            )}
                            {item.phone && (
                              <span className="flex items-center gap-0.5">
                                <Phone className="h-3 w-3 text-slate-400" />
                                {item.phone}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Username */}
                        <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                          {item.username}
                        </td>

                        {/* Role */}
                        <td className="py-3 px-4">
                          {renderRoleBadge(item.role?.code)}
                        </td>

                        {/* BPR & Branch */}
                        <td className="py-3 px-4 text-slate-700">
                          <div className="font-semibold text-slate-800">
                            {item.bpr?.name || "Semua BPR (Pusat)"}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.branch?.name || (item.bpr ? "Semua Cabang" : "-")}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {renderStatusBadge(item.status)}
                        </td>

                        {/* Last Login */}
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {item.lastLoginAt ? (
                            formatDate(item.lastLoginAt)
                          ) : (
                            <span className="text-slate-400 italic">Belum pernah</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(item)}
                                data-testid={`edit-user-btn-${item.id}`}
                                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-sm"
                                title="Edit Pengguna"
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                            )}

                            {canDelete && currentUser?.id !== item.id && (
                              <button
                                type="button"
                                onClick={() => handleOpenDeleteModal(item)}
                                data-testid={`delete-user-btn-${item.id}`}
                                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors shadow-sm"
                                title="Hapus Pengguna"
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

            {/* Pagination Controls */}
            {meta.totalPages > 1 && (
              <div
                data-testid="user-pagination"
                className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-600"
              >
                <div className="text-[11px] font-medium">
                  Menampilkan halaman <span className="font-bold text-slate-900">{meta.page}</span> dari{" "}
                  <span className="font-bold text-slate-900">{meta.totalPages}</span> (Total {meta.total} pengguna)
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={meta.page <= 1}
                    onClick={() => setMeta((prev) => ({ ...prev, page: 1 }))}
                    data-testid="pagination-first"
                    className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={meta.page <= 1}
                    onClick={() => setMeta((prev) => ({ ...prev, page: prev.page - 1 }))}
                    data-testid="pagination-prev"
                    className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>

                  <span className="px-2 font-semibold text-slate-800 text-[11px]">
                    {meta.page} / {meta.totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setMeta((prev) => ({ ...prev, page: prev.page + 1 }))}
                    data-testid="pagination-next"
                    className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={meta.page >= meta.totalPages}
                    onClick={() => setMeta((prev) => ({ ...prev, page: meta.totalPages }))}
                    data-testid="pagination-last"
                    className="rounded-lg border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                  >
                    <ChevronsRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Create / Edit User Modal */}
        {modalOpen && (
          <div
            data-testid="user-form-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm overflow-y-auto"
          >
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl border border-slate-200 my-8">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  {modalMode === "create" ? (
                    <div className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                      <UserPlus className="h-5 w-5" />
                    </div>
                  ) : (
                    <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                      <Edit2 className="h-5 w-5" />
                    </div>
                  )}
                  <div>
                    <h2
                      data-testid="user-modal-title"
                      className="text-base font-bold text-slate-900"
                    >
                      {modalMode === "create" ? "Tambah Pengguna Baru" : "Edit Pengguna"}
                    </h2>
                    <p className="text-xs text-slate-500">
                      {modalMode === "create"
                        ? "Lengkapi profil akun pengguna dan hak akses operasional."
                        : "Perbarui profil, peran, atau status pengguna."}
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

              {/* Modal Form */}
              <form onSubmit={handleFormSubmit} className="mt-4 space-y-4 text-xs">
                {/* Full Name */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    data-testid="input-fullname"
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1",
                      fieldErrors.fullName
                        ? "border-rose-400 focus:border-rose-600 focus:ring-rose-600"
                        : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600"
                    )}
                  />
                  {fieldErrors.fullName && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">
                      {fieldErrors.fullName}
                    </p>
                  )}
                </div>

                {/* Username */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Username <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={modalMode === "edit"}
                    placeholder="Contoh: budi_santoso"
                    value={formData.username}
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                    data-testid="input-username"
                    className={cn(
                      "w-full rounded-lg border px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1",
                      modalMode === "edit" ? "bg-slate-100 text-slate-500 cursor-not-allowed" : "",
                      fieldErrors.username
                        ? "border-rose-400 focus:border-rose-600 focus:ring-rose-600"
                        : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600"
                    )}
                  />
                  {fieldErrors.username && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">
                      {fieldErrors.username}
                    </p>
                  )}
                  {modalMode === "edit" && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      Username bersifat permanen dan tidak dapat diubah.
                    </p>
                  )}
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      placeholder="budi@bpr.co.id"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      data-testid="input-email"
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1",
                        fieldErrors.email
                          ? "border-rose-400 focus:border-rose-600 focus:ring-rose-600"
                          : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600"
                      )}
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-[11px] text-rose-600 font-medium">
                        {fieldErrors.email}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Nomor Telepon
                    </label>
                    <input
                      type="tel"
                      placeholder="081234567890"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      data-testid="input-phone"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    {modalMode === "create" ? (
                      <>
                        Password <span className="text-rose-500">*</span>
                      </>
                    ) : (
                      <>
                        Password Baru <span className="text-slate-400 font-normal">(Kosongkan jika tidak diubah)</span>
                      </>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required={modalMode === "create"}
                      placeholder={modalMode === "create" ? "Minimal 8 karakter" : "••••••••"}
                      value={formData.password}
                      onChange={(e) =>
                        setFormData({ ...formData, password: e.target.value })
                      }
                      data-testid="input-password"
                      className={cn(
                        "w-full rounded-lg border px-3 py-2 pr-9 text-xs text-slate-900 focus:outline-none focus:ring-1",
                        fieldErrors.password
                          ? "border-rose-400 focus:border-rose-600 focus:ring-rose-600"
                          : "border-slate-300 focus:border-indigo-600 focus:ring-indigo-600"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="mt-1 text-[11px] text-rose-600 font-medium">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {/* Role & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Peran Hak Akses (Role) <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.roleId}
                      onChange={(e) => {
                        const rId = e.target.value;
                        const roleObj = roles.find((r) => r.id === rId);
                        setFormData({
                          ...formData,
                          roleId: rId,
                          roleCode: roleObj?.code || "",
                        });
                      }}
                      data-testid="select-role"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                    >
                      <option value="">Pilih Role...</option>
                      {assignableRoles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.code})
                        </option>
                      ))}
                    </select>
                    {fieldErrors.roleId && (
                      <p className="mt-1 text-[11px] text-rose-600 font-medium">
                        {fieldErrors.roleId}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Status Akun <span className="text-rose-500">*</span>
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
                      <option value="SUSPENDED">Ditangguhkan (SUSPENDED)</option>
                    </select>
                  </div>
                </div>

                {/* BPR & Branch Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      BPR / Institusi
                    </label>
                    <select
                      disabled={currentUser?.role === "ADMIN"}
                      value={formData.bprId}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bprId: e.target.value,
                          branchId: "",
                        })
                      }
                      data-testid="select-bpr"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Tidak Terikat BPR (Super Admin Pusat)</option>
                      {bprs.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Kantor Cabang
                    </label>
                    <select
                      disabled={!formData.bprId}
                      value={formData.branchId}
                      onChange={(e) =>
                        setFormData({ ...formData, branchId: e.target.value })
                      }
                      data-testid="select-branch"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Semua Cabang / Kantor Pusat BPR</option>
                      {formBranches.map((br) => (
                        <option key={br.id} value={br.id}>
                          {br.name} ({br.code})
                        </option>
                      ))}
                    </select>
                  </div>
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
                    data-testid="submit-user-form-btn"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
                  >
                    {formSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <span>
                      {modalMode === "create" ? "Simpan Pengguna" : "Perbarui Pengguna"}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteModalOpen && userToDelete && (
          <div
            data-testid="delete-confirm-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
          >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="rounded-xl bg-rose-50 p-2.5">
                  <ShieldAlert className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Konfirmasi Hapus Pengguna
                  </h3>
                  <p className="text-xs text-slate-500">
                    Tindakan ini akan menonaktifkan akun secara soft delete.
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
                  <strong>Nama:</strong> {userToDelete.fullName}
                </p>
                <p>
                  <strong>Username:</strong> {userToDelete.username}
                </p>
                <p>
                  <strong>Role:</strong> {userToDelete.role?.name || userToDelete.role?.code}
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
                  <span>Hapus Pengguna</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
