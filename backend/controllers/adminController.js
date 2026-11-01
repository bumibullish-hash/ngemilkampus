const { body } = require('express-validator');
const mongoose = require('mongoose');
const User = require('../models/User');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Expense = require('../models/Expense');
const Setting = require('../models/Setting');
const BayarajaTransaction = require('../models/BayarajaTransaction');
const { escapeRegex } = require('../utils/format');
const { expireOverdueOrders } = require('../services/paymentService');
const { dayKey, awalHari, SEHARI } = require('../utils/dateRange');

const validasiPengeluaran = [
  body('title').trim().isLength({ min: 2, max: 100 }).withMessage('Keterangan harus 2 sampai 100 karakter'),
  body('category').isIn(['Bahan baku', 'Kemasan', 'Transport', 'Peralatan', 'Lainnya']).withMessage('Pilih kategori pengeluaran'),
  body('amount').isInt({ min: 1, max: 1000000000 }).withMessage('Jumlah harus angka bulat lebih dari 0'),
  body('date').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Tanggal wajib diisi'),
  body('note').optional().trim().isLength({ max: 200 }).withMessage('Catatan maksimal 200 karakter')
];

const validasiPengaturan = [
  body('businessName').trim().isLength({ min: 2, max: 80 }).withMessage('Nama usaha harus 2 sampai 80 karakter'),
  body('tagline').optional().trim().isLength({ max: 120 }).withMessage('Slogan maksimal 120 karakter'),
  body('address').optional().trim().isLength({ max: 200 }).withMessage('Alamat maksimal 200 karakter'),
  body('phone').optional().trim().isLength({ max: 30 }).withMessage('Nomor telepon maksimal 30 karakter'),
  body('email').optional({ values: 'falsy' }).trim().isEmail().withMessage('Format email tidak valid'),
  body('pickupHours').optional().trim().isLength({ max: 100 }).withMessage('Jam ambil maksimal 100 karakter'),
  body('pickupPoints').isArray({ min: 1, max: 10 }).withMessage('Isi minimal satu titik ambil'),
  body('pickupPoints.*').trim().isLength({ min: 2, max: 80 }).withMessage('Nama titik ambil harus 2 sampai 80 karakter')
];

async function dashboard(req, res) {
  await expireOverdueOrders(10).catch(() => {});
  const hari = [7, 30].includes(Number(req.query.days)) ? Number(req.query.days) : 7;
  const hariIni = awalHari(new Date());
  const mulai = new Date(hariIni.getTime() - (hari - 1) * SEHARI);

  const [semua, jumlahProduk, terbaru, terlaris] = await Promise.all([
    Order.find({}, 'total paymentStatus createdAt').lean(),
    Product.countDocuments(),
    Order.find().sort({ createdAt: -1 }).limit(8).lean(),
    Order.aggregate([
      { $match: { paymentStatus: 'paid' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          jumlah: { $sum: '$items.quantity' },
          omzet: { $sum: '$items.subtotal' }
        }
      },
      { $sort: { jumlah: -1 } },
      { $limit: 5 }
    ])
  ]);

  const ringkasan = { omzet: 0, totalTransaksi: semua.length, berhasil: 0, pending: 0, jumlahProduk };
  const grafik = [];
  const peta = {};
  for (let waktu = mulai.getTime(); waktu <= hariIni.getTime(); waktu += SEHARI) {
    const baris = { key: dayKey(new Date(waktu)), omzet: 0, transaksi: 0 };
    grafik.push(baris);
    peta[baris.key] = baris;
  }
  semua.forEach((order) => {
    if (order.paymentStatus === 'paid') {
      ringkasan.berhasil += 1;
      ringkasan.omzet += order.total;
      const baris = peta[dayKey(order.createdAt)];
      if (baris) {
        baris.omzet += order.total;
        baris.transaksi += 1;
      }
    }
    if (order.paymentStatus === 'pending') ringkasan.pending += 1;
  });

  res.json({ ringkasan, grafik, terlaris, terbaru });
}

