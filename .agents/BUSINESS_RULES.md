# BUSINESS RULES — CREDIT CALCULATOR BPR

## 1. Tujuan

Dokumen ini adalah **single source of truth** untuk business logic dan calculation logic aplikasi Credit Calculator.

Business rules diturunkan dari workbook kalkulator kredit, khususnya sheet:

- `Ref`
- `Asuransi`
- `Simulasi BPR`

Sheet lain tidak menjadi sumber rule untuk dokumen ini.

Tujuan utama dokumen:

1. Mengubah formula Excel menjadi formula bisnis yang independen dari alamat cell.
2. Memastikan hasil aplikasi dapat direproduksi dari workbook.
3. Memisahkan calculation engine dari UI.
4. Menyediakan dasar untuk automated test dan audit.
5. Memungkinkan parameter kredit dikelola tanpa hard-code formula pada frontend.

AI coding agent **DILARANG** menebak atau mengubah formula bisnis yang belum didefinisikan dalam dokumen ini.

---

# 2. Prinsip Utama

Semua perhitungan harus menggunakan **nama variabel bisnis**, bukan alamat cell Excel.

### Jangan

```text
DBR = M13 / F10
```

### Gunakan

```text
DBR = Angsuran Bulanan / Gaji Bersih per Bulan
```

### Jangan

```text
Plafon = J13
```

### Gunakan

```text
Plafon Pengajuan
```

Excel adalah sumber referensi/legacy calculation. Aplikasi menggunakan domain model dan calculation engine sendiri.

---

# 3. Scope Calculation Engine

Calculation engine terdiri dari:

```text
1. Input Validation
2. Age Engine
3. Tenor Engine
4. Credit Capacity Engine
5. Installment Engine
6. Insurance Engine
7. Fee Engine
8. Net Disbursement Engine
9. Eligibility Engine
10. Amortization Engine
11. Effective Rate Analysis
```

---

# 4. Variabel Bisnis

| Variabel | Definisi |
|---|---|
| `tanggalPerhitungan` | Tanggal ketika simulasi dihitung |
| `tanggalLahir` | Tanggal lahir debitur |
| `usiaSaatIni` | Usia debitur pada tanggal perhitungan |
| `usiaSaatLunas` | Usia debitur pada akhir tenor |
| `tenorBulan` | Tenor kredit dalam bulan |
| `tenorTahunAsuransi` | Tenor untuk lookup asuransi dalam tahun |
| `gajiBersih` | Penghasilan bersih per bulan |
| `plafonPengajuan` | Plafon yang diajukan |
| `plafonMaksimumProduk` | Batas maksimum plafon produk |
| `plafonMaksimumKemampuan` | Plafon berdasarkan kemampuan angsuran |
| `plafonMaksimumFinal` | Plafon maksimum setelah seluruh batas diterapkan |
| `angsuranBulanan` | Angsuran berdasarkan metode yang dipilih |
| `metodeAngsuran` | `FLAT` atau `ANNUITY` |
| `marginTahunan` | Annual rate tunggal yang digunakan untuk FLAT dan ANNUITY |
| `marginBulanan` | Margin per bulan = marginTahunan / 12 |
| `dbr` | Debt Burden Ratio |
| `dbrMaksimum` | DBR maksimum |
| `maksAngsuran` | Kemampuan angsuran maksimum |
| `maksTenorProduk` | Batas tenor produk |
| `maksTenorUsia` | Batas tenor berdasarkan usia |
| `maksTenorFinal` | Batas tenor final |
| `biayaAdmin` | Biaya administrasi |
| `biayaProvisi` | Biaya provisi |
| `biayaAsuransi` | Total charge asuransi sesuai struktur produk |
| `premiAsuransi` | Komponen premi asuransi |
| `feeFronting` | Komponen fee fronting |
| `pencadangan` | Komponen pencadangan |
| `biayaVerifikasi` | Biaya verifikasi |
| `biayaFlagging` | Biaya flagging |
| `angkaPelunasan` | Nilai pelunasan kewajiban sebelumnya |
| `potonganAngsuran` | Potongan angsuran pada pencairan |
| `totalBiaya` | Total seluruh biaya/potongan |
| `terimaBersih` | Dana bersih yang diterima debitur |
| `statusKredit` | `OK` atau `OVER` |
| `alasanOver` | Daftar alasan kegagalan eligibility |

---

# 5. Parameter Default BPR

Berdasarkan workbook yang dianalisis:

```text
DBR Maksimum              = 90%
Margin Tahunan            = 10,8%
Margin Bulanan            = 10,8% / 12 = 0,9%
Maksimal Tenor Produk     = 120 bulan
Batas Usia                = sebelum 85 tahun
Pembulatan Plafon         = Rp100.000
Maksimal Plafon Produk    = Rp200.000.000
Biaya Verifikasi          = Rp1.500.000
Biaya Flagging            = Rp38.000
Potongan Angsuran         = 2 periode
```

**Catatan:** nilai parameter harus disimpan sebagai configuration/master data, bukan hard-coded pada UI.

---

# 6. Input Validation

Sebelum kalkulasi:

