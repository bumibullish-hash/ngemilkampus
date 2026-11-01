require('dotenv').config();
const bayaraja = require('../services/bayaraja');

const buatLink = process.argv.includes('--tes-link');

function ringkas(nilai) {
  if (Array.isArray(nilai)) return 'array berisi ' + nilai.length + ' data';
  if (nilai && typeof nilai === 'object') return 'objek dengan kunci: ' + Object.keys(nilai).join(', ');
  return String(nilai);
}

async function langkah(nama, fungsi) {
  try {
    const hasil = await fungsi();
    console.log('[OK]    ' + nama);
    return hasil;
  } catch (error) {
    console.log('[GAGAL] ' + nama + ' -> ' + error.message);
    return null;
  }
}

async function jalankan() {
  console.log('Alamat Bayaraja     : ' + (process.env.BAYARAJA_BASE_URL || '(kosong)'));
  console.log('API Key terisi      : ' + (process.env.BAYARAJA_API_KEY ? 'ya' : 'tidak'));
  console.log('ID akun QRIS terisi : ' + (process.env.BAYARAJA_QRIS_ACCOUNT_ID ? 'ya' : 'tidak'));
  console.log('Webhook secret      : ' + (process.env.BAYARAJA_WEBHOOK_SECRET ? 'ya' : 'tidak'));
  console.log('');

  const transaksi = await langkah('GET /api/transactions (hanya membaca, memeriksa alamat dan API Key)', () =>
    bayaraja.getTransactions({ page: 1, limit: 1 })
  );
  if (transaksi) console.log('        bentuk respons: ' + ringkas(transaksi));

  const akun = await langkah('GET /api/qris (tidak ada di dokumentasi, mencoba mencari ID akun QRIS)', () =>
    bayaraja.listQrisAccounts()
  );
  if (akun) {
    const daftar = Array.isArray(akun) ? akun : akun.data || [];
    if (Array.isArray(daftar) && daftar.length) {
      daftar.forEach((item) => console.log('        akun QRIS: id=' + item.id + ' nama=' + (item.name || item.merchant_name || '-')));
    } else {
      console.log('        bentuk respons: ' + ringkas(akun));
    }
  }

  const qris = await langkah('POST /api/qris/create-amount (membuat QRIS Rp 1.000, tidak menyimpan transaksi)', () =>
    bayaraja.createDynamicQris(1000)
  );
  if (qris) {
    console.log('        qris_dynamic ada : ' + (qris.qris_dynamic ? 'ya' : 'tidak'));
    console.log('        qr_image_url ada : ' + (qris.qr_image_url ? 'ya' : 'tidak'));
    console.log('        nama merchant    : ' + (qris.merchant_name || '-'));
  }

  if (buatLink) {
    const link = await langkah('POST /api/links (membuat payment link uji Rp 1.000)', () =>
      bayaraja.createPaymentLink({
        title: 'Tes NgemilKampus',
        amount: 1000,
        description: 'Tes koneksi dari script cek-bayaraja',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      })
    );
    if (link) {
      console.log('        slug       : ' + link.slug);
      console.log('        payment_url: ' + link.payment_url);
      const status = await langkah('GET /api/pay/{slug}/status', () => bayaraja.getLinkStatus(link.slug));
      if (status) console.log('        paid=' + status.paid + ', bentuk respons: ' + ringkas(status));
    }
  } else {
    console.log('\nUntuk menguji pembuatan payment link, jalankan: npm run cek-bayaraja -- --tes-link');
  }
}

jalankan();
