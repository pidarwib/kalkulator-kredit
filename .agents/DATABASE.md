# DATABASE DESIGN — CREDIT CALCULATOR BPR

## 1. Tujuan

Dokumen ini mendefinisikan struktur database aplikasi Credit Calculator BPR berdasarkan:

- `PRD.md`
- `ROLE_PERMISSION.md`
- `BUSINESS_RULES.md`
- `ARCHITECTURE.md`

Database harus mendukung:

1. Authentication
2. Role-Based Access Control (RBAC)
3. Data scope
4. BPR / branch / payment office
5. Product configuration
6. Credit parameters
7. Insurance rate master
8. Fee parameters
9. Credit calculations
10. Saved simulations
11. Amortization schedules
12. Business rule versioning
13. Parameter versioning
14. Audit logging

---

# 2. Prinsip Database

## 2.1 Database sebagai Source of Truth

Untuk production:

```text
Database
   ↓
Master Parameter
   ↓
Calculation Engine
```

Excel bukan runtime database.

Workbook Excel digunakan sebagai:

- reference source;
- migration source;
- regression testing source.

Lokasi:

```text
reference_source/
└── KALKULATOR BPR KOTA 10 THN.xlsx
```

Excel tidak boleh dibaca setiap kali kalkulasi.

---

# 3. Logical Database Groups

```text
AUTHENTICATION
    ├── users
    ├── roles
    ├── permissions
    └── role_permissions

ORGANIZATION
    ├── bprs
    ├── branches
    └── payment_offices

PRODUCT CONFIGURATION
    ├── products
    ├── credit_parameters
    ├── fee_parameters
    └── insurance_rates

CALCULATION
    ├── calculations
    ├── calculation_results
    └── amortization_schedules

SIMULATION
    └── simulations

VERSIONING
    ├── business_rule_versions
    └── parameter_versions

AUDIT
    └── audit_logs
```

---

# 4. Entity Relationship Overview

```text
users
  │
  ├──────── roles
  │             │
  │             └── permissions
  │
  └──────── simulations
                   │
                   ├── products
                   │      │
                   │      ├── credit_parameters
                   │      ├── fee_parameters
                   │      └── insurance_rates
                   │
                   ├── calculation_results
                   │
                   └── amortization_schedules

bprs
  │
  ├── branches
  │
  └── payment_offices
```

---

# 5. users

Menyimpan seluruh user aplikasi.

Fields:

```text
users
--------------------------------
id
username
email
password_hash
full_name
phone
role_id
bpr_id
branch_id
status
last_login_at
created_at
updated_at
deleted_at
```

Rules:

- `username` unique.
- `email` unique jika digunakan.
- Password wajib hash.
- Password plaintext dilarang.
- Status minimal: `ACTIVE`, `INACTIVE`, `SUSPENDED`.
- Soft delete menggunakan `deleted_at`.

---

# 6. roles

Fields:

```text
roles
--------------------------------
id
code
name
description
is_active
created_at
updated_at
```

Role awal:

```text
SUPER_ADMIN
ADMIN
MARKETING
```

`code` harus unique.

---

# 7. permissions

Fields:

```text
permissions
--------------------------------
id
code
name
description
module
created_at
updated_at
```

Contoh permission (canonical code dari `ROLE_PERMISSION.md`):

```text
USER_VIEW
USER_CREATE
USER_UPDATE
USER_DELETE

SIMULATION_VIEW
SIMULATION_CREATE
SIMULATION_UPDATE
SIMULATION_DELETE

CREDIT_CALCULATE
CREDIT_VIEW_RESULT
CREDIT_EXPORT

MASTER_VIEW
MASTER_CREATE
MASTER_UPDATE
MASTER_DELETE

CREDIT_PARAMETER_VIEW
CREDIT_PARAMETER_CREATE
CREDIT_PARAMETER_UPDATE
CREDIT_PARAMETER_DELETE

AUDIT_VIEW
AUDIT_EXPORT
```

`code` harus unique.

---

# 8. role_permissions

Relasi many-to-many:

```text
role_permissions
--------------------------------
id
role_id
permission_id
created_at
```

Constraint:

```text
UNIQUE(role_id, permission_id)
```

---

# 9. User Scope

Scope:

```text
ALL
BPR
BRANCH
OWN
```

Contoh:

```text
SUPER_ADMIN
→ ALL

ADMIN
→ BPR / BRANCH sesuai assignment

MARKETING
→ OWN
```

Scope enforcement dilakukan backend.

---

# 10. bprs

```text
bprs
--------------------------------
id
code
name
status
created_at
updated_at
deleted_at
```

`code` unique.

---

