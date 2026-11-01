const idPesanan = parameter('id');
const wadahBayar = document.getElementById('halamanBayar');
let pewaktuPolling;
let pewaktuHitung;
let dataTerakhir;

const PESAN_STATUS = {
  pending: 'Menunggu pembayaran dikonfirmasi',
  paid: 'Pembayaran dikonfirmasi. Terima kasih!',
  rejected: 'Pembayaran ditolak oleh penjual',
  expired: 'Waktu pembayaran habis'
};

function langkahBayar(metode) {
  if (metode === 'qris') {
    return '<ol class="pay-steps"><li>Scan QR di samping dengan aplikasi e-wallet atau mobile banking, lalu bayar sesuai nominal.</li>' +
      '<li>Buka halaman Bayaraja dan unggah bukti pembayaran.</li>' +
      '<li>Penjual mengonfirmasi pembayaran di Bayaraja. Status di halaman ini berubah otomatis.</li></ol>';
  }
  return '<ol class="pay-steps"><li>Buka halaman pembayaran Bayaraja.</li>' +
    '<li>Scan QRIS di halaman tersebut, bayar, lalu unggah bukti pembayaran.</li>' +
    '<li>Penjual mengonfirmasi pembayaran di Bayaraja. Status di halaman ini berubah otomatis.</li></ol>';
}

function sisaWaktu(batas) {
  const selisih = Math.max(0, Math.floor((new Date(batas).getTime() - Date.now()) / 1000));
  return String(Math.floor(selisih / 60)).padStart(2, '0') + ':' + String(selisih % 60).padStart(2, '0');
}

function gambarHalaman(data, peringatan) {
  const order = data.order;
  const bayar = data.payment;
  const pending = order.paymentStatus === 'pending';

  const kiri = bayar.method === 'qris' && bayar.qrImage
    ? '<div class="card qr-box"><img src="' + esc(bayar.qrImage) + '" alt="QRIS pembayaran ' + esc(order.invoiceNumber) + '">' +
      '<div class="pay-amount">' + rupiah(order.total) + '</div>' +
      '<div class="muted">' + esc(bayar.merchantName ? 'Merchant: ' + bayar.merchantName : 'QRIS dinamis, nominal sudah terisi') + '</div></div>'
    : '<div class="card qr-box"><div class="muted">Total pembayaran</div><div class="pay-amount">' + rupiah(order.total) + '</div>' +
      '<div class="muted">Pembayaran melalui halaman Bayaraja</div></div>';

  let tombol = '';
  if (pending) {
    tombol =
      '<div class="flex gap wrap mt-2"><a class="btn btn-primary" href="' + esc(bayar.paymentUrl) + '" target="_blank" rel="noopener noreferrer">Buka halaman Bayaraja</a>' +
      '<button type="button" class="btn btn-outline" id="cekSekarang">Cek status sekarang</button></div>';
  } else if (order.paymentStatus === 'paid') {
    tombol = '<div class="flex gap wrap mt-2"><a class="btn btn-primary" href="/invoice?id=' + esc(order._id) + '">Lihat invoice</a>' +
      '<a class="btn btn-outline" href="/riwayat">Riwayat transaksi</a></div>';
  } else {
    tombol = '<p class="muted">Pesanan dibatalkan dan stok dikembalikan. Silakan buat pesanan baru jika masih ingin memesan.</p>' +
      '<div class="flex gap wrap"><a class="btn btn-primary" href="/produk">Pesan lagi</a><a class="btn btn-outline" href="/riwayat">Riwayat transaksi</a></div>';
  }

  const banner =
    '<div class="status-banner ' + esc(order.paymentStatus) + '">' + (pending ? '<div class="spinner" aria-hidden="true"></div>' : '') +
    '<div>' + esc(PESAN_STATUS[order.paymentStatus]) + (pending ? '<div class="countdown" id="hitungMundur"></div>' : '') + '</div></div>';

  wadahBayar.innerHTML =
    '<div class="pay-layout">' + kiri + '<div class="card"><div class="card-body">' + banner +
    (peringatan ? '<div class="alert alert-warning">Status belum dapat diperiksa: ' + esc(peringatan) + '</div>' : '') +
    '<dl class="kv"><dt>No. invoice</dt><dd>' + esc(order.invoiceNumber) + '</dd>' +
    '<dt>Metode</dt><dd>' + esc(LABEL_METODE[order.paymentMethod]) + '</dd>' +
    '<dt>Status pembayaran</dt><dd>' + badgeBayar(order.paymentStatus) + '</dd>' +
    '<dt>Titik ambil</dt><dd>' + esc(order.pickupPoint) + '</dd>' +
    '<dt>Waktu ambil</dt><dd>' + tanggal(order.pickupTime) + ' WIB</dd></dl>' +
    (pending ? '<h3 class="mt-2">Cara membayar</h3>' + langkahBayar(bayar.method) : '') + tombol +
    '</div></div></div>';

  const tombolCek = document.getElementById('cekSekarang');
  if (tombolCek) tombolCek.addEventListener('click', () => periksa(tombolCek));
  jalankanHitungMundur(order);
}

function jalankanHitungMundur(order) {
  clearInterval(pewaktuHitung);
  const label = document.getElementById('hitungMundur');
  if (!label || order.paymentStatus !== 'pending') return;
  const perbarui = () => {
    label.textContent = 'Sisa waktu ' + sisaWaktu(order.expiresAt);
  };
  perbarui();
  pewaktuHitung = setInterval(perbarui, 1000);
}

async function periksa(tombol) {
  if (tombol) setLoading(tombol, true, 'Memeriksa...');
  try {
    const hasil = await api('/api/orders/' + idPesanan + '/refresh', { method: 'POST' });
    const statusLama = dataTerakhir.order.paymentStatus;
    dataTerakhir = { order: hasil.order, payment: hasil.payment };
    if (hasil.order.paymentStatus !== statusLama || tombol || hasil.peringatan) {
      gambarHalaman(dataTerakhir, hasil.peringatan);
    }
    if (hasil.order.paymentStatus !== 'pending') {
      clearInterval(pewaktuPolling);
      if (hasil.order.paymentStatus === 'paid') toast('Pembayaran berhasil dikonfirmasi');
    } else if (tombol) {
      toast('Pembayaran belum dikonfirmasi oleh penjual');
    }
  } catch (error) {
    if (tombol) toast(error.message, 'error');
  } finally {
    const barisTombol = document.getElementById('cekSekarang');
    if (barisTombol) setLoading(barisTombol, false);
  }
}

async function muatPembayaran() {
  if (!idPesanan) {
    wadahBayar.innerHTML = '<div class="empty-box"><h2>Transaksi tidak ditemukan</h2><a class="btn btn-primary" href="/riwayat">Riwayat transaksi</a></div>';
    return;
  }
  try {
    dataTerakhir = await api('/api/orders/' + encodeURIComponent(idPesanan));
    gambarHalaman(dataTerakhir, null);
    if (dataTerakhir.order.paymentStatus === 'pending') {
      periksa(null);
      pewaktuPolling = setInterval(() => periksa(null), 5000);
    }
  } catch (error) {
    wadahBayar.innerHTML = '<div class="empty-box"><h2>Transaksi tidak ditemukan</h2><p>' + esc(error.message) + '</p><a class="btn btn-primary" href="/riwayat">Riwayat transaksi</a></div>';
  }
}

muatPembayaran();
