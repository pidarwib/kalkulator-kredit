# AGENT EXECUTION PROTOCOL

File ini adalah execution instruction untuk coding agent.

ATURAN UTAMA:

1. Selalu baca PROMPTS.md sebelum menjalankan task.
2. Kerjakan hanya TASK yang diminta user.
3. Jangan otomatis melanjutkan ke TASK berikutnya.
4. Untuk setiap TASK, baca specification yang relevan di folder .agents.
5. Specification adalah source of truth.
6. PROMPTS.md hanya mengatur cara menjalankan task.
7. BUSINESS_RULES.md adalah source of truth untuk business calculation.
8. DATABASE.md adalah source of truth untuk database design.
9. API_SPECIFICATION.md adalah source of truth untuk API contract.
10. SECURITY.md adalah source of truth untuk security.
11. ROLE_PERMISSION.md adalah source of truth untuk RBAC.
12. DESIGN.md adalah source of truth untuk UI/UX.
13. TECHNICAL_IMPLEMENTATION.md adalah source of truth untuk urutan dan scope implementasi.
14. Jangan mengarang data finansial.
15. Jangan mengarang insurance rate.
16. Jangan mengarang fee.
17. Jangan mengubah formula financial.
18. Jangan melakukan privilege escalation.
19. Jangan memindahkan security validation hanya ke frontend.
20. Jika terjadi konflik specification, STOP dan laporkan.
21. Jika reference data belum tersedia, STOP dan jangan membuat dummy financial data.
22. Setelah task selesai, jalankan test yang relevan.
23. Laporkan file yang dibuat/diubah dan hasil test.
24. Jangan mengerjakan task berikutnya tanpa instruksi user.

# ANTIGRAVITY AGENT PROMPTS — CREDIT CALCULATOR BPR

Dokumen ini berisi prompt siap-copy untuk mengerjakan TASK-001 sampai TASK-083 pada `TECHNICAL_IMPLEMENTATION.md`.

## Model Strategy

- **Flash 3.7 Low** → UI sederhana, CRUD sederhana, dokumentasi, review visual ringan.
- **Flash 3.7 Medium** → coding rutin, API CRUD, integration ringan, form, layout, testing rutin.
- **Claude Opus** → financial calculation, RBAC/security kritis, database architecture, regression Excel, debugging kompleks, dan task yang berisiko mengubah source of truth.

### Prinsip hemat token

Jangan gunakan Opus untuk task deterministic dan low-risk.

Prioritaskan Opus pada:

```text
TASK-001
TASK-006
TASK-009
TASK-014
TASK-015
TASK-017
TASK-022
TASK-024
TASK-025
TASK-027–035
TASK-037
TASK-062–065
TASK-067–068
TASK-070
TASK-071–072
TASK-082–083
```

Untuk task lain, Flash 3.7 Medium/Low biasanya cukup.

> Untuk task financial/security, jangan menurunkan model hanya demi hemat token. Kesalahan di area tersebut lebih mahal daripada token yang dihemat.

## Master Prompt

Jika ingin memberi konteks standar sebelum task:

```text
Anda adalah coding agent untuk aplikasi Credit Calculator BPR.

Jangan coding sebelum membaca specification yang relevan.
Jangan mengarang business rule, financial parameter, insurance rate, fee, role, permission, atau API contract.
Backend adalah source of truth.
Financial calculation harus deterministic.
Security harus server-side.
Jika specification konflik atau reference data tidak tersedia, STOP dan laporkan; jangan membuat asumsi.
Kerjakan hanya task yang saya berikan.
Setelah selesai jalankan test yang relevan dan laporkan file changed + test result + blocker.
```

---



# PHASE 0

## TASK-001 — Read All Specifications

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-001 — Read All Specifications` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Baca seluruh file .agents dan buat implementation checklist. Jangan coding. Identifikasi konflik; jika ada STOP dan laporkan.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 1

## TASK-002 — Initialize Application

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-002 — Initialize Application` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Setup project sesuai ARCHITECTURE.md: framework, package manager, TypeScript bila ditentukan, lint, formatter, test runner. Jalankan dev, lint, type-check, test.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-003 — Environment Configuration

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-003 — Environment Configuration` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement environment configuration dan .env.example. Secret tidak boleh hard-coded, masuk git, frontend bundle, atau log. Validasi required env saat startup.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-004 — Base Layout

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-004 — Base Layout` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement App Layout, Sidebar, Topbar, Main Content, Page Header sesuai DESIGN.md. Clean/minimal, responsive, tanpa financial hard-code.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 2

