# ARCHITECTURE — CREDIT CALCULATOR BPR

## 1. Tujuan

Dokumen ini mendefinisikan arsitektur teknis aplikasi Credit Calculator berdasarkan:

- PRD
- ROLE_PERMISSION
- BUSINESS_RULES
- Reference workbook

Architecture harus menjaga pemisahan antara:

1. Presentation Layer
2. Application Layer
3. Domain / Calculation Layer
4. Data Access Layer
5. Database
6. Authentication & Authorization
7. Audit & Observability

Architecture harus memungkinkan calculation engine diuji tanpa menjalankan UI.

---

# 2. Architectural Principles

## 2.1 Separation of Concerns

UI tidak boleh berisi business calculation.

```text
UI
 ↓
Application Service
 ↓
Calculation Engine
 ↓
Result
 ↓
UI
```

## 2.2 Single Source of Business Logic

Formula kredit hanya boleh berada di calculation/domain layer.

Business formula tidak boleh diduplikasi di:

- React component
- form validation
- API controller
- database trigger
- utility frontend

## 2.3 Backend Is Authoritative

Frontend bertanggung jawab terhadap:

- input form;
- presentation;
- interaction;
- client-side validation untuk UX.

Backend bertanggung jawab terhadap:

- authentication;
- authorization;
- business validation;
- calculation;
- database access;
- audit.

## 2.4 Configuration Over Hard-Code

Parameter seperti:

- DBR maximum
- Flat rate
- Maximum tenor
- Maximum principal
- Admin rate
- Provision rate
- Insurance rate
- Verification fee
- Flagging fee

tidak boleh di-hard-code pada UI.

Parameter berasal dari configuration/master data.

---

# 3. High-Level Architecture

```text
                    USER
                     │
                     ▼
              WEB APPLICATION
                     │
             Presentation Layer
                     │
                     ▼
              API / Application
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
 Authentication   RBAC       Application Services
       │             │             │
       └─────────────┼─────────────┘
                     │
                     ▼
             DOMAIN / CALCULATION
                     │
       ┌─────────────┼─────────────┐
       │             │             │
       ▼             ▼             ▼
 Credit Engine   Insurance      Fee Engine
       │           Engine          │
       │             │             │
       └─────────────┼─────────────┘
                     ▼
              Eligibility Engine
                     │
                     ▼
               Result Builder
                     │
                     ▼
              DATA ACCESS LAYER
                     │
                     ▼
                  DATABASE
```

---

# 4. Layer Architecture

## 4.1 Presentation Layer

Tanggung jawab:

- Login
- Dashboard
- Credit Calculator
- Simulation
- User Management
- Master Data
- Reports
- Profile
- Audit interface

Presentation layer tidak boleh menghitung business formula.

Contoh:

```text
CreditCalculatorPage
        ↓
CalculationForm
        ↓
POST /api/calculations
        ↓
Calculation Service
```

---

# 5. Application Layer

Application layer mengatur use case.

Contoh:

- CreateSimulation
- CalculateCredit
- GetSimulation
- UpdateSimulation
- DeleteSimulation
- CreateMarketingUser
- UpdateMarketingUser
- GetCreditParameters
- GetInsuranceRates

Application service bertanggung jawab terhadap:

- orchestration;
- transaction;
- authorization context;
- memanggil domain service;
- menyimpan hasil.

Application service tidak boleh memiliki formula kredit.

---

# 6. Domain / Calculation Layer

Ini adalah bagian paling kritis.

Struktur yang disarankan:

```text
calculation/
├── credit/
│   ├── credit-calculator
│   ├── credit-capacity
│   ├── installment
│   └── eligibility
│
├── installment/
│   ├── flat
│   ├── annuity
│   └── pmt
│
├── insurance/
│   ├── insurance-lookup
│   ├── insurance-calculator
│   └── insurance-rate
│
├── fees/
│   ├── admin
│   ├── provision
│   ├── fronting
│   ├── reserve
│   ├── verification
│   └── flagging
│
├── settlement/
│   └── net-disbursement
│
├── age/
│   └── age-calculator
│
├── tenor/
│   └── tenor-calculator
│
└── effective-rate/
    ├── pv
    ├── pmt
    └── rate
```

