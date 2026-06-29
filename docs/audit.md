# Tikep — Audit Report

## 🔴 Critical

1. **`saves` table tidak ada migration resmi**
   - File migrasi `drizzle/0000_*.sql` dan `drizzle/0001_*.sql` tidak pernah membuat tabel `saves`.
   - Tabel mungkin sudah ada di DB via `drizzle-kit push` atau manual `CREATE`, tapi di fresh deployment akan error.
   - Perlu migration baru untuk create `saves` table.

2. **`ON DELETE no action` di DB production**
   - Migrasi `0000` bikin semua foreign key dengan `ON DELETE no action`, padahal schema file menggunakan `{ onDelete: "cascade" }`.
   - Migrasi `cascade` belum pernah dijalankan ke database.
   - Akibat: jika menghapus user/video langsung di DB (bukan via aplikasi), akan meninggalkan orphaned records di `likes`, `comments`, `follows`, `saves`.

3. **`revalidatePath` hanya mencakup `"/"` — watch page tidak pernah di-revalidate**
   - `toggleLike`, `toggleSave`, `addComment` di actions hanya memanggil `revalidatePath("/")`.
   - Jika user like/comment dari halaman `/watch/[id]`, count di halaman tersebut tidak akan berubah tanpa refresh manual.
   - Perlu menambahkan `revalidatePath(`/watch/${videoId}`)`.

## 🟡 Bugs / Logical Errors

4. **Like & save initial state hardcoded `false`**
   - `feed-item.tsx` dan `watch-video.tsx` menginisialisasi `liked = false` dan `saved = false`.
   - Tidak ada pengecekan apakah user sudah pernah like/save video tersebut dari DB.
   - Setiap kali halaman di-refresh, icon like/save kembali kosong meskipun sebelumnya sudah di-like/disave.

5. **Follow state tidak persist**
   - `followed` di `feed-item.tsx` dan `watch-video.tsx` di-set `false` tanpa ngecek status follow dari DB.
   - Tombol Follow muncul kembali setelah refresh meskipun user sudah follow sebelumnya.

6. **Follower/following count hardcoded `0`**
   - `app/profile/[slug]/page.tsx:56-57`: variabel `followerCount` dan `followingCount` di-set `0` dan tidak pernah di-query dari tabel `follows`.
   - Yang tampil: Following = 0, Followers = 0 (selalu).

7. **Own profile page tidak menampilkan follow stats**
   - Halaman profil sendiri (`app/(main)/profile/page.tsx`) hanya menampilkan Posts count dan Saved count.
   - Tidak konsisten dengan public profile page (`profile/[slug]`) yang setidaknya punya placeholder (meskipun 0).

8. **Username disimpan dengan prefix `@` — risiko double `@`**
   - Register route menambahkan `@` di depan username: `usernameClean = username.startsWith("@") ? username : \`@${username}\``
   - UI kemudian melakukan `username.replace("@", "")` lalu menampilkan `/@${username}`.
   - Jika data pernah korup (username sudah mengandung `@` dan disimpan lagi), hasilnya bisa `@@username`.
   - Risiko rendah tapi rawan bugs.

9. **Tidak ada validasi panjang caption**
   - Upload video/foto tidak membatasi panjang caption.
   - Feed item menampilkan caption tanpa truncation — caption panjang bisa merusak layout.

## 🔵 Missing Features for MVP

10. **Feed tidak personal**
    - Semua user melihat video yang sama, diurutkan chronologically (`ORDER BY createdAt DESC`).
    - Tidak ada filtering berdasarkan following.
    - Untuk MVP awal ini OK, tapi fundamental untuk short-video app.

11. **Follow feature tidak memiliki efek apapun**
    - User bisa follow/unfollow, tapi:
      - Tombol Follow muncul lagi setelah refresh (lihat poin #5).
      - Feed tidak berubah — tetap menampilkan semua video.
      - Tidak ada indikator "Followed by X" atau "X follows you".
      - Follower count tidak dihitung (lihat poin #6).

12. **`thumbnailPath` tidak di-select di Saved Videos endpoint**
    - `app/api/users/[userId]/saves/route.ts` tidak memilih `videos.thumbnailPath`.
    - Akibat: grid saved videos fallback ke video `preload="metadata"` (slower, heavier).
    - Bandingkan dengan `app/api/users/[userId]/videos/route.ts` yang sudah include `thumbnailPath`.

13. **Loading / UX state minim**
    - Feed adalah server component — tidak ada skeleton loading antar navigasi.
    - Tidak ada pull-to-refresh untuk reload feed.
    - Upload page tidak memiliki progress bar — hanya teks "Posting...".
    - Tidak ada error boundary — satu component crash, seluruh app white screen.

14. **Bot tidak handle `/start` atau `callback_query`**
    - Share link (`t.me/bot?start=video_123`) tidak diproses oleh bot webhook.
    - Start param hanya dipakai di `TGProvider` untuk redirect — tidak ada respon dari bot.
    - Bot hanya handle `message.text` biasa.

15. **Share behavior ambigu**
    - `app/api/share/route.ts` mengirim ke `chat?.id ?? tgUser.id`.
    - Jika user mengakses app dari dalam grup, `chat.id` adalah ID grup — share message akan masuk ke grup (OK).
    - Jika user mengakses dari DM bot, `chat.id` tidak ada, fallback ke `tgUser.id` — pesan masuk ke DM user dengan bot.
    - User mungkin mengharapkan share ke chat lain, bukan ke diri sendiri.

## ⚠️ Database / Performance

16. **Tidak ada index pada foreign key columns**
    - `videos.user_id`, `likes.video_id`, `comments.video_id`, `saves.video_id`, `follows.follower_id`, `follows.following_id` tidak memiliki index.
    - `db.$count` subquery untuk like/comment/save count akan melakukan sequential scan seiring pertumbuhan data.

17. **`shareCount` increment rawan race condition**
    - `sql`\`${videos.shareCount} + 1\`` bukan atomic operation dalam konteks concurrent requests.
    - Bisa under-count jika dua share terjadi bersamaan.

## 📌 Priorities

### Harus dibenerin sebelum rilis publik
- [ ] #1 — Migration `saves` table
- [ ] #2 — Migration `ON DELETE CASCADE`
- [ ] #4 — Initial state like/save dari DB
- [ ] #3 — `revalidatePath` includekan `/watch/[id]`

### Penting untuk user experience
- [ ] #5 — Follow state persist dari DB
- [ ] #6 — Follower/following count
- [ ] #7 — Follow stats di own profile
- [ ] #12 — `thumbnailPath` di saved endpoint

### Nice to have
- [ ] #9 — Batasi panjang caption
- [ ] #13 — Loading states, error boundary
- [ ] #14 — Bot handle `/start`
- [ ] #15 — Perbaiki share behavior
- [ ] #16 — Indexes on FK columns

### Bisa ditunda / dipikirkan ulang
- [ ] #10 — Personalized feed (butuh data lebih banyak)
- [ ] #11 — Follow-based feed filtering
- [ ] #17 — Atomic shareCount
- [ ] #8 — Username format standardization