## TASK-005 — Database Connection

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-005 — Database Connection` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Setup ORM/database client, connection, baseline migration, dan database connectivity test sesuai ARCHITECTURE/DATABASE.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-006 — Core Database Schema

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-006 — Core Database Schema` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement seluruh schema core sesuai DATABASE.md: users, roles, permissions, organization, products, parameters, insurance, fees, simulations, calculations, amortization, audit. Validasi FK, unique, index, financial precision.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 3

## TASK-007 — Reference Source Directory

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-007 — Reference Source Directory` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Buat reference_source/original, validated, import, README. Jangan mengubah atau mengarang source financial.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-008 — Reference Data Import Pipeline

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-008 — Reference Data Import Pipeline` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Buat pipeline Excel→parse→validate→preview→approve→seed/database. Tolak duplicate, missing, invalid rate. Jangan mengimpor tanpa validasi.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-009 — Core Master Seed

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-009 — Core Master Seed` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Seed role, permission, BPR, branch, payment office, product, parameter, fee, insurance hanya dari data approved. Jika data resmi tidak tersedia, BLOCKED; jangan mengarang.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 4

## TASK-010 — User & Password Security

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-010 — User & Password Security` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement User repository, password hashing, verification, status validation. Gunakan Argon2id bila sesuai stack. Test plaintext password tidak tersimpan.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-011 — Login API

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-011 — Login API` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement POST /api/v1/auth/login sesuai API_SPECIFICATION. Test valid login, wrong password, unknown user, inactive user.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-012 — Session/Auth Middleware

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-012 — Session/Auth Middleware` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement session/token middleware, logout, expiration, current-user context, GET /auth/me. Unauthenticated protected request harus 401.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 5

## TASK-013 — Permission Model

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-013 — Permission Model` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement Role, Permission, RolePermission dan seed permission sesuai ROLE_PERMISSION.md. Jangan membuat permission baru tanpa specification.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-014 — Authorization Middleware

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-014 — Authorization Middleware` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement server-side requirePermission. Authentication→permission→continue/403. Buat tests.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-015 — Data Scope

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-015 — Data Scope` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement SUPER_ADMIN=ALL, ADMIN=BPR/BRANCH, MARKETING=OWN sesuai ROLE_PERMISSION/DATABASE. Test cross-user/cross-scope access.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-016 — User Management

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-016 — User Management` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement user CRUD API, role/scope validation, soft delete, audit untuk sensitive action. Ikuti API_SPECIFICATION.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-017 — Role & Permission Management

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-017 — Role & Permission Management` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement role/permission management API dengan authorization ketat dan audit. Cegah self privilege escalation.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 6

## TASK-018 — BPR Management

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-018 — BPR Management` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement BPR CRUD API sesuai API_SPECIFICATION, scope dan permission.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-019 — Branch Management

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-019 — Branch Management` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement Branch CRUD dan validasi BPR relationship serta scope.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-020 — Payment Office Management

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-020 — Payment Office Management` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement Payment Office CRUD dan validasi BPR→Branch→Payment Office relationship.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 7

## TASK-021 — Product Management

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-021 — Product Management` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement Product API dan status/lifecycle sesuai specification. Product menjadi parent reference calculation.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-022 — Credit Parameter Versioning

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-022 — Credit Parameter Versioning` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement active parameter lookup dan new-version workflow. Jangan overwrite historical version; audit dan optimistic locking.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-023 — Fee Parameter Management

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-023 — Fee Parameter Management` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement fee parameter versioning, validation, audit, activation. Jangan hard-code fee di calculation engine.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-024 — Insurance Rate Management

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-024 — Insurance Rate Management` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement insurance list, lookup, import, version, activation, audit. Rate hanya dari approved reference_source. Missing rate harus error, bukan estimasi.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 8

