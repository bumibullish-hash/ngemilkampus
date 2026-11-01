const crypto = require('crypto');
const paymentService = require('../services/paymentService');

const namaHeader = ['x-bayaraja-signature', 'x-webhook-signature', 'x-signature', 'x-hub-signature-256'];

function samaAman(a, b) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  return bufferA.length === bufferB.length && crypto.timingSafeEqual(bufferA, bufferB);
}

function signatureValid(req, secret) {
  const mentah = req.rawBody || Buffer.from('');
  const hex = crypto.createHmac('sha256', secret).update(mentah).digest('hex');
  const base64 = crypto.createHmac('sha256', secret).update(mentah).digest('base64');

  for (const nama of namaHeader) {
    const kiriman = req.headers[nama];
    if (!kiriman) continue;
    const bersih = String(kiriman).trim().replace(/^sha256=/i, '');
    if (samaAman(bersih.toLowerCase(), hex) || samaAman(bersih, base64)) {
      return true;
    }
  }
  return false;
}

async function terimaWebhook(req, res) {
  const secret = process.env.BAYARAJA_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(503).json({ message: 'Webhook belum dikonfigurasi' });
  }
  if (!signatureValid(req, secret)) {
    return res.status(401).json({ message: 'Signature webhook tidak valid' });
  }
  res.json({ message: 'Webhook diterima' });
  paymentService.syncWithBayaraja().catch((error) => console.error('Sinkronisasi webhook gagal: ' + error.message));
}

module.exports = { terimaWebhook };
