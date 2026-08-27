# TECHNICAL IMPLEMENTATION — CREDIT CALCULATOR BPR

## 1. Tujuan

Dokumen ini adalah **execution blueprint untuk coding agent** seperti Claude Code / Antigravity.

Dokumen ini menerjemahkan:

```text
PRD
ROLE_PERMISSION
BUSINESS_RULES
ARCHITECTURE
DATABASE
SECURITY
DESIGN
API_SPECIFICATION
```

menjadi pekerjaan coding yang:

- berurutan;
- granular;
- memiliki dependency;
- memiliki output yang jelas;
- memiliki acceptance criteria;
- memiliki testing;
- memiliki Definition of Done.

### Aturan utama untuk AI Coding Agent

Jangan langsung membuat seluruh aplikasi dalam satu langkah.

Agent harus:

```text
Read Specification
        ↓
Select Current Task
        ↓
Check Dependencies
        ↓
Implement
        ↓
Test
        ↓
Review
        ↓
Mark Done
        ↓
Next Task
```

Agent **tidak boleh mengubah business rule, database architecture, API contract, security boundary, atau design system secara diam-diam**.

Jika ditemukan konflik antar dokumen:

```text
STOP
↓
Explain Conflict
↓
Request Human Decision
```

---

# 2. Source of Truth

Urutan referensi:

```text
PRD.md
ROLE_PERMISSION.md
BUSINESS_RULES.md
ARCHITECTURE.md
DATABASE.md
SECURITY.md
DESIGN.md
API_SPECIFICATION.md
TECHNICAL_IMPLEMENTATION.md
```

Untuk domain masing-masing:

```text
Business Formula
→ BUSINESS_RULES.md

Role / Permission
→ ROLE_PERMISSION.md

Database
→ DATABASE.md

Security
→ SECURITY.md

UI / UX
→ DESIGN.md

API Contract
→ API_SPECIFICATION.md
```

Technical Implementation tidak boleh mengganti source of truth tersebut.

---

# 3. Development Strategy

Gunakan pendekatan:

```text
Foundation First
→ Security
→ Data Model
→ Master Data
→ Calculation Engine
→ API
→ UI
→ Integration
→ Testing
→ Hardening
```

Jangan membangun UI kalkulator secara penuh sebelum calculation engine tervalidasi.

Alasannya:

```text
UI
 ↓
API
 ↓
Calculation Engine
 ↓
Business Rules
```

Jika calculation engine belum benar, UI hanya akan membungkus logic yang belum tervalidasi.

---

# 4. Technology Stack (LOCKED)

```text
Framework  : Next.js (full-stack, App Router)
Language   : TypeScript
Styling    : Tailwind CSS
ORM        : Prisma
Database   : PostgreSQL
```

---

# 5. Recommended Project Structure

Struktur mengikuti Next.js App Router dengan modul-based organization:

```text
project/
│
├── .agents/                  ← specification files
│   ├── PRD.md
│   ├── ROLE_PERMISSION.md
│   ├── BUSINESS_RULES.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── SECURITY.md
│   ├── DESIGN.md
│   ├── API_SPECIFICATION.md
│   └── TECHNICAL_IMPLEMENTATION.md
│
├── src/
│   ├── app/                   ← Next.js App Router
│   │   ├── api/
│   │   │   └── v1/            ← API routes
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   ├── globals.css
│   │   └── layout.tsx
│   │
│   ├── components/            ← shared UI components
│   ├── modules/               ← feature modules
│   │   ├── auth/
│   │   ├── users/
│   │   ├── roles/
│   │   ├── permissions/
│   │   ├── bprs/
│   │   ├── branches/
│   │   ├── payment-offices/
│   │   ├── products/
│   │   ├── parameters/
│   │   ├── insurance/
│   │   ├── fees/
│   │   ├── calculations/
│   │   ├── simulations/
│   │   └── audit/
│   │
│   ├── domain/                ← calculation engine (pure TS, no framework)
│   │   ├── calculation/
│   │   ├── insurance/
│   │   ├── fees/
│   │   └── eligibility/
│   │
│   ├── lib/                   ← shared utilities
│   ├── repositories/          ← data access (Prisma)
│   └── types/                 ← shared TypeScript types
│
├── prisma/
│   ├── schema.prisma          ← database schema
│   ├── migrations/            ← Prisma migrations
│   └── seed.ts                ← seed script
│
├── tests/
├── scripts/
├── reference_source/
└── ...
```

---

# 6. Task Status Convention

Gunakan:

```text
[ ] NOT STARTED
[~] IN PROGRESS
[x] DONE
[!] BLOCKED
```

Jangan menandai task `[x]` jika acceptance criteria belum terpenuhi.

---

# 6. PHASE 0 — PROJECT DISCOVERY

## TASK-001 — Read All Specifications

### Objective

Memastikan agent memahami seluruh kontrak sebelum coding.

### Agent harus membaca:

```text
PRD.md
ROLE_PERMISSION.md
BUSINESS_RULES.md
ARCHITECTURE.md
DATABASE.md
SECURITY.md
DESIGN.md
API_SPECIFICATION.md
```

### Output

Buat internal implementation checklist berdasarkan dokumen.

### Acceptance Criteria

- [ ] Semua dokumen dibaca.
- [ ] Tidak ada asumsi financial rate baru.
- [ ] Tidak ada business rule baru.
- [ ] Tidak ada role baru tanpa specification.
- [ ] Tidak ada endpoint baru tanpa kebutuhan.

---

# 7. PHASE 1 — PROJECT FOUNDATION

## TASK-002 — Initialize Application `[x] DONE`

### Objective

Membuat project foundation.

### Agent harus

- setup framework sesuai `ARCHITECTURE.md`;
- setup package manager;
- setup TypeScript jika ditentukan architecture;
- setup linting;
- setup formatter;
- setup test runner;
- setup environment configuration.

### Acceptance Criteria

- [x] Development / Build → PASS
- [x] Lint → PASS (`next lint` - 0 errors/warnings)
- [x] Type check → PASS (`tsc --noEmit` - 0 errors)
- [x] Test runner → PASS (`vitest run` - 2/2 passed)

---

## TASK-003 — Environment Configuration `[x] DONE`

### Objective

Memisahkan configuration dari source code.

### Required categories

```text
DATABASE_URL
AUTH_SECRET
NODE_ENV
NEXT_PUBLIC_APP_URL
OPENROUTER_API_KEY jika digunakan
```

### Rules

- secret tidak boleh hard-coded;
- `.env` tidak boleh masuk git;
- `.env.example` tidak boleh berisi secret aktual.

### Acceptance Criteria

- [x] `.env` ignored (diatur di `.gitignore`).
- [x] `.env.example` tersedia dengan placeholder deskriptif dan tanpa secret aktual.
- [x] Application gagal dengan jelas jika required secret tidak tersedia (runtime Zod validation di `src/lib/env.ts`).
- [x] Secret tidak muncul di log (pesan error hanya menampilkan nama field & alasan validasi, nilai secret di-mask).

---

## TASK-004 — Base Layout `[x] DONE`

### Objective

Membuat shell aplikasi.

### Implement

```text
App Layout
Sidebar
Topbar
Main Content
Page Header
```

### Design

Ikuti `DESIGN.md`.

### Acceptance Criteria

- [x] Clean/minimal (desain fokus pada kejelasan data & profesional perbankan).
- [x] Responsive (desktop permanent sidebar, mobile slide-in drawer dengan backdrop).
- [x] Sidebar tersedia (`Sidebar` dengan navigasi terstruktur, grup menu, icon Lucide, status user).
- [x] Topbar tersedia (`Topbar` dengan toggle mobile, identitas BPR, role badge, profil user).
- [x] Tidak ada excessive colors (palet neutral slate dengan satu primary color indigo).
- [x] Tidak ada hard-coded financial data.

---

# 8. PHASE 2 — DATABASE FOUNDATION

## TASK-005 — Database Connection `[x] DONE`

### Objective

Membuat koneksi database.

### Agent harus

- configure ORM/database client (`PrismaClient` singleton di `src/lib/db.ts`);
- configure connection (PostgreSQL / Supabase via connection pooler + direct URL);
- create migration baseline (`prisma/schema.prisma` baseline model & sync);
- test connection (`checkDatabaseConnection()` helper, test suite `tests/db.test.ts`, CLI script `scripts/test-db-connection.ts`).

### Acceptance Criteria

- [x] Application dapat connect (terverifikasi terhubung ke Supabase PostgreSQL, ping latency ~2s).
- [x] Migration dapat dijalankan (`prisma db push` / `prisma generate` sinkron dengan PostgreSQL).
- [x] Migration baseline siap untuk skema inti (TASK-006).