## TASK-025 — Calculation Domain Model

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-025 — Calculation Domain Model` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Buat domain/value objects Money, Percentage, Tenor, Rate, Installment, Insurance Premium, Fee, Eligibility. Gunakan precision aman untuk financial values.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-026 — Calculation Input Validator

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-026 — Calculation Input Validator` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement backend validation untuk product, payment office, birth date, salary, income, principal, tenor, method FLAT/ANNUITY. Ikuti BUSINESS_RULES.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-027 — Flat Calculation Strategy

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-027 — Flat Calculation Strategy` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement FlatCalculationStrategy persis BUSINESS_RULES. Jangan mengubah formula. Buat unit tests normal, boundary, rounding, invalid.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-028 — Annuity/PMT Strategy

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-028 — Annuity/PMT Strategy` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement AnnuityCalculationStrategy sesuai PMT/business rules. Buat tests normal, boundary, rounding, invalid. Jangan membuat formula alternatif.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-029 — Insurance Calculation Service

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-029 — Insurance Calculation Service` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement insurance lookup berdasarkan usia, tenor tahun CEILING(tenor bulan/12), produk dan rate master; premium = principal×rate sesuai business rules. Missing rate = error.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-030 — Fee Calculation Service

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-030 — Fee Calculation Service` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement admin, provision, verification, flagging, installment deduction dan fee lainnya sesuai BUSINESS_RULES dan parameter master. Simpan komponen terpisah.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-031 — DBR Calculation

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-031 — DBR Calculation` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement DBR = installment/net salary dan maximum installment = salary×DBR maximum sesuai business rules. Validasi menggunakan nilai internal, bukan display rounding.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-032 — Eligibility Engine

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-032 — Eligibility Engine` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement eligibility engine: DBR, age at maturity, tenor, principal dan seluruh rules. Return status + semua reasons. Ikuti boundary 90%=OK.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-033 — Maximum Principal

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-033 — Maximum Principal` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement maximum principal berdasarkan payment capacity, method, product limit, age limit dan floor rounding sesuai BUSINESS_RULES. Test boundary.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-034 — Amortization Engine

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-034 — Amortization Engine` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement schedule FLAT/ANNUITY dengan period, payment date, opening balance, principal, margin, fee, installment, closing balance. Reconcile final balance.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 9

## TASK-035 — Calculation API

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-035 — Calculation API` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement POST /api/v1/calculations: auth→permission→scope→validation→load config/rates/fees→engine→eligibility→response. Jangan menerima financial truth dari frontend.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-036 — Calculation Response Contract

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-036 — Calculation Response Contract` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Pastikan request/response persis API_SPECIFICATION. Tambahkan contract tests. Jangan ubah contract diam-diam.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 10

## TASK-037 — Create Simulation

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-037 — Create Simulation` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement POST /simulations dalam transaction: simulation+result+amortization+audit. Rollback jika critical operation gagal.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-038 — Simulation List

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-038 — Simulation List` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement GET /simulations dengan search/filter/pagination/status/product/date dan scope server-side.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-039 — Simulation Detail

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-039 — Simulation Detail` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement GET /simulations/:id dengan input, result, eligibility, insurance, fees, versions, amortization dan ownership/scope check.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-040 — Simulation Archive/Delete

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-040 — Simulation Archive/Delete` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement soft delete/archive sesuai DATABASE/API. Authorization dan audit wajib.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 11

