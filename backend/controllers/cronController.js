const crypto = require('crypto');
const { expireOverdueOrders } = require('../services/paymentService');

function sama(a, b) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
}

async function periksaKedaluwarsa(req, res) {
  const rahasia = process.env.CRON_SECRET;
  if (!rahasia) {
    return res.status(503).json({ message: 'CRON_SECRET belum diisi' });
  }
  if (!sama(String(req.headers.authorization || ''), 'Bearer ' + rahasia)) {
    return res.status(401).json({ message: 'Tidak diizinkan' });
  }
  await expireOverdueOrders(50);
  res.json({ message: 'Pemeriksaan pesanan kedaluwarsa selesai' });
}

module.exports = { periksaKedaluwarsa };
