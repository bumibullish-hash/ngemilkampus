const express = require('express');
const cart = require('../controllers/cartController');
const validate = require('../middleware/validate');
const { protect, allowRoles } = require('../middleware/auth');

const router = express.Router();

router.use(protect, allowRoles('user'));

router.get('/', cart.lihatKeranjang);
router.get('/count', cart.jumlahKeranjang);
router.post('/', cart.validasiTambah, validate, cart.tambahKeKeranjang);
router.put('/:productId', cart.validasiUbah, validate, cart.ubahJumlah);
router.delete('/:productId', cart.hapusDariKeranjang);

module.exports = router;
