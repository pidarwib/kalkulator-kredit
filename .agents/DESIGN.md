# DESIGN SYSTEM & UI/UX — CREDIT CALCULATOR BPR

## 1. Design Direction

Aplikasi menggunakan desain:

- Clean
- Minimal
- Professional
- Modern
- Trustworthy
- Data-first

Prinsip utama:

> Less decoration, more information clarity.

Aplikasi bukan dashboard marketing yang penuh warna. Fokus visual adalah keterbacaan, kecepatan input, kejelasan hasil kalkulasi, dan konsistensi.

---

## 2. Visual Style

Target karakter:

```text
Professional Financial SaaS
+
Modern Banking Dashboard
+
Minimal Productivity App
```

Hindari:

- terlalu banyak warna;
- gradient berlebihan;
- shadow berlebihan;
- card terlalu banyak;
- icon dekoratif;
- animasi berlebihan;
- font terlalu besar;
- dashboard penuh KPI yang tidak relevan.

---

## 3. Color Strategy

Gunakan satu primary color sebagai identitas aplikasi.

Rekomendasi:

```text
Primary
→ Deep Blue / Navy

Background
→ Very Light Gray / Off White

Surface
→ White

Text Primary
→ Dark Gray / Near Black

Text Secondary
→ Medium Gray

Border
→ Light Gray
```

Jangan menggunakan banyak warna utama.

### Semantic Colors

```text
SUCCESS → Green
WARNING → Amber
ERROR   → Red
INFO    → Blue
```

Semantic color hanya digunakan jika memiliki makna.

Contoh:

```text
ELIGIBLE
→ SUCCESS

OVER / NOT ELIGIBLE
→ ERROR
```

---

## 4. Typography

Recommended:

```text
Inter
```

Fallback:

```text
system-ui
sans-serif
```

Hierarchy:

```text
H1 → 32px
H2 → 24px
H3 → 20px
Body → 14–16px
Caption → 12–13px
```

Weight:

```text
700 → Page Title
600 → Section Title
500 → Label / Important Data
400 → Body
```

Financial number dapat menggunakan weight lebih tinggi.

---

## 5. Layout

Gunakan:

```text
Sidebar
+
Topbar
+
Content Area
```

```text
┌──────────────────────────────────────────────┐
│ Sidebar │ Topbar                             │
│         ├────────────────────────────────────│
│ Menu    │ Main Content                       │
│         │                                    │
│         │                                    │
└─────────┴────────────────────────────────────┘
```

Sidebar dan topbar harus sederhana.

---

## 6. Sidebar

Menu mengikuti role dan permission.

Contoh:

```text
Dashboard

Kalkulator Kredit

Simulasi
  ├── Daftar Simulasi
  └── Buat Simulasi

Master Data
  ├── Produk
  ├── Parameter
  ├── Asuransi
  └── Fee

User Management

Audit Log
```

Menu tanpa permission tidak ditampilkan.

Catatan:

> Hiding menu bukan authorization. Backend tetap wajib melakukan permission check.

---

## 7. Dashboard

Dashboard Marketing fokus pada aktivitas kerja.

Contoh:

```text
Selamat datang, Marketing

┌────────────────┐ ┌────────────────┐
│ Simulasi Hari  │ │ Total Simulasi │
│ 12             │ │ 148            │
└────────────────┘ └────────────────┘

Simulasi Terbaru
────────────────────────────────────────
No     Nasabah       Produk      Status
001    ........      ........    Eligible
002    ........      ........    Over
```

Maksimal sekitar 2–4 KPI cards jika memang relevan.

Admin dapat melihat:

```text
Total Marketing
Total Simulation
Simulation Today
Eligible / Over
```

Tetap minimal.

---

## 8. Credit Calculator — Main Screen

Halaman kalkulator adalah focal point aplikasi.

Workflow:

```text
INPUT
  ↓
CALCULATE
  ↓
RESULT
```

Contoh:

```text
┌──────────────────────────────────────────────────────┐
│ Kalkulator Kredit                                    │
│ Hitung simulasi kredit dengan parameter yang berlaku │
├──────────────────────────────────────────────────────┤
│ DATA PEMOHON                                         │
│                                                      │
│ Nama              Tanggal Lahir                     │
│ [____________]    [____________]                    │
│                                                      │
│ Gaji Bersih       Penghasilan Lain                   │
│ [____________]    [____________]                    │
│                                                      │
│ DATA KREDIT                                          │
│                                                      │
│ Produk            Metode Perhitungan                 │
│ [__________▼]     [Flat ▼]                           │
│                                                      │
│ Plafon            Tenor                               │
│ [Rp _______]      [____ bulan]                       │
│                                                      │
│                 [ Hitung Simulasi ]                  │
└──────────────────────────────────────────────────────┘
```

---

## 9. Form Rules

Form harus:

- memiliki label yang jelas;
- menggunakan grouping;
- menggunakan input type yang sesuai;
- menampilkan unit;
- memberikan validation feedback;
- tidak menggunakan placeholder sebagai pengganti label.

Contoh:

```text
Tenor
[ 60 ] bulan
```

lebih baik daripada hanya:

```text
[Masukkan tenor dalam bulan]
```

---

## 10. Financial Input

Display:

```text
Gaji Bersih
[ Rp 8.500.000 ]

Plafon
[ Rp 100.000.000 ]
```

Internal value tetap numeric:

```text
8500000
100000000
```

Formatting hanya presentation layer.

---

## 11. Calculation Method

Marketing dapat memilih:

```text
Metode Perhitungan
[ Flat ▼ ]
```

Options:

```text
Flat
Annuity / PMT
```

Keterangan singkat:

```text
Flat
Bunga dihitung berdasarkan pokok awal.

Annuity / PMT
Angsuran dihitung menggunakan metode anuitas.
```

---

## 12. Calculation Button

Primary CTA:

```text
[ Hitung Simulasi ]
```

Saat calculation:

```text
[ Menghitung... ]
```

Button disabled saat proses untuk mencegah double submission.

---

## 13. Result Layout

Result menjadi focal point.

```text
HASIL SIMULASI

┌─────────────────────────────────────────────┐
│ Status                                      │
│                                             │
│ ✓ ELIGIBLE                                  │
│                                             │
│ Plafon Maksimal                             │
│ Rp 100.000.000                              │
│                                             │
│ Angsuran Bulanan                            │
│ Rp 1.550.000                                │
└─────────────────────────────────────────────┘
```

Hierarchy:

```text
1. Eligibility Status
2. Maximum Principal
3. Monthly Installment
4. DBR
5. Insurance
6. Fees
7. Net Disbursement
8. Detailed Calculation
9. Amortization
```

---

## 14. Eligible / Over

Eligible:

```text
✓ ELIGIBLE
```

Over:

```text
! NOT ELIGIBLE
```

Gunakan semantic color dan selalu sertakan teks/alasan.

Contoh:

```text
Alasan:

• DBR melebihi batas maksimum
• Plafon melebihi kemampuan angsuran
```

Jangan hanya mengandalkan warna.

---

## 15. Detailed Result

Gunakan section:

```text
Ringkasan
──────────────

Kelayakan
──────────────

Perhitungan Angsuran
──────────────

Asuransi
──────────────

Biaya
──────────────

Jadwal Angsuran
──────────────
```

Gunakan accordion/tab jika konten panjang.

---

## 16. Amortization Table

Kolom:

```text
Periode | Pokok Awal | Pokok | Bunga | Angsuran | Pokok Akhir
```

Rules:

```text
Numbers → right aligned
Text → left aligned
```

Table panjang menggunakan sticky header dan horizontal scroll jika diperlukan.

---

## 17. Simulation List

```text
┌──────────────────────────────────────────────────────┐
│ Simulasi Saya                         [ + Simulasi ]  │
├──────────────────────────────────────────────────────┤
│ Search [____________]   Status [All ▼]               │
├──────────────────────────────────────────────────────┤
│ No │ Tanggal │ Produk │ Plafon │ Angsuran │ Status   │
├──────────────────────────────────────────────────────┤
│ 01 │ ...     │ ...    │ ...    │ ...      │ Eligible │
│ 02 │ ...     │ ...    │ ...    │ ...      │ Over     │
└──────────────────────────────────────────────────────┘
```

Marketing hanya melihat simulation sesuai ownership/scope.

---

## 18. Admin User Management

Fitur:

```text
User Management

[ + Tambah Marketing ]

Search
Role
Status
Branch
```

Table:

```text
Nama
Username
Role
BPR
Branch
Status
Last Login
Action
```

---

## 19. Master Parameter UI

Parameter finansial ditampilkan structured:

```text
PARAMETER KREDIT

DBR Maksimum
[ 90% ]

Flat Rate Tahunan
[ 10.8% ]

Tenor Maksimum
[ 120 bulan ]

Plafon Maksimum
[ Rp 200.000.000 ]

Pembulatan Plafon
[ Rp 100.000 ]
```

Tampilkan:

```text
Effective From
Version
Status
Last Updated
Updated By
```

---

## 20. Insurance Master UI

Gunakan table/grid:

```text
Umur | Tenor | Rate
---------------------
56   | 1      | ...
56   | 2      | ...
57   | 1      | ...
```

Filter:

```text
Product
Age
Tenor
Status
Version
```

Jangan membuat tabel insurance menjadi dashboard dekoratif.

---

## 21. Parameter Edit UX

Karena parameter finansial sensitif:

```text
Edit
 ↓
Show Current Value
 ↓
Input New Value
 ↓
Validation
 ↓
Confirmation
 ↓
Save New Version
 ↓
Audit Log
```

Confirmation:

```text
Anda akan mengubah DBR maksimum
dari 90% menjadi 85%.

Perubahan ini akan berlaku mulai:
01/01/2027

[ Batal ] [ Simpan & Aktifkan ]
```

---

## 22. Audit Log UI

Table:

```text
Tanggal
User
Action
Entity
Entity ID
Summary
```

Detail:

```text
Before
After
IP
Timestamp
```

Jangan menampilkan secret.

---

## 23. Modal Rules

Modal hanya untuk:

- confirmation;
- quick edit;
- short form.

Form kompleks menggunakan dedicated page atau drawer.

---

## 24. Card Rules

Card digunakan jika membantu grouping.

Gunakan:

```text
1 primary result card
+
small supporting cards jika diperlukan
```

Hindari nested card berlebihan.

---

## 25. Border, Shadow, Radius

Border:

```text
Light
```

Shadow:

```text
Minimal
```

Radius konsisten:

```text
Buttons → 8px
Inputs → 8px
Cards → 10–12px
Modal → 12px
```

Jangan mencampur banyak style radius.

---

## 26. Spacing

Gunakan spacing system:

```text
4
8
12
16
24
32
48
```

Contoh:

```text
Form field gap → 16px
Section gap → 24–32px
Page padding → 24–32px
```

---

## 27. Responsive Design

Desktop-first karena target utama laptop/desktop.

Tetap support:

```text
Desktop
Tablet
Mobile
```

Mobile:

```text
Sidebar → Drawer
Two columns → One column
Large tables → Horizontal scroll
```

---

## 28. Accessibility

Minimal:

- label form jelas;
- keyboard navigation;
- focus state;
- contrast cukup;
- semantic HTML;
- button memiliki label;
- error message tidak hanya menggunakan warna;
- Eligible/Over memiliki text.

---

## 29. Loading State

Gunakan sesuai konteks:

```text
Skeleton
Spinner
Button loading
```

Calculation:

```text
Menghitung simulasi...
```

Animasi loading harus sederhana.

---

## 30. Empty State

Contoh:

```text
Belum ada simulasi

Buat simulasi pertama untuk mulai menghitung kredit.

[ + Buat Simulasi ]
```

Jangan hanya menampilkan table kosong.

---

## 31. Error State

Error harus menjelaskan:

```text
Apa yang terjadi
+
Apa yang harus dilakukan
```

Contoh:

```text
Perhitungan belum dapat dilakukan.

Tenor melebihi batas maksimum produk.

[ Periksa Input ]
```

---

## 32. Notification / Toast

Toast untuk feedback singkat:

```text
Simulation berhasil disimpan.
Parameter berhasil diperbarui.
```

Error penting tetap dekat dengan field/context.

---

## 33. Navigation Flow — Marketing

```text
Login
 ↓
Dashboard
 ↓
Kalkulator Kredit
 ↓
Input
 ↓
Hitung
 ↓
Result
 ↓
Simpan Simulation
 ↓
Daftar Simulation
 ↓
Detail Simulation
```

