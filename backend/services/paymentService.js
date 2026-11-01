const QRCode = require('qrcode');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Product = require('../models/Product');
const BayarajaTransaction = require('../models/BayarajaTransaction');
const bayaraja = require('./bayaraja');

function urlAman(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url);
}

async function createBayarajaPayment({ invoiceNumber, total, method, expiresAt }) {
  let qris = null;
  if (method === 'qris') {
    qris = await bayaraja.createDynamicQris(total);
  }

  const link = await bayaraja.createPaymentLink({
    title: invoiceNumber,
    amount: total,
    description: 'Pesanan ' + invoiceNumber + ' - NgemilKampus',
    expiresAt
  });

  if (!link.slug || !urlAman(link.payment_url)) {
    const error = new Error('Respons Bayaraja tidak lengkap, payment link gagal dibuat');
    error.status = 502;
    error.expose = true;
    throw error;
  }

  let qrImage = '';
  let qrisString = '';
  let merchantName = '';
  if (qris) {
    qrisString = qris.qris_dynamic || '';
    merchantName = qris.merchant_name || '';
    if (typeof qris.qr_image_url === 'string' && qris.qr_image_url.startsWith('data:image/')) {
      qrImage = qris.qr_image_url;
    } else if (qrisString) {
      qrImage = await QRCode.toDataURL(qrisString, { margin: 1, width: 320 });
    }
    if (!qrImage) {
      const error = new Error('Bayaraja tidak mengembalikan data QRIS');
      error.status = 502;
      error.expose = true;
      throw error;
    }
  }

  return {
    linkId: link.id ? String(link.id) : '',
    slug: link.slug,
    paymentUrl: link.payment_url,
    qrisString,
    qrImage,
    merchantName
  };
}

async function returnStock(order) {
  const diklaim = await Order.findOneAndUpdate(
    { _id: order._id, stockReturned: false },
    { stockReturned: true }
  );
  if (!diklaim) return;
  for (const item of order.items) {
    await Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } });
  }
}

async function markPaid(orderId, payerName) {
  const sebelum = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: { $in: ['pending', 'expired', 'rejected'] } },
    { paymentStatus: 'paid', orderStatus: 'diproses', paidAt: new Date() }
  );
  if (!sebelum) return false;

  await Payment.updateOne(
    { order: orderId },
    { status: 'paid', confirmedAt: new Date(), payerName: payerName || '' }
  );

  if (sebelum.stockReturned) {
    let stokKurang = false;
    for (const item of sebelum.items) {
      const hasil = await Product.updateOne(
        { _id: item.product, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );
      if (hasil.modifiedCount === 0) stokKurang = true;
    }
    await Order.updateOne(
      { _id: orderId },
      {
        stockReturned: false,
        adminNote: stokKurang
          ? 'Pembayaran masuk setelah pesanan kedaluwarsa dan stok tidak mencukupi. Hubungi pembeli.'
          : 'Pembayaran masuk setelah pesanan kedaluwarsa. Stok sudah dikurangi kembali.'
      }
    );
  }
  return true;
}

async function markFailed(orderId, status) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: 'pending' },
    { paymentStatus: status, orderStatus: 'dibatalkan' },
    { returnDocument: 'after' }
  );
  if (!order) return false;
  await Payment.updateOne({ order: orderId }, { status });
  await returnStock(order);
  return true;
}

function bacaStatus(data, payment) {
  const ringkasan = data.summary || {};
  const terakhir = data.latest_transaction || null;
  const sudahDikonfirmasi = data.paid === true || Number(ringkasan.confirmed) > 0;

  if (sudahDikonfirmasi) {
    const nominalCocok = data.amount === undefined || Number(data.amount) === payment.amount;
    return { status: nominalCocok ? 'paid' : 'nominal_beda', terakhir, menunggu: false };
  }
  const menunggu = Number(ringkasan.pending) > 0;
  if (terakhir && terakhir.status === 'rejected' && !menunggu) {
    return { status: 'rejected', terakhir, menunggu };
  }
  return { status: 'pending', terakhir, menunggu };
}