# 11. branches

```text
branches
--------------------------------
id
bpr_id
code
name
address
status
created_at
updated_at
deleted_at
```

Relationship:

```text
BPR 1 ──── N Branch
```

---

# 12. payment_offices

```text
payment_offices
--------------------------------
id
bpr_id
branch_id
code
name
type
status
created_at
updated_at
deleted_at
```

Type dapat mencakup:

```text
POS
BANK
OTHER
```

---

# 13. products

```text
products
--------------------------------
id
bpr_id
code
name
description
status
created_at
updated_at
deleted_at
```

Relationship:

```text
BPR 1 ──── N Products
```

Nilai aktual harus berasal dari master bisnis, bukan asumsi AI.

---

# 14. credit_parameters

```text
credit_parameters
--------------------------------
id
product_id

maximum_age_years
maximum_age_months

maximum_tenor_months
maximum_principal

maximum_dbr

flat_annual_rate
flat_monthly_rate

principal_rounding_increment

installment_deduction_periods

effective_from
effective_to

version
is_active

created_by
created_at
updated_at
```

---

# 15. Credit Parameter Rules

Default yang telah ditetapkan dalam Business Rules:

```text
maximum_dbr
    = 90%

flat_annual_rate
    = 10.8% (digunakan untuk FLAT dan ANNUITY, tanpa konversi effective rate)

flat_monthly_rate
    = 10.8% / 12 = 0.9%

maximum_tenor_months
    = 120

maximum_principal
    = Rp200.000.000

principal_rounding_increment
    = Rp100.000

installment_deduction_periods
    = 2
```

Produk hanya memiliki SATU annual rate (10,8%), digunakan untuk kedua metode angsuran (FLAT dan ANNUITY).

Nilai tersebut adalah configuration data.

Business Rules menjelaskan maknanya.

Database menyimpan nilai aktualnya.

---

# 16. Rate Representation

Rate disimpan sebagai numeric decimal.

```text
10.8%  → 0.108
90%    → 0.90
25.5%  → 0.255
```

Jangan menyimpan rate sebagai string seperti:

```text
"10.8%"
```

---

# 17. fee_parameters

```text
fee_parameters
--------------------------------
id
product_id
payment_office_id

admin_rate
provision_rate

verification_fee
flagging_fee

fronting_rate
reserve_rate

effective_from
effective_to

version
is_active

created_by
created_at
updated_at
```

Fee dapat bergantung pada:

- BPR;
- product;
- payment office;
- skema bisnis;
- periode berlaku.

Default yang ditetapkan:
- `verification_fee` = Rp1.500.000
- `flagging_fee` = Rp38.000 (disimpan sebagai parameter, dikurangkan satu kali pada Terima Bersih, tidak digabung ke `total_fees`)

Fee tidak boleh di-hard-code pada frontend.

---

# 18. insurance_rates

```text
insurance_rates
--------------------------------
id
product_id
age
tenor_years
premium_rate

effective_from
effective_to

version
is_active

created_at
updated_at
```

---

# 19. Insurance Rate Rules

Lookup menggunakan:

```text
age
+
tenor_years
```

Kemudian:

```text
Current Age Rate
+
Next Age Rate
↓
MAX
```

Formula detail berada di:

```text
BUSINESS_RULES.md
```

Database hanya menyimpan rate.

---

# 20. Insurance Data Migration

Rate asuransi **tidak boleh ditebak AI**.

Source:

```text
reference_source/
└── KALKULATOR BPR KOTA 10 THN.xlsx
```

Flow:

```text
Excel
 ↓
Extract
 ↓
Validate
 ↓
Review
 ↓
Seed
 ↓
insurance_rates
```

AI coding agent wajib mempertahankan nilai persis dari source.

Tidak boleh:

- interpolate;
- approximate;
- round tanpa rule;
- invent rate;
- mengisi missing rate dengan asumsi.

---

# 21. business_rule_versions

```text
business_rule_versions
--------------------------------
id
version
name
description
document_hash
status
effective_from
effective_to
created_by
created_at
```

Contoh:

```text
BR-1.0
BR-1.1
BR-2.0
```

---

# 22. parameter_versions

```text
parameter_versions
--------------------------------
id
version
product_id
description
effective_from
effective_to
status
created_by
created_at
```

Tujuan:

```text
Version 1
↓
Version 2
```

Simulation lama tetap dapat direkonstruksi.

---

# 23. calculations

Untuk calculation request/result jika perlu dipersist:

```text
calculations
--------------------------------
id
calculation_number

created_by

bpr_id
product_id
payment_office_id

calculation_method

business_rule_version
parameter_version

input_snapshot
result_snapshot

status

created_at
```

