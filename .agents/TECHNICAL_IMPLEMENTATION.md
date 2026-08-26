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

---

## TASK-027 — Flat Calculation Strategy

Implement:

```text
FlatCalculationStrategy
```

Formula wajib mengikuti `BUSINESS_RULES.md`.

Jangan menulis formula baru berdasarkan asumsi agent.

### Tests

- normal principal;
- normal tenor;
- boundary tenor;
- boundary principal;
- rounding;
- zero/invalid values.

---

## TASK-028 — Annuity / PMT Calculation Strategy

Implement:

```text
AnnuityCalculationStrategy
```

Menggunakan formula PMT/anuitas sesuai `BUSINESS_RULES.md`.

Rate yang digunakan adalah **rate tahunan yang sama dengan metode FLAT** (10,8% / 12 = 0,9% per bulan), tanpa konversi effective rate terpisah.

### Tests

- normal input;
- boundary values;
- rounding;
- consistency;
- invalid input.

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

---

## TASK-030 — Fee Calculation Service

Implement fee calculation berdasarkan `BUSINESS_RULES.md`.

Fee harus berasal dari active parameter:
- `flaggingFee` = Rp38.000 (default, disimpan di database, dikurangkan 1x pada Terima Bersih terpisah dari `totalFees`)
- `verificationFee` = Rp1.500.000
- `adminFee` = dari rule/parameter produk
- `provisionFee` = dari rule/parameter produk

---

## TASK-031 — DBR Calculation

Implement DBR sesuai business rule.

Pastikan:

```text
DBR = Installment / Monthly Income
```

atau formula final yang tertulis pada `BUSINESS_RULES.md`.

Jangan mengubah formula.

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

---

## TASK-033 — Maximum Principal Calculation

Implement calculation maximum principal berdasarkan business rule.

### Critical

Jangan membuat formula sendiri.

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

### Tests

- first period;
- middle period;
- final period;
- ending balance;
- rounding reconciliation.

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

---

## TASK-040 — Simulation Archive/Delete

Implement lifecycle sesuai `DATABASE.md` dan API specification.

Default:

```text
Soft Delete
```

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

---

## TASK-042 — Protected Routes

Implement route protection:

```text
Unauthenticated
→ Login

Authenticated
→ Application
```

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
