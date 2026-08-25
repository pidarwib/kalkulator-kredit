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

## TASK-003 — Environment Configuration

### Objective

Memisahkan configuration dari source code.

### Required categories

```text
DATABASE_URL
AUTH_SECRET
SESSION_SECRET / equivalent
API configuration
OPENROUTER_API_KEY jika digunakan
```

### Rules

- secret tidak boleh hard-coded;
- `.env` tidak boleh masuk git;
- `.env.example` tidak boleh berisi secret aktual.

### Acceptance Criteria

- [ ] `.env` ignored.
- [ ] `.env.example` tersedia.
- [ ] Application gagal dengan jelas jika required secret tidak tersedia.
- [ ] Secret tidak muncul di log.

---

## TASK-004 — Base Layout

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

- [ ] Clean/minimal.
- [ ] Responsive.
- [ ] Sidebar tersedia.
- [ ] Topbar tersedia.
- [ ] Tidak ada excessive colors.
- [ ] Tidak ada hard-coded financial data.

---

# 8. PHASE 2 — DATABASE FOUNDATION

## TASK-005 — Database Connection

### Objective

Membuat koneksi database.

### Agent harus

- configure ORM/database client;
- configure connection;
- create migration baseline;
- test connection.

### Acceptance Criteria

- [ ] Application dapat connect.
- [ ] Migration dapat dijalankan.
- [ ] Migration dapat rollback jika supported.

---

## TASK-006 — Implement Core Schema

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

AuditLogs
```

### Rules

- foreign key jelas;
- index sesuai query pattern;
- financial value menggunakan safe numeric/decimal representation;
- timestamps tersedia;
- soft delete sesuai specification.

### Acceptance Criteria

- [ ] Schema migration berhasil.
- [ ] FK valid.
- [ ] Unique constraint valid.
- [ ] Index utama tersedia.
- [ ] Financial columns aman.

---

# 9. PHASE 3 — SEED & REFERENCE SOURCE

## TASK-007 — Reference Source Directory

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

### Rules

AI tidak boleh mengarang nilai dari Excel.

---

## TASK-008 — Reference Data Import Pipeline

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

- [ ] File structure divalidasi.
- [ ] Duplicate ditolak.
- [ ] Missing value ditolak.
- [ ] Invalid rate ditolak.
- [ ] Import dapat direproduksi.
- [ ] Import memiliki audit/version context.

---

## TASK-009 — Seed Core Master Data

Seed hanya data yang sudah disetujui.

Contoh:

```text
Roles
Permissions
Role-Permissions
BPR
Branch
Payment Office
Product
Credit Parameters
Fee Parameters
Insurance Rates
```

### Critical Rule

Jangan membuat:

```text
fake insurance rate
estimated insurance rate
AI-generated rate
```

Jika data resmi belum tersedia:

```text
BLOCKED
```

bukan diisi asumsi.

---

# 10. PHASE 4 — AUTHENTICATION

## TASK-010 — User Model & Password Hashing

### Implement

- User repository;
- password hashing;
- password verification;
- status validation.

Recommended:

```text
Argon2id
```

jika sesuai stack.

### Acceptance Criteria

- [ ] Plaintext password tidak disimpan.
- [ ] Hash tidak dikirim frontend.
- [ ] Inactive user ditolak.

---

## TASK-011 — Login API

Implement:

```text
POST /api/v1/auth/login
```

Mengikuti `API_SPECIFICATION.md`.

### Tests

```text
Valid login
Wrong password
Unknown user
Inactive user
```

---

## TASK-012 — Session / Authentication Middleware

Implement:

```text
Authentication middleware
Current user context
Logout
Session expiration
```

Endpoints:

```text
POST /api/v1/auth/logout
GET /api/v1/auth/me
```

### Acceptance Criteria

Unauthenticated protected request:

```text
401
```

---

# 11. PHASE 5 — RBAC & DATA SCOPE

## TASK-013 — Permission Model

Implement:

```text
Role
Permission
RolePermission
```

Seed permission berdasarkan `ROLE_PERMISSION.md`.

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

- [ ] Unauthorized endpoint = 403.
- [ ] Frontend hiding tidak menjadi security mechanism.
- [ ] Permission check dilakukan server-side.

---

## TASK-015 — Data Scope Middleware / Service

Implement scope:

```text
SUPER_ADMIN → ALL
ADMIN → BPR / BRANCH
MARKETING → OWN
```

### Critical Test

Marketing A:

```text
GET simulation Marketing B
```

harus:

```text
DENY
```

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

- role assignment authorized;
- scope assignment authorized;
- soft delete;
- audit sensitive action.

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

### Security

User tidak boleh menaikkan privilege dirinya sendiri.

---

# 12. PHASE 6 — ORGANIZATION MASTER DATA

## TASK-018 — BPR Management

Implement BPR CRUD sesuai API.

---

## TASK-019 — Branch Management

Implement Branch CRUD.

Relationship:

```text
BPR
 ↓
Branch
```

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

Validasi relationship wajib dilakukan backend.

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