`input_snapshot` dan `result_snapshot` dapat menggunakan JSON/JSONB.

---

# 24. Calculation vs Simulation

## Calculation

```text
Input
 ↓
Calculation Engine
 ↓
Result
```

Tidak wajib disimpan permanen.

API:

```text
POST /api/calculations
```

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

API:

```text
POST /api/simulations
```

---

# 25. simulations

```text
simulations
--------------------------------
id
simulation_number

created_by

bpr_id
branch_id
payment_office_id
product_id

calculation_method

business_rule_version
parameter_version

input_snapshot
result_snapshot

status

created_at
updated_at
deleted_at
```

---

# 26. Simulation Ownership

Marketing hanya dapat melihat simulation miliknya:

```text
created_by = currentUser.id
```

Admin dapat melihat sesuai scope.

Super Admin dapat melihat seluruh data.

Authorization tetap dilakukan backend.

---

# 27. simulation status

**Calculation Status** (`calculation_results.eligibility_status`) — hasil eligibility engine:

```text
OK
OVER
```

**Simulation Lifecycle Status** (field `status` pada table `simulations`):

```text
DRAFT
SAVED
ARCHIVED
```

---

# 28. calculation_results

Jika hasil calculation dinormalisasi untuk reporting:

```text
calculation_results
--------------------------------
id
simulation_id

age_current
age_at_maturity

tenor_months
tenor_years_insurance

max_tenor_by_age
max_tenor_final

max_installment
max_principal_by_capacity
max_principal_final

requested_principal

installment
dbr
remaining_salary

insurance_rate
premium
fronting_fee
reserve

admin_fee
provision_fee
verification_fee
flagging_fee

installment_deduction
payoff_amount

total_fees
net_disbursement

eligibility_status

created_at
updated_at
```

---

# 29. Eligibility Reasons

Untuk reporting alasan `OVER`:

```text
eligibility_reasons
--------------------------------
id
simulation_id
code
message
created_at
```

Contoh:

```text
DBR_EXCEEDED
AGE_EXCEEDED
TENOR_EXCEEDED
PRINCIPAL_EXCEEDED
```

Satu simulation dapat memiliki banyak reason.

---

# 30. amortization_schedules

```text
amortization_schedules
--------------------------------
id
simulation_id
period_number
payment_date

opening_balance
principal_payment
margin_payment
installment
closing_balance

created_at
```

Relationship:

```text
Simulation 1 ──── N Amortization Schedule
```

---

# 31. Flat Amortization

```text
Principal Payment =
Principal / Tenor
```

```text
Margin Payment =
Principal × Flat Monthly Rate
```

```text
Installment =
Principal Payment + Margin Payment
```

Periode terakhir harus menangani residual akibat rounding.

---

# 32. Annuity Amortization

```text
Margin Payment =
Opening Balance × Monthly Rate (flat_monthly_rate = flat_annual_rate / 12)
```

```text
Principal Payment =
Installment - Margin Payment
```

```text
Closing Balance =
Opening Balance - Principal Payment
```

Periode terakhir harus disesuaikan terhadap residual.

---

# 33. audit_logs

```text
audit_logs
--------------------------------
id
user_id

action
entity_type
entity_id

old_value
new_value

ip_address
user_agent

created_at
```

Contoh action:

```text
LOGIN
LOGOUT
CREATE_USER
UPDATE_USER
DELETE_USER

CREATE_SIMULATION
UPDATE_SIMULATION
DELETE_SIMULATION

UPDATE_CREDIT_PARAMETER
UPDATE_INSURANCE_RATE
UPDATE_FEE_PARAMETER

ROLE_ASSIGNMENT
PERMISSION_CHANGE
```

---

# 34. Audit Requirements

Audit wajib untuk perubahan:

- user;
- role;
- permission;
- credit parameter;
- insurance rate;
- fee parameter;
- simulation;
- business rule version;
- parameter version.

Audit tidak boleh dapat diubah oleh Marketing.

---

# 35. Soft Delete

Entity yang memiliki historical importance menggunakan:

```text
deleted_at
```

Minimal:

- users;
- bprs;
- branches;
- payment_offices;
- products;
- simulations.

Historical financial records tidak boleh hard-delete tanpa kebijakan eksplisit.

---

# 36. Effective Dating

Parameter finansial mendukung:

```text
effective_from
effective_to
```

Contoh:

```text
10.8%
effective_from = 2026-01-01
effective_to   = 2026-12-31
```

Jika rate berubah, buat parameter baru; jangan overwrite historical data tanpa versioning.

---

# 37. Unique Constraints

Minimal:

```text
users.username
users.email

roles.code
permissions.code

bprs.code
branches.(bpr_id, code)
payment_offices.(bpr_id, code)

products.(bpr_id, code)

insurance_rates.(
    product_id,
    age,
    tenor_years,
    effective_from
)
```

Constraint final disesuaikan dengan database engine.

---

# 38. Foreign Key Rules

```text
users.role_id
    → roles.id

users.bpr_id
    → bprs.id

users.branch_id
    → branches.id

branches.bpr_id
    → bprs.id

products.bpr_id
    → bprs.id

credit_parameters.product_id
    → products.id

insurance_rates.product_id
    → products.id

simulations.created_by
    → users.id

simulations.product_id
    → products.id

calculation_results.simulation_id
    → simulations.id

amortization_schedules.simulation_id
    → simulations.id
```

---

# 39. Indexing

Index minimal:

```text
users.username
users.email
users.role_id
users.bpr_id
users.branch_id

branches.bpr_id

payment_offices.bpr_id
payment_offices.branch_id

products.bpr_id

credit_parameters.product_id
credit_parameters.is_active

fee_parameters.product_id
fee_parameters.payment_office_id
fee_parameters.is_active

insurance_rates.product_id
insurance_rates.age
insurance_rates.tenor_years
insurance_rates.is_active

simulations.created_by
simulations.bpr_id
simulations.product_id
simulations.created_at

calculation_results.simulation_id

amortization_schedules.simulation_id

audit_logs.user_id
audit_logs.entity_type
audit_logs.entity_id
audit_logs.created_at
```

---

# 40. JSON Snapshot

Jika menggunakan PostgreSQL, gunakan JSONB untuk:

```text
input_snapshot
result_snapshot
old_value
new_value
```

Contoh:

```json
{
  "netSalary": 8500000,
  "requestedPrincipal": 100000000,
  "tenorMonths": 120,
  "calculationMethod": "FLAT"
}
```

Snapshot harus menyimpan data yang diperlukan untuk reconstructability.

---

# 41. Money Storage

Nilai uang menggunakan `NUMERIC/DECIMAL` atau integer-safe representation.

Untuk IDR, BIGINT dapat digunakan untuk nilai rupiah integer.

Jika calculation membutuhkan decimal intermediate:

```text
DECIMAL / NUMERIC
```

digunakan.

Jangan menggunakan floating point binary untuk financial persistence.

---

# 42. Rate Storage

Rate disimpan sebagai:

```text
DECIMAL
```

Contoh:

```text
10.8%  → 0.108
90%    → 0.90
25.5%  → 0.255
```

Precision dan scale ditentukan sesuai database engine.

---

# 43. Database Seed Structure

```text
database/
├── migrations/
│
└── seeds/
    ├── roles.seed
    ├── permissions.seed
    ├── role_permissions.seed
    ├── bprs.seed
    ├── branches.seed
    ├── payment_offices.seed
    ├── products.seed
    ├── credit_parameters.seed
    ├── fee_parameters.seed
    └── insurance_rates.seed
```

---

# 44. Seed Source

Seed data finansial harus memiliki provenance:

```text
source_file
source_sheet
source_reference
imported_at
imported_by
```

Untuk insurance rate:

```text
source_file =
KALKULATOR BPR KOTA 10 THN.xlsx

source_sheet =
Asuransi
```

Setiap rate harus dapat ditelusuri kembali ke sumbernya.

---

# 45. Reference Source vs Database

```text
reference_source/
    ↓
Excel asli
    ↓
Migration / Extraction
    ↓
database/seeds/
    ↓
Database
    ↓
Application
```

Jangan:

```text
Application
    ↓
Excel
```

---

# 46. Security

Database harus:

- menggunakan least privilege;
- credential tidak disimpan di source code;
- connection menggunakan environment variables;
- production database tidak diekspos langsung ke public internet;
- backup dilakukan berkala;
- audit tersedia;
- sensitive data dibatasi sesuai kebutuhan.

---

# 47. Backup

Minimal:

```text
Daily Backup
Retention Policy
Restore Test
```

Financial simulation data harus memiliki recovery strategy.

---

# 48. Migration Rules

Setiap perubahan schema menggunakan migration.

Contoh:

```text
001_create_users
002_create_roles
003_create_permissions
004_create_products
005_create_credit_parameters
...
```

Production schema tidak boleh diubah manual tanpa migration.

---

# 49. Database Transaction

Transaction wajib digunakan untuk operasi yang membutuhkan atomicity.

Contoh:

```text
Create Simulation
+
Calculation Result
+
Amortization Schedule
```

