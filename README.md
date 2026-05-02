# UTS PPLOS - Sistem Pemesanan UMKM

Nama: Muhammad Ryan Afandi
NIM: 2410511062
Kelas: A

## Studi Kasus
Sistem Pemesanan UMKM (Mini E-Commerce)

## Tech Stack
- API Gateway: Node.js Express
- Service PHP: CodeIgniter 4
- Service Node.js: Express
- Auth Service: JWT + Google OAuth
- Database: MySQL

## Link YT
https://youtu.be/tsN4YszOfYw?si=2UkLETjT38aypzMq

### Langkah-langkah
1. **Clone repository**
   ```bash
   git clone https://github.com/Niloverz/uts-pplos-a-2410511062.git
   cd uts-pplos-a-2410511062
   Jalankan MySQL (XAMPP)

2. Start MySQL di XAMPP Control Panel

Buat database: auth_db, produk_db, order_db

3. Jalankan Auth Service
4. Jalankan Produk Service 
5. Jalankan Order Service
6. Jalankan API Gateway

## Peta Endpoint 
POST	/api/auth/register	Registrasi user baru
POST	/api/auth/login	Login, mengembalikan access token & refresh token
GET	    /api/auth/profile	Mendapatkan data user (butuh token)
POST	/api/auth/refresh	Memperbarui access token
GET	    /api/auth/google	Login dengan Google OAuth
GET	    /api/products	Mendapatkan semua produk (dengan paging & filter)
POST	/api/products	Menambah produk (butuh token)
PUT	    /api/products/{id}	Mengupdate produk (butuh token)
DELETE	/api/products/{id}	Menghapus produk (butuh token)
GET	    /api/cart/{session_id}	Lihat isi keranjang
POST	/api/cart	Tambah item ke keranjang
DELETE	/api/cart/{session_id}/{produk_id}	Hapus item dari keranjang
POST	/api/checkout	Checkout (ubah keranjang jadi pesanan)
PUT	    /api/orders/{id}/status	Update status pesanan