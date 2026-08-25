# API SPECIFICATION — CREDIT CALCULATOR BPR

## 1. Tujuan

Dokumen ini mendefinisikan kontrak komunikasi antara frontend dan backend aplikasi Credit Calculator BPR.

Dokumen ini tidak mendefinisikan ulang formula kredit.

Formula dan aturan perhitungan tetap mengacu pada:

```text
BUSINESS_RULES.md
```

API Specification mendefinisikan:

- endpoint;
- HTTP method;
- authentication;
- permission;
- data scope;
- request;
- validation;
- response;
- error response;
- status code;
- resource ownership.

---

# 2. API Architecture

```text
Frontend
    ↓
HTTPS
    ↓
API
    ↓
Authentication
    ↓
Authorization / RBAC
    ↓
Data Scope
    ↓
Validation
    ↓
Application Service
    ↓
Calculation Engine / Repository
    ↓
Database
```

Frontend tidak boleh mengakses database secara langsung.

---

# 3. Base URL

Development:

```text
http://localhost:3000/api
```

Production:

```text
https://<production-domain>/api
```

Base URL production harus berasal dari environment configuration.

---

# 4. API Versioning

Gunakan versioning:

```text
/api/v1
```

Contoh:

```text
/api/v1/calculations
```

Tujuannya agar perubahan API pada masa depan tidak merusak client lama.

---

# 5. Authentication

Protected endpoint membutuhkan authentication.

Recommended session flow:

```text
POST /api/v1/auth/login
        ↓
Session Created
        ↓
Authenticated Request
        ↓
Protected Endpoint
```

Authentication mechanism harus konsisten dengan implementation stack.

---

# 6. Authorization

Setiap protected endpoint harus mendefinisikan:

```text
Authentication
+
Permission
+
Scope
```

Contoh:

```text
POST /api/v1/simulations

Authentication:
Required

Permission:
SIMULATION_CREATE

Scope:
User's authorized BPR / branch / ownership
```

Frontend hiding menu bukan authorization.

---

# 7. Standard HTTP Status

Gunakan:

```text
200 OK
201 Created
204 No Content

400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Unprocessable Entity
429 Too Many Requests

500 Internal Server Error
```

Gunakan `401` untuk authentication failure.

Gunakan `403` ketika user sudah authenticated tetapi tidak memiliki permission/scope.

---

# 8. Standard Error Response

Format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Pesan yang aman untuk user.",
    "details": {}
  }
}
```

Contoh:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Data yang dimasukkan tidak valid.",
    "details": {
      "tenorMonths": "Tenor melebihi batas maksimum."
    }
  }
}
```

Jangan mengirim:

- stack trace;
- SQL query;
- database credential;
- API key;
- internal filesystem path;
- secret.

---

# 9. Standard Pagination

List endpoint menggunakan:

```text
?page=1&pageSize=20
```

Response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Maximum `pageSize` harus dibatasi oleh backend.

---

# 10. Standard List Response

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

---

# 11. AUTH API

## 11.1 Login

```text
POST /api/v1/auth/login
```

Authentication:

```text
Not required
```

Request:

```json
{
  "username": "marketing01",
  "password": "********"
}
```

Backend:

```text
Validate
 ↓
Find User
 ↓
Verify Password Hash
 ↓
Check Status
 ↓
Create Session
 ↓
Return User Context
```

Success:

```text
200 OK
```

Response:

```json
{
  "user": {
    "id": "user-id",
    "username": "marketing01",
    "fullName": "Marketing User",
    "role": "MARKETING"
  }
}
```

Failure:

```text
401 Unauthorized
```

Message harus generic.

---

## 11.2 Logout

```text
POST /api/v1/auth/logout
```

Authentication:

```text
Required
```

Success:

```text
204 No Content
```

---

## 11.3 Current User

```text
GET /api/v1/auth/me
```

Authentication:

```text
Required
```

Response:

```json
{
  "user": {
    "id": "user-id",
    "username": "marketing01",
    "fullName": "Marketing User",
    "role": "MARKETING",
    "permissions": [
      "CALCULATION_RUN",
      "SIMULATION_CREATE",
      "SIMULATION_VIEW"
    ],
    "scope": "OWN"
  }
}
```