---

## TASK-006 — Implement Core Schema `[x] DONE`

Implement entity sesuai `DATABASE.md`.

Minimal logical groups:

```text
Users
Roles
Permissions
RolePermissions

BPR
Branch
PaymentOffice

Products
CreditParameters
InsuranceRates
FeeParameters

Simulations
Calculations
CalculationResults
Amortization
EligibilityReasons

AuditLogs
```

### Rules

- foreign key jelas;
- index sesuai query pattern;
- financial value menggunakan safe numeric/decimal representation;
- timestamps tersedia;
- soft delete sesuai specification.

### Acceptance Criteria

- [x] Schema migration berhasil (`prisma db push` terverifikasi sinkron ke Supabase PostgreSQL).
- [x] FK valid (seluruh relasi 1:N dan M:N dihubungkan dengan foreign key constraint yang ketat).
- [x] Unique constraint valid (unique codes untuk role, permission, product per bpr, composite unique rates).
- [x] Index utama tersedia (index pada query patterns: role, bpr, branch, status, effective dating).
- [x] Financial columns aman (menggunakan `@db.Decimal` dengan presisi standar perbankan: nominal `Decimal(15, 2)`, rate `Decimal(6, 5)` & `Decimal(7, 6)`, DBR `Decimal(5, 4)`).

---

# 9. PHASE 3 — SEED & REFERENCE SOURCE

## TASK-007 — Reference Source Directory `[x] DONE`

### Objective

Memisahkan source resmi dari application code.

Struktur:

```text
reference_source/
├── README.md
├── original/
├── validated/
└── import/
```

File Excel resmi ditempatkan di sini sesuai workflow project.

### Acceptance Criteria

- [x] Struktur folder `reference_source/` (original, validated, import) tersedia.
- [x] `reference_source/README.md` mendokumentasikan tata kelola data referensi, prinsip immutability, dan larangan halusinasi nilai finansial.
- [x] File workbook resmi `KALKULATOR KREDIT.xlsx` tersimpan di `reference_source/original/`.
- [x] AI tidak mengarang nilai dari Excel.

---

## TASK-008 — Reference Data Import Pipeline `[x] DONE`

### Objective

Membuat pipeline:

```text
Excel
 ↓
Parse
 ↓
Validate
 ↓
Preview
 ↓
Approve
 ↓
Seed / Migration
 ↓
Database
```

### Acceptance Criteria

- [x] File structure divalidasi (sheet required: `Ref`, `Asuransi`, `Simulasi BPR`).
- [x] Duplicate ditolak (validasi composite key: kode BPR, kode produk, kombinasi usia-tenor tarif asuransi).
- [x] Missing value ditolak (validasi field required, relasi antar-entitas, dan pencegahan `NaN`).
- [x] Invalid rate ditolak (pengecekan range suku bunga tahunan/bulanan, rasio DBR, tarif premi asuransi `0 <= rate <= 1`).
- [x] Import dapat direproduksi (pipeline deterministik menghasilkan file JSON terstruktur di `reference_source/import/`).
- [x] Import memiliki audit/version context (`manifest.json` menyimpan SHA256 document hash, timestamp ekstraksi, versi pipeline, dan ringkasan statistik baris).

---

## TASK-009 — Seed Core Master Data `[x] DONE`

Seed hanya data yang sudah disetujui dari pipeline validasi.

```text
Roles (SUPER_ADMIN, ADMIN, MARKETING)
Permissions (40 Canonical Permissions)
Role-Permissions (86 Assignments)
BPR (BPR Kota Madiun, BPR Bhakti Sumekar)
Payment Office (29 Kantor Bayar Pos)
Product (Kredit Pensiun Platinum)
Credit Parameters (10.8% p.a., 90% DBR, 120 bln max, Rp200jt max)
Fee Parameters (Flagging Rp38.000, Verifikasi Rp1.500.000, Admin 0.5%, Provisi 0.5%)
Insurance Rates (300 Baris Matrix Usia 65-84 vs Tenor 1-15 thn)
BusinessRuleVersion (BR-1.0)
ParameterVersion (v1.0)
```

### Acceptance Criteria

- [x] Manifest verifikasi tervalidasi sebelum seeding (`manifest.json` APPROVED status & SHA256 checksum).
- [x] 40 permissions dan 3 roles ter-seed sesuai `ROLE_PERMISSION.md`.
- [x] 86 role-permission assignments terkonfigurasi.
- [x] BPR, produk, parameter kredit, dan fee ter-seed tanpa halusinasi/tanpa aproksimasi nilai.
- [x] 300 data tarif asuransi jiwa kredit ter-seed utuh dari master workbook BPR.
- [x] Seeder bersifat idempoten (menggunakan upsert / versioned updates, aman dijalankan berulang).

---

# 10. PHASE 4 — AUTHENTICATION

## TASK-010 — User Model & Password Hashing `[x] DONE`

### Implement

- User repository (`UserRepository` dengan DTO `SafeUser`);
- password hashing (`Argon2id` via `@node-rs/argon2` mengikuti standar OWASP);
- password verification & strength policy (min 8 karakter, kombinasi huruf & angka);
- status validation (`ACTIVE`, `INACTIVE`, `SUSPENDED`, soft-delete `deleted_at`).

### Acceptance Criteria

- [x] Plaintext password tidak disimpan (selalu di-hash dengan Argon2id sebelum disimpan ke database).
- [x] Hash tidak dikirim frontend (`toSafeUser` / `SafeUser` DTO mengisolasi dan menghapus `passwordHash`).
- [x] Inactive / suspended / soft-deleted user ditolak oleh `validateUserStatus`.

---

## TASK-011 — Login API `[x] DONE`

Implement:

```text
POST /api/v1/auth/login
```

Mengikuti `API_SPECIFICATION.md`.

### Acceptance Criteria

- [x] Valid login menghasilkan 200 OK dengan payload user sanitized dan HTTP-only session cookie (`credit_calculator_session`).
- [x] Wrong password menghasilkan 401 Unauthorized dengan generic error message (`INVALID_CREDENTIALS`).
- [x] Unknown user menghasilkan 401 Unauthorized dengan generic error message (`INVALID_CREDENTIALS`).
- [x] Inactive / suspended user menghasilkan 401 Unauthorized (`ACCOUNT_INACTIVE`).
- [x] Missing / invalid input body menghasilkan 400 Bad Request (`VALIDATION_ERROR`).
- [x] Audit log login tercatat di tabel `audit_logs`.

---

## TASK-012 — Session / Authentication Middleware `[x] DONE`

Implement:

```text
Authentication middleware (src/middleware.ts & authenticateRequest helper)
Current user context (GET /api/v1/auth/me)
Logout (POST /api/v1/auth/logout)
Session expiration & revocation (JWT 7d & active status check)
```

Endpoints:

```text
POST /api/v1/auth/logout
GET /api/v1/auth/me
```

### Acceptance Criteria

- [x] Unauthenticated protected request menghasilkan 401 Unauthorized (`UNAUTHORIZED`).
- [x] `GET /api/v1/auth/me` mengembalikan user context lengkap, live permissions list, dan data scope (`OWN`, `BRANCH`, `ALL`).
- [x] Mendukung autentikasi ganda: HTTP-only Cookie (`credit_calculator_session`) & `Authorization: Bearer <token>`.
- [x] `POST /api/v1/auth/logout` mengembalikan 204 No Content, mencatat audit log logout, dan menghapus session cookie (`maxAge: 0`).
- [x] Next.js Edge Middleware (`src/middleware.ts`) memproteksi endpoint `/api/v1/*` (kecuali public route `/api/v1/auth/login`).

---

# 11. PHASE 5 — RBAC & DATA SCOPE

## TASK-013 — Permission Model `[x] DONE`

Implement:

```text
Role (SUPER_ADMIN, ADMIN, MARKETING)
Permission (40 Canonical Permissions per ROLE_PERMISSION.md)
RolePermission (86 Matrix Assignments)
PermissionService (Evaluation helpers: hasPermission, hasAnyPermission, hasAllPermissions, isCanonicalPermission)
```

### Acceptance Criteria

- [x] Tepat 40 canonical permissions terdaftar dan terstruktur per module (AUTH, USER, ROLE, CREDIT, SIMULATION, MASTER, CREDIT_PARAM, REPORT, AUDIT).
- [x] 3 canonical roles (`SUPER_ADMIN`, `ADMIN`, `MARKETING`) terkonfigurasi dengan matriks hak akses resmi dari `ROLE_PERMISSION.md` §4.
- [x] `PermissionService` menyediakan fungsi evaluasi permission server-side (`hasPermission`, `hasAnyPermission`, `hasAllPermissions`) dengan bypass otoritas penuh bagi `SUPER_ADMIN`.
- [x] Tidak ada permission buatan atau tidak terdokumentasi yang ditambahkan (`isCanonicalPermission` memvalidasi integritas kode).

