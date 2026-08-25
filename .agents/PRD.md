# PRD — Credit Calculator

## 1. Tujuan Produk
Credit Calculator adalah aplikasi web untuk membantu marketing melakukan simulasi kredit calon debitur secara terstandarisasi, menyimpan histori simulasi, dan menerapkan business rules secara konsisten.

## 2. Target User
1. **Super Admin** — akses tertinggi, mengelola sistem, user, role, permission, master data, dan konfigurasi.
2. **Admin** — mengelola marketing dan master data sesuai permission.
3. **Marketing** — input calon debitur, menjalankan simulasi, menyimpan dan melihat histori simulasi sesuai data scope.

## 3. Prinsip Akses
Aplikasi menggunakan:
- **Authentication** — memastikan identitas user.
- **RBAC (Role-Based Access Control)** — menentukan action yang boleh dilakukan.
- **Data Scope** — menentukan data yang boleh dilihat/dimodifikasi.

Detail matrix role dan permission akan dibuat di `ROLE_PERMISSION.md`.

## 4. Modul Utama
### Authentication
- Login/logout
- Password hashing
- Session management
- Protected routes
- Server-side authorization

### Dashboard
**Admin/Super Admin:** jumlah marketing, simulasi, debitur, statistik produk/status.  
**Marketing:** simulasi milik sendiri, simulasi hari ini/bulan berjalan, status simulasi, shortcut kalkulator.

### User Management
- Tambah marketing
- Edit user
- Aktif/nonaktif user
- Atur role
- Reset/change password
- Monitoring user

### Master Data
- Fronting
- Jenis produk
- Sumber dana
- Layanan
- Jenis pensiun
- Cabang/kantor
- Tujuan kantor bayar
- Parameter kredit
- Komponen biaya
- Parameter usia/tenor/plafon

### Kalkulator Kredit
**Input debitur:** nama, NIK/No. KTP, NOPEN, tanggal lahir, usia, jenis pensiun, status pembiayaan, pelunasan, asal/tujuan kantor bayar, dan data pendukung.

**Input produk:** fronting, jenis produk, sumber dana, layanan, cabang, parameter produk.

**Parameter kredit:** gaji bersih, margin, maksimal plafond, maksimal tenor, tenor pengajuan, angka pelunasan.

**Biaya:** admin, provisi, asuransi, verifikasi, potongan angsuran, biaya/titipan lain.

**Output:** status kelayakan, plafon maksimal/pengajuan, angsuran per bulan, sisa gaji, total biaya, pelunasan, dan terima bersih.

> Formula final tidak boleh ditebak dari screenshot. Formula resmi akan didefinisikan dalam `BUSINESS_RULES.md`.

## 5. Calculation Engine
Alur:
```text
Input → Validation → Business Rules → Calculation Engine → Result
```

Calculation engine harus:
- deterministik;
- terpisah dari UI;
- dapat di-unit-test;
- tidak menduplikasi formula;
- memakai parameter terkonfigurasi;
- memiliki aturan pembulatan eksplisit.

## 6. Simulasi & Riwayat
Marketing dapat menyimpan simulasi dengan:
- nomor simulasi;
- user pembuat;
- data debitur;
- produk;
- parameter input;
- hasil kalkulasi;
- status;
- timestamp.

Dua status yang dipisahkan:

**Calculation Status** (hasil eligibility engine setelah kalkulasi dijalankan):
- `OK` — seluruh eligibility rule terpenuhi
- `OVER` — minimal satu rule gagal

**Simulation Lifecycle Status** (siklus hidup simulasi yang disimpan):
- `DRAFT` — simulasi belum disimpan permanen
- `SAVED` — simulasi telah disimpan
- `ARCHIVED` — simulasi diarsipkan

Marketing hanya melihat data sesuai data scope. Admin/Super Admin melihat sesuai permission.

## 7. Audit Trail
Aktivitas penting dicatat:
- user;
- action;
- entity;
- entity ID;
- timestamp;
- perubahan penting.

## 8. Security Requirements
- Password tidak disimpan plaintext.
- Secret hanya melalui environment variables.
- Authorization harus dilakukan server-side.
- Frontend tidak boleh menjadi satu-satunya pengaman role.
- Endpoint sensitif wajib protected.
- Input wajib divalidasi.
- Data sensitif ditangani secara aman.
- Aktivitas penting memiliki audit trail.

Detail security akan dibuat di `SECURITY.md`.

## 9. UI/UX
- Responsif dan mudah digunakan marketing.
- Input dan hasil kalkulasi dipisahkan jelas.
- Hasil utama dibuat prominent.
- Validasi mudah dipahami.
- Nilai uang menggunakan format Rupiah.
- Tanggal menggunakan format Indonesia.
- Spreadsheet lama menjadi referensi kebutuhan, bukan harus ditiru pixel-perfect.

## 10. Technology Direction

Stack telah dikonfirmasi dan di-lock:

- Framework: **Next.js** (full-stack, App Router)
- Language: **TypeScript**
- Styling: **Tailwind CSS**
- ORM: **Prisma**
- Database: **PostgreSQL**
- Version control: **Git**
- Development: **Antigravity / AI coding agent**

## 11. Development Principles
1. Jangan menebak business rules.
2. Jangan coding sebelum requirement relevan jelas.
3. Jangan mengubah calculation engine tanpa test.
4. Jangan mengandalkan frontend untuk authorization.
5. Pisahkan business logic dari UI.
6. Jangan mengubah file yang tidak terkait task.
7. Implementasikan secara bertahap.
8. Setiap fase harus dapat dijalankan dan diuji.
9. Buat Git checkpoint sebelum perubahan besar.
10. AI agent wajib melaporkan file yang diubah dan hasil testing.

## 12. MVP Definition of Done
- [ ] Super Admin login
- [ ] Admin login
- [ ] Marketing login
- [ ] Role & permission berjalan
- [ ] Protected routes berjalan
- [ ] Admin dapat mengelola marketing
- [ ] Marketing dapat menggunakan kalkulator
- [ ] Data debitur dapat diinput
- [ ] Calculation engine berjalan
- [ ] Hasil kalkulasi tampil
- [ ] Simulasi dapat disimpan
- [ ] Marketing dapat melihat histori miliknya
- [ ] Admin dapat monitoring sesuai permission
- [ ] Audit trail tersedia
- [ ] Calculation engine memiliki automated tests
- [ ] Security baseline terpenuhi
- [ ] Aplikasi berjalan lokal

## 13. Future Scope
- Multi-cabang
- Multi-fronting
- Multi-bank
- Approval workflow
- Integrasi database eksternal
- API partner/bank
- Export PDF/Excel
- Analytics
- Notification
- PWA/mobile
- Cloud deployment
- Multi-tenant architecture
