const { body } = require('express-validator');
const Category = require('../models/Category');
const Product = require('../models/Product');

const validasiKategori = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Nama kategori harus 2 sampai 50 karakter'),
  body('description').optional().trim().isLength({ max: 200 }).withMessage('Deskripsi maksimal 200 karakter')
];

async function daftarKategori(req, res) {
  const categories = await Category.find().sort({ name: 1 }).lean();
  const jumlah = await Product.aggregate([{ $group: { _id: '$category', total: { $sum: 1 } } }]);
  const peta = {};
  jumlah.forEach((item) => {
    peta[String(item._id)] = item.total;
  });
  categories.forEach((item) => {
    item.productCount = peta[String(item._id)] || 0;
  });
  res.json({ categories });
}

async function tambahKategori(req, res) {
  const sudahAda = await Category.findOne({ name: new RegExp('^' + req.body.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
  if (sudahAda) {
    return res.status(409).json({ message: 'Nama kategori sudah dipakai', errors: { name: 'Nama kategori sudah dipakai' } });
  }
  const category = await Category.create({ name: req.body.name, description: req.body.description || '' });
  res.status(201).json({ category });
}

async function ubahKategori(req, res) {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ message: 'Kategori tidak ditemukan' });
  }
  const kembar = await Category.findOne({
    _id: { $ne: category._id },
    name: new RegExp('^' + req.body.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i')
  });
  if (kembar) {
    return res.status(409).json({ message: 'Nama kategori sudah dipakai', errors: { name: 'Nama kategori sudah dipakai' } });
  }
  category.name = req.body.name;
  category.description = req.body.description || '';
  await category.save();
  res.json({ category });
}

async function hapusKategori(req, res) {
  const dipakai = await Product.countDocuments({ category: req.params.id });
  if (dipakai > 0) {
    return res.status(400).json({ message: 'Kategori masih dipakai oleh ' + dipakai + ' produk. Pindahkan atau hapus produknya terlebih dahulu.' });
  }
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) {
    return res.status(404).json({ message: 'Kategori tidak ditemukan' });
  }
  res.json({ message: 'Kategori berhasil dihapus' });
}

module.exports = { validasiKategori, daftarKategori, tambahKategori, ubahKategori, hapusKategori };