async function daftarPengguna(req, res) {
  const filter = {};
  if (req.query.search) {
    const pola = new RegExp(escapeRegex(String(req.query.search).slice(0, 50)), 'i');
    filter.$or = [{ name: pola }, { email: pola }];
  }
  const users = await User.find(filter).sort({ createdAt: -1 }).lean();
  const statistik = await Order.aggregate([
    {
      $group: {
        _id: '$user',
        jumlahPesanan: { $sum: 1 },
        totalBelanja: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$total', 0] } }
      }
    }
  ]);
  const peta = {};
  statistik.forEach((item) => {
    peta[String(item._id)] = item;
  });
  users.forEach((user) => {
    const data = peta[String(user._id)];
    user.jumlahPesanan = data ? data.jumlahPesanan : 0;
    user.totalBelanja = data ? data.totalBelanja : 0;
  });
  res.json({ users });
}

function filterTanggalPengeluaran(query) {
  const filter = {};
  if (/^\d{4}-\d{2}-\d{2}$/.test(query.from || '')) {
    filter.$gte = new Date(query.from + 'T00:00:00+07:00');
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(query.to || '')) {
    filter.$lt = new Date(new Date(query.to + 'T00:00:00+07:00').getTime() + SEHARI);
  }
  return Object.keys(filter).length ? filter : null;
}

async function daftarPengeluaran(req, res) {
  const filter = {};
  const tanggal = filterTanggalPengeluaran(req.query);
  if (tanggal) filter.date = tanggal;
  const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 });
  const total = expenses.reduce((jumlah, item) => jumlah + item.amount, 0);
  res.json({ expenses, total });
}

async function tambahPengeluaran(req, res) {
  const expense = await Expense.create({
    title: req.body.title,
    category: req.body.category,
    amount: Number(req.body.amount),
    date: new Date(req.body.date + 'T12:00:00+07:00'),
    note: req.body.note || ''
  });
  res.status(201).json({ expense });
}

async function ubahPengeluaran(req, res) {
  const expense = await Expense.findById(req.params.id);
  if (!expense) {
    return res.status(404).json({ message: 'Pengeluaran tidak ditemukan' });
  }
  expense.title = req.body.title;
  expense.category = req.body.category;
  expense.amount = Number(req.body.amount);
  expense.date = new Date(req.body.date + 'T12:00:00+07:00');
  expense.note = req.body.note || '';
  await expense.save();
  res.json({ expense });
}

async function hapusPengeluaran(req, res) {
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (!expense) {
    return res.status(404).json({ message: 'Pengeluaran tidak ditemukan' });
  }
  res.json({ message: 'Pengeluaran berhasil dihapus' });
}

async function lihatPengaturan(req, res) {
  res.json({ setting: await Setting.get() });
}

async function pengaturanPublik(req, res) {
  const setting = await Setting.get();
  res.json({
    setting: {
      businessName: setting.businessName,
      tagline: setting.tagline,
      address: setting.address,
      phone: setting.phone,
      email: setting.email,
      pickupHours: setting.pickupHours,
      pickupPoints: setting.pickupPoints
    }
  });
}

async function simpanPengaturan(req, res) {
  const setting = await Setting.get();
  setting.businessName = req.body.businessName;
  setting.tagline = req.body.tagline || '';
  setting.address = req.body.address || '';
  setting.phone = req.body.phone || '';
  setting.email = req.body.email || '';
  setting.pickupHours = req.body.pickupHours || '';
  setting.pickupPoints = [...new Set(req.body.pickupPoints.map((item) => String(item).trim()).filter(Boolean))];
  await setting.save();
  res.json({ setting });
}

async function transaksiBayaraja(req, res) {
  const filter = {};
  if (['confirmed', 'pending', 'rejected'].includes(req.query.status)) {
    filter.status = req.query.status;
  }
  const tanggal = filterTanggalPengeluaran(req.query);
  if (tanggal) filter.remoteCreatedAt = tanggal;
  const transactions = await BayarajaTransaction.find(filter).sort({ remoteCreatedAt: -1, createdAt: -1 }).limit(100);
  res.json({ transactions });
}

module.exports = {
  validasiPengeluaran,
  validasiPengaturan,
  dashboard,
  daftarPengguna,
  daftarPengeluaran,
  tambahPengeluaran,
  ubahPengeluaran,
  hapusPengeluaran,
  lihatPengaturan,
  pengaturanPublik,
  simpanPengaturan,
  transaksiBayaraja
};