1. `tanggalLahir` wajib valid.
2. `gajiBersih` harus lebih besar dari 0.
3. `tenorBulan` harus lebih besar dari 0.
4. `plafonPengajuan` tidak boleh negatif.
5. `marginTahunan` harus valid.
6. Produk/BPR wajib tersedia.
7. Parameter produk wajib tersedia.
8. Data yang diperlukan untuk insurance lookup wajib tersedia.

Input kosong tidak boleh otomatis dianggap `0` kecuali rule secara eksplisit menyatakan demikian.

Nilai uang harus dihitung menggunakan tipe decimal/integer-safe arithmetic, bukan floating point yang berpotensi menghasilkan error presisi.

---

# 7. Age Engine

## 7.1 Usia Saat Ini

Usia dihitung dari:

```text
Tanggal Perhitungan
-
Tanggal Lahir
```

Implementasi harus mempertahankan komponen tahun/bulan/hari bila diperlukan untuk menentukan boundary usia.

---

## 7.2 Tanggal Lunas

```text
Tanggal Lunas =
Tanggal Perhitungan + Tenor Bulan
```

---

## 7.3 Usia Saat Lunas

```text
Usia Saat Lunas =
Tanggal Lunas - Tanggal Lahir
```

---

## 7.4 Batas Usia

Workbook menggunakan batas usia nominal **85 tahun**, dengan perilaku tenor efektif sampai sebelum mencapai usia 85 tahun.

Untuk coding, boundary harus diperlakukan sebagai:

```text
Usia Saat Lunas < 85 tahun
```

atau equivalently:

```text
Usia maksimum efektif = 84 tahun 11 bulan
```

Implementasi tidak boleh mengizinkan tenor yang menyebabkan usia saat lunas melewati boundary tersebut.

---

# 8. Tenor Engine

## 8.1 Maksimal Tenor Berdasarkan Produk

```text
Maksimal Tenor Produk = 120 bulan
```

Nilai harus berasal dari konfigurasi produk.

---

## 8.2 Maksimal Tenor Berdasarkan Usia

Maksimal tenor berdasarkan usia adalah sisa waktu sampai sebelum mencapai batas usia maksimum.

Secara konsep:

```text
Maksimal Tenor Usia =
selisih bulan dari tanggal perhitungan
sampai batas usia efektif
```

---

## 8.3 Maksimal Tenor Final

```text
Maksimal Tenor Final =
MIN(
    Maksimal Tenor Produk,
    Maksimal Tenor Usia
)
```

---

## 8.4 Validasi Tenor

```text
Jika Tenor Pengajuan > Maksimal Tenor Final
→ OVER

Jika Tenor Pengajuan <= Maksimal Tenor Final
→ OK
```

Nilai tepat pada batas diperbolehkan.

Contoh untuk batas produk:

```text
120 bulan → OK
121 bulan → OVER
```

---

# 9. DBR Engine

DBR adalah rasio angsuran terhadap gaji bersih bulanan.

```text
DBR =
Angsuran Bulanan / Gaji Bersih
```

Dalam persen:

```text
DBR% =
(Angsuran Bulanan / Gaji Bersih) × 100
```

---

## 9.1 DBR Maksimum

```text
DBR Maksimum = 90%
```

Rule:

```text
Jika DBR > 90%
→ OVER

Jika DBR <= 90%
→ OK
```

Validasi harus menggunakan nilai numerik internal, bukan angka yang sudah dibulatkan untuk display.

---

# 10. Credit Capacity Engine

## 10.1 Maksimal Angsuran

```text
Maksimal Angsuran =
Gaji Bersih × DBR Maksimum
```

Dengan DBR 90%:

```text
Maksimal Angsuran =
Gaji Bersih × 90%
```

---

# 11. Installment Engine

Aplikasi **WAJIB menyediakan pilihan metode angsuran melalui dropdown**.

Pilihan:

```text
FLAT
ANNUITY
```

Label UI yang disarankan:

```text
Metode Perhitungan Angsuran:
[ Flat ▼ ]
```

atau:

```text
[ Flat ]
[ Anuitas / PMT ]
```

Pilihan metode harus tersimpan sebagai bagian dari simulasi.

---

# 12. Metode Angsuran FLAT

Metode `FLAT` adalah metode utama yang digunakan pada jalur simulasi BPR untuk perhitungan flat rate.

## 12.1 Margin Flat Bulanan

Margin tahunan:

```text
Margin Tahunan = 10,8%
```

Margin bulanan:

```text
Margin Flat Bulanan =
Margin Tahunan / 12
```

Sehingga:

```text
10,8% / 12 = 0,9% per bulan
```

---

## 12.2 Angsuran Flat

```text
Angsuran Pokok =
Plafon Pengajuan / Tenor Bulan
```

```text
Angsuran Margin =
Plafon Pengajuan × Margin Flat Bulanan
```

```text
Angsuran Bulanan =
Angsuran Pokok + Angsuran Margin
```

atau:

```text
Angsuran Bulanan =
(Plafon Pengajuan / Tenor Bulan)
+
(Plafon Pengajuan × Margin Flat Bulanan)
```

Dengan margin 10,8% per tahun:

```text
Angsuran Bulanan =
(Plafon Pengajuan / Tenor Bulan)
+
(Plafon Pengajuan × 10,8% / 12)
```

