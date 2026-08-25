# SECURITY — CREDIT CALCULATOR BPR

## 1. Tujuan

Dokumen ini mendefinisikan security architecture dan security requirements aplikasi Credit Calculator BPR.

Security harus melindungi:
- akun pengguna;
- role dan permission;
- data calon debitur;
- data simulasi kredit;
- parameter finansial;
- tarif asuransi;
- hasil perhitungan;
- audit trail;
- credential, secret, dan API key.

Dokumen ini mengikuti `PRD.md`, `ROLE_PERMISSION.md`, `BUSINESS_RULES.md`, `ARCHITECTURE.md`, dan `DATABASE.md`.

---

# 2. Prinsip Security

## 2.1 Backend Is Authoritative

Frontend bukan sumber keputusan security.

Backend wajib memvalidasi:
- authentication;
- authorization;
- role;
- permission;
- data scope;
- ownership;
- input;
- business rule.

## 2.2 Default Deny

Jika permission tidak tersedia:

```text
DENY
```

Jangan menggunakan allow-by-default.

## 2.3 Least Privilege

User hanya mendapatkan permission dan data scope yang diperlukan.

## 2.4 Defense in Depth

```text
Browser
 ↓
HTTPS
 ↓
Authentication
 ↓
Authorization
 ↓
Data Scope
 ↓
Input Validation
 ↓
Business Validation
 ↓
Repository / Database
```

---

# 3. Authentication

Flow:

```text
Login
 ↓
Validate Input
 ↓
Find User
 ↓
Verify Password Hash
 ↓
Check User Status
 ↓
Create Session
 ↓
Authenticated
```

User dengan status `INACTIVE`, `SUSPENDED`, atau `DELETED` tidak boleh login.

---

# 4. Password Security

- Password tidak boleh plaintext.
- Gunakan password hashing yang aman, direkomendasikan Argon2id jika didukung stack.
- Jangan membuat algoritma hashing sendiri.
- Password hash tidak boleh dikirim ke frontend.
- Password tidak boleh masuk log.

---

# 5. Session Security

Session harus:
- memiliki expiration;
- dapat di-invalidasi saat logout;
- tidak menyimpan credential plaintext.

Jika menggunakan cookie:

```text
HttpOnly = true
Secure = true
SameSite = Lax/Strict
```

Jika menggunakan token:
- token memiliki expiration;
- signing secret berasal dari environment/secret manager;
- token tidak boleh di-hard-code;
- token tidak boleh masuk log.

---

# 6. RBAC Security

Authorization:

```text
User
 ↓
Role
 ↓
Permission
 ↓
Resource
 ↓
Data Scope
```

Role awal:

```text
SUPER_ADMIN
ADMIN
MARKETING
```

Permission harus diperiksa di backend pada setiap protected endpoint.

Menyembunyikan tombol di frontend bukan security control.

---

# 7. Data Scope

```text
SUPER_ADMIN → ALL

ADMIN → BPR / BRANCH sesuai assignment

MARKETING → OWN
```

Marketing hanya dapat mengakses simulation miliknya.

Backend harus menerapkan filter scope pada query.

---

# 8. IDOR Protection

Request seperti:

```text
GET /api/simulations/123
```

tidak boleh otomatis memberikan data hanya karena ID diketahui.

Flow wajib:

```text
Authenticate
 ↓
Authorize
 ↓
Check Ownership / Scope
 ↓
Load Resource
```

Tujuannya mencegah Insecure Direct Object Reference (IDOR).

---

# 9. Privilege Escalation Protection

User tidak boleh menaikkan privilege dirinya sendiri melalui request.

Contoh serangan:

```json
{
  "role": "SUPER_ADMIN"
}
```

Backend harus memvalidasi apakah caller memiliki permission untuk memberikan role tersebut.

Marketing tidak boleh:
- membuat role;
- memberikan permission;
- mengubah role dirinya;
- menaikkan privilege.

---

# 10. Input Validation

Semua API input harus divalidasi di backend.

Calculation minimal:

```text
birthDate
netSalary
requestedPrincipal
tenorMonths
calculationMethod
productId
paymentOfficeId
```

Validasi:
- required;
- type;
- format;
- range;
- enum;
- relationship;
- business constraint.