---

# 12. USER API

## 12.1 List Users

```text
GET /api/v1/users
```

Permission:

```text
USER_VIEW
```

Query:

```text
?page=1
&pageSize=20
&search=
&role=
&status=
&branchId=
```

Scope:

```text
Admin's authorized scope
```

Marketing:

```text
DENY
```

---

## 12.2 Create User

```text
POST /api/v1/users
```

Permission:

```text
USER_CREATE
```

Request:

```json
{
  "username": "marketing01",
  "email": "marketing@example.com",
  "fullName": "Marketing User",
  "phone": "08xxxxxxxxxx",
  "roleId": "role-id",
  "bprId": "bpr-id",
  "branchId": "branch-id"
}
```

Backend harus memvalidasi apakah caller boleh memberikan role dan scope tersebut.

Success:

```text
201 Created
```

---

## 12.3 Get User

```text
GET /api/v1/users/:id
```

Permission:

```text
USER_VIEW
```

Backend wajib melakukan scope check.

---

## 12.4 Update User

```text
PATCH /api/v1/users/:id
```

Permission:

```text
USER_UPDATE
```

Backend wajib memvalidasi perubahan role/scope.

---

## 12.5 Delete User

```text
DELETE /api/v1/users/:id
```

Permission:

```text
USER_DELETE
```

Default implementation:

```text
Soft Delete
```

Success:

```text
204 No Content
```

---

# 13. ROLE API

## 13.1 List Roles

```text
GET /api/v1/roles
```

Permission:

```text
ROLE_VIEW
```

---

## 13.2 Create Role

```text
POST /api/v1/roles
```

Permission:

```text
ROLE_CREATE
```

---

## 13.3 Update Role

```text
PATCH /api/v1/roles/:id
```

Permission:

```text
ROLE_UPDATE
```

---

## 13.4 Delete Role

```text
DELETE /api/v1/roles/:id
```

Permission:

```text
ROLE_DELETE
```

System role yang digunakan core authorization tidak boleh dihapus sembarangan.

---

# 14. PERMISSION API

## 14.1 List Permissions

```text
GET /api/v1/permissions
```

Permission:

```text
PERMISSION_VIEW
```

---

## 14.2 Assign Permission

```text
POST /api/v1/roles/:roleId/permissions
```

Permission:

```text
ROLE_PERMISSION_ASSIGN
```

Request:

```json
{
  "permissionIds": [
    "permission-id-1",
    "permission-id-2"
  ]
}
```

Perubahan wajib masuk audit log.

---

# 15. BPR API

## 15.1 List BPR

```text
GET /api/v1/bprs
```

Permission:

```text
MASTER_VIEW
```

---

## 15.2 Create BPR

```text
POST /api/v1/bprs
```

Permission:

```text
MASTER_CREATE
```

---

## 15.3 Update BPR

```text
PATCH /api/v1/bprs/:id
```

Permission:

```text
MASTER_UPDATE
```

---

# 16. BRANCH API

## 16.1 List Branches

```text
GET /api/v1/branches
```

Query:

```text
?bprId=
&page=
&pageSize=
```

Permission:

```text
MASTER_VIEW
```

---

## 16.2 Create Branch

```text
POST /api/v1/branches
```

Permission:

```text
MASTER_CREATE
```

---

## 16.3 Update Branch

```text
PATCH /api/v1/branches/:id
```

Permission:

```text
MASTER_UPDATE
```

---

# 17. PAYMENT OFFICE API

## 17.1 List Payment Offices

```text
GET /api/v1/payment-offices
```

Query:

```text
?bprId=
&branchId=
```

Permission:

```text
MASTER_VIEW
```

---

## 17.2 Create Payment Office

```text
POST /api/v1/payment-offices
```

Permission:

```text
MASTER_CREATE
```

---

## 17.3 Update Payment Office

```text
PATCH /api/v1/payment-offices/:id
```

Permission:

```text
MASTER_UPDATE
```

---

# 18. PRODUCT API

## 18.1 List Products

```text
GET /api/v1/products
```

Permission:

```text
MASTER_VIEW
```