---

# 13. Metode Angsuran ANNUITY / PMT

Metode `ANNUITY` menggunakan prinsip PMT/anuitas.

Rate yang digunakan adalah **rate tahunan yang sama dengan metode FLAT** dibagi 12:

```text
Margin Bulanan =
Margin Tahunan / 12
```

Sehingga untuk rate 10,8%:

```text
Margin Bulanan = 10,8% / 12 = 0,9% per bulan
```

Formula PMT menggunakan margin bulanan tersebut:

```text
Angsuran Bulanan =
PMT(
    Margin Bulanan,
    Tenor Bulan,
    Plafon Pengajuan
)
```

Karena PMT secara matematis menghasilkan cash flow negatif untuk pembayaran:

```text
Angsuran Bulanan =
-PMT(
    Margin Bulanan,
    Tenor Bulan,
    Plafon Pengajuan
)
```

Untuk implementasi manual:

```text
Angsuran =
P × r × (1+r)^n
/
((1+r)^n - 1)
```

dengan:

```text
P = Plafon Pengajuan
r = Margin Bulanan (= Margin Tahunan / 12)
n = Tenor Bulan
```

---

# 14. Rate untuk Kedua Metode

Produk hanya memiliki **satu annual rate**: **10,8% per tahun**.

Rate ini digunakan untuk:

```text
Metode FLAT
  → Margin Bulanan = 10,8% / 12 = 0,9%

Metode ANNUITY / PMT
  → Margin Bulanan = 10,8% / 12 = 0,9%
  → Rate PMT menggunakan Margin Bulanan yang sama
```

**Tidak ada konversi effective rate.** Jangan mengubah 10,8% menjadi effective rate lain.

Rate 10,8% harus disimpan sebagai parameter/master data (`credit_parameters.flat_annual_rate`), bukan hard-coded di source code.

```text
Margin Tahunan = flat_annual_rate dari database
Margin Bulanan = Margin Tahunan / 12
```

---

# 15. Pilihan Metode dan Dampaknya

Metode yang dipilih marketing memengaruhi:

- Angsuran bulanan
- DBR
- Sisa gaji
- Kemampuan plafon
- Potongan angsuran
- Hasil simulasi

Semua hasil harus dihitung ulang ketika marketing mengganti:

```text
FLAT ↔ ANNUITY
```

Contoh alur:

```text
Input Plafon
     ↓
Pilih Metode
     ↓
┌───────────────┐
│ FLAT          │
│ atau          │
│ ANNUITY/PMT   │
└───────────────┘
     ↓
Angsuran
     ↓
DBR
     ↓
Sisa Gaji
     ↓
Eligibility
```

---

# 16. Maximum Principal — Metode Flat

Untuk metode flat, maksimum plafon berdasarkan kemampuan angsuran:

```text
Plafon Maksimum Kemampuan =
(
    Maksimal Angsuran × Tenor Bulan
)
/
(
    1 + (Margin Flat Bulanan × Tenor Bulan)
)
```

Dengan:

```text
Maksimal Angsuran =
Gaji Bersih × DBR Maksimum
```

Sehingga:

```text
Plafon Maksimum Kemampuan =
(
    Gaji Bersih × DBR Maksimum × Tenor Bulan
)
/
(
    1 + (Margin Flat Bulanan × Tenor Bulan)
)
```

---

# 17. Maximum Principal — Metode Annuity

Untuk metode ANNUITY, maksimum plafon berdasarkan kemampuan angsuran menggunakan present value.

Rate yang digunakan adalah **Margin Bulanan** (sama dengan metode FLAT):

```text
Margin Bulanan = Margin Tahunan / 12
```

Konsep:

```text
Plafon Maksimum Kemampuan =
PV(
    Margin Bulanan,
    Tenor Bulan,
    Maksimal Angsuran
)
```

Dengan tanda positif untuk hasil plafon:

```text
Plafon Maksimum Kemampuan =
-PV(
    Margin Efektif Bulanan,
    Tenor Bulan,
    Maksimal Angsuran
)
```

Secara matematis:

```text
PV =
Payment ×
(
    1 - (1+r)^(-n)
)
/
r
```

dengan:

```text
Payment = Maksimal Angsuran
r       = Margin Bulanan (= Margin Tahunan / 12)
n       = Tenor Bulan
```

---

# 18. Maximum Principal Final

Maksimum plafon final mempertimbangkan:

1. Kemampuan angsuran.
2. Batas maksimum produk.
3. Batas usia/tenor.
4. Kebijakan produk/BPR.

Konsep:

```text
Plafon Maksimum Final =
MIN(
    Plafon Maksimum Kemampuan,
    Plafon Maksimum Produk
)
```

Tenor yang digunakan harus terlebih dahulu lolos `Tenor Engine`.

---

# 19. Pembulatan Plafon

Workbook menggunakan pembulatan ke bawah dalam kelipatan:

```text
Rp100.000
```

Formula:

```text
Plafon Final =
FLOOR(
    Plafon Maksimum Final,
    Rp100.000
)
```

Contoh:

```text
Rp98.765.432
→ Rp98.700.000
```

---

# 20. Validasi Plafon Pengajuan

