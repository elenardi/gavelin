# 🎲 Gavelin: Card Chronicles

Game kartu berbasis D&D mirip Pokémon TCG Pocket, dengan sistem upgrade kartu ala Marvel Snap. Bisa dimainkan di browser & mobile.

**Tech Stack:** React + Three.js (frontend) · Node.js + Express + Socket.IO (backend) · MySQL

---

## 📁 Struktur Project

```
gavelin/
├── backend/          ← Node.js + Express API
│   ├── config/       ← Database & Passport config
│   ├── middleware/   ← JWT auth
│   ├── routes/       ← API endpoints
│   ├── services/     ← Business logic (pack, battle)
│   ├── socket/       ← Socket.IO battle handler
│   └── database/     ← schema.sql + seed.sql
└── frontend/         ← React + Three.js
    └── src/
        ├── pages/        ← Halaman utama
        ├── components/   ← Card, Pack, Battle, Layout
        ├── contexts/     ← Auth context
        └── utils/        ← API client
```

---

## 🚀 Cara Instalasi

### 1. Setup MySQL

```bash
mysql -u root -p
```

```sql
SOURCE gavelin/backend/database/schema.sql;
SOURCE gavelin/backend/database/seed.sql;
```

---

### 2. Setup Google OAuth (WAJIB untuk login Google)

1. Buka [console.cloud.google.com](https://console.cloud.google.com)
2. Buat project baru → klik **"APIs & Services"** → **"Credentials"**
3. Klik **"Create Credentials"** → **"OAuth 2.0 Client ID"**
4. Pilih **"Web application"**
5. Tambahkan **Authorized redirect URIs**:
   - `http://localhost:5000/api/auth/google/callback`
6. Copy **Client ID** dan **Client Secret**

---

### 3. Setup Backend

```bash
cd gavelin/backend
npm install
cp .env.example .env
```

Edit `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password_mysql_kamu
DB_NAME=gavelin
JWT_SECRET=isi_dengan_string_random_min_32_char
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

Jalankan:
```bash
npm run dev
# Server berjalan di http://localhost:5000
```

---

### 4. Setup Frontend

```bash
cd gavelin/frontend
npm install
cp .env.example .env
```

Edit `.env`:
```env
VITE_GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
```

Jalankan:
```bash
npm run dev
# Buka http://localhost:3000
```

---

## 🎮 Fitur Game

| Fitur | Deskripsi |
|-------|-----------|
| **Splash Screen** | Three.js particle animation + logo |
| **Auth** | Register/Login email + Google OAuth |
| **Home** | News, Gift, Pack Slots, Quick Menu, Mission |
| **Pack Opening** | Max 2x/hari, animasi Three.js + card reveal |
| **Koleksi** | Grid kartu, filter, detail, deck builder |
| **Upgrade Kartu** | Seperti Marvel Snap: level 1–5 pakai dust |
| **Convert Duplikat** | Kartu duplikat → dust khusus kartu itu |
| **Community** | Teman, cari user, kirim/klaim kartu hadiah |
| **Battle vs AI** | Mudah/Normal/Susah, real-time via Socket.IO |
| **Battle PvP** | Matchmaking antrian vs pemain lain |
| **Shop** | Frame, title, card back, gems, gold, dust |
| **Mission** | Daily & weekly tasks dengan reward |
| **Leaderboard** | Ranking berdasarkan kemenangan |
| **Profile** | Edit username, stats, currency |

---

## 🃏 Sistem Kartu

**Tipe:** Character · Spell · Item · Location · Trap

**Rarity:** Common → Uncommon → Rare → Epic → Legendary

**Kelas:** Warrior · Mage · Rogue · Cleric · Ranger · Barbarian · Druid · Paladin · Bard · Monk

**Upgrade System (seperti Marvel Snap):**
- Setiap kartu bisa diupgrade dari Level 1 hingga Level 5
- Membutuhkan **Card Dust** khusus untuk kartu tersebut
- Dapatkan dust dengan mengkonversi kartu duplikat
- Biaya dust meningkat per level: 10 → 20 → 40 → 80 (common)

---

## ⚡ Pack Slot System

- Setiap akun dapat **maksimal 2 slot** buka pack per hari
- Slot **reset setiap tengah malam UTC**
- Slot **tidak bisa ditumpuk** — habis ya habis, esok hari mulai dari 2 lagi
- Slot dikurangi otomatis saat pack berhasil dibuka

---

## 🌐 API Endpoints

```
POST   /api/auth/register          Register email
POST   /api/auth/login             Login email
GET    /api/auth/google            Google OAuth
GET    /api/auth/me                Get current user
PATCH  /api/auth/profile           Update profil

GET    /api/packs                  Daftar pack
POST   /api/packs/:id/open         Buka pack

GET    /api/collection/cards       Koleksi kartu (dengan filter)
POST   /api/collection/cards/:id/upgrade    Upgrade kartu
POST   /api/collection/cards/:id/convert    Duplikat → dust
GET    /api/collection/decks       Daftar deck
POST   /api/collection/decks       Buat deck
PUT    /api/collection/decks/:id   Update deck

GET    /api/community/friends      Daftar teman
GET    /api/community/search       Cari user
POST   /api/community/friends/request    Kirim permintaan
PATCH  /api/community/friends/:id  Terima/tolak
POST   /api/community/gift         Kirim kartu
GET    /api/community/gifts        Daftar hadiah masuk
POST   /api/community/gift/:id/claim    Klaim hadiah

POST   /api/battle/ai/start        Battle vs AI
POST   /api/battle/pvp/queue       Matchmaking PvP
GET    /api/battle/history         Riwayat battle
GET    /api/battle/leaderboard     Ranking

GET    /api/shop                   Item shop
POST   /api/shop/buy/:id           Beli item

GET    /api/missions               Daftar mission
POST   /api/missions/:id/claim     Klaim reward
POST   /api/missions/login-checkin Login check-in

GET    /api/news                   Berita & update
```

---

## 🔌 Socket.IO Events

| Event (client → server) | Deskripsi |
|--------------------------|-----------|
| `start_ai_battle`        | Mulai battle vs AI |
| `play_card`              | Mainkan kartu dari tangan |
| `end_turn`               | Akhiri giliran (AI lalu merespons) |
| `surrender`              | Menyerah |

| Event (server → client) | Deskripsi |
|--------------------------|-----------|
| `battle_started`         | Battle dimulai + game state awal |
| `game_update`            | Update state setelah setiap aksi |
| `battle_ended`           | Battle selesai + pemenang |

---

## 📦 Deployment

**Backend (Railway / Render / VPS):**
```bash
npm start
```

**Frontend (Vercel / Netlify):**
```bash
npm run build
# Deploy folder dist/
```

Ingat update `GOOGLE_CALLBACK_URL` dan `FRONTEND_URL` di `.env` sesuai domain produksi.

---

## 📸 Card Art

Taruh gambar kartu di `frontend/public/assets/cards/` dengan nama sesuai `image_url` di database.
Format disarankan: PNG 400×560px (rasio 5:7).

---

*Gavelin: Card Chronicles — Bangun deck, kuasai dungeon, jadilah legenda!*
