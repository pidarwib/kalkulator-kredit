# ROLE & PERMISSION — Credit Calculator

## 1. Tujuan

Dokumen ini mendefinisikan Role-Based Access Control (RBAC), permission, dan data scope pada aplikasi Credit Calculator.

Authorization wajib diterapkan pada backend/API. Frontend hanya digunakan untuk menampilkan atau menyembunyikan UI sesuai permission dan bukan sebagai mekanisme keamanan utama.

Model akses:

User → Role → Permission → Data Scope → Resource / Action

---

## 2. Role

Versi MVP menggunakan tiga role:

1. SUPER_ADMIN
2. ADMIN
3. MARKETING

### 2.1 SUPER_ADMIN

Super Admin memiliki akses penuh terhadap sistem.

Tanggung jawab:
- Mengelola seluruh user.
- Mengelola role dan permission.
- Mengelola master data.
- Mengelola parameter kredit.
- Melihat seluruh simulasi.
- Mengelola konfigurasi sistem.
- Melihat audit trail.
- Melakukan monitoring seluruh aktivitas.

### 2.2 ADMIN

Admin memiliki akses operasional.

Tanggung jawab:
- Mengelola marketing sesuai data scope.
- Mengelola master data sesuai permission.
- Melihat dan memonitor simulasi sesuai scope.
- Menggunakan kalkulator.
- Melihat laporan sesuai permission.

Admin tidak boleh:
- Mengubah Super Admin.
- Menghapus Super Admin.
- Mengubah permission sistem secara bebas.
- Mengakses konfigurasi sensitif yang hanya diperuntukkan bagi Super Admin.

### 2.3 MARKETING

Marketing adalah pengguna operasional yang melakukan simulasi kredit.

Marketing dapat:
- Login.
- Melihat dashboard sendiri.
- Menggunakan kalkulator.
- Membuat simulasi.
- Melihat simulasi milik sendiri.
- Mengubah simulasi milik sendiri sesuai status.
- Menghapus simulasi milik sendiri sesuai aturan.
- Melihat profil sendiri.

Marketing tidak dapat:
- Mengelola user.
- Mengelola role.
- Mengelola permission.
- Mengelola master data.
- Mengubah parameter kredit global.
- Melihat simulasi marketing lain.
- Mengakses endpoint admin.

---

# 3. Permission

Permission menggunakan format:

`RESOURCE_ACTION`

Contoh:

`USER_CREATE`

`SIMULATION_CREATE`

`CREDIT_CALCULATE`

## 3.1 Authentication

| Permission | Deskripsi |
|---|---|
| AUTH_LOGIN | Login |
| AUTH_LOGOUT | Logout |
| AUTH_CHANGE_PASSWORD | Mengubah password sendiri |
| AUTH_RESET_PASSWORD | Reset password user lain |
| PROFILE_VIEW | Melihat profil sendiri |
| PROFILE_UPDATE | Mengubah profil sendiri |

## 3.2 User Management

| Permission | Deskripsi |
|---|---|
| USER_VIEW | Melihat user |
| USER_CREATE | Membuat user |
| USER_UPDATE | Mengubah user |
| USER_DELETE | Menghapus user |
| USER_ACTIVATE | Mengaktifkan user |
| USER_DEACTIVATE | Menonaktifkan user |
| USER_RESET_PASSWORD | Reset password user |
| USER_ASSIGN_ROLE | Memberikan role |

## 3.3 Role & Permission Management

| Permission | Deskripsi |
|---|---|
| ROLE_VIEW | Melihat role |
| ROLE_CREATE | Membuat role |
| ROLE_UPDATE | Mengubah role |
| ROLE_DELETE | Menghapus role |
| PERMISSION_VIEW | Melihat permission |
| ROLE_PERMISSION_ASSIGN | Mengatur permission role |

Pada MVP, permission management dibatasi hanya untuk SUPER_ADMIN.

## 3.4 Credit Calculator

| Permission | Deskripsi |
|---|---|
| CREDIT_CALCULATE | Menjalankan kalkulasi |
| CREDIT_VIEW_RESULT | Melihat hasil kalkulasi |
| CREDIT_EXPORT | Export hasil kalkulasi |