harus berhasil seluruhnya atau rollback seluruhnya.

---

# 50. Concurrency

Parameter update harus memperhatikan concurrent modification.

Gunakan:

```text
optimistic locking
```

atau mekanisme versioning.

Tujuannya mencegah dua admin menimpa perubahan parameter secara tidak sengaja.

---

# 51. Parameter Change Workflow

```text
Admin
 ↓
Update Parameter
 ↓
Validate
 ↓
Create New Parameter Version
 ↓
Audit Log
 ↓
Activate
```

Jangan overwrite parameter historical yang sudah digunakan simulation.

---

# 52. Insurance Rate Update Workflow

```text
Excel / Official Source
        ↓
Extraction
        ↓
Validation
        ↓
Review
        ↓
Seed / Import
        ↓
New Parameter Version
        ↓
Audit
        ↓
Activate
        ↓
Regression Test
```

AI tidak boleh menentukan rate.

---

# 53. Calculation Reproducibility

Setiap saved simulation harus dapat direkonstruksi menggunakan:

```text
input_snapshot
+
business_rule_version
+
parameter_version
```

Jika parameter sudah tidak aktif, historical data tetap dapat ditelusuri.

---

# 54. Recommended Database Separation

Logical separation:

```text
AUTH
CONFIGURATION
CALCULATION
SIMULATION
AUDIT
```

Physical schema dapat tetap satu database pada tahap awal.

Tidak perlu memecah menjadi beberapa database sebelum ada kebutuhan scale/security yang jelas.

---

# 55. Initial Database Priority

Tahap pertama:

```text
1. users
2. roles
3. permissions
4. role_permissions

5. bprs
6. branches
7. payment_offices

8. products
9. credit_parameters
10. fee_parameters
11. insurance_rates

12. simulations
13. calculation_results
14. amortization_schedules

15. business_rule_versions
16. parameter_versions

17. audit_logs
```

---

# 56. Definition of Done

Database design siap implementation jika:

- [ ] User/RBAC schema tersedia.
- [ ] Data scope dapat diterapkan.
- [ ] BPR/branch/payment office tersedia.
- [ ] Product tersedia.
- [ ] Credit parameters tersedia.
- [ ] Fee parameters tersedia.
- [ ] Insurance rate master tersedia.
- [ ] Calculation result dapat disimpan.
- [ ] Simulation ownership tersedia.
- [ ] Amortization tersedia.
- [ ] Eligibility reasons dapat disimpan.
- [ ] Business rule version tersedia.
- [ ] Parameter version tersedia.
- [ ] Audit log tersedia.
- [ ] Historical result dapat direkonstruksi.
- [ ] Reference Excel dipisahkan dari runtime database.
- [ ] Seed/migration strategy tersedia.
- [ ] Financial values menggunakan tipe yang aman.
- [ ] Rate menggunakan decimal.
- [ ] Foreign keys tersedia.
- [ ] Index utama tersedia.
- [ ] Soft delete diterapkan pada entity relevan.
- [ ] Effective dating tersedia untuk parameter finansial.
- [ ] Transaction boundary didefinisikan.

---

# 57. Kesimpulan Database Architecture

Database Credit Calculator harus diperlakukan sebagai **financial application database**, bukan sekadar database CRUD.

Prinsip utama:

1. RBAC dan data scope ditegakkan melalui backend/database.
2. Parameter kredit, fee, dan insurance rate disimpan sebagai master/configuration data.
3. Excel berada di `reference_source/` dan bukan runtime dependency.
4. Insurance rate dimigrasikan dari Excel secara exact; AI tidak boleh mengestimasi angka.
5. Simulation menyimpan input/result snapshot agar historical calculation dapat direkonstruksi.
6. Business rule version dan parameter version dipisahkan.
7. Financial amount menggunakan numeric/integer-safe representation.
8. Rate disimpan sebagai decimal.
9. Amortization schedule dipisahkan dari simulation header.
10. Audit log wajib untuk perubahan parameter, permission, user, dan simulation.
11. Parameter lama tidak boleh ditimpa jika sudah digunakan simulation historis.
12. Database seed menjadi jembatan antara reference Excel dan production database.

Target:

```text
reference_source/
        │
        ▼
     EXCEL
        │
        ▼
   MIGRATION / SEED
        │
        ▼
     DATABASE
        │
 ┌──────┼────────┐
 ▼      ▼        ▼
RBAC  CONFIG  SIMULATION
        │        │
        ▼        ▼
    CALCULATION RESULT
        │
        ▼
      AUDIT
```

Status:

```text
DRAFT — READY FOR DATABASE IMPLEMENTATION / SCHEMA REVIEW
```