---

# 7. Credit Calculation Engine

Calculation engine menerima input terstruktur.

```text
CreditCalculationInput

- birthDate
- calculationDate
- netSalary
- requestedPrincipal
- tenorMonths
- calculationMethod
- bprId
- productId
- paymentOfficeId
- payoffAmount
- other deductions
```

Output:

```text
CreditCalculationResult

- status
- reasons
- age
- maturityAge
- maxTenor
- maxInstallment
- maxPrincipal
- installment
- dbr
- remainingSalary
- insurance
- fees
- netDisbursement
- breakdown
- amortization
```

---

# 8. Installment Strategy

Metode angsuran harus menggunakan Strategy Pattern.

```text
InstallmentCalculator
        │
        ├── FlatInstallmentCalculator
        │
        └── AnnuityInstallmentCalculator
```

Interface konseptual:

```text
calculateInstallment(
    principal,
    tenorMonths,
    rate
)
```

Marketing memilih:

```text
FLAT
```

atau:

```text
ANNUITY
```

Backend memilih strategy berdasarkan `calculationMethod`.

---

# 9. Flat Calculation

Flat calculation menggunakan:

```text
Monthly Principal =
Principal / Tenor

Monthly Margin =
Principal × Annual Flat Rate / 12

Monthly Installment =
Monthly Principal + Monthly Margin
```

Default:

```text
Annual Flat Rate = 10.8%
Monthly Flat Rate = 0.9%
```

---

# 10. Annuity Calculation

Annuity menggunakan PMT.

```text
Payment =
-PMT(
    monthlyEffectiveRate,
    tenorMonths,
    principal
)
```

Secara matematis:

```text
Payment =
P × r × (1+r)^n
/
((1+r)^n - 1)
```

Komponen:

```text
P = principal
r = effective monthly rate
n = tenor
```

---

# 11. Maximum Principal Strategy

Maximum principal juga mengikuti metode angsuran.

```text
MaximumPrincipalCalculator
        │
        ├── FlatMaximumPrincipalCalculator
        │
        └── AnnuityMaximumPrincipalCalculator
```

## Flat

```text
Max Principal =
(
    Max Installment × Tenor
)
/
(
    1 + Monthly Flat Rate × Tenor
)
```

## Annuity

```text
Max Principal =
PV(
    Effective Monthly Rate,
    Tenor,
    Max Installment
)
```

---

# 12. Insurance Architecture

Insurance harus dipisahkan sebagai domain service.

```text
InsuranceService
       │
       ▼
InsuranceRateRepository
       │
       ▼
Insurance Rate Master
```

Flow:

```text
Age
 ↓
Insurance Tenor
 ↓
Lookup Current Age
 ↓
Lookup Next Age
 ↓
MAX
 ↓
Insurance Rate
 ↓
Premium
```

Insurance rate tidak boleh di-hard-code pada frontend.

---

# 13. Insurance Rate Data

Insurance rate disimpan dalam database.

Conceptual structure:

```text
insurance_rates

id
product_id
age
tenor_years
premium_rate
effective_from
effective_to
active
created_at
updated_at
```

Jika terdapat skema rate berbeda:

```text
fronting_rates
reserve_rates
```

dapat dipisahkan.

---

# 14. Fee Architecture

Gunakan service terpisah:

```text
FeeService
   │
   ├── AdminFeeCalculator
   ├── ProvisionFeeCalculator
   ├── FrontingFeeCalculator
   ├── ReserveCalculator
   ├── VerificationFeeCalculator
   └── FlaggingFeeCalculator
```

Fee configuration berasal dari database/configuration.

---

# 15. Eligibility Architecture

Eligibility dipisahkan dari calculation.

```text
EligibilityEngine
       │
       ├── DbrRule
       ├── AgeRule
       ├── TenorRule
       └── PrincipalRule
```

Engine harus mengumpulkan semua violation.

Contoh:

```json
{
  "status": "OVER",
  "reasons": [
    "DBR melebihi 90%",
    "Tenor melebihi batas"
  ]
}
```

