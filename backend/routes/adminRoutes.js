const express = require('express');
const product = require('../controllers/productController');
const category = require('../controllers/categoryController');
const order = require('../controllers/orderController');
const admin = require('../controllers/adminController');
const report = require('../controllers/reportController');
const validate = require('../middleware/validate');
const uploadFoto = require('../middleware/upload');
const { protect, allowRoles } = require('../middleware/auth');

const router = express.Router();

router.use(protect, allowRoles('admin'));

router.get('/dashboard', admin.dashboard);

router.get('/products', product.daftarProdukAdmin);
router.post('/products', uploadFoto.single('image'), product.validasiProduk, validate, product.tambahProduk);
router.put('/products/:id', uploadFoto.single('image'), product.validasiProduk, validate, product.ubahProduk);
router.patch('/products/:id/toggle', product.ubahStatusProduk);
router.delete('/products/:id', product.hapusProduk);

router.get('/categories', category.daftarKategori);
router.post('/categories', category.validasiKategori, validate, category.tambahKategori);
router.put('/categories/:id', category.validasiKategori, validate, category.ubahKategori);
router.delete('/categories/:id', category.hapusKategori);

router.get('/orders', order.semuaPesanan);
router.patch('/orders/:id/status', order.validasiStatusPesanan, validate, order.ubahStatusPesanan);
router.post('/sync', order.sinkronkan);
router.get('/bayaraja-transactions', admin.transaksiBayaraja);

router.get('/users', admin.daftarPengguna);

router.get('/expenses', admin.daftarPengeluaran);
router.post('/expenses', admin.validasiPengeluaran, validate, admin.tambahPengeluaran);
router.put('/expenses/:id', admin.validasiPengeluaran, validate, admin.ubahPengeluaran);
router.delete('/expenses/:id', admin.hapusPengeluaran);

router.get('/settings', admin.lihatPengaturan);
router.put('/settings', admin.validasiPengaturan, validate, admin.simpanPengaturan);

router.get('/reports/sales', report.penjualan);
router.get('/reports/sales.pdf', report.penjualanPdf);
router.get('/reports/finance', report.keuangan);
router.get('/reports/finance.pdf', report.keuanganPdf);

module.exports = router;