```text
Jika Plafon Pengajuan > Plafon Maksimum Final
→ OVER

Jika Plafon Pengajuan <= Plafon Maksimum Final
→ OK
```

Nilai tepat pada batas diperbolehkan.

---

# 21. Effective Rate Analysis — RATE (Informasi Saja)

> **Catatan:** Bagian ini bersifat informasional. Aplikasi tidak menggunakan effective rate conversion untuk menghitung angsuran ANNUITY. Kedua metode (FLAT dan ANNUITY) menggunakan rate yang sama: **10,8% per tahun / 12 per bulan**.

Workbook menyediakan analisis RATE untuk keperluan reporting/informasi, bukan sebagai dasar kalkulasi angsuran.

Jika diperlukan untuk keperluan analisis atau pelaporan:

```text
calculateEffectiveRate(
    principal,
    installment,
    tenorMonths,
    paymentTiming
)
```

Konsep:

```text
Effective Monthly Rate =
RATE(
    Tenor Bulan,
    -Angsuran,
    Plafon,
    Nilai Akhir,
    Timing Pembayaran
)
```

Kemudian:

```text
Effective Annual Rate =
Effective Monthly Rate × 12
```

Hasil ini hanya digunakan untuk **pelaporan**, bukan sebagai input kalkulasi.

---

# 22. Satu Rate untuk Semua Metode

**Keputusan bisnis final:**

```text
Satu Annual Rate = 10,8% per tahun
```

Digunakan untuk:

```text
FLAT    → Margin Bulanan = 10,8% / 12 = 0,9%
ANNUITY → Margin Bulanan = 10,8% / 12 = 0,9%
```

Tidak ada konversi flat-to-effective. Tidak ada field effective rate terpisah.

Rate disimpan di database sebagai:

```text
credit_parameters.flat_annual_rate = 0.108
```

Aplikasi mengambil rate ini dari database, bukan hard-code.

---

# 23. Insurance Engine

## 23.1 Tenor Asuransi

Tenor asuransi dalam tahun:

```text
Tenor Tahun Asuransi =
CEILING(Tenor Bulan / 12)
```

Contoh:

```text
12 bulan  → 1 tahun
24 bulan  → 2 tahun
25 bulan  → 3 tahun
60 bulan  → 5 tahun
120 bulan → 10 tahun
```

---

# 24. Insurance Rate Lookup

Insurance rate berasal dari tabel tarif asuransi.

Lookup menggunakan:

1. Usia.
2. Tenor asuransi.
3. Produk/jenis asuransi jika diperlukan.

Jangan hard-code seluruh rate pada source code.

Model:

```text
InsuranceRate Master
    ↓
Lookup berdasarkan usia + tenor
    ↓
Insurance Rate
```

---

# 25. Current Age dan Next Age Insurance Rule

Workbook melakukan lookup untuk usia saat ini dan usia berikutnya.

```text
Usia Lookup 1 =
Usia Saat Ini
```

```text
Usia Lookup 2 =
Usia Saat Ini + 1 tahun
```

Kemudian:

```text
Rate 1 =
Lookup(
    Usia Saat Ini,
    Tenor Tahun Asuransi
)
```

```text
Rate 2 =
Lookup(
    Usia Saat Ini + 1 tahun,
    Tenor Tahun Asuransi
)
```

Tarif yang digunakan:

```text
Insurance Rate =
MAX(
    Rate 1,
    Rate 2
)
```

Tujuannya mengikuti perilaku workbook yang mengambil rate yang lebih tinggi dari dua usia tersebut.

---

# 26. Insurance Charge

Struktur insurance-related charge pada workbook harus dipisahkan.

Komponen:

```text
1. Premi Asuransi
2. Fee Fronting
3. Pencadangan
```

Jangan menyimpan seluruhnya hanya sebagai satu angka tanpa breakdown.

---

# 27. Premium Asuransi

Secara umum:

```text
Premi Asuransi =
Plafon Pengajuan × Tarif Premi Asuransi
```

Tarif premi berasal dari insurance rate master/lookup.

---

# 28. Fee Fronting

```text
Fee Fronting =
Plafon Pengajuan × Tarif Fee Fronting
```

Tarif harus configurable berdasarkan:

- BPR
- Produk
- Skema
- Ketentuan bisnis

---

# 29. Pencadangan

Pencadangan merupakan komponen terpisah dari premium dan fee fronting.

```text
Pencadangan =
Plafon Pengajuan × Tarif Pencadangan
```

Tarif pencadangan harus berasal dari konfigurasi yang sesuai.

---

# 30. Total Insurance-Related Charge

```text
Total Insurance Charge =
Premi Asuransi
+
Fee Fronting
+
Pencadangan
```

Jika workbook menggunakan combined rate:

```text
Combined Insurance Rate =
Premium Rate
+
Fronting Rate
+
Reserve Rate
```

Kemudian:

```text
Total Insurance Charge =
Plafon Pengajuan × Combined Insurance Rate
```

Kedua representasi tersebut harus menghasilkan nilai yang sama setelah mengikuti precision/rounding rule.

---

# 31. Biaya Administrasi

Konsep umum:

```text
Biaya Admin =
Plafon Pengajuan × Tarif Admin
```

Tarif tidak boleh hard-coded secara global.

