const { body } = require('express-validator');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const Setting = require('../models/Setting');
const nextInvoiceNumber = require('../utils/invoiceNumber');
const { escapeRegex } = require('../utils/format');
const paymentService = require('../services/paymentService');
const { buatInvoicePdf } = require('../services/pdfService');

const validasiCheckout = [
  body('paymentMethod').isIn(['qris', 'link']).withMessage('Pilih metode pembayaran'),
  body('pickupPoint').trim().notEmpty().withMessage('Pilih titik ambil'),
  body('pickupTime').matches(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).withMessage('Pilih waktu ambil'),
  body('note').optional().trim().isLength({ max: 200 }).withMessage('Catatan maksimal 200 karakter')
];

const validasiStatusPesanan = [
  body('orderStatus').isIn(['diproses', 'siap_diambil', 'selesai']).withMessage('Status pesanan tidak valid')
];

async function lepasStok(daftar) {
  for (const item of daftar) {
    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
  }
}

async function checkout(req, res) {
  const { paymentMethod, pickupPoint, note } = req.body;
  const setting = await Setting.get();
  if (!setting.pickupPoints.includes(pickupPoint)) {
    return res.status(400).json({ message: 'Titik ambil tidak valid', errors: { pickupPoint: 'Titik ambil tidak valid' } });
  }

  const waktuAmbil = new Date(req.body.pickupTime + ':00+07:00');
  const sekarang = Date.now();
  if (Number.isNaN(waktuAmbil.getTime()) || waktuAmbil.getTime() < sekarang) {
    return res.status(400).json({ message: 'Waktu ambil tidak boleh di masa lalu', errors: { pickupTime: 'Waktu ambil tidak boleh di masa lalu' } });
  }
  if (waktuAmbil.getTime() > sekarang + 7 * 24 * 60 * 60 * 1000) {
    return res.status(400).json({ message: 'Waktu ambil maksimal 7 hari ke depan', errors: { pickupTime: 'Waktu ambil maksimal 7 hari ke depan' } });
  }

  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  const itemKeranjang = cart ? cart.items.filter((item) => item.product && item.product.isActive) : [];
  if (itemKeranjang.length === 0) {
    return res.status(400).json({ message: 'Keranjang masih kosong' });
  }

  const dipesan = [];
  for (const item of itemKeranjang) {
    const hasil = await Product.findOneAndUpdate(
      { _id: item.product._id, isActive: true, stock: { $gte: item.quantity } },
      { $inc: { stock: -item.quantity } }
    );
    if (!hasil) {
      await lepasStok(dipesan);
      return res.status(400).json({ message: 'Stok ' + item.product.name + ' tidak mencukupi' });
    }
    dipesan.push({ product: item.product._id, quantity: item.quantity });
  }

  try {
    const items = itemKeranjang.map((item) => ({
      product: item.product._id,
      name: item.product.name,
      price: item.product.price,
      costPrice: item.product.costPrice,
      quantity: item.quantity,
      subtotal: item.product.price * item.quantity
    }));
    const subtotal = items.reduce((jumlah, item) => jumlah + item.subtotal, 0);
    const invoiceNumber = await nextInvoiceNumber();
    const menit = Number(process.env.PAYMENT_EXPIRE_MINUTES) || 30;
    const expiresAt = new Date(Date.now() + menit * 60 * 1000);

    const bayar = await paymentService.createBayarajaPayment({
      invoiceNumber,
      total: subtotal,
      method: paymentMethod,
      expiresAt
    });

    const order = await Order.create({
      invoiceNumber,
      user: req.user._id,
      customerName: req.user.name,
      customerEmail: req.user.email,
      customerPhone: req.user.phone,
      items,
      subtotal,
      total: subtotal,
      paymentMethod,
      pickupPoint,
      pickupTime: waktuAmbil,
      note: note || '',
      expiresAt
    });
    await Payment.create({
      order: order._id,
      method: paymentMethod,
      amount: subtotal,
      expiresAt,
      ...bayar
    });
    await Cart.deleteOne({ _id: cart._id });
    res.status(201).json({ orderId: order._id, invoiceNumber });
  } catch (error) {
    await lepasStok(dipesan);
    throw error;
  }
}

function bolehAkses(order, user) {
  return user.role === 'admin' || String(order.user) === String(user._id);
}

function dataPembayaran(payment) {
  if (!payment) return null;
  return {
    method: payment.method,
    status: payment.status,
    paymentUrl: payment.paymentUrl,
    qrImage: payment.qrImage,
    merchantName: payment.merchantName,
    expiresAt: payment.expiresAt,
    confirmedAt: payment.confirmedAt
  };
}