async function refreshPayment(orderId, { force = false } = {}) {
  const order = await Order.findById(orderId);
  if (!order) return { order: null, error: null };
  if (order.paymentStatus === 'paid') return { order, error: null };

  const payment = await Payment.findOne({ order: order._id });
  if (!payment) return { order, error: null };

  if (!force && order.paymentStatus !== 'pending') return { order, error: null };
  if (!force && payment.lastCheckedAt && Date.now() - payment.lastCheckedAt.getTime() < 3000) {
    return { order, error: null };
  }

  let data;
  try {
    data = await bayaraja.getLinkStatus(payment.slug);
  } catch (error) {
    await Payment.updateOne({ _id: payment._id }, { lastCheckedAt: new Date() });
    return { order, error: error.message };
  }
  await Payment.updateOne({ _id: payment._id }, { lastCheckedAt: new Date() });

  const hasil = bacaStatus(data, payment);
  let pesanError = null;

  if (hasil.status === 'paid') {
    const nama = hasil.terakhir && hasil.terakhir.payer_name ? hasil.terakhir.payer_name : '';
    await markPaid(order._id, nama);
  } else if (hasil.status === 'nominal_beda') {
    pesanError = 'Nominal pembayaran di Bayaraja tidak sama dengan total pesanan. Periksa di dashboard Bayaraja.';
  } else if (hasil.status === 'rejected') {
    await markFailed(order._id, 'rejected');
  } else if (order.paymentStatus === 'pending' && new Date() > order.expiresAt && !hasil.menunggu) {
    await markFailed(order._id, 'expired');
  }

  return { order: await Order.findById(order._id), error: pesanError };
}

async function expireOverdueOrders(batas = 50) {
  const terlambat = await Order.find({
    paymentStatus: 'pending',
    expiresAt: { $lt: new Date() }
  }).limit(batas);
  for (const order of terlambat) {
    const hasil = await refreshPayment(order._id, { force: true });
    if (hasil.error) break;
  }
}

function ambilDaftar(body) {
  const daftar = Array.isArray(body) ? body : body.data || body.transactions || [];
  if (Array.isArray(daftar)) return daftar;
  return daftar.items || daftar.transactions || [];
}

async function syncWithBayaraja({ from, to } = {}) {
  const hasil = { diperiksa: 0, berubah: 0, transaksiBayaraja: 0, peringatan: null };

  const batas = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const orders = await Order.find({
    paymentStatus: { $in: ['pending', 'rejected', 'expired'] },
    createdAt: { $gte: batas }
  })
    .sort({ createdAt: -1 })
    .limit(100);

  for (const order of orders) {
    const statusAwal = order.paymentStatus;
    const cek = await refreshPayment(order._id, { force: true });
    hasil.diperiksa += 1;
    if (cek.error) {
      hasil.peringatan = cek.error;
      break;
    }
    if (cek.order && cek.order.paymentStatus !== statusAwal) hasil.berubah += 1;
  }

  if (hasil.peringatan) return hasil;

  try {
    const params = { page: 1, limit: 50 };
    if (from) params.from = from;
    if (to) params.to = to;
    const body = await bayaraja.getTransactions(params);
    const daftar = ambilDaftar(body);

    for (const item of daftar) {
      if (!item || item.id === undefined) continue;
      const linkId = String(item.link_id || (item.link && item.link.id) || '');
      const data = {
        linkId,
        status: String(item.status || ''),
        amount: Number(item.amount) || 0,
        payerName: item.payer_name || ''
      };
      if (item.created_at && !Number.isNaN(Date.parse(item.created_at))) {
        data.remoteCreatedAt = new Date(item.created_at);
      }
      await BayarajaTransaction.updateOne(
        { externalId: String(item.id) },
        { $set: data },
        { upsert: true }
      );
      hasil.transaksiBayaraja += 1;

      if (item.status === 'confirmed' && linkId) {
        const payment = await Payment.findOne({ linkId });
        if (payment) {
          const order = await Order.findById(payment.order);
          if (order && order.paymentStatus !== 'paid') {
            const cek = await refreshPayment(order._id, { force: true });
            if (cek.order && cek.order.paymentStatus === 'paid') hasil.berubah += 1;
          }
        }
      }
    }
  } catch (error) {
    hasil.peringatan = error.message;
  }

  return hasil;
}

module.exports = {
  createBayarajaPayment,
  refreshPayment,
  expireOverdueOrders,
  syncWithBayaraja,
  returnStock
};