Gunakan:

```text
getAdminRate(
    BPR,
    Produk,
    Kantor Bayar,
    parameter lain
)
```

Workbook memiliki kondisi tarif berdasarkan kombinasi parameter tertentu. Kondisi tersebut harus dimigrasikan sebagai configuration/business rule, bukan sebagai referensi cell.

---

# 32. Biaya Provisi

```text
Biaya Provisi =
Plafon Pengajuan × Tarif Provisi
```

Gunakan:

```text
getProvisionRate(
    BPR,
    Produk,
    Kantor Bayar,
    parameter lain
)
```

---

# 33. Biaya Verifikasi

Workbook menggunakan biaya verifikasi tetap:

```text
Biaya Verifikasi = Rp1.500.000
```

Namun aplikasi harus menyimpan nilai tersebut sebagai parameter:

```text
verificationFee
```

bukan hard-coded pada frontend.

---

# 34. Biaya Flagging

Biaya flagging ditetapkan sebagai nilai nominal tetap:

```text
Biaya Flagging = Rp38.000
```

Nilai ini harus disimpan sebagai parameter/master data (`fee_parameters.flagging_fee`), bukan hard-coded.

Nilai boleh direvisi di masa depan melalui mekanisme parameter versioning yang memiliki authorization dan audit trail.

Historical version harus tetap dapat ditelusuri.

Biaya Flagging dikurangkan **satu kali saja** pada perhitungan Terima Bersih, secara terpisah dari `totalFees`.

**Jangan memasukkan Biaya Flagging ke dalam `totalFees`.** Hal ini akan menyebabkan double-deduction.

---

# 35. Potongan Angsuran

Workbook menggunakan:

```text
Jumlah Periode Potongan = 2
```

Formula:

```text
Potongan Angsuran =
Angsuran Bulanan × Jumlah Periode Potongan
```

Sehingga default:

```text
Potongan Angsuran =
Angsuran Bulanan × 2
```

Nilai `2` harus configurable.

---

# 36. Total Biaya

Komponen harus disimpan terpisah.

`totalFees` adalah jumlah biaya yang dipotong, **tidak termasuk Biaya Flagging dan Angka Pelunasan** (keduanya dikurangkan secara terpisah pada Terima Bersih):

```text
Total Biaya =
Biaya Admin
+
Biaya Provisi
+
Total Insurance Charge
+
Biaya Verifikasi
+
Potongan Angsuran
+
Biaya Lainnya
```

Jangan menggabungkan seluruh komponen secara permanen menjadi satu field karena breakdown diperlukan untuk audit.

---

# 37. Terima Bersih

Formula final (keputusan bisnis):

```text
Terima Bersih =
Plafon Pengajuan
-
Total Biaya
-
Angka Pelunasan
-
Biaya Flagging
-
Potongan Lainnya
```

Keterangan:

- `Total Biaya` = Admin + Provisi + Insurance + Verifikasi + Potongan Angsuran + Biaya Lainnya
- `Biaya Flagging` dikurangkan **satu kali** secara terpisah (tidak masuk `Total Biaya`)
- `Angka Pelunasan` dikurangkan terpisah
- `Potongan Lainnya` dikurangkan terpisah jika ada

---

# 38. Eligibility Engine

Status kredit tidak boleh ditentukan hanya oleh satu parameter.

Status:

```text
OK
```

jika seluruh eligibility rule terpenuhi.

Status:

```text
OVER
```

jika minimal satu rule gagal.

---

# 39. Eligibility Rules

### DBR

```text
Jika DBR > DBR Maksimum
→ OVER
```

### Usia

```text
Jika Usia Saat Lunas >= batas usia efektif
→ OVER
```

### Tenor

```text
Jika Tenor Pengajuan > Maksimal Tenor Final
→ OVER
```

### Plafon

```text
Jika Plafon Pengajuan > Plafon Maksimum Final
→ OVER
```

---

# 40. Multiple Reasons

Jangan berhenti pada error pertama.

Contoh:

```json
{
  "status": "OVER",
  "reasons": [
    "DBR melebihi 90%",
    "Tenor melebihi maksimal tenor",
    "Plafon melebihi maksimal plafon"
  ]
}
```

Semua rule yang gagal harus dikumpulkan.

---

# 41. Calculation Result

Calculation engine minimal mengembalikan:

```text
statusKredit
alasanOver

usiaSaatIni
usiaSaatLunas

tenorBulan
maksTenorUsia
maksTenorFinal

metodeAngsuran
marginTahunan
marginBulanan

maksAngsuran
plafonMaksimumKemampuan
plafonMaksimumFinal
plafonPengajuan

angsuranBulanan
dbr
sisaGaji

tenorTahunAsuransi
insuranceRate
premiAsuransi
feeFronting
pencadangan

biayaAdmin
biayaProvisi
biayaVerifikasi
biayaFlagging
potonganAngsuran
angkaPelunasan

totalBiaya
terimaBersih

calculationBreakdown
```

---

# 42. Calculation Breakdown

UI harus dapat menjelaskan hasil perhitungan.

Contoh:

```text
PLAFON
Plafon Pengajuan       Rp xxx

ANGSURAN
Metode                 Flat / Anuitas
Angsuran Pokok         Rp xxx
Angsuran Margin        Rp xxx
Angsuran Bulanan       Rp xxx

KEMAMPUAN BAYAR
Gaji Bersih            Rp xxx
DBR                    xx.xx%
DBR Maksimum           90%
Sisa Gaji              Rp xxx

BIAYA
Admin                  Rp xxx
Provisi                Rp xxx
Premi Asuransi         Rp xxx
Fee Fronting           Rp xxx
Pencadangan            Rp xxx
Verifikasi             Rp xxx
Potongan Angsuran      Rp xxx
Flagging               Rp xxx
Pelunasan              Rp xxx

HASIL
Total Potongan         Rp xxx
Terima Bersih          Rp xxx
Status                 OK / OVER
```

---

# 43. Behavior Saat Marketing Mengubah Metode

Dropdown metode:

```text
[ FLAT ▼ ]
```

Jika marketing memilih:

```text
ANNUITY
```

sistem wajib menghitung ulang minimal:

```text
Angsuran
DBR
Sisa Gaji
Plafon Maksimum Kemampuan
Eligibility
Potongan Angsuran
Terima Bersih
```

Jika kembali ke:

```text
FLAT
```

semua nilai dihitung ulang menggunakan formula flat.

Jangan menyimpan hasil dari metode sebelumnya sebagai hasil metode baru.

---

# 44. Rule Pembulatan

Pisahkan:

```text
Calculation Precision
```

dan:

```text
Display Precision
```

Contoh:

```text
DBR internal = 0.899999999999
DBR display  = 90.00%
```

Eligibility menggunakan nilai internal.

Untuk plafon:

```text
FLOOR(
    Plafon Maksimum Final,
    Rp100.000
)
```

Jangan menggunakan nilai display sebagai input calculation engine.

---

# 45. Currency Rules

Semua nilai finansial menggunakan:

```text
Currency = IDR
```

Contoh penyimpanan:

```text
1934300
```

Display:

```text
Rp1.934.300
```

Jangan menggunakan floating point untuk nilai finansial yang membutuhkan precision.

---

# 46. Amortization Schedule — FLAT

Untuk metode flat, minimal schedule dapat menyimpan:

```text
Periode
Tanggal Pembayaran
Saldo Awal
Pokok
Margin
Total Angsuran
Saldo Akhir
```

Pada metode flat:

```text
Pokok Periode =
Plafon / Tenor
```

```text
Margin Periode =
Plafon × Margin Flat Bulanan
```

```text
Angsuran =
Pokok Periode + Margin Periode
```

Boundary periode terakhir harus menangani residual akibat pembulatan agar saldo akhir tidak menghasilkan selisih.

---

# 47. Amortization Schedule — ANNUITY

Untuk metode anuitas:

```text
Angsuran =
Pokok + Bunga/Margin
```

Margin periode:

```text
Margin Periode =
Saldo Awal × Margin Efektif Bulanan
```

Pokok periode:

```text
Pokok Periode =
Angsuran - Margin Periode
```

Saldo akhir:

```text
Saldo Akhir =
Saldo Awal - Pokok Periode
```

Periode terakhir harus disesuaikan terhadap residual rounding.

---

# 48. Business Rule Versioning

Setiap simulasi harus menyimpan versi rule yang digunakan.

Minimal:

```text
businessRuleVersion
parameterVersion
calculationMethod
calculatedAt
```

Tujuannya agar hasil simulasi lama tetap dapat dijelaskan meskipun parameter bisnis berubah di kemudian hari.

---

# 49. Master Configuration

Parameter yang sebaiknya berada di database:

```text
BPR
Product
Maximum Age
Maximum Tenor
Maximum Principal
Maximum DBR
Flat Annual Rate
Flat Monthly Rate
Admin Rate
Provision Rate
Verification Fee
Flagging Fee
Installment Deduction Period
Insurance Rate Table
Fronting Rate
Reserve Rate
Rounding Rule
```

---

# 50. Insurance Master

Struktur minimum:

```text
InsuranceRate
- id
- productId
- age
- tenorYears
- premiumRate
- effectiveFrom
- effectiveTo
- active
```

Jika fronting dan pencadangan menggunakan rate table berbeda:

```text
FrontingRate
ReserveRate
```

dapat dipisahkan sebagai master/configuration tersendiri.

---

# 51. Calculation Engine Flow

```text
Input
  ↓
Validate Input
  ↓
Load BPR + Product Configuration
  ↓
Calculate Age
  ↓
Calculate Maturity Age
  ↓
Calculate Maximum Tenor by Age
  ↓
Determine Final Maximum Tenor
  ↓
Calculate Maximum Installment
  ↓
Select Calculation Method
      │
      ├── FLAT
      │     ↓
      │  Flat Installment
      │
      └── ANNUITY
            ↓
         PMT Installment
      │
      ↓
Calculate Maximum Principal
      │
      ├── Flat → Flat Capacity Formula
      └── Annuity → PV
      ↓
Validate Requested Principal
  ↓
Calculate Actual Installment
  ↓
Calculate DBR
  ↓
Calculate Remaining Salary
  ↓
Calculate Insurance
  ↓
Calculate Admin / Provision / Fees
  ↓
Calculate Settlement / Flagging
  ↓
Calculate Net Disbursement
  ↓
Eligibility Engine
  ↓
Generate Reasons
  ↓
Generate Breakdown
  ↓
Generate Amortization Schedule
  ↓
Save Calculation Result
```

