const path = require('path');
const express = require('express');
const { pageGuard } = require('../middleware/auth');

const router = express.Router();
const folderFrontend = path.join(__dirname, '..', '..', 'frontend');

function halaman(...lokasi) {
  const file = path.join(folderFrontend, ...lokasi);
  return (req, res) => res.sendFile(file);
}

router.get('/', halaman('index.html'));
router.get('/produk', halaman('produk.html'));
router.get('/produk-detail', halaman('produk-detail.html'));
router.get('/login', halaman('login.html'));
router.get('/register', halaman('register.html'));

const user = pageGuard('user');
router.get('/keranjang', user, halaman('pages', 'user', 'keranjang.html'));
router.get('/checkout', user, halaman('pages', 'user', 'checkout.html'));
router.get('/pembayaran', user, halaman('pages', 'user', 'pembayaran.html'));
router.get('/riwayat', user, halaman('pages', 'user', 'riwayat.html'));
router.get('/transaksi', user, halaman('pages', 'user', 'transaksi.html'));
router.get('/akun', user, halaman('pages', 'user', 'akun.html'));

router.get('/invoice', pageGuard('user', 'admin'), halaman('pages', 'invoice.html'));

const admin = pageGuard('admin');
router.get('/admin', admin, halaman('pages', 'admin', 'dashboard.html'));
router.get('/admin/produk', admin, halaman('pages', 'admin', 'produk.html'));
router.get('/admin/kategori', admin, halaman('pages', 'admin', 'kategori.html'));
router.get('/admin/transaksi', admin, halaman('pages', 'admin', 'transaksi.html'));
router.get('/admin/transaksi-detail', admin, halaman('pages', 'admin', 'transaksi-detail.html'));
router.get('/admin/pengguna', admin, halaman('pages', 'admin', 'pengguna.html'));
router.get('/admin/pengeluaran', admin, halaman('pages', 'admin', 'pengeluaran.html'));
router.get('/admin/laporan-penjualan', admin, halaman('pages', 'admin', 'laporan-penjualan.html'));
router.get('/admin/laporan-keuangan', admin, halaman('pages', 'admin', 'laporan-keuangan.html'));
router.get('/admin/pengaturan', admin, halaman('pages', 'admin', 'pengaturan.html'));

router.use((req, res) => {
  res.status(404).sendFile(path.join(folderFrontend, '404.html'));
});

module.exports = router;