Jangan berhenti pada violation pertama.

---

# 16. Calculation Pipeline

```text
Input
 ↓
Normalize
 ↓
Validate
 ↓
Load Configuration
 ↓
Calculate Age
 ↓
Calculate Maximum Tenor
 ↓
Calculate Maximum Installment
 ↓
Select Installment Strategy
 ↓
Calculate Installment
 ↓
Calculate Maximum Principal
 ↓
Calculate DBR
 ↓
Calculate Remaining Salary
 ↓
Calculate Insurance
 ↓
Calculate Fees
 ↓
Calculate Settlement
 ↓
Calculate Net Disbursement
 ↓
Run Eligibility
 ↓
Generate Breakdown
 ↓
Generate Amortization
 ↓
Persist Simulation
 ↓
Return Result
```

---

# 17. Authentication Architecture

Authentication berada di backend.

Flow:

```text
Login
 ↓
Validate Credential
 ↓
Verify Password
 ↓
Check User Status
 ↓
Create Session / Token
 ↓
Authenticated Request
```

User minimal memiliki:

```text
id
email/username
passwordHash
role
status
```

Password tidak boleh disimpan plaintext.

---

# 18. RBAC Architecture

Authorization:

```text
Authenticated User
       ↓
Load Role
       ↓
Load Permission
       ↓
Check Permission
       ↓
Check Data Scope
       ↓
Allow / Deny
```

Default:

```text
DENY
```

---

# 19. Data Scope Architecture

## Super Admin

```text
scope = ALL
```

## Admin

```text
scope = ADMIN_SCOPE
```

## Marketing

```text
scope = OWN
```

Data filtering harus dilakukan pada backend/database query.

---

# 20. Simulation Architecture

Simulation memiliki ownership.

Minimal:

```text
simulation
├── id
├── simulation_number
├── created_by
├── bpr_id
├── product_id
├── calculation_method
├── input_snapshot
├── result_snapshot
├── business_rule_version
├── parameter_version
├── status
├── created_at
└── updated_at
```

---

# 21. Snapshot Strategy

Saat simulation disimpan, input dan parameter yang digunakan harus dapat direkonstruksi.

Minimal snapshot:

```text
input_snapshot
result_snapshot
business_rule_version
parameter_version
```

Tujuannya agar perubahan parameter di masa depan tidak mengubah interpretasi simulation lama.

---

# 22. Database Architecture

Database dibagi menjadi kelompok:

```text
Authentication
    ↓
Users
Roles
Permissions
Role Permissions

Organization
    ↓
BPR
Branch
Payment Office

Credit Configuration
    ↓
Products
Credit Parameters
Fee Parameters
Insurance Rates

Transactions
    ↓
Simulations
Calculation Results
Amortization

Audit
    ↓
Audit Logs
```

Detail schema akan dibuat pada `DATABASE.md`.

---

# 23. Data Access Layer

Domain layer tidak boleh langsung bergantung pada ORM/database implementation.

Gunakan repository abstraction:

```text
UserRepository
RoleRepository
SimulationRepository
ProductRepository
CreditParameterRepository
InsuranceRateRepository
FeeParameterRepository
AuditRepository
```

Contoh:

```text
InsuranceService
       ↓
InsuranceRateRepository
       ↓
Database
```

---

# 24. API Architecture

API dibagi berdasarkan domain.

```text
/api/auth
/api/users
/api/roles
/api/permissions
/api/products
/api/credit-parameters
/api/insurance-rates
/api/simulations
/api/calculations
/api/reports
/api/audit-logs
```

Calculation:

```text
POST /api/calculations
```

Simulation:

```text
POST   /api/simulations
GET    /api/simulations
GET    /api/simulations/:id
PATCH  /api/simulations/:id
DELETE /api/simulations/:id
```

---

# 25. Calculation vs Simulation

Keduanya harus dipisahkan.

## Calculation

```text
Input
 ↓
Calculation Engine
 ↓
Result
```

Tidak harus menyimpan database.

## Simulation

```text
Input
 ↓
Calculation Engine
 ↓
Result
 ↓
Persist
```