---

# 52. Pseudocode Utama

```text
function calculateCredit(application):

    validateInput(application)

    config = getProductConfig(
        application.bpr,
        application.product
    )

    age = calculateAge(
        application.birthDate,
        application.calculationDate
    )

    maturityDate =
        addMonths(
            application.calculationDate,
            application.tenorMonths
        )

    ageAtMaturity =
        calculateAge(
            application.birthDate,
            maturityDate
        )

    maxTenorByAge =
        calculateRemainingTenor(
            application.birthDate,
            config.maximumAge
        )

    maxTenorFinal =
        min(
            config.maxTenorMonths,
            maxTenorByAge
        )

    maxInstallment =
        application.netSalary *
        config.dbrMaximum

    if application.calculationMethod == "FLAT":

        installment =
            calculateFlatInstallment(
                application.requestedPrincipal,
                application.tenorMonths,
                config.flatAnnualRate
            )

        maxPrincipalByCapacity =
            calculateMaximumPrincipalFlat(
                maxInstallment,
                application.tenorMonths,
                config.flatMonthlyRate
            )

    else if application.calculationMethod == "ANNUITY":

        installment =
            calculateAnnuityInstallment(
                application.requestedPrincipal,
                application.tenorMonths,
                config.monthlyRate  -- = flatAnnualRate / 12, sama dengan FLAT
            )

        maxPrincipalByCapacity =
            calculateMaximumPrincipalAnnuity(
                maxInstallment,
                application.tenorMonths,
                config.monthlyRate  -- = flatAnnualRate / 12
            )

    maxPrincipalFinal =
        floorToIncrement(
            min(
                maxPrincipalByCapacity,
                config.maxPrincipal
            ),
            config.principalRounding
        )

    dbr =
        installment /
        application.netSalary

    remainingSalary =
        application.netSalary -
        installment

    insuranceTenorYears =
        ceil(
            application.tenorMonths / 12
        )

    insuranceRateCurrent =
        getInsuranceRate(
            age,
            insuranceTenorYears
        )

    insuranceRateNext =
        getInsuranceRate(
            age + 1,
            insuranceTenorYears
        )

    insuranceRate =
        max(
            insuranceRateCurrent,
            insuranceRateNext
        )

    premium =
        application.requestedPrincipal *
        insuranceRate

    frontingFee =
        calculateFrontingFee(...)

    reserve =
        calculateReserve(...)

    adminFee =
        calculateAdminFee(...)

    provisionFee =
        calculateProvisionFee(...)

    verificationFee =
        calculateVerificationFee(...)

    flaggingFee =
        calculateFlaggingFee(...)

    installmentDeduction =
        installment *
        config.installmentDeductionPeriods

    totalInsuranceCharge =
        premium +
        frontingFee +
        reserve

    totalFees =
        adminFee +
        provisionFee +
        totalInsuranceCharge +
        verificationFee +
        installmentDeduction

    netDisbursement =
        application.requestedPrincipal -
        totalFees -
        application.payoffAmount -
        flaggingFee -
        otherDeductions

    reasons = []

    if dbr > config.dbrMaximum:
        reasons.push("DBR melebihi batas")

    if ageAtMaturity >= config.maximumAge:
        reasons.push("Usia saat lunas melebihi batas")

    if application.tenorMonths > maxTenorFinal:
        reasons.push("Tenor melebihi batas")

    if application.requestedPrincipal > maxPrincipalFinal:
        reasons.push("Plafon melebihi batas")

    status =
        reasons.length > 0
        ? "OVER"
        : "OK"

    return {
        status,
        reasons,
        calculationMethod,
        installment,
        dbr,
        remainingSalary,
        maxPrincipalFinal,
        premium,
        frontingFee,
        reserve,
        adminFee,
        provisionFee,
        verificationFee,
        flaggingFee,
        installmentDeduction,
        totalFees,
        netDisbursement
    }
```

---

# 53. Error Handling

Input invalid harus menghasilkan error yang jelas.

Contoh:

```text
INVALID_BIRTH_DATE
INVALID_SALARY
INVALID_TENOR
INVALID_PRINCIPAL
INVALID_PRODUCT
INVALID_BPR
INVALID_MARGIN
INSURANCE_RATE_NOT_FOUND
INVALID_INSURANCE_CONFIGURATION
INVALID_CALCULATION_METHOD
```

Sistem tidak boleh menghasilkan angka yang tampak valid jika parameter penting tidak tersedia.

---

# 54. Calculation Method Enum

Gunakan enum:

```text
FLAT
ANNUITY
```

Database harus menyimpan metode yang dipilih pada setiap simulasi.

Contoh:

```text
calculation_method = FLAT
```

atau:

```text
calculation_method = ANNUITY
```

---

# 55. Audit Requirements

Aktivitas berikut harus diaudit:

- Perubahan metode kalkulasi jika simulasi disimpan.
- Perubahan parameter kredit.
- Perubahan rate.
- Perubahan master insurance.
- Perubahan fee.
- Create simulation.
- Update simulation.
- Delete simulation.
- Recalculation simulation.