Query:

```text
?bprId=
&status=ACTIVE
```

---

## 18.2 Get Product

```text
GET /api/v1/products/:id
```

Permission:

```text
MASTER_VIEW
```

---

## 18.3 Create Product

```text
POST /api/v1/products
```

Permission:

```text
MASTER_CREATE
```

---

## 18.4 Update Product

```text
PATCH /api/v1/products/:id
```

Permission:

```text
MASTER_UPDATE
```

---

# 19. CREDIT PARAMETER API

## 19.1 Get Active Parameters

```text
GET /api/v1/products/:productId/credit-parameters
```

Permission:

```text
CREDIT_PARAMETER_VIEW
```

Response:

```json
{
  "productId": "product-id",
  "version": "v1",
  "maximumDbr": 0.90,
  "flatAnnualRate": 0.108,
  "maximumTenorMonths": 120,
  "maximumPrincipal": 200000000,
  "principalRoundingIncrement": 100000
}
```

---

## 19.2 Update Credit Parameter

```text
POST /api/v1/products/:productId/credit-parameters/versions
```

Permission:

```text
CREDIT_PARAMETER_CREATE
```

Request:

```json
{
  "maximumDbr": 0.90,
  "flatAnnualRate": 0.108,
  "maximumTenorMonths": 120,
  "maximumPrincipal": 200000000,
  "principalRoundingIncrement": 100000,
  "effectiveFrom": "2026-01-01"
}
```

Backend:

```text
Validate
 ↓
Create New Version
 ↓
Audit
 ↓
Activate according to workflow
```

Historical version tidak boleh di-overwrite.

---

# 20. INSURANCE API

## 20.1 List Insurance Rates

```text
GET /api/v1/products/:productId/insurance-rates
```

Permission:

```text
MASTER_VIEW
```

Query:

```text
?age=
&tenorYears=
&page=
&pageSize=
```

---

## 20.2 Lookup Insurance Rate

```text
GET /api/v1/products/:productId/insurance-rates/lookup
```

Query:

```text
?age=56
&tenorYears=5
```

Permission:

```text
MASTER_VIEW
```

Response harus mengembalikan data master yang digunakan calculation engine.

---

## 20.3 Import Insurance Rates

```text
POST /api/v1/products/:productId/insurance-rates/import
```

Permission:

```text
MASTER_UPDATE
```

Flow:

```text
Upload
 ↓
Validate
 ↓
Parse
 ↓
Preview
 ↓
Confirm
 ↓
Create Version
 ↓
Audit
```

Jangan langsung mengaktifkan data tanpa validation/review jika workflow production membutuhkan approval.

---

# 21. FEE API

## 21.1 Get Fee Parameters

```text
GET /api/v1/products/:productId/fee-parameters
```

Permission:

```text
CREDIT_PARAMETER_VIEW
```

---

## 21.2 Create Fee Version

```text
POST /api/v1/products/:productId/fee-parameters/versions
```

Permission:

```text
CREDIT_PARAMETER_UPDATE
```

Historical fee version tidak boleh di-overwrite.

---

# 22. CALCULATION API

Ini adalah endpoint inti aplikasi.

## 22.1 Calculate Credit

```text
POST /api/v1/calculations
```

Authentication:

```text
Required
```

Permission:

```text
CREDIT_CALCULATE
```

Request:

```json
{
  "productId": "product-id",
  "paymentOfficeId": "payment-office-id",
  "birthDate": "1970-01-01",
  "netSalary": 8500000,
  "otherIncome": 0,
  "requestedPrincipal": 100000000,
  "tenorMonths": 60,
  "calculationMethod": "FLAT"
}
```

Allowed calculation method:

```text
FLAT
ANNUITY
```

Backend workflow:

```text
Authenticate
 ↓
Authorize
 ↓
Validate Request
 ↓
Load Product
 ↓
Load Active Credit Parameters
 ↓
Load Insurance Rate
 ↓
Load Fee Parameters
 ↓
Execute Calculation Engine
 ↓
Evaluate Eligibility
 ↓
Generate Result
 ↓
Return Response
```

Frontend tidak mengirim:
- final DBR;
- insurance rate;
- fee rate;
- maximum principal;
- business rule result.

