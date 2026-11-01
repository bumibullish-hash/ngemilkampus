const Order = require('../models/Order');
const Expense = require('../models/Expense');
const { getRange, buildKeys, dayKey, monthKey } = require('../utils/dateRange');

function kunciWaktu(tanggal, unit) {
  return unit === 'month' ? monthKey(tanggal) : dayKey(tanggal);
}

async function laporanPenjualan({ period, from, to, status }) {
  const rentang = getRange(period, from, to);
  const semua = await Order.find({ createdAt: { $gte: rentang.start, $lt: rentang.end } })
    .sort({ createdAt: -1 })
    .lean();

  const ringkasan = { total: semua.length, paid: 0, pending: 0, rejected: 0, expired: 0, omzet: 0, itemTerjual: 0 };
  const perPeriode = {};
  buildKeys(rentang.start, rentang.end, rentang.unit).forEach((kunci) => {
    perPeriode[kunci] = { key: kunci, omzet: 0, transaksi: 0 };
  });

  semua.forEach((order) => {
    ringkasan[order.paymentStatus] += 1;
    if (order.paymentStatus === 'paid') {
      ringkasan.omzet += order.total;
      ringkasan.itemTerjual += order.items.reduce((jumlah, item) => jumlah + item.quantity, 0);
      const kunci = kunciWaktu(order.createdAt, rentang.unit);
      if (perPeriode[kunci]) {
        perPeriode[kunci].omzet += order.total;
        perPeriode[kunci].transaksi += 1;
      }
    }
  });

  const baris = (status ? semua.filter((order) => order.paymentStatus === status) : semua).map((order) => ({
    _id: order._id,
    invoiceNumber: order.invoiceNumber,
    createdAt: order.createdAt,
    customerName: order.customerName,
    produk: order.items.map((item) => item.name + ' x' + item.quantity).join(', '),
    total: order.total,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus
  }));

  return {
    periode: { label: rentang.label, unit: rentang.unit },
    ringkasan,
    grafik: Object.values(perPeriode),
    baris
  };
}

async function laporanKeuangan({ period, from, to }) {
  const rentang = getRange(period, from, to);
  const orders = await Order.find({
    paymentStatus: 'paid',
    createdAt: { $gte: rentang.start, $lt: rentang.end }
  }).lean();
  const pengeluaranList = await Expense.find({ date: { $gte: rentang.start, $lt: rentang.end } })
    .sort({ date: -1 })
    .lean();

  const perPeriode = {};
  buildKeys(rentang.start, rentang.end, rentang.unit).forEach((kunci) => {
    perPeriode[kunci] = { key: kunci, pendapatan: 0, hpp: 0, pengeluaran: 0, labaBersih: 0, transaksi: 0 };
  });

  let pendapatan = 0;
  let hpp = 0;
  orders.forEach((order) => {
    const biayaModal = order.items.reduce((jumlah, item) => jumlah + item.costPrice * item.quantity, 0);
    pendapatan += order.total;
    hpp += biayaModal;
    const baris = perPeriode[kunciWaktu(order.createdAt, rentang.unit)];
    if (baris) {
      baris.pendapatan += order.total;
      baris.hpp += biayaModal;
      baris.transaksi += 1;
    }
  });

  let totalPengeluaran = 0;
  pengeluaranList.forEach((item) => {
    totalPengeluaran += item.amount;
    const baris = perPeriode[kunciWaktu(item.date, rentang.unit)];
    if (baris) baris.pengeluaran += item.amount;
  });

  const rekap = Object.values(perPeriode).map((baris) => ({
    ...baris,
    labaBersih: baris.pendapatan - baris.hpp - baris.pengeluaran
  }));

  return {
    periode: { label: rentang.label, unit: rentang.unit },
    ringkasan: {
      pendapatan,
      transaksiBerhasil: orders.length,
      hpp,
      labaKotor: pendapatan - hpp,
      pengeluaran: totalPengeluaran,
      labaBersih: pendapatan - hpp - totalPengeluaran
    },
    rekap,
    pengeluaran: pengeluaranList.map((item) => ({
      _id: item._id,
      date: item.date,
      title: item.title,
      category: item.category,
      amount: item.amount
    }))
  };
}

module.exports = { laporanPenjualan, laporanKeuangan };