## 3.5 Simulation

| Permission | Deskripsi |
|---|---|
| SIMULATION_VIEW | Melihat simulasi |
| SIMULATION_CREATE | Membuat simulasi |
| SIMULATION_UPDATE | Mengubah simulasi |
| SIMULATION_DELETE | Menghapus simulasi |
| SIMULATION_EXPORT | Export simulasi |

## 3.6 Master Data

| Permission | Deskripsi |
|---|---|
| MASTER_VIEW | Melihat master data |
| MASTER_CREATE | Membuat master data |
| MASTER_UPDATE | Mengubah master data |
| MASTER_DELETE | Menghapus master data |

Master data mencakup:
- Fronting
- Produk
- Sumber dana
- Jenis pensiun
- Layanan
- Cabang
- Kantor bayar
- Parameter lainnya

## 3.7 Credit Parameters

| Permission | Deskripsi |
|---|---|
| CREDIT_PARAMETER_VIEW | Melihat parameter |
| CREDIT_PARAMETER_CREATE | Membuat parameter |
| CREDIT_PARAMETER_UPDATE | Mengubah parameter |
| CREDIT_PARAMETER_DELETE | Menghapus parameter |

Perubahan parameter kredit harus menghasilkan audit trail.

## 3.8 Reports

| Permission | Deskripsi |
|---|---|
| REPORT_VIEW | Melihat laporan |
| REPORT_EXPORT | Export laporan |

## 3.9 Audit Trail

| Permission | Deskripsi |
|---|---|
| AUDIT_VIEW | Melihat audit trail |
| AUDIT_EXPORT | Export audit trail |

---

# 4. Role-Permission Matrix

## 4.1 Authentication

| Permission | Super Admin | Admin | Marketing |
|---|---:|---:|---:|
| AUTH_LOGIN | ✅ | ✅ | ✅ |
| AUTH_LOGOUT | ✅ | ✅ | ✅ |
| AUTH_CHANGE_PASSWORD | ✅ | ✅ | ✅ |
| AUTH_RESET_PASSWORD | ✅ | ✅* | ❌ |
| PROFILE_VIEW | ✅ | ✅ | ✅ |
| PROFILE_UPDATE | ✅ | ✅ | ✅ |

`*` hanya untuk user dalam scope Admin.

## 4.2 User Management

| Permission | Super Admin | Admin | Marketing |
|---|---:|---:|---:|
| USER_VIEW | ✅ | ✅ | ❌ |
| USER_CREATE | ✅ | ✅ | ❌ |
| USER_UPDATE | ✅ | ✅ | ❌ |
| USER_DELETE | ✅ | ❌ | ❌ |
| USER_ACTIVATE | ✅ | ✅ | ❌ |
| USER_DEACTIVATE | ✅ | ✅ | ❌ |
| USER_RESET_PASSWORD | ✅ | ✅ | ❌ |
| USER_ASSIGN_ROLE | ✅ | terbatas | ❌ |

Admin hanya dapat mengelola user marketing dalam data scope-nya.

## 4.3 Role & Permission

| Permission | Super Admin | Admin | Marketing |
|---|---:|---:|---:|
| ROLE_VIEW | ✅ | ❌ | ❌ |
| ROLE_CREATE | ✅ | ❌ | ❌ |
| ROLE_UPDATE | ✅ | ❌ | ❌ |
| ROLE_DELETE | ✅ | ❌ | ❌ |
| PERMISSION_VIEW | ✅ | ❌ | ❌ |
| ROLE_PERMISSION_ASSIGN | ✅ | ❌ | ❌ |

## 4.4 Credit Calculator

| Permission | Super Admin | Admin | Marketing |
|---|---:|---:|---:|
| CREDIT_CALCULATE | ✅ | ✅ | ✅ |
| CREDIT_VIEW_RESULT | ✅ | ✅ | ✅ |
| CREDIT_EXPORT | ✅ | ✅ | ✅ |

## 4.5 Simulation