Backend mengambil semuanya dari approved configuration.

---

# 23. Calculation Response

Contoh:

```json
{
  "calculationId": "calculation-id",
  "status": "OK",
  "calculationMethod": "FLAT",
  "input": {
    "requestedPrincipal": 100000000,
    "tenorMonths": 60
  },
  "result": {
    "maximumPrincipal": 100000000,
    "installment": 2566667,
    "dbr": 0.30196,
    "remainingSalary": 5933333,
    "totalFees": 5000000,
    "flaggingFee": 38000,
    "payoffAmount": 0,
    "netDisbursement": 94962000
  },
  "insurance": {
    "rate": 0.0,
    "premium": 0,
    "fronting": 0,
    "reserve": 0
  },
  "fees": {
    "admin": 0,
    "provision": 0,
    "verification": 1500000,
    "flagging": 38000,
    "installmentDeduction": 0
  },
  "versions": {
    "businessRule": "BR-1.0",
    "parameter": "v1"
  }
}
```

Nilai contoh di atas hanya menunjukkan struktur response. Nilai financial production harus berasal dari database/reference source dan calculation engine. Flagging fee dikurangkan 1x pada perhitungan `netDisbursement`, terpisah dari `totalFees`.

---

# 24. Calculation Validation

Minimal:

```text
productId        → valid
paymentOfficeId  → valid
birthDate        → valid
netSalary        → valid
requestedPrincipal → valid
tenorMonths      → valid
calculationMethod → FLAT / ANNUITY
```

Business constraint mengikuti `BUSINESS_RULES.md`.

---

# 25. Calculation Error

Contoh:

```json
{
  "error": {
    "code": "CALCULATION_VALIDATION_ERROR",
    "message": "Perhitungan tidak dapat dilakukan.",
    "details": {
      "tenorMonths": "Tenor melebihi batas maksimum produk."
    }
  }
}
```

Status:

```text
422 Unprocessable Entity
```

---

# 26. SIMULATION API

## 26.1 Create Simulation

```text
POST /api/v1/simulations
```

Permission:

```text
SIMULATION_CREATE
```

Request:

```json
{
  "productId": "product-id",
  "paymentOfficeId": "payment-office-id",
  "birthDate": "1970-01-01",
  "netSalary": 8500000,
  "otherIncome": 0,
  "requestedPrincipal": 100000000,
  "tenorMonths": 60,
  "calculationMethod": "FLAT"
}
```

Backend:

```text
Validate
 ↓
Authorize
 ↓
Calculate
 ↓
Persist Simulation
 ↓
Persist Result
 ↓
Persist Amortization
 ↓
Audit
```

Gunakan database transaction.

Success:

```text
201 Created
```

---

# 27. List Simulations

```text
GET /api/v1/simulations
```

Permission:

```text
SIMULATION_VIEW
```

Query:

```text
?page=1
&pageSize=20
&search=
&status=
&productId=
&createdFrom=
&createdTo=
```

Scope wajib diterapkan.

Marketing:

```text
created_by = currentUser.id
```

Admin:

```text
BPR / BRANCH scope
```

Super Admin:

```text
ALL
```

---

# 28. Get Simulation Detail

```text
GET /api/v1/simulations/:id
```

Permission:

```text
SIMULATION_VIEW
```

Backend wajib melakukan:

```text
Authentication
+
Permission
+
Ownership / Scope
```

Response:

```json
{
  "id": "simulation-id",
  "simulationNumber": "SIM-000001",
  "status": "SAVED",
  "input": {},
  "result": {},
  "versions": {
    "businessRule": "BR-1.0",
    "parameter": "v1"
  }
}
```

---

# 29. Delete / Archive Simulation

Jika business workflow mengizinkan:

```text
DELETE /api/v1/simulations/:id
```

Permission:

```text
SIMULATION_DELETE
```

Default:

```text
Soft Delete
```

Alternatif:

```text
POST /api/v1/simulations/:id/archive
```

lebih eksplisit jika lifecycle archive digunakan.

---

# 30. AMORTIZATION API

## 30.1 Get Amortization

