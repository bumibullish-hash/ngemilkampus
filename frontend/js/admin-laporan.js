const jenis = document.body.dataset.laporan;
const formLaporan = document.getElementById('formLaporan');
const PERIODE = [
  ['hari-ini', 'Hari ini'],
  ['7-hari', '7 hari terakhir'],
  ['bulan-ini', 'Bulan ini'],
  ['bulan-lalu', 'Bulan sebelumnya'],
  ['tahun-ini', 'Tahun ini'],
  ['kustom', 'Rentang tanggal']
];
let periodeAktif = 'bulan-ini';

document.getElementById('chipPeriode').innerHTML = PERIODE.map(
  (item) => '<button type="button" class="chip' + (item[0] === periodeAktif ? ' active' : '') + '" data-periode="' + item[0] + '">' + item[1] + '</button>'
).join('');

function queryLaporan() {
  const query = new URLSearchParams({ period: periodeAktif });
  if (periodeAktif === 'kustom') {
    query.set('from', formLaporan.from.value);
    query.set('to', formLaporan.to.value);
  }
  if (jenis === 'penjualan' && formLaporan.status.value) query.set('status', formLaporan.status.value);
  return query.toString();
}

function aturKustom() {
  document.getElementById('areaKustom').classList.toggle('hidden', periodeAktif !== 'kustom');
}

function perbaruiTautanPdf() {
  document.getElementById('tombolPdf').href = '/api/admin/reports/' + (jenis === 'penjualan' ? 'sales' : 'finance') + '.pdf?' + queryLaporan();
}

function kartu(label, nilai, kelas) {
  return '<div class="stat ' + (kelas || '') + '"><span>' + esc(label) + '</span><strong>' + nilai + '</strong></div>';
}

function gambarPenjualan(data) {
  const r = data.ringkasan;
  document.getElementById('ringkasan').innerHTML =
    kartu('Total omzet (hanya Paid)', rupiah(r.omzet), 'accent') + kartu('Total transaksi', r.total) + kartu('Berhasil (Paid)', r.paid, 'good') + kartu('Pending', r.pending) + kartu('Item terjual', r.itemTerjual);
  document.getElementById('tabelLaporan').innerHTML = data.baris.length
    ? data.baris
        .map(
          (baris) =>
            '<tr><td data-label="No. transaksi"><a href="/admin/transaksi-detail?id=' + esc(baris._id) + '">' + esc(baris.invoiceNumber) + '</a></td>' +
            '<td data-label="Tanggal">' + tanggal(baris.createdAt) + '</td><td data-label="Pelanggan">' + esc(baris.customerName) + '</td>' +
            '<td data-label="Produk">' + esc(baris.produk) + '</td><td data-label="Total" class="text-right">' + rupiah(baris.total) + '</td>' +
            '<td data-label="Metode">' + esc(LABEL_METODE[baris.paymentMethod]) + '</td><td data-label="Status">' + badgeBayar(baris.paymentStatus) + '</td></tr>'
        )
        .join('')
    : '<tr><td colspan="7" class="empty-box">Tidak ada transaksi pada periode ini.</td></tr>';
}

function gambarKeuangan(data) {
  const r = data.ringkasan;
  document.getElementById('ringkasan').innerHTML =
    kartu('Total pendapatan (hanya Paid)', rupiah(r.pendapatan), 'accent') +
    kartu('Transaksi berhasil', r.transaksiBerhasil) +
    kartu('Harga modal (HPP)', rupiah(r.hpp)) +
    kartu('Laba kotor', rupiah(r.labaKotor)) +
    kartu('Pengeluaran', rupiah(r.pengeluaran)) +
    kartu('Laba bersih', rupiah(r.labaBersih), r.labaBersih >= 0 ? 'good' : 'bad');
  const baris = data.rekap.filter((item) => item.transaksi > 0 || item.pengeluaran > 0);
  document.getElementById('tabelLaporan').innerHTML = baris.length
    ? baris
        .map(
          (item) =>
            '<tr><td data-label="Periode">' + labelKunci(item.key) + '</td><td data-label="Transaksi" class="text-right">' + item.transaksi + '</td>' +
            '<td data-label="Pendapatan" class="text-right">' + rupiah(item.pendapatan) + '</td><td data-label="Modal" class="text-right">' + rupiah(item.hpp) + '</td>' +
            '<td data-label="Pengeluaran" class="text-right">' + rupiah(item.pengeluaran) + '</td><td data-label="Laba bersih" class="text-right"><strong>' + rupiah(item.labaBersih) + '</strong></td></tr>'
        )
        .join('')
    : '<tr><td colspan="6" class="empty-box">Belum ada pendapatan atau pengeluaran pada periode ini.</td></tr>';
  document.getElementById('tabelPengeluaran').innerHTML = data.pengeluaran.length
    ? data.pengeluaran
        .map(
          (item) =>
            '<tr><td data-label="Tanggal">' + tanggalSaja(item.date) + '</td><td data-label="Keterangan">' + esc(item.title) + '</td>' +
            '<td data-label="Kategori">' + esc(item.category) + '</td><td data-label="Jumlah" class="text-right">' + rupiah(item.amount) + '</td></tr>'
        )
        .join('')
    : '<tr><td colspan="4" class="empty-box">Tidak ada pengeluaran pada periode ini.</td></tr>';
}

async function muatLaporan() {
  if (periodeAktif === 'kustom' && (!formLaporan.from.value || !formLaporan.to.value)) return;
  perbaruiTautanPdf();
  try {
    const data = await api('/api/admin/reports/' + (jenis === 'penjualan' ? 'sales' : 'finance') + '?' + queryLaporan());
    document.getElementById('labelPeriode').textContent = data.periode.label;
    document.getElementById('judulCetak').textContent = document.getElementById('labelPeriode').textContent;
    const grafik = jenis === 'penjualan'
      ? data.grafik
      : data.rekap.map((item) => ({ key: item.key, omzet: item.pendapatan, transaksi: item.transaksi }));
    gambarGrafik('grafikLaporan', grafik, jenis === 'penjualan' ? 'Omzet' : 'Pendapatan');
    if (jenis === 'penjualan') gambarPenjualan(data);
    else gambarKeuangan(data);
  } catch (error) {
    toast(error.message, 'error');
  }
}

document.getElementById('chipPeriode').addEventListener('click', (event) => {
  const chip = event.target.closest('[data-periode]');
  if (!chip) return;
  periodeAktif = chip.dataset.periode;
  document.querySelectorAll('#chipPeriode .chip').forEach((item) => item.classList.toggle('active', item === chip));
  aturKustom();
  muatLaporan();
});

formLaporan.addEventListener('submit', (event) => {
  event.preventDefault();
  if (periodeAktif === 'kustom' && (!formLaporan.from.value || !formLaporan.to.value)) {
    toast('Isi tanggal awal dan tanggal akhir', 'error');
    return;
  }
  muatLaporan();
});

document.getElementById('tombolCetak').addEventListener('click', () => window.print());

const hariIni = tanggalInput(new Date());
formLaporan.from.value = hariIni.slice(0, 8) + '01';
formLaporan.to.value = hariIni;
aturKustom();
muatLaporan();