---

# 11. Financial Input Security

Financial value harus:
- numeric;
- mengikuti batas bisnis;
- non-negative jika memang tidak boleh negatif;
- menggunakan decimal/integer-safe representation;
- mengikuti rounding rule.

Jangan menggunakan floating point binary untuk financial persistence.

---

# 12. Financial Source of Truth

Financial calculation hanya boleh menggunakan:

```text
Approved Business Rules
+
Approved Parameters
+
Approved Master Data
```

Bukan:

```text
AI estimation
User-provided rate
Frontend calculation
Uncontrolled external source
```

---

# 13. Financial Parameter Tampering

Jangan mempercayai parameter finansial kritis dari frontend.

Contoh request berikut tidak boleh dijadikan source of truth:

```json
{
  "requestedPrincipal": 100000000,
  "dbr": 0.90,
  "insuranceRate": 0.255
}
```

Backend harus mengambil DBR, insurance rate, fee, dan product parameter dari approved database/configuration.

---

# 14. Insurance Rate Security

Insurance rate adalah financial master data.

Marketing secara default:

```text
VIEW   = sesuai permission
MANAGE = DENY
```

Perubahan rate:

```text
Authorized User
 ↓
Validate
 ↓
Create New Version
 ↓
Audit
 ↓
Activate
 ↓
Regression Test
```

AI tidak boleh mengarang atau memperkirakan insurance rate.

---

# 15. Credit Parameter Security

Parameter seperti:

```text
DBR
Flat Rate
Maximum Tenor
Maximum Principal
Rounding
```

harus:
- protected by permission;
- validated;
- versioned;
- audited.

Parameter lama tidak boleh ditimpa jika sudah digunakan simulation historis.

---

# 16. Calculation Security

Calculation engine harus deterministic.

```text
Input A
+
Parameter Version X
+
Business Rule Version Y
=
Result Z
```

Hasil tidak boleh dipengaruhi oleh:
- random state;
- UI state;
- AI response;
- uncontrolled external API.

---

# 17. SQL Injection

Gunakan:
- parameterized queries;
- prepared statements;
- ORM/query builder yang aman.

Jangan membuat SQL dengan string concatenation dari user input.

---

# 18. XSS

User-generated content harus di-escape/sanitize sesuai konteks.

Perhatikan:
- nama user;
- alamat;
- catatan simulation;
- report;
- imported text.

Jangan melakukan raw HTML rendering tanpa sanitization.

---

# 19. CSRF

Jika menggunakan cookie/session:
- gunakan CSRF protection;
- gunakan SameSite cookie;
- validasi origin bila diperlukan.

Jika menggunakan token-based authentication, CSRF strategy harus mengikuti mekanisme token.

---

# 20. CORS

Production API harus menggunakan allowlist origin.

Hindari:

```text
Access-Control-Allow-Origin: *
```

untuk authenticated API.

---

# 21. Rate Limiting

Minimal diterapkan pada:
- login;
- authentication endpoint;
- password-related endpoint;
- calculation endpoint;
- sensitive admin endpoint.

Tujuan:
- brute-force protection;
- abuse prevention;
- resource protection.

---

# 22. Error Handling

Jangan mengirim detail internal kepada client.

Jangan mengirim:
- stack trace;
- database credential;
- internal path;
- API key;
- SQL error detail.

Production response cukup:

```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Terjadi kesalahan pada server."
  }
}
```

Detail teknis hanya pada server log.

---

# 23. Secrets Management

Secret tidak boleh disimpan di:
- source code;
- `.md`;
- seed;
- git repository;
- frontend;
- screenshot;
- log.

Contoh:

```text
DATABASE_URL
AUTH_SECRET
SESSION_SECRET
OPENROUTER_API_KEY
```

Gunakan environment variables atau secret manager.

`.env` tidak boleh masuk repository.

Contoh `.env.example`:

```text
DATABASE_URL=
AUTH_SECRET=
OPENROUTER_API_KEY=
```

Tanpa nilai secret aktual.

---

# 24. OpenRouter API Key

Jika aplikasi menggunakan OpenRouter:

```text
Frontend
   X
   ↓
OpenRouter
```

Jangan menaruh API key di browser.

Gunakan:

```text
Frontend
   ↓
Backend
   ↓
OpenRouter
```

API key hanya berada di server environment.

Jika OpenRouter hanya digunakan oleh developer/AI coding environment, key tetap tidak boleh dimasukkan ke source repository.

---

# 25. Database Security

Database:
- tidak exposed langsung ke public internet;
- menggunakan least-privilege credential;
- menggunakan encrypted connection bila diperlukan;
- memiliki backup;
- memiliki restore procedure.

Jangan menggunakan database superuser untuk runtime application.

---

# 26. Sensitive Data

Minimalkan penyimpanan:
- identity data;
- contact data;
- financial data;
- authentication data.

Simpan hanya data yang diperlukan business process.

---

# 27. Data in Transit

Production menggunakan:

```text
HTTPS / TLS
```

Password, session, dan financial data tidak boleh dikirim melalui HTTP plaintext.

---

# 28. Data at Rest

Database, backup, dan storage production harus menggunakan encryption at rest jika tersedia pada infrastructure.

Export yang mengandung data sensitif harus dilindungi.

---

# 29. Audit Logging

Security-sensitive action minimal:

```text
LOGIN
LOGOUT
LOGIN_FAILED
ACCOUNT_LOCKED

CREATE_USER
UPDATE_USER
DELETE_USER

ROLE_ASSIGNMENT
PERMISSION_CHANGE

UPDATE_CREDIT_PARAMETER
UPDATE_INSURANCE_RATE
UPDATE_FEE_PARAMETER

CREATE_SIMULATION
UPDATE_SIMULATION
DELETE_SIMULATION
```

Audit log minimal:

```text
user_id
action
entity_type
entity_id
old_value
new_value
created_at
```

Audit tidak boleh dapat diubah Marketing.

---

# 30. Logging Rules

Jangan log:
- password;
- API key;
- access token;
- session secret;
- database password;
- full sensitive payload tanpa kebutuhan.

Contoh aman:

```text
USER_LOGIN_SUCCESS
user_id=123
timestamp=...
```

---

# 31. Security Headers

Production harus mempertimbangkan:

```text
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
Strict-Transport-Security
```

Implementasi final mengikuti framework/deployment.

---

# 32. File Upload Security

Jika aplikasi memiliki upload:
- allowlist extension;
- validate MIME type;
- validate file size;
- generate safe filename;
- jangan percaya filename user;
- jangan execute uploaded file;
- simpan file di lokasi non-executable.

---

# 33. Excel Import Security

Flow:

```text
File
 ↓
Validate File Type
 ↓
Validate File Size
 ↓
Parse
 ↓
Validate Structure
 ↓
Validate Data
 ↓
Human Review
 ↓
Import
 ↓
Audit
```

Jangan langsung:

```text
Excel → Production Database
```

---

# 34. Insurance Import Validation

Minimal validasi:

```text
Age
Tenor
Rate
Product
Effective Date
```

Invalid data harus ditolak.

Duplicate key harus ditolak.

Missing required value harus ditolak.

Rate tidak boleh diisi dengan asumsi.

---

# 35. Report and Export Security

Report mengikuti scope:

```text
MARKETING
→ simulation miliknya

ADMIN
→ BPR/branch scope

SUPER_ADMIN
→ seluruh scope
```

Export endpoint harus memiliki authorization yang sama dengan endpoint view.

---

# 36. Frontend Security

Frontend tidak boleh:
- menjadi source of truth financial data;
- menentukan authorization;
- menentukan ownership;
- menyimpan secret;
- menentukan final eligibility.

Frontend hanya menampilkan keputusan backend.

---

# 37. Dependency Security

Package dependency harus:
- menggunakan versi supported;
- diperbarui berkala;
- dipindai vulnerability;
- berasal dari source terpercaya.

Lakukan dependency audit sesuai package manager.

---

# 38. AI Coding Agent Security Rules

AI coding agent wajib:

1. Membaca `.agents/SECURITY.md`.
2. Tidak menonaktifkan authentication tanpa approval.
3. Tidak menonaktifkan authorization.
4. Tidak menaruh secret di source code.
5. Tidak membuat hard-coded financial parameters.
6. Tidak membuat fake insurance rates.
7. Tidak bypass validation.
8. Tidak menghapus audit logging.
9. Tidak menggunakan SQL concatenation.
10. Tidak membuat endpoint admin tanpa permission check.