| Permission | Super Admin | Admin | Marketing |
|---|---:|---:|---:|
| SIMULATION_VIEW | ✅ | ✅ | ✅* |
| SIMULATION_CREATE | ✅ | ✅ | ✅ |
| SIMULATION_UPDATE | ✅ | ✅ | ✅* |
| SIMULATION_DELETE | ✅ | ✅ | ✅* |
| SIMULATION_EXPORT | ✅ | ✅ | ✅* |

`*` Marketing hanya dapat mengakses simulasi yang menjadi miliknya.

## 4.6 Master Data

| Permission | Super Admin | Admin | Marketing |
|---|---:|---:|---:|
| MASTER_VIEW | ✅ | ✅ | ❌ |
| MASTER_CREATE | ✅ | ✅ | ❌ |
| MASTER_UPDATE | ✅ | ✅ | ❌ |
| MASTER_DELETE | ✅ | terbatas | ❌ |

## 4.7 Credit Parameters

| Permission | Super Admin | Admin | Marketing |
|---|---:|---:|---:|
| CREDIT_PARAMETER_VIEW | ✅ | ✅ | ❌ |
| CREDIT_PARAMETER_CREATE | ✅ | terbatas | ❌ |
| CREDIT_PARAMETER_UPDATE | ✅ | terbatas | ❌ |
| CREDIT_PARAMETER_DELETE | ✅ | ❌ | ❌ |

## 4.8 Reports

| Permission | Super Admin | Admin | Marketing |
|---|---:|---:|---:|
| REPORT_VIEW | ✅ | ✅ | terbatas |
| REPORT_EXPORT | ✅ | ✅ | terbatas |

## 4.9 Audit Trail

| Permission | Super Admin | Admin | Marketing |
|---|---:|---:|---:|
| AUDIT_VIEW | ✅ | terbatas | ❌ |
| AUDIT_EXPORT | ✅ | ❌ | ❌ |

---

# 5. Data Scope

Permission menentukan apa yang boleh dilakukan. Data scope menentukan data mana yang boleh diakses.

## 5.1 SUPER_ADMIN

Scope:

`ALL`

Dapat mengakses seluruh data.

## 5.2 ADMIN

Scope default:

`ADMIN_SCOPE`

Admin hanya dapat mengakses data yang berada dalam wilayah/cabang/organisasi yang menjadi tanggung jawabnya.

Contoh:

```text
Admin A
  ↓
Cabang Madiun
  ↓
Marketing 1
Marketing 2
Marketing 3
```

Admin A tidak otomatis dapat mengakses marketing di cabang lain.

## 5.3 MARKETING

Scope default:

`OWN`

Marketing hanya dapat mengakses data yang dibuat/ditugaskan kepadanya.

Contoh:

```text
Marketing A
  ↓
Simulation A
Simulation B
Simulation C
```

Marketing A tidak dapat mengakses simulasi Marketing B.

---

# 6. Authorization Rules

Authorization wajib dilakukan pada server/backend.

### Rule 1 — Frontend hiding bukan security

Jangan hanya menyembunyikan menu Admin untuk Marketing. Backend juga harus menolak request ke endpoint admin jika user tidak memiliki permission.

### Rule 2 — Role tidak boleh dipercaya dari request client

Payload seperti:

```json
{
  "role": "ADMIN"
}
```

tidak boleh menjadi dasar authorization. Role harus berasal dari authenticated session/database.

### Rule 3 — Data ownership wajib diperiksa

Marketing A yang mencoba mengakses simulasi milik Marketing B harus ditolak oleh backend.

### Rule 4 — Authorization berlaku pada

- Page
- Route
- API endpoint
- Service
- Database query
- Mutation

---

# 7. Simulation Ownership

Setiap simulation wajib memiliki:

`created_by`

yang mereferensikan user pembuat.

Contoh:

```text
simulation
├── id
├── simulation_number
├── created_by
├── debtor_id
├── product_id
├── status
├── created_at
└── updated_at
```

Backend menggunakan `created_by` untuk menentukan ownership.

---

# 8. Role Hierarchy

```text
SUPER_ADMIN
     │
     ▼
   ADMIN
     │
     ▼
 MARKETING
```

Hierarchy tidak otomatis berarti Admin memiliki seluruh permission Super Admin. Permission harus tetap eksplisit.

---

# 9. Status-Based Permission

Akses terhadap simulation dipengaruhi oleh dua status yang terpisah.