## TASK-041 — Login Page

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-041 — Login Page` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement login UI sesuai DESIGN.md: username, password, loading, error, clean minimal. Hubungkan auth API.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-042 — Protected Routes

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-042 — Protected Routes` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement route protection: unauthenticated→login, authenticated→app; jangan menjadikan frontend sebagai security boundary.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-043 — Permission-aware Navigation

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-043 — Permission-aware Navigation` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement sidebar/menu berdasarkan permission untuk Marketing/Admin/Super Admin. Backend tetap authoritative.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 12

## TASK-044 — Calculator Form

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-044 — Calculator Form` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement calculator form sesuai DESIGN/API: applicant data, birth date, salary, other income, product, payment office, principal, tenor, method Flat/Annuity.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-045 — Currency & Percentage Components

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-045 — Currency & Percentage Components` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Buat reusable CurrencyInput, PercentageInput, NumberInput. Display formatted, internal numeric/decimal.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-046 — Calculator Validation UX

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-046 — Calculator Validation UX` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement required/format/range/business validation dekat field. Jangan hanya toast.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-047 — Calculate Action

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-047 — Calculate Action` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement validate→POST /calculations→loading→result. Disable submit selama request dan handle errors sesuai API contract.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 13

## TASK-048 — Result Summary

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-048 — Result Summary` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement primary result: status, maximum principal, installment, DBR. Gunakan semantic colors terbatas dan text status.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-049 — Result Detail

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-049 — Result Detail` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement sections ringkasan, eligibility, installment, insurance, fees, net disbursement. Untuk OVER, UI boleh menampilkan '-' tanpa mengubah raw calculation.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-050 — Amortization UI

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-050 — Amortization UI` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement table period, date, opening balance, principal, margin, fee, installment, closing balance dengan numeric right alignment.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-051 — Save Simulation

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-051 — Save Simulation` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement save result→POST /simulations→success→detail. Hindari duplicate submission.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 14

## TASK-052 — Simulation List UI

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-052 — Simulation List UI` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement search, filter, pagination, status, date, product dan scope-aware list sesuai DESIGN.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-053 — Simulation Detail UI

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-053 — Simulation Detail UI` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement detail simulation: number, creator, date, input, result, parameter/business-rule versions, amortization.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 15

## TASK-054 — User Management UI

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-054 — User Management UI` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement user list/create/edit/status/role/BPR/branch sesuai permission dan DESIGN.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-055 — Product Management UI

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-055 — Product Management UI` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement product list/create/edit/status dengan validation dan permission-aware UI.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-056 — Parameter Management UI

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-056 — Parameter Management UI` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement current version, effective date, status, values, updated by, edit confirmation, new version activation.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-057 — Insurance Management UI

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-057 — Insurance Management UI` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement insurance table, filter, lookup, import, version, activation dan validation. Jangan expose secrets.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-058 — Fee Management UI

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-058 — Fee Management UI` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement fee parameter versioning UI sesuai API/DESIGN.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-059 — Audit Log UI

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-059 — Audit Log UI` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement audit list/filter/detail before-after/actor/timestamp tanpa menampilkan secret.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 16

## TASK-060 — Marketing Dashboard

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-060 — Marketing Dashboard` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement dashboard minimal: simulation today, total simulation, recent simulation. Maksimal 2–4 KPI cards.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-061 — Admin Dashboard

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-061 — Admin Dashboard` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Implement total marketing, total simulation, today, eligibility summary sesuai scope/permission.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 17

## TASK-062 — IDOR Test

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-062 — IDOR Test` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Buat security tests untuk akses simulation/resource milik user/scope lain. Expected deny sesuai policy.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-063 — Privilege Escalation Test

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-063 — Privilege Escalation Test` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Uji malicious role=SUPER_ADMIN dan perubahan permission/scope. Semua harus ditolak tanpa permission.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-064 — Financial Parameter Tampering Test

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-064 — Financial Parameter Tampering Test` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Kirim DBR/insuranceRate/fee dari frontend dan pastikan backend tidak mempercayainya sebagai source of truth.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-065 — Secret Exposure Test

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-065 — Secret Exposure Test` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Scan frontend bundle, API response, logs dan git artifacts untuk API key/password/session/database secrets.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-066 — Rate Limit Test

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-066 — Rate Limit Test` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Uji login dan sensitive endpoints terhadap rate limiting/brute force protection.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 18

## TASK-067 — Unit Tests

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-067 — Unit Tests` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Lengkapi unit tests Money/rounding, Flat, Annuity, Insurance, Fees, DBR, Eligibility, Maximum Principal, Amortization.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-068 — Integration Tests

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-068 — Integration Tests` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Test API+DB+Auth+RBAC+Calculation end-to-end pada service layer.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-069 — E2E Tests

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-069 — E2E Tests` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Test Login→Calculator→Flat→Calculate→Result→Save→Detail dan ulangi Annuity.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-070 — RBAC E2E

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-070 — RBAC E2E` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Test Marketing/Admin/Super Admin menu, endpoint, ownership dan scope.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 19