async function detailPesanan(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order || !bolehAkses(order, req.user)) {
    return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
  }
  const payment = await Payment.findOne({ order: order._id });
  const setting = await Setting.get();
  res.json({ order, payment: dataPembayaran(payment), setting });
}

async function cekPembayaran(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order || !bolehAkses(order, req.user)) {
    return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
  }
  const hasil = await paymentService.refreshPayment(order._id, { force: req.user.role === 'admin' });
  const payment = await Payment.findOne({ order: order._id });
  res.json({ order: hasil.order, payment: dataPembayaran(payment), peringatan: hasil.error });
}

async function riwayatSaya(req, res) {
  const filter = { user: req.user._id };
  if (['pending', 'paid', 'rejected', 'expired'].includes(req.query.status)) {
    filter.paymentStatus = req.query.status;
  }
  const orders = await Order.find(filter).sort({ createdAt: -1 }).limit(200);
  res.json({ orders });
}

async function ringkasanAkun(req, res) {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 }).lean();
  const ringkasan = {
    totalPesanan: orders.length,
    menungguBayar: orders.filter((order) => order.paymentStatus === 'pending').length,
    berhasil: orders.filter((order) => order.paymentStatus === 'paid').length,
    totalBelanja: orders.filter((order) => order.paymentStatus === 'paid').reduce((jumlah, order) => jumlah + order.total, 0)
  };
  res.json({ ringkasan, terbaru: orders.slice(0, 5) });
}

async function invoicePdf(req, res) {
  const order = await Order.findById(req.params.id);
  if (!order || !bolehAkses(order, req.user)) {
    return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
  }
  const payment = await Payment.findOne({ order: order._id });
  const setting = await Setting.get();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="' + order.invoiceNumber + '.pdf"');
  const doc = buatInvoicePdf(order, payment, setting);
  doc.pipe(res);
  doc.end();
}

function filterTanggal(query) {
  const filter = {};
  if (/^\d{4}-\d{2}-\d{2}$/.test(query.from || '')) {
    filter.$gte = new Date(query.from + 'T00:00:00+07:00');
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(query.to || '')) {
    filter.$lt = new Date(new Date(query.to + 'T00:00:00+07:00').getTime() + 24 * 60 * 60 * 1000);
  }
  return Object.keys(filter).length ? filter : null;
}

async function semuaPesanan(req, res) {
  await paymentService.expireOverdueOrders(10).catch(() => {});
  const filter = {};
  if (['pending', 'paid', 'rejected', 'expired'].includes(req.query.status)) {
    filter.paymentStatus = req.query.status;
  }
  if (['menunggu_pembayaran', 'diproses', 'siap_diambil', 'selesai', 'dibatalkan'].includes(req.query.orderStatus)) {
    filter.orderStatus = req.query.orderStatus;
  }
  const tanggal = filterTanggal(req.query);
  if (tanggal) filter.createdAt = tanggal;
  if (req.query.search) {
    const pola = new RegExp(escapeRegex(String(req.query.search).slice(0, 50)), 'i');
    filter.$or = [{ invoiceNumber: pola }, { customerName: pola }];
  }
  const halaman = Math.max(Number(req.query.page) || 1, 1);
  const batas = Math.min(Number(req.query.limit) || 20, 100);
  const total = await Order.countDocuments(filter);
  const orders = await Order.find(filter)
    .sort({ createdAt: -1 })
    .skip((halaman - 1) * batas)
    .limit(batas);
  res.json({ orders, total, page: halaman, pages: Math.max(Math.ceil(total / batas), 1) });
}

async function ubahStatusPesanan(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
  }
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'Transaksi tidak ditemukan' });
  }
  if (order.paymentStatus !== 'paid') {
    return res.status(400).json({ message: 'Status pesanan hanya dapat diubah setelah pembayaran berstatus Paid' });
  }
  order.orderStatus = req.body.orderStatus;
  await order.save();
  res.json({ order });
}

async function sinkronkan(req, res) {
  const hasil = await paymentService.syncWithBayaraja({ from: req.body.from, to: req.body.to });
  res.json(hasil);
}

module.exports = {
  validasiCheckout,
  validasiStatusPesanan,
  checkout,
  detailPesanan,
  cekPembayaran,
  riwayatSaya,
  ringkasanAkun,
  invoicePdf,
  semuaPesanan,
  ubahStatusPesanan,
  sinkronkan
};