Audit minimal:

```text
id
userId
action
entityType
entityId
oldValue
newValue
businessRuleVersion
parameterVersion
createdAt
```

---

# 56. Regression Test Requirements

Setiap formula wajib memiliki test.

Minimal:

## DBR

```text
89.99% → OK
90.00% → OK
90.01% → OVER
```

## Tenor

```text
120 bulan → OK jika masih dalam batas usia
121 bulan → OVER jika melebihi batas produk
```

## Plafon

```text
Plafon = maksimum → OK
Plafon > maksimum → OVER
```

## Metode Flat

Test:

```text
Principal
+
Tenor
+
10,8% annual flat rate
```

harus menghasilkan angsuran sesuai workbook.

## Metode Annuity

Test:

```text
Principal
+
Margin Bulanan (= 10,8% / 12)
+
Tenor
```

harus menghasilkan PMT sesuai expected result.

## Insurance

Test:

```text
Rate current age
Rate next age
→ MAX
```

## Net Disbursement

Test semua komponen potongan secara terpisah.

---

# 57. Excel Regression Testing

Untuk memastikan migrasi Excel → aplikasi benar, developer harus membuat regression test menggunakan beberapa contoh nyata dari workbook.

Setiap test minimal berisi:

```text
Input Excel
Expected Excel Result
Application Result
Difference
Status
```

Target:

```text
Difference = 0
```

atau perbedaan hanya sebesar toleransi rounding yang telah disepakati.

---

# 58. Source of Truth

Untuk formula yang telah diverifikasi:

```text
BUSINESS_RULES.md
        ↓
Calculation Engine
        ↓
Automated Tests
        ↓
Application
```

Workbook Excel tetap menjadi reference/regression source selama proses migrasi.

Jangan membuat:

```text
UI
 ↓
Excel-style cell formula
 ↓
Result
```

---

# 59. Larangan untuk AI Coding Agent

AI coding agent DILARANG:

1. Menebak formula.
2. Menggunakan effective rate yang berbeda dari rate database (10,8% / 12).
3. Melakukan konversi flat-to-effective rate tanpa keputusan bisnis eksplisit.
4. Menghapus pilihan metode `FLAT` / `ANNUITY`.
5. Mengubah rate tanpa parameter/configuration.
6. Hard-code insurance rate pada frontend.
7. Hard-code fee pada komponen UI.
8. Mengubah rounding.
9. Mengubah boundary usia.
10. Mengubah status eligibility.
11. Mengubah formula untuk membuat hasil "terlihat bagus".
12. Mengubah business rule tanpa update dokumen dan regression test.
13. Memasukkan Biaya Flagging ke dalam `totalFees` (akan menyebabkan double-deduction pada Terima Bersih).

Jika rule belum jelas:

```text
STATUS = NEED_CLARIFICATION
```

AI harus meminta klarifikasi, bukan membuat asumsi.

---

# 60. Definition of Done — Business Rules

Business Rules dianggap siap untuk implementation jika:

- [x] Formula menggunakan nama variabel bisnis.
- [x] Tidak bergantung pada alamat cell Excel.
- [x] DBR didefinisikan.
- [x] Maximum installment didefinisikan.
- [x] Flat installment didefinisikan.
- [x] Annuity/PMT didefinisikan (menggunakan rate yang sama: 10,8% / 12).
- [x] PV untuk maximum principal annuity didefinisikan (menggunakan rate yang sama).
- [x] RATE untuk effective-rate analysis didefinisikan (informasional saja).
- [x] Marketing memiliki pilihan metode angsuran.
- [x] Satu annual rate 10,8% untuk kedua metode didefinisikan.
- [x] Insurance lookup didefinisikan.
- [x] Current-age dan next-age insurance rule didefinisikan.
- [x] Premium/fronting/reserve dipisahkan.
- [x] Admin dan provisi configurable.
- [x] Verifikasi dan flagging didefinisikan (Rp38.000 sebagai parameter).
- [x] Potongan angsuran didefinisikan.
- [x] Terima bersih didefinisikan (flagging dikurangkan satu kali, terpisah dari totalFees).
- [x] Eligibility didefinisikan.
- [x] Reason `OVER` didefinisikan.
- [x] Rounding didefinisikan.
- [x] Regression test diwajibkan.
- [x] Business rule versioning didefinisikan.

---

# 61. Status Dokumen

```text
Status:
APPROVED FOR IMPLEMENTATION

Scope:
Ref + Asuransi + Simulasi BPR

Calculation Methods:
FLAT + ANNUITY

Single Annual Rate:
10,8% (digunakan untuk FLAT dan ANNUITY)

Default DBR Maximum:
90%

Default Maximum Product Tenor:
120 months

Default Maximum Age:
Before 85 years

Default Principal Rounding:
Rp100.000

Default Flagging Fee:
Rp38.000 (disimpan sebagai parameter, bukan hard-coded)

Terima Bersih:
Plafon - Total Biaya - Pelunasan - Flagging Fee - Potongan Lainnya
(Flagging Fee dikurangkan satu kali, TIDAK termasuk dalam Total Biaya)
```

