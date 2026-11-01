require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { expireOverdueOrders } = require('./services/paymentService');

const port = process.env.PORT || 3000;

async function start() {
  try {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
      throw new Error('JWT_SECRET belum diisi atau terlalu pendek (minimal 16 karakter) di file .env');
    }
    const alamatBayaraja = process.env.BAYARAJA_BASE_URL || '';
    if (!alamatBayaraja || /\/\/(www\.)?bayaraja\.com/i.test(alamatBayaraja)) {
      console.warn('PERINGATAN: BAYARAJA_BASE_URL belum benar. bayaraja.com bukan alamat API. Gunakan alamat instance Bayaraja Anda, contoh https://bayaraja.arwebs.my.id');
    }
    await connectDB();
    app.listen(port, () => {
      console.log('NgemilKampus berjalan di http://localhost:' + port);
    });
    setInterval(() => {
      expireOverdueOrders().catch((error) => console.error('Pemeriksaan pesanan kedaluwarsa gagal: ' + error.message));
    }, 60 * 1000);
  } catch (error) {
    console.error('Gagal menjalankan aplikasi: ' + error.message);
    process.exit(1);
  }
}

start();