## TASK-071 — Excel Financial Regression

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-071 — Excel Financial Regression` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Gunakan Excel/reference dataset sebagai expected result. Bandingkan installment, DBR, insurance, fees, max principal, eligibility, amortization. Jika mismatch STOP dan investigasi; jangan ubah formula agar pass.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-072 — Boundary Testing

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-072 — Boundary Testing` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Automate boundary: DBR 89.99/90/90.01, tenor 119/120/121, principal limit, age maturity, kombinasi rules.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 20

## TASK-073 — Calculation Performance

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-073 — Calculation Performance` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Profiling calculation untuk query redundant dan service performance. Optimalkan tanpa mengubah hasil financial.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-074 — Database Query Review

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-074 — Database Query Review` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Review indexes, N+1, pagination, joins dan amortization queries. Gunakan profiling sebelum optimasi.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 21

## TASK-075 — Design Review

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-075 — Design Review` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Audit UI terhadap DESIGN.md: clean, minimal, one primary color, spacing, typography, no noisy effects.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-076 — Responsive Review

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-076 — Responsive Review` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Test desktop/tablet/mobile; perbaiki overflow, sidebar drawer, forms dan tables.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-077 — Accessibility Review

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-077 — Accessibility Review` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Audit keyboard, focus, contrast, labels, semantic HTML, validation/error semantics.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 22

## TASK-078 — Audit Verification

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-078 — Audit Verification` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Verifikasi audit event login, failed login, user, role, permission, parameter, insurance, fee, simulation lifecycle.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-079 — Error Monitoring

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-079 — Error Monitoring` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Review server logging/monitoring agar error dapat ditelusuri tanpa secret/sensitive payload leakage.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.


# PHASE 23

## TASK-080 — Environment Separation

**Model rekomendasi:** `Flash 3.7 Low`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-080 — Environment Separation` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Pisahkan dev/test/prod configuration dan credential. Tidak ada production secret di development.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-081 — Database Backup

**Model rekomendasi:** `Flash 3.7 Medium`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-081 — Database Backup` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Dokumentasikan/test backup, restore, migration procedure sesuai infrastructure.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-082 — Security Configuration

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-082 — Security Configuration` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Verify HTTPS, secure cookies, CORS, security headers, rate limit, secret management.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.

## TASK-083 — Final Regression

**Model rekomendasi:** `Opus`

**Prompt untuk Antigravity Agent:**

> Kerjakan `TASK-083 — Final Regression` sebagai satu task terisolasi.
>
> Baca terlebih dahulu specification yang relevan di `.agents/`: `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`, `DESIGN.md`, `API_SPECIFICATION.md`, dan `TECHNICAL_IMPLEMENTATION.md`. Jangan mengarang aturan yang tidak didukung dokumen.
>
> **Pekerjaan:** Jalankan unit, integration, E2E, RBAC, security dan financial regression. Semua critical test harus PASS.
>
> Aturan:
> 1. Jangan mengubah business rule, financial formula, role/permission, database contract, API contract, security boundary, atau design system tanpa approval.
> 2. Inspect code yang sudah ada sebelum membuat perubahan.
> 3. Jangan mengarang data finansial, insurance rate, fee, atau parameter.
> 4. Implementasikan perubahan sekecil mungkin tetapi lengkap.
> 5. Buat atau update test yang relevan.
> 6. Jalankan lint, type-check, dan test yang relevan.
> 7. Jika ada konflik specification atau data/reference source belum tersedia, **STOP** dan jelaskan blocker; jangan menebak.
> 8. Jangan menandai task selesai jika acceptance criteria belum terpenuhi.
>
> Setelah selesai, laporkan:
> - status: DONE / BLOCKED;
> - file dibuat;
> - file diubah;
> - ringkasan implementasi;
> - test yang dijalankan dan hasilnya;
> - issue/blocker jika ada;
> - langkah berikutnya yang disarankan.