## 9.1 Calculation Status

Hasil dari eligibility engine setelah kalkulasi dijalankan:

```text
OK   — seluruh eligibility rule terpenuhi
OVER — minimal satu rule gagal
```

Calculation status hanya dibaca; tidak diubah langsung oleh user.
Disimpan dalam `calculation_results.eligibility_status`.

## 9.2 Simulation Lifecycle Status

Status siklus hidup simulasi yang disimpan:

```text
DRAFT
  ↓
SAVED
  ↓
ARCHIVED
```

Aturan:

- Marketing dapat mengubah simulasi berstatus `DRAFT`.
- Setelah `SAVED`, perubahan dibatasi.
- `ARCHIVED` hanya dapat dilakukan oleh user dengan permission `SIMULATION_DELETE`.
- Perubahan parameter penting harus menghasilkan audit trail.
- Simulation yang sudah `SAVED` tidak boleh diubah tanpa aturan khusus.

---

# 10. Audit Requirements

Aktivitas berikut wajib diaudit:

- Login penting
- Logout
- Create user
- Update user
- Change role
- Activate/deactivate user
- Change credit parameter
- Create simulation
- Update simulation
- Delete simulation
- Perubahan master data
- Perubahan permission

Minimal audit record:

```text
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

Penyimpanan `old_value` dan `new_value` harus memperhatikan data sensitif.

---

# 11. Prinsip Implementasi RBAC

1. Gunakan permission eksplisit.
2. Jangan hard-code authorization hanya pada frontend.
3. Semua API sensitif harus memiliki authorization middleware.
4. Data scope diterapkan pada database query.
5. Default access adalah DENY.
6. Permission baru harus eksplisit diberikan.
7. Perubahan role/permission harus diaudit.
8. Jangan mempercayai role dari client.
9. User nonaktif tidak boleh melakukan authenticated operation.
10. Authentication dan authorization harus dipisahkan.

---

# 12. Authorization Flow

```text
Request
   ↓
Authentication
   ↓
Apakah user valid?
   │
   ├── NO → 401 Unauthorized
   │
   └── YES
         ↓
      Load Role
         ↓
      Check Permission
         │
         ├── NO → 403 Forbidden
         │
         └── YES
               ↓
          Check Data Scope
               │
               ├── NO → 403/404 sesuai policy
               │
               └── YES
                     ↓
                  Execute
```

---

# 13. Default Security Policy

**DENY BY DEFAULT**

Jika permission belum diberikan:

`DENY`

Jika data tidak termasuk scope user:

`DENY`

Jika user tidak aktif:

`DENY`

Jika session tidak valid:

`DENY`

---

# 14. MVP Scope

RBAC MVP wajib memiliki:

- [ ] Super Admin
- [ ] Admin
- [ ] Marketing
- [ ] Authentication
- [ ] Role assignment
- [ ] Permission checking
- [ ] Protected routes
- [ ] Protected API
- [ ] Data ownership
- [ ] Admin scope
- [ ] Audit trail
- [ ] Active/inactive user
- [ ] Default deny

---

# 15. Future RBAC

RBAC dapat dikembangkan menjadi:

```text
User
  ↓
Role
  ↓
Permission
  ↓
Organization
  ↓
Branch
  ↓
Area
  ↓
Data Scope
```

Kemungkinan role tambahan:

- Koordinator
- Supervisor
- Area Manager
- Auditor
- Bank Admin

Fitur tersebut tidak menjadi bagian MVP kecuali dibutuhkan.

---

# 16. Definition of Done

RBAC dianggap selesai jika:

- User dapat login sesuai credential.
- User mendapatkan role dari database/session.
- Role memiliki permission yang eksplisit.
- Protected route bekerja.
- Protected API bekerja.
- Marketing tidak dapat mengakses admin endpoint.
- Marketing hanya dapat mengakses simulation miliknya.
- Admin hanya dapat mengakses data sesuai scope.
- Super Admin dapat mengakses seluruh data.
- User nonaktif ditolak.
- Permission yang tidak diberikan menghasilkan `403 Forbidden`.
- Perubahan role/permission diaudit.
- Automated authorization tests tersedia.
