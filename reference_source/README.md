# Reference Source Management — Credit Calculator BPR

Direktori ini digunakan untuk menyimpan seluruh file referensi resmi dari bisnis (workbook Excel, tarif premi asuransi, parameter kredit BPR, tabel angsuran) guna menjamin keaslian data finansial dan auditabilitas sistem.

---

## Struktur Direktori

```text
reference_source/
├── README.md              # Dokumentasi tata kelola data referensi
├── original/              # File workbook Excel asli dari BPR (read-only, tidak boleh diubah)
│   └── KALKULATOR KREDIT.xlsx
├── validated/             # File referensi yang telah divalidasi strukturnya oleh sistem
└── import/                # Data hasil ekstraksi/transformasi (JSON/CSV) siap-seed ke database
```

---

## Protokol dan Aturan Tata Kelola Data

1. **Prinsip Immutability:**
   - File di dalam folder `original/` adalah *Source of Truth* resmi dari BPR dan bersifat **read-only**.
   - Tidak boleh ada modifikasi formula, perubahan nominal, atau pengeditan data secara manual pada file di dalam folder `original/`.

2. **Larangan AI Hallucination:**
   - AI / Developer **dilarang keras mengarang atau menginterpolasi data finansial**, tarif premi asuransi, rate bunga, ataupun parameter biaya.
   - Seluruh data yang masuk ke database harus bersumber langsung dari hasil ekstraksi dan validasi file di direktori ini.

3. **Alur Ekstraksi & Import (Pipeline):**
   ```text
   reference_source/original/ (Excel Asli)
                 ↓
      Validation Engine (Pengecekan Tipe, Range & Format)
                 ↓
   reference_source/validated/ (File Tervalidasi)
                 ↓
   reference_source/import/ (Format Ekstraksi JSON/CSV)
                 ↓
         Database Seeder (Prisma ORM Seed)
                 ↓
          PostgreSQL Database
   ```

4. **Kategori Data yang Diekstrak:**
   - Master Produk Kredit BPR
   - Parameter Kredit BPR (Maksimum DBR 90%, Suku Bunga 10,8% p.a., Tenor Maks 120 bln, Plafon Maks Rp200jt)
   - Tabel Tarif Premi Asuransi Jiwa Kredit (Matrix Usia vs Tenor)
   - Parameter Biaya (Biaya Flagging Rp38.000, Biaya Verifikasi Rp1.500.000, Admin, Provisi, Fronting, Cadangan)
