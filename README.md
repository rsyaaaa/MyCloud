# MyCloud — Personal Local Cloud & Media Hub (Private NAS Web App)

A modern, high-performance private cloud and media hub running 24/7 on Ubuntu Server (`autofocus-server`) for your local area network. Built with the **MarketNest Design System** (warm terracotta, artisanal typography, flat border-driven elevation).

---

## 🌐 Akses Jaringan Lokal (Local Area Network)
- **Host IP:** `192.168.18.78`
- **Port:** `8080`
- **Web App URL:** [http://192.168.18.78:8080](http://192.168.18.78:8080)
- **Hostname:** `autofocus-server`

---

## 🔑 Kredensial Administrator Default (Seeded)
- **Username:** `admin`
- **Password:** `admin12345`
- **Safe Vault Master PIN:** `123456`
- **Hak Akses:** Kuota tak terbatas (500 GB), monitoring kapasitas HDD fisik host real-time, approval pengajuan kuota pengguna.

> **Catatan Registrasi Pengguna Baru:**
> Setiap pengguna baru yang mendaftar secara mandiri akan otomatis mendapatkan role `regular_user` dengan kuota awal **15 GB** (`16,106,127,360 bytes`).

---

## 🚀 Fitur Unggulan Sesuai PRD

### 1. Manajemen Pengguna & Sistem Kuota (15 GB Default)
- **Real-Time Quota Enforcement:** Middleware upload menghitung `SUM(file_size)` secara langsung. Jika upload baru melampaui batas kuota, server mengembalikan status `413 Payload Too Large`.
- **Alur Pengajuan Tambah Kuota:**
  - Pengguna dapat mengajukan penambahan kuota (GB) beserta alasan langsung dari UI.
  - Administrator dapat meninjau, menyetujui, atau menolak permohonan melalui **Admin Dashboard**.
  - Persetujuan otomatis memperbarui batas `storage_quota_bytes`.

### 2. Brankas Terkunci (Safe Lock / Vault Folder)
- **Isolasi Total:** File dengan `is_locked = TRUE` diisolasi secara fisik ke subfolder `/vault/` dan dieksklusikan dari:
  - Galeri utama
  - Carousel "Ingatkah Momen Ini?"
  - Video Hub
  - Pencarian global & tag album
- **PIN Sekunder:** Akses ke brankas memerlukan master PIN.
- **Auto-Lock Security:** Brankas otomatis terkunci setelah 3 menit tidak aktif atau saat berpindah jendela / tab browser.
- **Streaming Rahasia:** File brankas hanya dapat diputar via endpoint khusus `/api/vault/media/:id` dengan token PIN yang valid.

### 3. Galeri Modern & "Ingatkah Momen Ini?" (Memories Engine)
- **Dynamic Date Grid:** Pengelompokan cerdas (`Hari Ini`, `Kemarin`, `Bulan Tahun`).
- **Memories Carousel:**
  - "1 Minggu Lalu" (rentang 7 hari lalu ± 1 hari)
  - "1 Bulan Lalu" (rentang 30 hari lalu ± 2 hari)
  - "1 Tahun Lalu", "2 Tahun Lalu", dst.
  - Fallback memori acak untuk arsip > 14 hari.
- **In-Place Management:** Ubah nama tampilan, atur album/kategori, toggle favorit, dan kunci ke brankas.

### 4. Advanced Video Streaming Hub
- **Aspect-Ratio Native Player:**
  - Metadata diekstrak menggunakan **FFprobe** (lebar, tinggi, rotasi).
  - **Video Portrait (9:16):** Wadah player menyesuaikan vertikal secara alami di desktop & mobile tanpa rotasi paksa landscape.
  - **Video Landscape:** Menyesuaikan rasio standar 16:9.
- **HTTP Range Requests (Status 206 Partial Content):** Scrubbing & seeking instan tanpa buffering ulang di Wi-Fi lokal.
- **Resume Watch:** Otomatis menyimpan `currentTime` setiap 5 detik ke database. Menampilkan notifikasi "Lanjutkan menonton dari [MM:SS]?" saat video dibuka kembali.

---

## 📂 Struktur Direktori Fisik
Data fisik tersimpan rapi di `/home/autofocusxioo/nas_data/`:
```
/home/autofocusxioo/nas_data/
├── db/
│   ├── nas.db            # Database SQLite (WAL mode enabled)
│   ├── nas.db-wal
│   └── nas.db-shm
└── users/
    └── {user_uuid}/
        ├── uploads/      # Berkas media umum
        ├── thumbnails/   # Cache thumbnail WebP hasil render FFmpeg
        └── vault/        # Berkas terlindungi (Safe Lock)
```

---

## 🛠️ Manajemen Service (24/7 Server Runner)

Gunakan script helper `./mycloud.sh`:

```bash
# Cek status running (systemd user service)
./mycloud.sh status

# Restart service
./mycloud.sh restart

# Lihat log real-time
./mycloud.sh logs

# Jalankan via Docker Compose jika diinginkan
./mycloud.sh docker-up

# Hentikan Docker Compose
./mycloud.sh docker-down
```