---

## TASK-014 — Authorization Middleware

Implement:

```text
requirePermission()
```

Pattern:

```text
Authenticate
 ↓
Check Permission
 ↓
Continue / 403
```

### Acceptance Criteria

- [x] Unauthorized endpoint = 403.
- [x] Frontend hiding tidak menjadi security mechanism.
- [x] Permission check dilakukan server-side.

---

## TASK-015 — Data Scope Middleware / Service

Implement scope:

```text
SUPER_ADMIN → ALL
ADMIN → BPR / BRANCH
MARKETING → OWN
```

### Acceptance Criteria

- [x] SUPER_ADMIN scope implemented (ALL records).
- [x] ADMIN scope implemented (BPR / BRANCH isolation).
- [x] MARKETING scope implemented (OWN records only).
- [x] Critical Test Passed: Marketing A accessing Marketing B simulation = DENY (403 Forbidden / IDOR prevention).
- [x] Cross-branch access denied for Branch Admins.
- [x] Server-side Prisma query where clause generators implemented.

---

## TASK-016 — User Management

Implement:

```text
GET    /users
POST   /users
GET    /users/:id
PATCH  /users/:id
DELETE /users/:id
```

Rules:

- [x] role assignment authorized;
- [x] scope assignment authorized;
- [x] soft delete (USER_DELETE for Super Admin, self-delete blocked);
- [x] audit sensitive action (USER_CREATE, USER_UPDATE, USER_ACTIVATE, USER_DEACTIVATE, USER_DELETE, etc.);
- [x] pagination and filters for user listing.

---

## TASK-017 — Role & Permission Management

Implement:

```text
GET /roles
POST /roles
PATCH /roles/:id
DELETE /roles/:id

GET /permissions
POST /roles/:roleId/permissions
```

### Acceptance Criteria

- [x] `GET /roles` implemented with permission counts and user counts (ROLE_VIEW).
- [x] `POST /roles` implemented with validation and duplicate prevention (ROLE_CREATE).
- [x] `PATCH /roles/:id` implemented (ROLE_UPDATE).
- [x] `DELETE /roles/:id` implemented (ROLE_DELETE, protected system roles).
- [x] `GET /permissions` implemented with module filter (PERMISSION_VIEW).
- [x] `POST /roles/:roleId/permissions` implemented (ROLE_PERMISSION_ASSIGN).
- [x] Strict privilege escalation protection enforced (Admin/Marketing rejected with 403 Forbidden).
- [x] System roles (`SUPER_ADMIN`, `ADMIN`, `MARKETING`) protected against deletion or deactivation.
- [x] Audit logs recorded for all role and permission mutations.

---

# 12. PHASE 6 — ORGANIZATION MASTER DATA

### Acceptance Criteria

- [x] `GET /api/v1/bprs` implemented with search, status filter, and data scope filtering (MASTER_VIEW).
- [x] `POST /api/v1/bprs` implemented with schema validation and unique code check (MASTER_CREATE, Super Admin only).
- [x] `GET /api/v1/bprs/:id` implemented with scope checks (MASTER_VIEW).
- [x] `PATCH /api/v1/bprs/:id` implemented with scope boundary validation (MASTER_UPDATE).
- [x] `DELETE /api/v1/bprs/:id` implemented with soft delete (MASTER_DELETE, Super Admin only).
- [x] Structured audit logging for BPR creations, updates, and deletions (`BPR_CREATE`, `BPR_UPDATE`, `BPR_DELETE`).
- [x] Marketing users rejected with 403 Forbidden on all BPR operations.

---

## TASK-019 — Branch Management

Implement Branch CRUD.

Relationship:

```text
BPR
 ↓
Branch
```

### Acceptance Criteria

- [x] `GET /api/v1/branches` implemented with `bprId`, `search`, `status`, pagination, and scope filtering (MASTER_VIEW).
- [x] `POST /api/v1/branches` implemented with schema validation and unique code check per BPR (MASTER_CREATE).
- [x] `GET /api/v1/branches/:id` implemented with scope checks (MASTER_VIEW).
- [x] `PATCH /api/v1/branches/:id` implemented with scope boundary validation (MASTER_UPDATE).
- [x] `DELETE /api/v1/branches/:id` implemented with soft delete (MASTER_DELETE).
- [x] Admin can only view and manage branches in their assigned BPR.
- [x] Structured audit logging for branch creations, updates, and deletions (`BRANCH_CREATE`, `BRANCH_UPDATE`, `BRANCH_DELETE`).
- [x] Marketing users rejected with 403 Forbidden on all branch operations.

---

## TASK-020 — Payment Office Management

Implement:

```text
BPR
 ↓
Branch
 ↓
Payment Office
```

### Acceptance Criteria

- [x] `GET /api/v1/payment-offices` implemented with `bprId`, `branchId`, `type`, `status`, `search`, pagination, and scope filtering (MASTER_VIEW).
- [x] `POST /api/v1/payment-offices` implemented with hierarchical relationship validation (`BPR → Branch → Payment Office`) (MASTER_CREATE).
- [x] `GET /api/v1/payment-offices/:id` implemented with relations and scope validation (MASTER_VIEW).
- [x] `PATCH /api/v1/payment-offices/:id` implemented with affiliation validation when moving branches (MASTER_UPDATE).
- [x] `DELETE /api/v1/payment-offices/:id` implemented with soft delete (MASTER_DELETE).
- [x] Strict backend validation preventing assignment of branches to unaffiliated BPRs.
- [x] Structured audit logging for payment office creations, updates, and deletions (`PAYMENT_OFFICE_CREATE`, `PAYMENT_OFFICE_UPDATE`, `PAYMENT_OFFICE_DELETE`).
- [x] Marketing users rejected with 403 Forbidden on all payment office operations.

---

# 13. PHASE 7 — CREDIT MASTER DATA

## TASK-021 — Product Management

Implement:

```text
GET /products
GET /products/:id
POST /products
PATCH /products/:id
```

### Rules

Product harus dapat menjadi parent/reference bagi:

```text
Credit Parameters
Insurance
Fee
Calculation
```

### Acceptance Criteria

- [x] `GET /api/v1/products` implemented with `bprId`, `status`, `search`, and data scope filtering (MASTER_VIEW).
- [x] `POST /api/v1/products` implemented with unique code per BPR and relation creation (MASTER_CREATE).
- [x] `GET /api/v1/products/:id` implemented with child relation counts (creditParameters, feeParameters, insuranceRates, simulations, calculations) (MASTER_VIEW).
- [x] `PATCH /api/v1/products/:id` implemented with lifecycle status and name/description updates (MASTER_UPDATE).
- [x] `DELETE /api/v1/products/:id` implemented with soft delete (MASTER_DELETE).
- [x] Admin can only view and manage products in their assigned BPR.
- [x] Structured audit logging for product creations, updates, and deletions (`PRODUCT_CREATE`, `PRODUCT_UPDATE`, `PRODUCT_DELETE`).
- [x] Marketing users rejected with 403 Forbidden on all product operations.

---

## TASK-022 — Credit Parameter Versioning

Implement:

```text
GET active parameters
POST new parameter version
```

Parameter mengikuti `BUSINESS_RULES.md`.

Contoh:

```text
maximumDbr
flatAnnualRate
maximumTenorMonths
maximumPrincipal
rounding
```

### Critical

Jangan overwrite historical parameter.

### Acceptance Criteria

- [x] `GET /api/v1/products/:id/credit-parameters` implemented to retrieve the currently active parameters (CREDIT_PARAMETER_VIEW).
- [x] `GET /api/v1/products/:id/credit-parameters/versions` implemented to list all active and historical versions (CREDIT_PARAMETER_VIEW).
- [x] `POST /api/v1/products/:id/credit-parameters/versions` implemented with transactional version lifecycle (CREDIT_PARAMETER_CREATE).
- [x] Strict non-overwriting rule: previous active parameter is deactivated with `effectiveTo` stamped and never mutated.
- [x] Parameter version metadata registered in `parameter_versions` table for traceability.
- [x] Admin data scoping: Admin can only view and manage parameter versions for products in their assigned BPR.
- [x] Structured audit logging for credit parameter version creation (`CREDIT_PARAMETER_CREATE`) capturing previous and new snapshots.
- [x] Marketing users rejected with 403 Forbidden on all credit parameter operations.