UI dapat melakukan live calculation tanpa membuat record simulation setiap kali field berubah.

---

# 26. Reference Source Architecture

Workbook Excel tidak digunakan sebagai runtime database.

Lokasi:

```text
reference_source/
└── KALKULATOR BPR KOTA 10 THN.xlsx
```

Fungsi:

- reference;
- formula verification;
- data migration;
- regression testing.

Production application tidak membaca workbook untuk setiap calculation.

---

# 27. Data Migration

Flow:

```text
Excel Reference
      ↓
Extraction
      ↓
Validation
      ↓
Transformation
      ↓
Seed / Migration
      ↓
Database
      ↓
Verification
```

Untuk insurance:

```text
Excel
 ↓
Insurance Rate Dataset
 ↓
Review
 ↓
insurance_rates
```

AI tidak boleh mengestimasi rate.

---

# 28. Seed Data Architecture

Seed data minimal:

```text
database/
└── seeds/
    ├── users
    ├── roles
    ├── permissions
    ├── products
    ├── credit_parameters
    ├── fee_parameters
    ├── insurance_rates
    └── ...
```

Seed data harus dapat dijalankan ulang secara aman.

---

# 29. Calculation Versioning

Setiap simulation harus menyimpan:

```text
businessRuleVersion
parameterVersion
calculationMethod
```

Jika formula berubah:

```text
Version 1
Version 2
Version 3
```

simulation lama tetap dapat ditelusuri.

---

# 30. Transaction Boundary

Operasi berikut harus transactional jika menghasilkan perubahan persistent:

- Create Simulation
- Update Simulation
- Delete Simulation
- Change Credit Parameter
- Change Insurance Rate
- Change Role / Permission

Calculation yang hanya menghasilkan preview tidak harus membuka database transaction panjang.

---

# 31. Error Handling

Gunakan error category:

```text
400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Business Rule Validation
500 Internal Server Error
```

Business rule violation seperti DBR > 90% bukan system crash.

Contoh:

```json
{
  "status": "OVER",
  "reasons": [
    {
      "code": "DBR_EXCEEDED",
      "message": "DBR melebihi batas maksimum 90%"
    }
  ]
}
```

---

# 32. Logging

System logging harus membedakan:

```text
Application Log
Security Log
Audit Log
Calculation Log
```

Calculation log tidak boleh menyimpan data sensitif secara berlebihan.

---

# 33. Security Boundary

```text
Browser
   │
   ▼
API
   │
Authentication
   │
Authorization
   │
Application Service
   │
Domain
   │
Repository
   │
Database
```

Browser tidak boleh dianggap trusted environment.

---

# 34. Testing Architecture

Testing dibagi:

```text
Unit Test
Integration Test
Authorization Test
Calculation Regression Test
API Test
End-to-End Test
```

Prioritas tinggi:

```text
Calculation Engine
RBAC
Insurance Lookup
Fee Calculation
Eligibility
```

---

# 35. Calculation Regression Testing

Reference Excel digunakan untuk membuat expected result.

Flow:

```text
Excel Expected Result
        ↓
Automated Test
        ↓
Application Calculation
        ↓
Compare
```

Target:

```text
Difference = 0
```

atau berada dalam tolerance rounding yang disetujui.

---

# 36. Performance Considerations

Calculation engine harus stateless.

Request dapat diproses secara independen.

Jangan menyimpan state kalkulasi user di memory server sebagai sumber kebenaran.

---

# 37. Caching

Data yang relatif jarang berubah dapat di-cache:

- Product configuration
- Credit parameters
- Insurance rate tables
- Fee parameters

Cache harus memiliki invalidation strategy.

Calculation result tidak boleh menggunakan stale parameter tanpa version awareness.

---

# 38. Frontend State

Frontend dapat menyimpan:

- Current Form State
- Current Calculation Result
- UI State

Frontend bukan source of truth untuk:

- Role
- Permission
- Credit Parameters
- Insurance Rates
- Eligibility
- Final Calculation

---

# 39. Recommended Module Boundary

```text
modules/
├── auth/
├── users/
├── roles/
├── permissions/
├── products/
├── credit-parameters/
├── insurance/
├── fees/
├── calculations/
├── simulations/
├── reports/
└── audit/
```

