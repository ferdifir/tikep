# Tikep — Viability Report

> **Tanggal:** 29 Juni 2026
> **Lingkup:** 1 bulan ke depan untuk menentukan lanjut/tidak

---

## 1. VPS Resources

### Spesifikasi

| Resource | Value |
|---|---|
| CPU | 2 core x86_64 |
| RAM | 3.9 GB (3.0 GB available) |
| Disk | 50 GB SSD (17 GB free) |
| Inodes | 24% used (776K / 3.2M) |
| OS | Ubuntu 24.04 LTS |
| Swap | ❌ Tidak ada |

### Pemakaian RAM Saat Ini

| Proses | RAM |
|---|---|
| MySQL (tidak dipakai tikep) | ~360 MB |
| Hermes Agent (monitoring VPS) | ~220 MB |
| Next.js (tikep) | ~140 MB |
| PM2 Daemon | ~76 MB |
| PostgreSQL | ~31 MB |
| **Total aktif** | **~878 MB** |
| **Still available** | **~3.0 GB** |

### Pemakaian Disk Saat Ini

| Item | Size |
|---|---|
| OS & system files (`/usr/`) | 5.5 GB |
| Node.js + global tools | ~2 GB |
| `node_modules/` | 886 MB |
| MySQL data (tidak dipakai tikep) | 202 MB |
| VPS agent / logging (`/opt/`, `/var/log/`) | ~525 MB |
| Uploads (1 user, ~5 file) | 37 MB |
| `.next/` build output | 15 MB |
| Database (Postgres — 0 record) | 7.8 MB |
| **Sisa free** | **~17 GB** |

> **Estimasi real free untuk konten:** ~16 GB (setelah sistem + app)

---

## 2. Upload Strategy & Storage Cost

### Flow Upload Saat Ini

```
Upload (multipart, max 100MB)
  → simpan temp file di public/uploads/{userId}/temp_*
  → FFprobe: validasi durasi (max 30 detik), ambil info
  → FFmpeg re-encode: libx264 CRF 28, scale ?x720, aac 64k
  → Output: {id}_comp.mp4
  → Generate thumbnail (frame 0): {id}.jpg
  → Hapus temp file
  → Simpan record di DB
```

### Biaya Per Konten

#### Video (30 detik, 720p)

| Tahap | Ukuran |
|---|---|
| Raw upload (belum dikompres) | ~10-15 MB |
| **Setelah FFmpeg CRF 28** | **~600-800 KB** |
| Thumbnail (frame 0, JPG) | ~15-25 KB |
| **Total permanent** | **~700 KB per video** |

#### Foto (JPEG/PNG/WebP)

| Tahap | Ukuran |
|---|---|
| Upload langsung (skip FFmpeg) | ~200-500 KB |
| Thumbnail (salin dari file) | ~200-500 KB |
| **Total permanent** | **~200-500 KB per foto** |

> Temp file dihapus setelah kompresi — storage final hanya file compressed + thumbnail.

---

## 3. Capacity Analysis

### Dengan 17 GB Free (real ~16 GB)

#### Skenario Video Saja
```
16 GB ÷ 0.7 MB = ~23.400 video
```

#### Skenario Campuran (70% video, 30% foto)
```
11.2 GB ÷ 0.7 MB = ~16.000 video
4.8 GB ÷ 0.3 MB = ~16.000 foto
Total: ~32.000 uploads
```

#### Skenario Realistis 1 Bulan (100 DAU)
- 100 user aktif per hari
- 20% upload per hari = 20 upload/hari
- 30 hari = 600 uploads
- **Storage dibutuhkan:** 600 × 0.6 MB (rata-rata) = **~360 MB/bulan**

#### Skenario Agresif (500 DAU)
- 500 user aktif per hari
- 10% upload per hari = 50 upload/hari
- 30 hari = 1.500 uploads
- **Storage dibutuhkan:** 1.500 × 0.6 MB = **~900 MB/bulan**

### Kesimpulan Capacity

| Skenario | Cukup Sampai |
|---|---|
| 100 DAU | ~3,5 tahun |
| 500 DAU | ~1,5 tahun |
| 1000 DAU | ~9 bulan |

> **Disk bukan bottleneck dalam 1 bulan ke depan.**

---

## 4. Bottlenecks & Risiko

### 🟡 CPU — Potensi Masalah

| Item | Detail |
|---|---|
| Core | 2 core saja |
| FFmpeg | Single-threaded per proses, 2 upload simultan = 100% CPU |
| Build time | ~16-40 detik (bergantung beban) |
| Saran | Di bawah 50 user aktif bersamaan masih aman |

### 🟠 RAM — Perlu Monitor

| Item | Detail |
|---|---|
| Next.js | ~140 MB idle, naik saat build + serve |
| Postgres | ~30 MB, naik seiring data |
| **+ MySQL** | **~360 MB — tidak dipakai tikep, mubazir** |
| Swap | 0 — OOM risk jika ada spike |
| Saran | Matikan MySQL → hemat ~360 MB → total bebas ~3.4 GB |

### 🔴 Temp File Tidak Terhapus

- Dari 10 file di `uploads/1/`, 6 adalah temp file (total ~36 MB)
- Temp file gagal cleanup karena error FFmpeg path di early test
- **Jika terjadi error berulang, temp akan menumpuk dan habiskan disk**
- Perlu scheduled cleanup job atau error handler yang lebih baik

### 🟢 Database — Tidak Ada Masalah

| Item | Nilai |
|---|---|
| Ukuran DB sekarang | 7.8 MB (0 record) |
| Ukuran per 1.000 video | ~5 MB |
| Ukuran per 10.000 user | ~10 MB |
| Proyeksi 1 tahun (10K user, 50K video) | ~50 MB |
| **Kesimpulan** | DB tidak akan jadi masalah |

---

## 5. Rekomendasi — Lanjut / Tidak?

### ✅ Lanjut, dengan catatan:

| Syarat | Alasan |
|---|---|
| Matikan MySQL | Tidak dipakai, buang ~360 MB RAM + 200 MB disk |
| Tambah swap 1-2 GB | Lindungan OOM murah |
| Set cron cleanup temp file | `find /.../uploads/ -name "temp_*" -mtime +1 -delete` |
| Target DAU realistis | 100-200 user dulu — resource masih muat |
| Upgrade disk nanti | Baru perlu setelah 15.000+ upload (~50 GB) |

### ❌ Tidak lanjut, jika:

| Alasan |
|---|
| Target >1.000 DAU dalam 1 bulan — CPU 2 core kewalahan handle upload + serve |
| Ingin video >30 detik atau resolusi >720p — storage & CPU naik drastis |
| Tidak mau handling operasional (cleanup, monitor, upgrade) |

### Final Verdict

> **LAYAK LANJUT untuk 1 bulan ke depan** dengan target 100-500 DAU.
> Resource sekarang cukup, strategi kompresi FFmpeg sudah efisien (700 KB/video).
> Prioritaskan matikan MySQL + tambah swap sebagai persiapan.
> Evaluasi ulang setelah 1 bulan berdasar DAU aktual.

---

## 6. Action Items (Jika Lanjut)

- [ ] Matikan service MySQL (`systemctl stop mysql && systemctl disable mysql`)
- [ ] Buat swap 2 GB (`fallocate -l 2G /swapfile && mkswap /swapfile && swapon /swapfile`)
- [ ] Cron job harian hapus temp file (`0 3 * * * find /var/www/tikep/public/uploads/ -name "temp_*" -mtime +1 -delete`)
- [ ] Pasang monitoring disk (alert >85%)
- [ ] Evaluasi DAU & storage real di minggu ke-4