---

## TASK-023 — Fee Parameter Management

Implement fee versioning.

Flow:

```text
Current Version
 ↓
Create New Version
 ↓
Validate
 ↓
Audit
 ↓
Activate
```

### Acceptance Criteria

- [x] `GET /api/v1/products/:id/fee-parameters` implemented with optional `paymentOfficeId` and product fallback (CREDIT_PARAMETER_VIEW).
- [x] `GET /api/v1/products/:id/fee-parameters/versions` implemented to list all active and historical fee versions (CREDIT_PARAMETER_VIEW).
- [x] `POST /api/v1/products/:id/fee-parameters/versions` implemented with transactional version lifecycle (CREDIT_PARAMETER_CREATE).
- [x] Strict non-overwriting rule: previous active fee parameter deactivated with `effectiveTo` timestamp preserved.
- [x] Hierarchical validation: payment office override must belong to the product's BPR.
- [x] Fee components separated (adminRate, provisionRate, verificationFee, flaggingFee, frontingRate, reserveRate) without hard-coding in engine.
- [x] Structured audit logging for fee parameter creation (`FEE_PARAMETER_CREATE`) capturing previous and new snapshots.
- [x] Admin data scoping enforced and Marketing rejected with 403 Forbidden.

---

## TASK-024 — Insurance Rate Management

Implement:

```text
List
Lookup
Import
Version
Activation
Audit
```

### Critical Rule

Insurance data berasal dari:

```text
reference_source
```

bukan AI estimation.

### Acceptance Criteria

- [x] `GET /api/v1/products/:id/insurance-rates` implemented with pagination and `age`/`tenorYears` filter (MASTER_VIEW).
- [x] `GET /api/v1/products/:id/insurance-rates/lookup` implemented with strict exact and dual lookup (Current Age vs Next Age MAX rule) (MASTER_VIEW).
- [x] Strict rule enforced: missing insurance rates return 404 NOT_FOUND error (no AI guessing or estimation).
- [x] `POST /api/v1/products/:id/insurance-rates/import` implemented with versioned batch import and non-overwriting historical preservation (MASTER_UPDATE).
- [x] Validation against duplicate (age, tenor) pairs and out-of-bound values in import payload.
- [x] Structured audit logging for insurance rate import (`INSURANCE_RATE_IMPORT`).
- [x] Admin data scoping: Admin restricted to own BPR and Marketing rejected with 403 Forbidden.

---

# 14. PHASE 8 — CALCULATION DOMAIN

## TASK-025 — Calculation Domain Model

Buat domain object/value object untuk:

```text
Money
Percentage
Tenor
Interest Rate
Installment
Insurance Premium
Fee
Eligibility
```

Tujuannya mencegah percampuran unit/value.

### Acceptance Criteria

- [x] `Money` Value Object implemented with high precision decimal math, rounding, increments, and IDR formatting.
- [x] `Percentage` Value Object implemented with decimal, percent, basis points, arithmetic, and application to Money.
- [x] `Tenor` Value Object implemented with months, years, and insurance lookup ceiling rule (`CEILING(months / 12)`).
- [x] `InterestRate` Value Object implemented with unified 10.8% annual rate, 0.9% monthly rate, flat interest, and PMT formula.
- [x] `Installment` Domain Object implemented with FLAT and ANNUITY breakdowns and upfront deduction logic.
- [x] `InsurancePremium` Domain Object implemented with base premium, fronting fee, reserve charge, and combined rate.
- [x] `Fee` Domain Object implemented with admin fee, provision fee, verification fee, flagging fee, total fees, and net disbursement formula.
- [x] `Eligibility` Domain Object implemented with multi-rule failure aggregation (DBR, Age at maturity < 85y, Tenor, Principal, Net disbursement).
- [x] Unit test suite covering all 8 domain models/value objects (16/16 tests passing).

---

## TASK-026 — Calculation Input Validator

Validasi:

```text
Product
Payment Office
Birth Date
Net Salary
Other Income
Requested Principal
Tenor
Calculation Method
```

Allowed:

```text
FLAT
ANNUITY
```

### Acceptance Criteria

