const express = require('express');
const order = require('../controllers/orderController');
const validate = require('../middleware/validate');
const { protect, allowRoles } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/checkout', allowRoles('user'), order.validasiCheckout, validate, order.checkout);
router.get('/', allowRoles('user'), order.riwayatSaya);
router.get('/summary', allowRoles('user'), order.ringkasanAkun);
router.get('/:id', order.detailPesanan);
router.post('/:id/refresh', order.cekPembayaran);
router.get('/:id/invoice.pdf', order.invoicePdf);

module.exports = router;
