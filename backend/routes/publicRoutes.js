const express = require('express');
const product = require('../controllers/productController');
const category = require('../controllers/categoryController');
const admin = require('../controllers/adminController');

const router = express.Router();

router.get('/products', product.daftarProdukPublik);
router.get('/products/:id', product.detailProdukPublik);
router.get('/categories', category.daftarKategori);
router.get('/settings/public', admin.pengaturanPublik);

module.exports = router;