- [x] Backend calculation input validation schema implemented with Zod and deep business rule checks.
- [x] Product validation (verifying active product exists and active `CreditParameter` and `FeeParameter` are present).
- [x] Hierarchical relationship validation (payment office must belong to the product's BPR).
- [x] Debtor age validation (minimum 18 years, strictly before 85 years boundary, past birth date check).
- [x] Financial input validation (netSalary > 0, otherIncome >= 0, requestedPrincipal > 0, tenorMonths 1-360, method `FLAT` or `ANNUITY`).
- [x] `calculateAgeBreakdown` helper implemented for exact calendar year, month, and day calculations.
- [x] Input transformation to strongly-typed domain objects (`Money`, `Tenor`, `InterestRate`, `CalculationMethod`).
- [x] Unit test suite covering valid flows and boundary/error conditions (9/9 tests passing).

---

## TASK-027 — Flat Calculation Strategy

Implement:

```text
FlatCalculationStrategy
```

Formula wajib mengikuti `BUSINESS_RULES.md`.

Jangan menulis formula baru berdasarkan asumsi agent.

### Acceptance Criteria

- [x] `FlatCalculationStrategy` implemented adhering strictly to `BUSINESS_RULES.md` Sections 9, 10, 12, 16, 18, 19.
- [x] Unified 10.8% annual margin rate / 0.9% flat monthly margin rate.
- [x] Installment calculation: `Angsuran Pokok = Plafon / Tenor`, `Angsuran Margin = Plafon * Margin Bulanan`, `Angsuran Bulanan = Pokok + Margin`.
- [x] Capacity calculation: `Plafon Maksimum Kemampuan = (Maksimal Angsuran * Tenor) / (1 + (Margin Flat Bulanan * Tenor))`.
- [x] Downward floor rounding to nearest Rp 100.000 increment (`FLOOR(capacity, 100.000)`).
- [x] Final maximum principal: `MIN(Plafon Kemampuan Dibulatkan, Batas Plafon Produk)`.
- [x] DBR & validation flags (`isDbrValid: dbr <= maxDbr`, `isPrincipalValid: principal <= maxPrincipalFinal`).
- [x] Unit test suite covering normal principal/tenor, boundary tenor (1m, 120m), boundary principal, rounding, high DBR, and zero/invalid edge cases (8/8 tests passing).

---

## TASK-028 — Annuity / PMT Calculation Strategy

Implement:

```text
AnnuityCalculationStrategy
```

Menggunakan formula PMT/anuitas sesuai `BUSINESS_RULES.md`.

Rate yang digunakan adalah **rate tahunan yang sama dengan metode FLAT** (10,8% / 12 = 0,9% per bulan), tanpa konversi effective rate terpisah.

### Acceptance Criteria

- [x] `AnnuityCalculationStrategy` implemented adhering strictly to `BUSINESS_RULES.md` Sections 13, 14, 17, 18, 19.
- [x] Unified 10.8% annual margin rate / 0.9% flat monthly margin rate without separate effective conversion.
- [x] Monthly installment formula: PMT with $P$, $r=0.009$, $n=\text{tenorMonths}$.
- [x] Initial breakdown: interest portion ($P \times 0.009$) and principal portion ($\text{PMT} - \text{interestPortion}$).
- [x] Capacity calculation: Present Value $PV = \text{Payment} \times \frac{1 - (1+r)^{-n}}{r}$ where $\text{Payment} = \text{Gaji Bersih} \times \text{DBR Maksimum}$.
- [x] Downward floor rounding to nearest Rp 100.000 increment (`FLOOR(capacity, 100.000)`).
- [x] Final maximum principal: `MIN(Plafon Kemampuan Dibulatkan, Batas Plafon Produk)`.
- [x] DBR & validation flags (`isDbrValid: dbr <= maxDbr`, `isPrincipalValid: principal <= maxPrincipalFinal`).
- [x] Unit test suite covering normal inputs, mathematical PMT-PV consistency, FLAT vs ANNUITY comparative behavior, boundary values (1m, 120m, 200M), rounding increments, and zero/invalid edge cases (9/9 tests passing).

---

## TASK-029 — Insurance Calculation Service

Implement:

```text
InsuranceCalculationService
```

Flow:

```text
Age
+
Tenor
+
Product
 ↓
Insurance Rate Lookup
 ↓
Premium Calculation
```

### Critical

Rate harus berasal dari approved insurance master.

Tidak boleh:

```text
if rate not found:
    estimate rate
```

Jika rate tidak ditemukan:

```text
Calculation Error / Business Validation Error
```

### Acceptance Criteria

- [x] `InsuranceCalculationService` implemented adhering strictly to `BUSINESS_RULES.md` Sections 23-30.
- [x] Tenor lookup in years using ceiling rule: `tenorYears = CEILING(tenorMonths / 12)`.
- [x] Dual lookup: evaluates both `currentAge` and `nextAge` (`currentAge + 1`) and selects `MAX(rate1, rate2)` per Section 25.
- [x] Full breakdown calculation: Base Premium (`principal * selectedRate`), Fronting Fee (`principal * frontingRate`), Reserve Charge (`principal * reserveRate`), Combined Rate, and Total Insurance Charge.
- [x] Critical Rule strictly enforced: missing rate throws `MissingInsuranceRateError` (never estimates or guesses rates).
- [x] Unit and integration tests covering standard calculations, ceiling rules, dual lookup, and missing rate errors (5/5 tests passing).

---

## TASK-030 — Fee Calculation Service

Implement fee calculation berdasarkan `BUSINESS_RULES.md`.

Fee harus berasal dari active parameter:
- `flaggingFee` = Rp38.000 (default, disimpan di database, dikurangkan 1x pada Terima Bersih terpisah dari `totalFees`)
- `verificationFee` = Rp1.500.000
- `adminFee` = dari rule/parameter produk
- `provisionFee` = dari rule/parameter produk

### Acceptance Criteria

- [x] `FeeCalculationService` implemented adhering strictly to `BUSINESS_RULES.md` Sections 31-37.
- [x] Fee components separated (admin fee, provision fee, verification fee, flagging fee, installment deductions, other fee, settlement payoff).
- [x] `Total Biaya` formula implemented: `adminFee + provisionFee + insuranceCharge + verificationFee + installmentDeduction + otherFee` (strictly excludes flagging fee and settlement payoff to prevent double deduction).
- [x] `Terima Bersih` (Net Disbursement) formula implemented: `principal - totalDeductions` where `totalDeductions = totalFees + flaggingFee + settlementPayoff + otherDeductions`.
- [x] Payment office fee parameter override support with automatic fallback to default BPR product fee parameter.
- [x] Unit and integration tests covering standard calculations, payoff deductions, payment office fallback, and error handling (4/4 tests passing).

---

## TASK-031 — DBR Calculation

Implement DBR sesuai business rule.

Pastikan:

```text
DBR = Installment / Monthly Income
```

atau formula final yang tertulis pada `BUSINESS_RULES.md`.

Jangan mengubah formula.

### Acceptance Criteria

- [x] `DbrService` implemented strictly following `BUSINESS_RULES.md` Sections 9 & 10.
- [x] Ratio formula: $\text{DBR} = \text{Angsuran Bulanan} / \text{Gaji Bersih}$.
- [x] Maximum installment formula: $\text{Maksimal Angsuran} = \text{Gaji Bersih} \times \text{DBR Maksimum}$ (default 90%).
- [x] Remaining salary formula: $\text{Sisa Gaji} = \text{Gaji Bersih} - \text{Angsuran Bulanan}$.
- [x] High-precision internal Decimal boundary check: $\text{DBR} \le 90\% \rightarrow \text{OK}$, $\text{DBR} > 90\% \rightarrow \text{OVER}$ without premature display rounding.
- [x] Edge cases handled: zero/negative salary and negative remaining salary.
- [x] Unit test suite covering standard ratios, 90% exact boundary, internal decimal precision, negative remaining salary, and zero salary handlers (6/6 tests passing).

---

## TASK-032 — Eligibility Engine

Implement:

```text
EligibilityService
```

Output minimal:

```text
OK
OVER
```

dan reasons.

Contoh:

```text
DBR exceeds maximum
Tenor exceeds maximum
Principal exceeds maximum
```

### Acceptance Criteria

- [x] `EligibilityService` implemented adhering strictly to `BUSINESS_RULES.md` Sections 38-41.
- [x] Status decision logic: `OK` if all criteria pass, `OVER` if any rule fails.
- [x] Comprehensive multi-rule checking: DBR ($\le 90\%$), Age at maturity ($< 85$ years / $\le 84$y 11m), Tenor ($\le \text{final max tenor}$), Principal ($\le \text{final max principal}$), and Net Disbursement ($> 0$).
- [x] Multi-reason aggregation per Section 40: collects all failure reasons without premature early return.
- [x] Exact boundary testing: 90.00% DBR $\rightarrow$ OK, 120m tenor $\rightarrow$ OK, 200M principal $\rightarrow$ OK.
- [x] Unit test suite covering all single-rule failures, multiple simultaneous violations, and exact boundary cases (8/8 tests passing).

---

## TASK-033 — Maximum Principal Calculation

Implement calculation maximum principal berdasarkan business rule.

### Critical

Jangan membuat formula sendiri.

### Acceptance Criteria

- [x] `MaximumPrincipalService` implemented strictly following `BUSINESS_RULES.md` Sections 8, 16, 17, 18, 19.
- [x] Method-specific capacity formulas (FLAT installment capacity vs ANNUITY Present Value $PV$ capacity).
- [x] Age-limited maximum tenor evaluation (debitor tenure capped at remaining months until 84 years 11 months).
- [x] Floor rounding to nearest Rp 100.000 increment (`FLOOR(capacity, 100000)`).
- [x] Final maximum principal capped at product limit (`MIN(roundedCapacity, maxProductPrincipal)`).
- [x] Requested principal validation check against final maximum principal.
- [x] Unit test suite covering FLAT capacity, ANNUITY capacity, age constraint effects, and boundary checks (5/5 tests passing).

---

## TASK-034 — Amortization Engine

Implement schedule untuk:

```text
FLAT
ANNUITY
```

Output:

```text
Period
Opening Balance
Principal
Interest/Margin
Installment
Closing Balance
```

### Acceptance Criteria

- [x] `AmortizationEngine` implemented supporting both `FLAT` and `ANNUITY` methods.
- [x] Complete breakdown generated for every period: `period`, `paymentDate`, `openingBalance`, `principalPortion`, `interestPortion`, `installment`, `closingBalance`.
- [x] Accurate final period balance reconciliation guaranteeing `closingBalance === 0` at period $n$.
- [x] Schedule summary providing aggregated totals: `totalPrincipalPaid`, `totalInterestPaid`, `totalInstallmentsPaid`.
- [x] Unit test suite covering first, middle, and final period breakdowns, 120-month long schedules, boundary 1-month tenor, and edge cases (5/5 tests passing).

---

# 15. PHASE 9 — CALCULATION API

## TASK-035 — POST /calculations

Implement:

```text
POST /api/v1/calculations
```

Flow:

```text
Auth
 ↓
Permission
 ↓
Scope
 ↓
Validate
 ↓
Load Product
 ↓
Load Parameter Version
 ↓
Load Insurance
 ↓
Load Fee
 ↓
Calculation Engine
 ↓
Eligibility
 ↓
Response
```

### Acceptance Criteria

- [x] Implemented route handler `POST /api/v1/calculations` with authentication & RBAC permission `CREDIT_CALCULATE`.
- [x] Enforced tenant scoping (non-Super Admin restricted to products in their own BPR).
- [x] Validated input with `CalculationInputValidator` and executed orchestration flow via `CreditCalculationOrchestrator`.
- [x] Persisted calculation audit record to database `Calculation` table.
- [x] Integration tests created in `tests/calculations-api.test.ts` (7/7 tests passing).

---

## TASK-036 — Calculation Response Contract

Response harus mengikuti `API_SPECIFICATION.md`.

Jangan mengubah request/response secara diam-diam.

Jika contract perlu berubah:

```text
Update API_SPECIFICATION.md
 ↓
Review
 ↓
Implementation
```

### Acceptance Criteria

- [x] Verified response structure conforming strictly to `API_SPECIFICATION.md` Section 23 (root properties, `input`, `result`, `insurance`, `fees`, `versions`, `breakdown`, `schedule`).
- [x] Handled error responses conforming strictly to Section 25 (422 `CALCULATION_VALIDATION_ERROR`, 403 Forbidden, 401 Unauthorized).
- [x] Created dedicated contract test suite `tests/calculation-response-contract.test.ts` (3/3 tests passing).

---

# 16. PHASE 10 — SIMULATION

## TASK-037 — Create Simulation

Implement:

```text
POST /api/v1/simulations
```

Transaction:

```text
Simulation
+
Calculation Result
+
Amortization
+
Audit
```

Jika critical operation gagal:

```text
ROLLBACK
```

### Acceptance Criteria

- [x] Implemented route handler `POST /api/v1/simulations` with permission `SIMULATION_CREATE` and tenant scoping.
- [x] Implemented `SimulationRepository.createWithDetails` executing atomic database transaction `db.$transaction` covering `Simulation`, `CalculationResult`, `AmortizationSchedule` (all periods), `EligibilityReason`, and `AuditLog`.
- [x] Guaranteed rollback if any critical write fails.
- [x] Created comprehensive integration & transaction tests in `tests/create-simulation-api.test.ts` (7/7 tests passing).

---

## TASK-038 — Simulation List

Implement:

```text
GET /api/v1/simulations
```

Features:

```text
Search
Filter
Pagination
Status
Product
Date
```

Scope wajib diterapkan.

### Acceptance Criteria

- [x] Implemented route handler `GET /api/v1/simulations` with permission `SIMULATION_VIEW`.
- [x] Implemented server-side data scoping (`MARKETING`: own simulations only, `ADMIN`: BPR scope, `SUPER_ADMIN`: all).
- [x] Implemented search (`simulationNumber`, `customerName`, `customerNip`), filter (`status`, `productId`, `createdFrom`, `createdTo`), and pagination (`page`, `pageSize`, `total`, `totalPages`).
- [x] Created comprehensive test suite in `tests/list-simulations-api.test.ts` (9/9 tests passing).

---

## TASK-039 — Simulation Detail

Implement:

```text
GET /api/v1/simulations/:id
```

Harus menampilkan:

```text
Input
Result
Eligibility
Insurance
Fees
Versions
Amortization
```

### Acceptance Criteria

- [x] Implemented route handler `GET /api/v1/simulations/:id` with permission `SIMULATION_VIEW`.
- [x] Enforced ownership & BPR scoping checks before returning simulation details (returning 403 for unauthorized access).
- [x] Returned complete detailed payload: `input`, `result`, `breakdown`, `insurance`, `fees`, `versions`, and `schedule`.
- [x] Created comprehensive detail test suite in `tests/simulation-detail-api.test.ts` (9/9 tests passing).

---

## TASK-040 — Simulation Archive/Delete

Implement lifecycle sesuai `DATABASE.md` dan API specification.

Default:

```text
Soft Delete
```

### Acceptance Criteria

- [x] Implemented `DELETE /api/v1/simulations/:id` for soft deleting (`deletedAt = now()`, `status = ARCHIVED`) with audit log and permission `SIMULATION_DELETE`.
- [x] Implemented `POST /api/v1/simulations/:id/archive` for explicit archiving lifecycle with audit log.
- [x] Enforced ownership and multi-tenant scoping for deletion/archival.
- [x] Created comprehensive test suite in `tests/simulation-delete-archive-api.test.ts` (7/7 tests passing).

---

# 17. PHASE 11 — FRONTEND AUTH & RBAC

## TASK-041 — Login Page

Design:

```text
Clean
Minimal
Professional
```

Implement:

```text
Username
Password
Login
Loading
Error
```

### Acceptance Criteria

- [x] Implemented clean, minimal, and professional Login UI (`src/app/login/page.tsx`) adhering to `DESIGN.md`.
- [x] Provided username and password inputs, form validation, loading spinner state, and error/success alerts.
- [x] Integrated seamlessly with backend authentication API `POST /api/v1/auth/login`.
- [x] Handled redirect after successful login to default `/` or `callbackUrl` search parameter.
- [x] Integrated functional logout in `Topbar` with `POST /api/v1/auth/logout`.
- [x] Created unit & component test suite in `tests/login-page.test.tsx` (4/4 tests passing).

---

## TASK-042 — Protected Routes

Implement route protection:

```text
Unauthenticated
→ Login

Authenticated
→ Application
```

### Acceptance Criteria

- [x] Implemented route protection middleware (`src/middleware.ts`) handling all frontend and API routes.
- [x] Redirected unauthenticated users attempting to access protected frontend pages to `/login` with full `callbackUrl` search parameter.
- [x] Redirected already authenticated users attempting to access `/login` back to the application (`/` or target callback URL).
- [x] Blocked unauthenticated requests to protected API routes (`/api/v1/*`) with standard 401 Unauthorized JSON format.
- [x] Maintained the strict security boundary on backend endpoints where authorization and data scopes remain authoritative.
- [x] Created comprehensive integration test suite in `tests/protected-routes.test.ts` (10/10 tests passing).

---

## TASK-043 — Permission-aware Navigation

Sidebar berdasarkan permission.

Contoh:

```text
Marketing
→ Dashboard
→ Kalkulator
→ Simulasi

Admin
→ Dashboard
→ User
→ Product
→ Parameter
→ Insurance
→ Fee
→ Audit
```

Frontend hanya UX layer.

### Acceptance Criteria

- [x] Implemented dynamic, permission-aware navigation filtering (`getNavigationForUser` & `Sidebar`) adhering to `DESIGN.md` and `ROLE_PERMISSION.md`.
- [x] Annotated navigation items with `requiredPermission` / `requiredPermissions` mapping (Calculator, Simulations, Products, Parameters, Insurance, Fees, Organization, User Management, Audit Trail).
- [x] Filtered out unauthorized menu items and omitted empty section headers dynamically based on live user permissions.
- [x] Created `AuthProvider` and `useAuth()` React Context to distribute authenticated user profile, live permissions, and role across UI components.
- [x] Preserved the architecture rule that hiding frontend navigation is purely a UX optimization while backend APIs remain the authoritative security boundary.
- [x] Created component and unit test suite in `tests/permission-aware-navigation.test.tsx` (5/5 tests passing).

---

# 18. PHASE 12 — CALCULATOR UI

## TASK-044 — Calculator Form

Implement field:

```text
Nama / applicant data jika required
Tanggal Lahir
Gaji Bersih
Penghasilan Lain
Product
Payment Office
Plafon
Tenor
Metode Perhitungan
```

Method:

```text
FLAT
ANNUITY
```

### Acceptance Criteria

- [x] Implemented comprehensive Calculator Form UI (`src/components/calculator/calculator-form.tsx`) and Calculator Page (`src/app/calculator/page.tsx`) adhering to `DESIGN.md`.
- [x] Provided structured fields: Customer Name, NIP, Birth Date, Net Salary, Other Income, Other Deductions, Product dropdown, Payment Office dropdown, Requested Principal, Tenor Months (with shortcut buttons), Calculation Method (Flat / Annuity toggle), Settlement Payoff, and Other Fees.
- [x] Dynamic dropdown fetching for active products and payment offices scoped to user BPR.
- [x] Client-side form validations for positive amounts, mandatory birth dates, products, and tenors.
- [x] Connected to authoritative backend calculation API `POST /api/v1/calculations` with instant KPI feedback and eligibility status display.
- [x] Created unit & component test suite in `tests/calculator-form.test.tsx` (5/5 tests passing).

---

## TASK-045 — Currency & Percentage Components

Implement reusable:

```text
CurrencyInput
PercentageInput
NumberInput
```

Rules:

```text
Display → formatted
Internal → numeric/decimal
```

### Acceptance Criteria

- [x] Implemented reusable financial input components (`CurrencyInput`, `PercentageInput`, `NumberInput`) in `src/components/ui/`.
- [x] Separated presentation layer formatting (e.g. `Rp 100.000.000`, `12,5%`) from internal numeric/decimal states (`100000000`, `0.125`) adhering strictly to `DESIGN.md` §10.
- [x] Provided helper formatting and parsing utilities (`formatCurrencyValue`, `parseCurrencyValue`, `formatPercentageValue`, `parsePercentageValue`).
- [x] Supported accessibility features, prefixes (`Rp`), suffixes (`%`, `Bulan`), inline error states, and helper texts.
- [x] Integrated `CurrencyInput` and `NumberInput` cleanly into `CalculatorForm`.
- [x] Created unit & component test suite in `tests/currency-percentage-components.test.tsx` (7/7 tests passing).

---

## TASK-046 — Calculator Validation UX

Display:

```text
Required
Invalid format
Out of range
Business validation
```

Error harus dekat dengan field terkait.

### Acceptance Criteria

- [x] Implemented rich, contextual inline field-level validations (required, invalid format, out-of-range, and business rules) directly under each affected input container.
- [x] Enforced applicant age constraints (minimum 20 years, maximum before 85 years) with dynamic age calculation and real-time badge feedback (`Usia: X thn Y bln`).
- [x] Enforced principal range constraints (minimum Rp 1.000.000, positive values, maximum Rp 1.000.000.000) and tenor bounds (1 to 360 months).
- [x] Displayed clear error icons, red border states, and descriptive error copy close to each field (avoiding relying solely on detached global toasts).
- [x] Preserved user interaction responsiveness with live validation feedback on blur and submit.
- [x] Created unit & component test suite in `tests/calculator-validation-ux.test.tsx` (4/4 tests passing).

---

## TASK-047 — Calculate Action

Flow:

```text
Click Hitung
 ↓
Validate
 ↓
POST /calculations
 ↓
Loading
 ↓
Result
```

Disable button selama request.

### Acceptance Criteria

- [x] Implemented complete calculation execution flow: `validate form -> POST /api/v1/calculations -> loading state -> render calculation results`.
- [x] Disabled submit button and displayed active loading spinner and status text during in-flight network request.
- [x] Handled error responses in full accordance with the API error contract (`400`, `404`, `422`, `500`), displaying clear contextual alert banner while resetting stale results.
- [x] Integrated seamlessly with backend calculations engine and database parameters.
- [x] Created end-to-end component test suite in `tests/calculate-action.test.tsx` (3/3 tests passing).

---

# 19. PHASE 13 — RESULT UI

## TASK-048 — Result Summary

Display:

```text
Eligibility
Maximum Principal
Monthly Installment
DBR
```

Primary result harus mudah dipindai.

### Acceptance Criteria

- [x] Implemented dedicated `ResultSummary` component (`src/components/calculator/result-summary.tsx`) adhering strictly to `DESIGN.md` §13 & §14.
- [x] Displayed clear primary KPI cards for Maximum Principal, Monthly Installment, Debt Burden Ratio (DBR), and Net Disbursement.
- [x] Implemented explicit status badges and text indicators for `ELIGIBLE` and `NOT ELIGIBLE (OVER)` with semantic color highlights without relying solely on color.
- [x] Displayed bulleted failure reasons when calculation status is `OVER`.
- [x] Included "Simpan Sebagai Simulasi" action button calling `POST /api/v1/simulations` with persistent feedback.
- [x] Created unit & component test suite in `tests/result-summary.test.tsx` (3/3 tests passing).

---

## TASK-049 — Result Detail

Sections:

```text
Ringkasan
Kelayakan
Angsuran
Insurance
Fees
Net Disbursement
```

### Acceptance Criteria

- [x] Implemented comprehensive `ResultDetail` component (`src/components/calculator/result-detail.tsx`) with accessible tabbed sections according to `DESIGN.md` §15.
- [x] Implemented **Ringkasan** section showing applicant biodata, financial inputs, and facility parameters.
- [x] Implemented **Kelayakan** section showing DBR evaluation vs 90% threshold, age at maturity vs max limit, and maximum borrowing capacity.
- [x] Implemented **Angsuran** section showing interest/margin structure, principal monthly, margin monthly, and total repayment.
- [x] Implemented **Insurance** section showing life insurance premium, fronting fee, reserve fund, and total insurance charges.
- [x] Implemented **Rincian Biaya** section showing itemized admin, provision, verification, flagging, hold installment, settlement payoff, other fee, and total deductions.
- [x] Implemented **Terima Bersih** section showing net loan disbursement computation, displaying `-` if calculation status is `OVER` without altering raw calculation data.
- [x] Created unit & component test suite in `tests/result-detail.test.tsx` (7/7 tests passing).

---

## TASK-050 — Amortization UI

Table:

```text
Period
Opening Balance
Principal
Interest/Margin
Installment
Closing Balance
```

### Acceptance Criteria

- [x] Implemented modular and responsive `AmortizationTable` component (`src/components/calculator/amortization-table.tsx`) adhering to `DESIGN.md` §16.
- [x] Included all required table columns: `Bln (Period)`, `Pokok Awal`, `Angsuran Pokok`, `Margin / Bunga`, `Total Angsuran`, and `Pokok Akhir`.
- [x] Enforced strict numeric right-alignment (`text-right font-mono tabular-nums`) for monetary values and centered alignment for period index.
- [x] Implemented sticky table headers on vertical scroll and responsive horizontal scroll support.
- [x] Added summary footer computing total principal paid, total margin/interest, and total installment repayments.
- [x] Implemented client-side pagination (default 12 months/page) with quick page-size selector (12, 24, 60, All) and CSV export action.
- [x] Created unit & component test suite in `tests/amortization-ui.test.tsx` (6/6 tests passing).

---

## TASK-051 — Save Simulation

Button:

```text
Simpan Simulasi
```

Flow:

```text
Result
 ↓
Save
 ↓
POST /simulations
 ↓
Success
 ↓
Simulation Detail
```

### Acceptance Criteria

- [x] Implemented seamless Save Simulation action from calculation results to backend `POST /api/v1/simulations`.
- [x] Prevented duplicate submissions during in-flight network requests with active loading spinner and disabled button states.
- [x] On successful creation (201 Created), provided immediate visual feedback (success banner) displaying generated `simulationNumber` and direct link to open the saved simulation detail (`/simulations/[id]`).
- [x] Locked the save button to `Tersimpan ✓` status to prevent accidental duplicate saves of identical results.
- [x] Handled permission / validation errors gracefully according to the API error contract.
- [x] Created unit & integration test suite in `tests/save-simulation-flow.test.tsx` (2/2 tests passing).

---

# 20. PHASE 14 — SIMULATION UI

## TASK-052 — Simulation List Page

Implement:

```text
Search
Filter
Pagination
Status badge
Date
Product
```

---

## TASK-053 — Simulation Detail Page

Display:

```text
Simulation Number
Created By
Created At
Input
Result
Parameter Version
Business Rule Version
Amortization
```

---

# 21. PHASE 15 — ADMIN UI

## TASK-054 — User Management UI

Implement:

```text
User List
Create User
Edit User
Status
Role
BPR
Branch
```

---

## TASK-055 — Product Management UI

Implement:

```text
Product List
Create
Edit
Status
```

---

## TASK-056 — Parameter Management UI

Display:

```text
Current Version
Effective Date
Status
Current Value
Updated By
```

Update flow harus memiliki confirmation.

---

## TASK-057 — Insurance Management UI

Implement:

```text
Insurance Table
Filter
Lookup
Import
Version
Activation
```

---

## TASK-058 — Fee Management UI

Implement fee parameter versioning UI.

---

## TASK-059 — Audit Log UI

Implement:

```text
Audit List
Filters
Detail
Before / After
Timestamp
Actor
```

---

# 22. PHASE 16 — DASHBOARD

## TASK-060 — Marketing Dashboard

Display only useful information:

```text
Simulation Today
Total Simulation
Recent Simulation
```

Maximum 2–4 KPI cards.

---

## TASK-061 — Admin Dashboard

Display:

```text
Total Marketing
Total Simulation
Simulation Today
Eligibility Summary
```

Scope mengikuti permission.

---

# 23. PHASE 17 — SECURITY HARDENING

## TASK-062 — IDOR Test

Test:

```text
Marketing A
 ↓
Simulation B
```

Expected:

```text
403 / 404 according to security policy
```

---

## TASK-063 — Privilege Escalation Test

Test malicious request:

```json
{
  "role": "SUPER_ADMIN"
}
```

Expected:

```text
DENY
```

---

## TASK-064 — Financial Parameter Tampering Test

Frontend mencoba:

```json
{
  "dbr": 0.99,
  "insuranceRate": 0.01
}
```

Backend harus mengabaikan/tolak parameter tersebut sebagai source of truth.

---

## TASK-065 — Secret Exposure Test

Verify:

```text
API key
Password
Session secret
Database credential
```

tidak muncul:

```text
Frontend bundle
API response
Logs
Git
```

---

## TASK-066 — Rate Limit Test

Test login dan sensitive endpoint.

---

# 24. PHASE 18 — TESTING

## TASK-067 — Unit Tests

Minimum:

```text
Flat Calculation
Annuity Calculation
Insurance
Fees
DBR
Eligibility
Maximum Principal
Amortization
Money/rounding
```

---

## TASK-068 — Integration Tests

Test:

```text
API
+
Database
+
Authentication
+
RBAC
+
Calculation
```

---

## TASK-069 — End-to-End Tests

Flow utama:

```text
Login
 ↓
Open Calculator
 ↓
Input
 ↓
Select Flat
 ↓
Calculate
 ↓
View Result
 ↓
Save Simulation
 ↓
Open Simulation
```

Ulangi dengan:

```text
Annuity
```

---

## TASK-070 — RBAC E2E

Test:

```text
Marketing
Admin
Super Admin
```

Pastikan menu dan endpoint sesuai permission.

---

# 25. PHASE 19 — FINANCIAL REGRESSION

## TASK-071 — Excel Reference Validation

Gunakan Excel/reference source sebagai validation dataset.

Flow:

```text
Excel Expected Result
        ↓
Application Result
        ↓
Compare
        ↓
Pass / Fail
```

Bandingkan minimal:

```text
Installment
DBR
Insurance
Fees
Maximum Principal
Eligibility
Amortization
```

### Critical Rule

Jika hasil berbeda:

```text
STOP
```

Jangan mengubah formula agar test pass sebelum penyebab perbedaan ditemukan.

---

## TASK-072 — Boundary Testing

Test:

```text
DBR exactly at maximum
DBR above maximum

Maximum tenor
Maximum tenor + 1

Maximum principal
Maximum principal + 1

Minimum valid age
Maximum valid age

Zero values
Negative values
Missing values
```

---

# 26. PHASE 20 — PERFORMANCE

## TASK-073 — Calculation Performance

Pastikan calculation request tidak melakukan query redundant.

Perhatikan:

```text
Parameter lookup
Insurance lookup
Fee lookup
Calculation
Amortization
```

---

## TASK-074 — Database Query Review

Review:

- indexes;
- N+1 query;
- pagination;
- unnecessary joins;
- large amortization queries.

---

# 27. PHASE 21 — UI QUALITY

## TASK-075 — Design Review

Checklist:

```text
Clean
Minimal
Professional
One primary color
Limited semantic colors
Consistent spacing
Consistent typography
```

---

## TASK-076 — Responsive Review

Test:

```text
Desktop
Tablet
Mobile
```

---

## TASK-077 — Accessibility Review

Check:

```text
Keyboard
Focus
Contrast
Labels
Error messages
Semantic HTML
```

---

# 28. PHASE 22 — AUDIT & OBSERVABILITY

## TASK-078 — Audit Verification

Verify audit event untuk:

```text
Login
Failed Login
User Creation
Role Change
Permission Change
Parameter Change
Insurance Change
Fee Change
Simulation Creation
Simulation Deletion/Archive
```

---

## TASK-079 — Error Monitoring

Application error harus dapat ditemukan melalui server logs/monitoring tanpa membocorkan secret.

---

# 29. PHASE 23 — PRODUCTION READINESS

## TASK-080 — Environment Separation

Pastikan:

```text
Development
Test
Production
```

menggunakan configuration dan credential yang sesuai.

---

## TASK-081 — Database Backup

Pastikan:

```text
Backup
Restore
Migration
```

procedure tersedia.

---

## TASK-082 — Security Configuration

Verify:

```text
HTTPS
Secure cookies
CORS
Security headers
Rate limiting
Secret management
```

---

## TASK-083 — Final Regression

Run:

```text
Unit Tests
Integration Tests
E2E Tests
RBAC Tests
Security Tests
Financial Regression
```

Semua critical test harus PASS.

---

# 30. FINAL ACCEPTANCE

Aplikasi dapat dianggap siap MVP jika:

### Foundation

- [ ] Application starts.
- [ ] Database works.
- [ ] Migration works.
- [ ] Environment works.

### Authentication

- [ ] Login works.
- [ ] Logout works.
- [ ] Session protection works.

### RBAC

- [ ] Roles work.
- [ ] Permissions work.
- [ ] Data scope works.
- [ ] IDOR protected.
- [ ] Privilege escalation protected.

### Master Data

- [ ] Product works.
- [ ] Parameters work.
- [ ] Insurance works.
- [ ] Fees work.
- [ ] Versioning works.

### Calculation

- [ ] Flat works.
- [ ] Annuity works.
- [ ] Insurance works.
- [ ] Fees work.
- [ ] DBR works.
- [ ] Eligibility works.
- [ ] Maximum principal works.
- [ ] Amortization works.

### Simulation

- [ ] Create works.
- [ ] Save works.
- [ ] List works.
- [ ] Detail works.
- [ ] Scope works.

### UI

- [ ] Clean.
- [ ] Minimal.
- [ ] Responsive.
- [ ] Accessible.
- [ ] Role-aware navigation.
- [ ] Result readable.

### Security

- [ ] Secrets protected.
- [ ] API protected.
- [ ] RBAC tested.
- [ ] IDOR tested.
- [ ] Financial tampering tested.
- [ ] Rate limiting tested.

### Financial Accuracy

- [ ] Excel/reference dataset validated.
- [ ] Flat result matches expected.
- [ ] Annuity result matches expected.
- [ ] Insurance matches approved reference.
- [ ] Fees match approved reference.
- [ ] Amortization reconciles.
- [ ] Historical versions remain reproducible.

---

# 31. AI Coding Agent Operating Protocol

Sebelum mengerjakan task:

```text
1. Read relevant specification.
2. Identify dependencies.
3. Inspect existing code.
4. Do not overwrite working functionality blindly.
5. Implement smallest complete change.
6. Run tests.
7. Fix errors.
8. Review security.
9. Report changed files.
10. Report tests.
11. Mark task complete only when acceptance criteria pass.
```

Setelah task selesai, agent harus memberikan:

```text
TASK:
TASK-XXX

STATUS:
DONE / BLOCKED

FILES CREATED:
...

FILES MODIFIED:
...

IMPLEMENTATION:
...

TESTS:
...

RESULT:
PASS / FAIL

NOTES:
...
```

---

# 32. Change Control

Jika agent menemukan kebutuhan baru:

```text
Requirement Baru
 ↓
STOP CODING
 ↓
Identifikasi dokumen yang terpengaruh
 ↓
Update Specification
 ↓
Review
 ↓
Update Technical Task
 ↓
Coding
```

Jangan membiarkan AI melakukan scope creep.

---

# 33. Forbidden Agent Behavior

Agent tidak boleh:

```text
❌ Mengarang insurance rate
❌ Mengarang fee
❌ Mengarang financial parameter
❌ Mengubah formula tanpa approval
❌ Menghapus RBAC untuk mempermudah coding
❌ Membypass authentication
❌ Membypass data scope
❌ Menaruh API key di frontend
❌ Hard-code secret
❌ Mengubah API contract diam-diam
❌ Menghapus audit
❌ Menggunakan production data sembarangan
❌ Menandai task DONE tanpa test
```

---

# 34. Recommended Coding Order

Urutan final:

```text
01. Read Specifications
        ↓
02. Project Foundation
        ↓
03. Environment
        ↓
04. Database
        ↓
05. Reference Source / Seed
        ↓
06. Authentication
        ↓
07. RBAC
        ↓
08. Data Scope
        ↓
09. User Management
        ↓
10. Organization Master
        ↓
11. Product
        ↓
12. Parameters
        ↓
13. Insurance
        ↓
14. Fees
        ↓
15. Calculation Domain
        ↓
16. Flat Engine
        ↓
17. Annuity Engine
        ↓
18. Insurance Engine
        ↓
19. Fee Engine
        ↓
20. DBR / Eligibility
        ↓
21. Amortization
        ↓
22. Calculation API
        ↓
23. Simulation API
        ↓
24. Authentication UI
        ↓
25. RBAC UI
        ↓
26. Calculator UI
        ↓
27. Result UI
        ↓
28. Simulation UI
        ↓
29. Admin UI
        ↓
30. Dashboard
        ↓
31. Security Hardening
        ↓
32. Testing
        ↓
33. Excel Financial Regression
        ↓
34. Performance
        ↓
35. Production Readiness
```

---

# 35. Final Principle

Jangan menggunakan pola:

```text
"AI, buatkan aplikasi kalkulator kredit lengkap."
```

Gunakan:

```text
Specification
 ↓
Task
 ↓
Implementation
 ↓
Test
 ↓
Review
 ↓
Next Task
```

Untuk task financial:

```text
Business Rule
 ↓
Automated Test
 ↓
Calculation Engine
 ↓
API
 ↓
UI
```

Untuk security:

```text
Security Requirement
 ↓
Backend Enforcement
 ↓
Automated Test
 ↓
UI
```

Untuk reference data:

```text
Official Source
 ↓
Validation
 ↓
Version
 ↓
Database
 ↓
Calculation
```

---

# 36. Definition of Done — Entire Application

Aplikasi Credit Calculator BPR dinyatakan selesai hanya jika:

```text
PRD
✓

RBAC
✓

Business Rules
✓

Architecture
✓

Database
✓

Security
✓

Design
✓

API
✓

Technical Implementation
✓

Calculation Engine
✓

Reference Data
✓

Automated Tests
✓

Financial Regression
✓

Security Testing
✓

Production Readiness
✓
```

Dan seluruh critical acceptance criteria:

```text
PASS
```

Status:

```text
READY FOR AGENT-DRIVEN IMPLEMENTATION
```
