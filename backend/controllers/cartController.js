const { body } = require('express-validator');
const mongoose = require('mongoose');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

const validasiTambah = [
  body('productId').custom((nilai) => mongoose.isValidObjectId(nilai)).withMessage('Produk tidak valid'),
  body('quantity').optional().isInt({ min: 1, max: 99 }).withMessage('Jumlah harus 1 sampai 99')
];

const validasiUbah = [body('quantity').isInt({ min: 1, max: 99 }).withMessage('Jumlah harus 1 sampai 99')];

async function ambilKeranjang(userId) {
  const cart = await Cart.findOne({ user: userId }).populate({
    path: 'items.product',
    populate: { path: 'category', select: 'name' }
  });
  const items = [];
  if (cart) {
    cart.items.forEach((item) => {
      if (!item.product || !item.product.isActive) return;
      items.push({
        product: item.product,
        quantity: item.quantity,
        stokCukup: item.product.stock >= item.quantity,
        subtotal: item.product.price * item.quantity
      });
    });
  }
  const total = items.reduce((jumlah, item) => jumlah + item.subtotal, 0);
  return { items, total };
}

async function lihatKeranjang(req, res) {
  res.json(await ambilKeranjang(req.user._id));
}

async function jumlahKeranjang(req, res) {
  const cart = await Cart.findOne({ user: req.user._id });
  const jumlah = cart ? cart.items.reduce((total, item) => total + item.quantity, 0) : 0;
  res.json({ count: jumlah });
}

async function tambahKeKeranjang(req, res) {
  const jumlahBaru = Number(req.body.quantity) || 1;
  const product = await Product.findOne({ _id: req.body.productId, isActive: true });
  if (!product) {
    return res.status(404).json({ message: 'Produk tidak ditemukan atau sudah tidak dijual' });
  }
  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) {
    cart = new Cart({ user: req.user._id, items: [] });
  }
  const ada = cart.items.find((item) => String(item.product) === String(product._id));
  const totalJumlah = (ada ? ada.quantity : 0) + jumlahBaru;
  if (totalJumlah > product.stock) {
    return res.status(400).json({ message: 'Stok ' + product.name + ' tersisa ' + product.stock });
  }
  if (ada) {
    ada.quantity = totalJumlah;
  } else {
    cart.items.push({ product: product._id, quantity: jumlahBaru });
  }
  await cart.save();
  res.status(201).json({ message: product.name + ' ditambahkan ke keranjang' });
}

async function ubahJumlah(req, res) {
  const jumlah = Number(req.body.quantity);
  const product = await Product.findOne({ _id: req.params.productId, isActive: true });
  if (!product) {
    return res.status(404).json({ message: 'Produk tidak ditemukan atau sudah tidak dijual' });
  }
  if (jumlah > product.stock) {
    return res.status(400).json({ message: 'Stok ' + product.name + ' tersisa ' + product.stock });
  }
  const cart = await Cart.findOne({ user: req.user._id });
  const item = cart && cart.items.find((data) => String(data.product) === String(product._id));
  if (!item) {
    return res.status(404).json({ message: 'Produk tidak ada di keranjang' });
  }
  item.quantity = jumlah;
  await cart.save();
  res.json({ message: 'Jumlah diperbarui' });
}

async function hapusDariKeranjang(req, res) {
  await Cart.updateOne({ user: req.user._id }, { $pull: { items: { product: req.params.productId } } });
  res.json({ message: 'Produk dihapus dari keranjang' });
}

module.exports = {
  validasiTambah,
  validasiUbah,
  lihatKeranjang,
  jumlahKeranjang,
  tambahKeKeranjang,
  ubahJumlah,
  hapusDariKeranjang
};
