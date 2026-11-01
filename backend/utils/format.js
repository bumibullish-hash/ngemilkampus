function formatRupiah(angka) {
  return 'Rp ' + Number(angka || 0).toLocaleString('id-ID');
}

function formatTanggal(tanggal) {
  return new Date(tanggal).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatTanggalSaja(tanggal) {
  return new Date(tanggal).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function escapeRegex(teks) {
  return String(teks).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const labelStatusBayar = {
  pending: 'Pending',
  paid: 'Paid',
  rejected: 'Rejected',
  expired: 'Expired'
};

const labelStatusPesanan = {
  menunggu_pembayaran: 'Menunggu pembayaran',
  diproses: 'Diproses',
  siap_diambil: 'Siap diambil',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan'
};

const labelMetode = {
  qris: 'QRIS',
  link: 'Payment Link'
};

module.exports = {
  formatRupiah,
  formatTanggal,
  formatTanggalSaja,
  escapeRegex,
  labelStatusBayar,
  labelStatusPesanan,
  labelMetode
};