---

## 34. Navigation Flow — Admin

```text
Login
 ↓
Dashboard
 ├── User Management
 ├── Master Product
 ├── Credit Parameters
 ├── Insurance
 ├── Fee
 ├── Simulation
 └── Audit Log
```

Menu aktual mengikuti permission.

---

## 35. Page List

```text
AUTH
├── Login

MARKETING
├── Dashboard
├── Kalkulator Kredit
├── Simulasi
├── Detail Simulasi

ADMIN
├── Dashboard
├── User Management
├── User Detail/Edit
├── Product Management
├── Credit Parameters
├── Insurance Rates
├── Fee Parameters
└── Audit Logs

SHARED
├── Profile
└── Settings
```

---

## 36. Component Architecture

Reusable components:

```text
Layout
Sidebar
Topbar
PageHeader

Button
Input
CurrencyInput
PercentageInput
NumberInput
Select
DatePicker

Card
Modal
Drawer
Badge
Alert
Toast

DataTable
Pagination
SearchInput
FilterBar

CalculationSummary
EligibilityBadge
FinancialMetric
AmortizationTable
```

---

## 37. Currency Component

Display:

```text
Rp 100.000.000
```

Internal:

```text
100000000
```

Formatted string bukan financial value.

---

## 38. Percentage Component

Display:

```text
10.8%
```

Internal:

```text
0.108
```

Formatting hanya presentation layer.

---

## 39. Design Tokens

Gunakan centralized design tokens:

```text
--color-primary
--color-background
--color-surface
--color-text-primary
--color-text-secondary
--color-border
--color-success
--color-warning
--color-error

--radius-sm
--radius-md
--radius-lg

--space-1
--space-2
--space-3
--space-4
--space-6
--space-8
```

Jangan hard-code style yang sama berulang-ulang.

---

## 40. Dark Mode

Dark mode bukan prioritas MVP.

MVP menggunakan light theme terlebih dahulu.

Jika dark mode dibuat:
- gunakan design tokens;
- pertahankan semantic colors;
- pastikan contrast;
- jangan membuat dua design system terpisah.

---

## 41. Animation

Animation harus subtle.

Gunakan untuk:

- transition;
- loading;
- drawer;
- modal;
- feedback.

Hindari bouncing, decorative animation, dan excessive motion.

---

## 42. Design Anti-Patterns

Jangan menggunakan:

```text
❌ Rainbow dashboard
❌ Banyak gradient
❌ Neon colors
❌ Excessive glassmorphism
❌ 10+ KPI cards
❌ Giant icons
❌ Heavy shadows
❌ Excessive animation
❌ Different colors for every menu
❌ Rounded-everything
❌ Financial data displayed as decorative graphics
```

---

## 43. Design Quality Gate

- [ ] Clean.
- [ ] Minimal.
- [ ] Professional.
- [ ] Tidak ramai warna.
- [ ] Satu primary color.
- [ ] Semantic colors terbatas.
- [ ] Typography konsisten.
- [ ] Spacing konsisten.
- [ ] Navigation berdasarkan role/permission.
- [ ] Calculator menjadi focal workflow.
- [ ] Result mudah dipindai.
- [ ] Financial number mudah dibaca.
- [ ] Form memiliki label jelas.
- [ ] Validation jelas.
- [ ] Responsive.
- [ ] Accessible.
- [ ] Loading/empty/error state tersedia.
- [ ] Tidak ada security decision di frontend.
- [ ] Tidak ada hard-coded financial truth di UI.

---

## 44. Kesimpulan

Desain Credit Calculator menggunakan pendekatan:

```text
CLEAN
+
MINIMAL
+
PROFESSIONAL
+
DATA-FIRST
```

Visual hierarchy:

```text
Navigation
    ↓
Input
    ↓
Calculation
    ↓
Result
    ↓
Detail
```

Warna:

```text
Neutral
   +
One Primary Color
   +
Limited Semantic Colors
```

Prinsip final:

> Desain harus terlihat profesional dan tenang, bukan ramai. User harus langsung memahami apa yang harus diisi, tombol apa yang harus ditekan, dan hasil kredit apa yang diperoleh.

Status:

```text
DRAFT — READY FOR UI IMPLEMENTATION / DESIGN REVIEW
```