```text
GET /api/v1/simulations/:id/amortization
```

Permission:

```text
SIMULATION_VIEW
```

Scope:

```text
Same as simulation
```

Response:

```json
{
  "simulationId": "simulation-id",
  "rows": [
    {
      "period": 1,
      "openingBalance": 100000000,
      "principalPayment": 1000000,
      "marginPayment": 900000,
      "installment": 1900000,
      "closingBalance": 99000000
    }
  ]
}
```

Nilai di atas hanya contoh struktur response.

---

# 31. AUDIT API

## 31.1 List Audit Logs

```text
GET /api/v1/audit-logs
```

Permission:

```text
AUDIT_VIEW
```

Query:

```text
?page=1
&pageSize=20
&userId=
&action=
&entityType=
&createdFrom=
&createdTo=
```

Marketing:

```text
DENY
```

atau sesuai permission organisasi.

Audit response tidak boleh membocorkan secret.

---

# 32. PROFILE API

## 32.1 Get Profile

```text
GET /api/v1/profile
```

Authentication:

```text
Required
```

---

## 32.2 Update Profile

```text
PATCH /api/v1/profile
```

Authentication:

```text
Required
```

User hanya dapat mengubah field yang memang diizinkan.

Role dan permission tidak boleh diubah melalui endpoint profile.

---

# 33. API Data Ownership

Aturan:

```text
Resource
 ↓
created_by / owner
 ↓
Scope
```

Jangan membuat endpoint yang hanya melakukan:

```text
findById(id)
```

tanpa authorization/scope check.

---

# 34. API and Business Rules Relationship

API tidak memiliki formula sendiri.

```text
API
 ↓
Application Service
 ↓
Calculation Engine
 ↓
BUSINESS_RULES.md
```

Contoh:

```text
POST /api/v1/calculations
        ↓
CalculationService
        ↓
FlatStrategy / AnnuityStrategy
        ↓
Business Rules
```

Jika formula berubah, update calculation engine berdasarkan `BUSINESS_RULES.md`, bukan membuat formula baru di controller.

---

# 35. API and Database Relationship

API tidak boleh langsung mengakses table secara sembarangan.

Recommended:

```text
Controller
 ↓
Application Service
 ↓
Repository
 ↓
Database
```

Calculation:

```text
Controller
 ↓
CalculationService
 ↓
ParameterRepository
 ↓
InsuranceRepository
 ↓
FeeRepository
 ↓
CalculationEngine
```

---

# 36. Transaction Boundary

Untuk:

```text
POST /api/v1/simulations
```

gunakan transaction:

```text
Create Simulation
+
Create Calculation Result
+
Create Amortization
+
Create Audit
```

Jika salah satu operasi critical gagal:

```text
ROLLBACK
```

---

# 37. Concurrency

Parameter update menggunakan versioning/optimistic locking.

Jika dua admin mencoba mengubah parameter yang sama:

```text
Admin A → Version 1 → Version 2
Admin B → Version 1 → Conflict
```

Response:

```text
409 Conflict
```

---

# 38. API Security Requirements

Setiap protected endpoint harus menerapkan:

```text
Authentication
Authorization
Scope Check
Input Validation
Rate Limit jika sensitif
Safe Error Handling
Audit jika diperlukan
```

Sensitive endpoints:

```text
User Management
Role Management
Permission Management
Parameter Management
Insurance Management
Fee Management
Audit
```

harus memiliki protection tambahan.

---

# 39. API Idempotency

Untuk operation yang dapat menyebabkan duplicate financial record, pertimbangkan idempotency key.

Contoh:

```text
POST /api/v1/simulations
Idempotency-Key: <unique-key>
```

Tujuannya mencegah duplicate simulation akibat double click/network retry.

Implementation detail ditentukan pada technical implementation.

---

# 40. API Naming Convention

Gunakan plural resource:

```text
/users
/products
/simulations
/calculations
```

Gunakan kebab-case jika diperlukan:

```text
/payment-offices
/audit-logs
```

Gunakan HTTP method sesuai semantic:

```text
GET
POST
PATCH
DELETE
```

---

# 41. API Naming Rules

Hindari endpoint seperti:

```text
/getUsers
/createSimulation
/updateParameter
```

Gunakan:

```text
GET /users
POST /simulations
PATCH /parameters/:id
```

---

# 42. API Response Rules

Response harus konsisten.

List:

```json
{
  "data": [],
  "pagination": {}
}
```

Single resource:

```json
{
  "data": {}
}
```

Error:

```json
{
  "error": {
    "code": "...",
    "message": "...",
    "details": {}
  }
}
```

Jika implementation team memilih format berbeda, format harus dikonsistenkan secara global.

---

# 43. API Contract Rules for AI Agent

AI coding agent:

1. Tidak boleh mengubah endpoint tanpa update API Specification.
2. Tidak boleh mengubah request/response contract secara diam-diam.
3. Tidak boleh menambahkan endpoint admin tanpa permission.
4. Tidak boleh menerima financial parameter kritis sebagai source of truth dari frontend.
5. Tidak boleh mengubah business formula di controller.
6. Tidak boleh bypass data scope.
7. Tidak boleh menghapus audit pada sensitive operation.
8. Setiap endpoint harus memiliki test.

---

# 44. Minimum API Test Matrix

## Authentication

```text
Valid login
Invalid password
Inactive user
Logout
Unauthenticated request
```

## RBAC

```text
Marketing allowed endpoint
Marketing forbidden endpoint
Admin allowed endpoint
Admin forbidden endpoint
Super Admin endpoint
```

## Scope

```text
Marketing reads own simulation
Marketing attempts another user's simulation
Admin reads own BPR
Admin attempts another BPR
Super Admin reads all
```

## Calculation

```text
Valid Flat
Valid Annuity
Invalid tenor
Invalid salary
Invalid principal
Invalid product
Invalid payment office
```

## Parameter

```text
Authorized update
Unauthorized update
Version conflict
Historical version protection
```

---

# 45. Definition of Done

API specification dianggap siap implementation jika:

- [ ] Authentication endpoint didefinisikan.
- [ ] User API didefinisikan.
- [ ] Role API didefinisikan.
- [ ] Permission API didefinisikan.
- [ ] BPR API didefinisikan.
- [ ] Branch API didefinisikan.
- [ ] Payment Office API didefinisikan.
- [ ] Product API didefinisikan.
- [ ] Credit Parameter API didefinisikan.
- [ ] Insurance API didefinisikan.
- [ ] Fee API didefinisikan.
- [ ] Calculation API didefinisikan.
- [ ] Simulation API didefinisikan.
- [ ] Amortization API didefinisikan.
- [ ] Audit API didefinisikan.
- [ ] Profile API didefinisikan.
- [ ] Authentication requirement tersedia.
- [ ] Permission requirement tersedia.
- [ ] Scope requirement tersedia.
- [ ] Request schema tersedia.
- [ ] Response schema tersedia.
- [ ] Error contract tersedia.
- [ ] HTTP status tersedia.
- [ ] Transaction boundary tersedia.
- [ ] IDOR protection tersedia.
- [ ] Financial parameter protection tersedia.
- [ ] API testing matrix tersedia.

---

# 46. Kesimpulan

API Specification adalah **kontrak teknis antara frontend dan backend**.

Struktur final:

```text
Frontend
   ↓
API Contract
   ↓
Application Service
   ↓
Business Rules / Calculation Engine
   ↓
Repository
   ↓
Database
```

API tidak menggantikan Business Rules.

API menerjemahkan kebutuhan UI menjadi request backend, kemudian backend menjalankan Business Rules yang sudah ditetapkan.

Prinsip utama:

1. API tidak menyimpan formula bisnis.
2. API tidak menjadi sumber financial truth.
3. Backend mengambil parameter dari database.
4. Authorization dan data scope dilakukan server-side.
5. Calculation menggunakan Calculation Engine.
6. Simulation menggunakan transaction.
7. Historical calculation menggunakan business-rule dan parameter version.
8. Sensitive endpoint wajib memiliki permission.
9. Request/response contract harus konsisten.
10. Setiap endpoint harus memiliki test.

Status:

```text
DRAFT — READY FOR TECHNICAL IMPLEMENTATION
```