Calculation module dapat menggunakan service dari:

- products
- credit-parameters
- insurance
- fees

tetapi tidak boleh mengandung UI-specific logic.

---

# 40. Dependency Direction

```text
Presentation
      ↓
Application
      ↓
Domain
      ↑
Infrastructure
```

Domain tidak boleh bergantung pada:

- React
- browser API
- ORM
- HTTP framework
- UI component

---

# 41. Recommended Calculation Interfaces

Konseptual interface:

```text
CreditCalculator
InstallmentCalculator
MaximumPrincipalCalculator
InsuranceCalculator
FeeCalculator
EligibilityEngine
AmortizationCalculator
EffectiveRateCalculator
```

Contoh:

```text
CreditCalculator.calculate(input)
```

menghasilkan:

```text
CreditCalculationResult
```

---

# 42. Deterministic Calculation

Untuk input dan parameter yang sama:

```text
Input A
+
Parameter Version X
+
Business Rule Version Y
```

harus selalu menghasilkan:

```text
Result Z
```

Calculation engine tidak boleh bergantung pada:

- random state;
- UI state;
- external AI response;
- uncontrolled external API.

---

# 43. AI Usage Boundary

AI coding assistant dapat membantu:

- generate code;
- generate test;
- refactor;
- documentation;
- migration script.

AI coding assistant tidak boleh:

- mengarang insurance rate;
- mengubah business rule;
- mengubah parameter finansial;
- mengganti formula;
- menentukan eligibility berdasarkan asumsi.

Untuk perubahan business rule:

```text
Human Approval
      ↓
BUSINESS_RULES.md
      ↓
Code
      ↓
Regression Test
```

---

# 44. Reference File Protection

File:

```text
reference_source/KALKULATOR BPR KOTA 10 THN.xlsx
```

diposisikan sebagai immutable reference.

AI agent:

```text
READ = YES
MODIFY = NO
DELETE = NO
```

Jika file perlu diperbarui:

```text
Human Approval
↓
Replace Reference
↓
Re-validate
↓
Update Business Rules / Parameters
↓
Update Seeds
↓
Regression Test
```

---

# 45. Environment Architecture

Minimal:

```text
Development
Staging
Production
```

Environment configuration:

```text
.env
.env.local
.env.staging
.env.production
```

Secrets tidak boleh disimpan dalam source code.

Contoh:

```text
DATABASE_URL
AUTH_SECRET
OPENROUTER_API_KEY
```

menggunakan environment variables jika memang diperlukan.

---

# 46. AI API Usage

AI bukan bagian dari calculation engine.

Jika aplikasi nantinya menggunakan AI:

```text
AI Service
```

harus terpisah dari:

```text
Credit Calculation Engine
```

AI tidak boleh menentukan:

- angsuran;
- DBR;
- plafond;
- insurance rate;
- eligibility.

AI hanya boleh membantu fitur non-deterministik yang memang direncanakan.

---

# 47. Deployment Architecture

Target awal:

```text
Browser
   ↓
Web Server
   ↓
Application Server
   ↓
Database
```

Production harus menggunakan:

- HTTPS
- Secure Headers
- Environment Secrets
- Database Backup
- Error Monitoring
- Audit Logging

Detail deployment ditentukan setelah stack final.

---

# 48. Architecture Decision Records

Keputusan arsitektur penting harus dicatat.

Contoh:

```text
ADR-001
Calculation engine menggunakan domain service.

ADR-002
Excel tidak digunakan sebagai runtime data source.

ADR-003
Insurance rate disimpan di database.

ADR-004
Calculation method menggunakan FLAT dan ANNUITY.

ADR-005
RBAC diterapkan di backend.
```

---

# 49. Non-Goals

Architecture ini tidak mencakup:

- Core banking system.
- Loan origination system penuh.
- Payment gateway.
- Disbursement banking.
- Real-time bank host-to-host.
- AI underwriting.
- Credit scoring machine learning.

Fitur tersebut dapat menjadi extension di masa depan.

---

# 50. Definition of Done

