const fs = require('fs');
const path = require('path');
const { body } = require('express-validator');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Cart = require('../models/Cart');
const Media = require('../models/Media');
const { escapeRegex } = require('../utils/format');

const validasiProduk = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Nama produk harus 2 sampai 100 karakter'),
  body('category').custom((nilai) => mongoose.isValidObjectId(nilai)).withMessage('Kategori wajib dipilih'),
  body('price').isInt({ min: 1000, max: 10000000 }).withMessage('Harga jual minimal Rp 1.000 dan harus angka bulat'),
  body('costPrice').isInt({ min: 0, max: 10000000 }).withMessage('Harga modal harus angka bulat dan tidak negatif'),
  body('stock').isInt({ min: 0, max: 100000 }).withMessage('Stok harus angka bulat dan tidak negatif'),
  body('description').optional().trim().isLength({ max: 500 }).withMessage('Deskripsi maksimal 500 karakter')
];

async function hapusFoto(urlFoto) {
  if (!urlFoto) return;
  if (urlFoto.startsWith('/media/')) {
    await Media.deleteOne({ _id: urlFoto.replace('/media/', '') }).catch(() => {});
    return;
  }
  if (urlFoto.startsWith('/uploads/')) {
    const lokasi = path.join(__dirname, '..', 'uploads', path.basename(urlFoto));
    fs.unlink(lokasi, () => {});
  }
}

async function simpanFoto(file) {
  const media = await Media.create({ contentType: file.mimetype, data: file.buffer });
  return '/media/' + media._id;
}

async function daftarProdukPublik(req, res) {
  const filter = { isActive: true };
  if (req.query.category && mongoose.isValidObjectId(req.query.category)) {
    filter.category = req.query.category;
  }
  if (req.query.search) {
    filter.name = new RegExp(escapeRegex(String(req.query.search).slice(0, 50)), 'i');
  }
  const limit = Math.min(Number(req.query.limit) || 60, 100);
  const products = await Product.find(filter).populate('category', 'name').sort({ createdAt: -1 }).limit(limit);
  res.json({ products });
}

async function detailProdukPublik(req, res) {
  const product = await Product.findOne({ _id: req.params.id, isActive: true }).populate('category', 'name');
  if (!product) {
    return res.status(404).json({ message: 'Produk tidak ditemukan' });
  }
  res.json({ product });
}

async function daftarProdukAdmin(req, res) {
  const filter = {};
  if (req.query.search) {
    filter.name = new RegExp(escapeRegex(String(req.query.search).slice(0, 50)), 'i');
  }
  if (req.query.category && mongoose.isValidObjectId(req.query.category)) {
    filter.category = req.query.category;
  }
  const products = await Product.find(filter).populate('category', 'name').sort({ createdAt: -1 });
  res.json({ products });
}

async function tambahProduk(req, res) {
  const kategori = await Category.findById(req.body.category);
  if (!kategori) {
    return res.status(400).json({ message: 'Kategori tidak ditemukan', errors: { category: 'Kategori tidak ditemukan' } });
  }
  const product = await Product.create({
    name: req.body.name,
    category: kategori._id,
    description: req.body.description || '',
    price: Number(req.body.price),
    costPrice: Number(req.body.costPrice),
    stock: Number(req.body.stock),
    isActive: req.body.isActive !== 'false',
    image: req.file ? await simpanFoto(req.file) : ''
  });
  res.status(201).json({ product });
}

async function ubahProduk(req, res) {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Produk tidak ditemukan' });
  }
  const kategori = await Category.findById(req.body.category);
  if (!kategori) {
    return res.status(400).json({ message: 'Kategori tidak ditemukan', errors: { category: 'Kategori tidak ditemukan' } });
  }
  product.name = req.body.name;
  product.category = kategori._id;
  product.description = req.body.description || '';
  product.price = Number(req.body.price);
  product.costPrice = Number(req.body.costPrice);
  product.stock = Number(req.body.stock);
  product.isActive = req.body.isActive !== 'false';
  if (req.file) {
    await hapusFoto(product.image);
    product.image = await simpanFoto(req.file);
  }
  await product.save();
  res.json({ product });
}

async function ubahStatusProduk(req, res) {
  const product = await Product.findById(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Produk tidak ditemukan' });
  }
  product.isActive = !product.isActive;
  await product.save();
  res.json({ product });
}

async function hapusProduk(req, res) {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) {
    return res.status(404).json({ message: 'Produk tidak ditemukan' });
  }
  await hapusFoto(product.image);
  await Cart.updateMany({}, { $pull: { items: { product: product._id } } });
  res.json({ message: 'Produk berhasil dihapus' });
}

module.exports = {
  validasiProduk,
  daftarProdukPublik,
  detailProdukPublik,
  daftarProdukAdmin,
  tambahProduk,
  ubahProduk,
  ubahStatusProduk,
  hapusProduk
};