---

# 39. AI Security Boundary

AI coding agent boleh:

```text
Generate code
Generate tests
Refactor
Generate migrations
Generate documentation
```

AI coding agent tidak boleh otomatis:

```text
Invent financial data
Change business rules
Disable security
Expose secrets
Bypass RBAC
Remove audit logging
```

Security-critical change:

```text
AI Proposal
 ↓
Human Review
 ↓
Implementation
 ↓
Security Test
```

---

# 40. Development Security

Development menggunakan:
- localhost;
- test database;
- dummy data.

Jangan menggunakan production credential untuk development tanpa kebutuhan dan approval.

Jangan menyalin database production penuh ke laptop developer tanpa policy.

---

# 41. Production Security

Minimal:

```text
HTTPS
Secure Cookies
Strong Secrets
Database Backup
Monitoring
Audit Logging
Rate Limiting
Error Handling
Dependency Updates
```

Production secrets harus berbeda dari development.

---

# 42. Security Testing

Minimal:

```text
Authentication Test
Authorization Test
RBAC Test
Data Scope Test
IDOR Test
Input Validation Test
SQL Injection Test
XSS Test
CSRF Test
Rate Limit Test
Secret Exposure Test
File Upload Test
Calculation Tampering Test
```

Prioritas tinggi:

```text
RBAC
Data Scope
IDOR
Financial Parameter Tampering
Authentication
Secret Exposure
```

---

# 43. Security Incident Response

Jika terjadi:

```text
credential leak
API key leak
unauthorized access
parameter tampering
data exposure
```

Flow:

```text
Detect
 ↓
Contain
 ↓
Revoke / Rotate Credential
 ↓
Investigate Audit Log
 ↓
Patch
 ↓
Test
 ↓
Recover
 ↓
Document Incident
```

---

# 44. Security Definition of Done

- [ ] Authentication architecture jelas.
- [ ] Password hashing ditentukan.
- [ ] Session/token security ditentukan.
- [ ] RBAC backend ditentukan.
- [ ] Data scope ditentukan.
- [ ] IDOR protection ditentukan.
- [ ] Privilege escalation protection ditentukan.
- [ ] Input validation ditentukan.
- [ ] Financial parameter protection ditentukan.
- [ ] Insurance rate protection ditentukan.
- [ ] Secret management ditentukan.
- [ ] Database security ditentukan.
- [ ] Audit logging ditentukan.
- [ ] File upload/import security ditentukan jika fitur tersedia.
- [ ] API security ditentukan.
- [ ] Rate limiting ditentukan.
- [ ] Security headers ditentukan.
- [ ] Dependency security ditentukan.
- [ ] Security testing ditentukan.
- [ ] AI coding security boundary ditentukan.

---

# 45. Kesimpulan

Aplikasi Credit Calculator adalah aplikasi yang menangani data finansial dan authorization-sensitive. Security tidak boleh hanya berupa login page.

Security utama:

```text
Authentication
      ↓
Authorization / RBAC
      ↓
Data Scope / Ownership
      ↓
Input Validation
      ↓
Financial Parameter Protection
      ↓
Calculation Engine
      ↓
Database
      ↓
Audit
```

Prinsip paling penting:

1. Backend adalah sumber keputusan security.
2. Default authorization adalah `DENY`.
3. Marketing hanya mengakses data sesuai ownership/scope.
4. Financial parameter tidak boleh diubah tanpa permission.
5. Insurance rate tidak boleh diestimasi AI.
6. Financial calculation harus deterministic.
7. Perubahan parameter wajib versioned dan audited.
8. Historical simulation tidak berubah karena parameter baru.
9. Secret/API key tidak boleh berada di source code atau frontend.
10. OpenRouter API key hanya berada di server environment jika digunakan aplikasi.
11. AI coding agent tidak boleh menonaktifkan security atau mengarang data finansial.
12. RBAC, IDOR, privilege escalation, dan financial parameter tampering menjadi prioritas security testing.

Status:

```text
DRAFT — READY FOR SECURITY REVIEW / IMPLEMENTATION
```