Architecture dianggap siap untuk tahap database design jika:

- [ ] Layer architecture disepakati.
- [ ] Calculation engine terpisah dari UI.
- [ ] Flat dan Annuity memiliki strategy terpisah.
- [ ] Insurance menjadi domain service.
- [ ] Fee menjadi domain service.
- [ ] Eligibility menjadi domain engine.
- [ ] RBAC berada di backend.
- [ ] Data scope berada di backend/database.
- [ ] Excel tidak menjadi runtime dependency.
- [ ] Reference source dipisahkan.
- [ ] Database seed dipisahkan dari business rule.
- [ ] Calculation dan Simulation dipisahkan.
- [ ] Versioning business rules tersedia.
- [ ] Regression testing tersedia.
- [ ] AI tidak menjadi source of financial truth.
- [ ] Dependency direction jelas.
- [ ] Security boundary jelas.

---

# 51. Technology Stack (LOCKED)

Stack telah dikonfirmasi dan di-lock:

```text
Framework  : Next.js (full-stack, App Router)
Language   : TypeScript
Styling    : Tailwind CSS
ORM        : Prisma
Database   : PostgreSQL
```

Implikasi terhadap arsitektur:

- API routes menggunakan Next.js API Routes (`/app/api/v1/...`)
- Database schema dan migration menggunakan Prisma (`prisma/schema.prisma`, `prisma/migrations/`)
- PostgreSQL mendukung `JSONB` untuk `input_snapshot` dan `result_snapshot`
- TypeScript digunakan di seluruh layer (frontend, API, domain, repository)
- Tailwind CSS digunakan untuk styling frontend
- Seed menggunakan `prisma/seed.ts`

---

# 52. Kesimpulan Architecture

Arsitektur aplikasi Credit Calculator menggunakan pendekatan **layered/domain-oriented architecture** dengan calculation engine sebagai komponen inti.

Prinsip utama:

1. **Frontend hanya menangani UI dan interaction.**
2. **Backend menjadi authoritative layer untuk authentication, authorization, validation, dan calculation.**
3. **Business calculation ditempatkan di domain/calculation layer dan tidak diduplikasi di frontend.**
4. **Metode angsuran menggunakan Strategy Pattern dengan dua pilihan: FLAT dan ANNUITY/PMT.**
5. **Insurance, fee, eligibility, age, tenor, dan effective-rate calculation dipisahkan menjadi domain service/engine.**
6. **Excel ditempatkan di `reference_source/` sebagai sumber referensi dan regression testing, bukan runtime database.**
7. **Rate asuransi dan parameter bisnis yang digunakan aplikasi dimigrasikan ke PostgreSQL melalui Prisma seed/migration.**
8. **RBAC dan data scope ditegakkan di backend/database, bukan hanya melalui visibility menu frontend.**
9. **Calculation dan Simulation dipisahkan agar live calculation tidak otomatis membuat record database.**
10. **Setiap simulation menyimpan `businessRuleVersion`, `parameterVersion`, dan `calculationMethod` agar hasil historis dapat direkonstruksi.**
11. **Calculation engine harus deterministic: input + parameter version + business rule version yang sama harus menghasilkan hasil yang sama.**
12. **AI coding agent tidak boleh menjadi sumber kebenaran untuk formula, rate, parameter finansial, atau eligibility.**

Target arsitektur:

```text
                    USER
                     │
                     ▼
                FRONTEND
                     │
                     ▼
              API / BACKEND
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
       RBAC              APPLICATION SERVICES
                                │
                                ▼
                         DOMAIN / CALCULATION
                                │
             ┌──────────────────┼──────────────────┐
             ▼                  ▼                  ▼
        Installment         Insurance             Fees
        FLAT/ANNUITY          Engine              Engine
             │                  │                  │
             └──────────────────┼──────────────────┘
                                ▼
                         Eligibility Engine
                                │
                                ▼
                          Result Builder
                                │
                                ▼
                           Repository
                                │
                                ▼
                            DATABASE

Excel
  │
  ▼
reference_source/
  │
  └── reference / migration / regression testing
```

**Status: `LOCKED — READY FOR IMPLEMENTATION`**
