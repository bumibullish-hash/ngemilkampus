const tabelTransaksi = document.getElementById('tabelTransaksi');
const formFilter = document.getElementById('formFilter');
let halaman = 1;

async function muatTransaksi() {
  tabelTransaksi.innerHTML = '<tr><td colspan="7" class="loading"><div class="spinner"></div>Memuat transaksi...</td></tr>';
  const query = new URLSearchParams({ page: halaman, limit: 15 });
  ['status', 'orderStatus', 'from', 'to', 'search'].forEach((nama) => {
    if (formFilter[nama].value.trim()) query.set(nama, formFilter[nama].value.trim());
  });
  try {
    const data = await api('/api/admin/orders?' + query.toString());
    if (data.orders.length === 0) {
      tabelTransaksi.innerHTML = '<tr><td colspan="7" class="empty-box">Belum ada transaksi yang sesuai filter.</td></tr>';
    } else {
      tabelTransaksi.innerHTML = data.orders
        .map(
          (order) =>
            '<tr><td data-label="No. transaksi"><strong>' + esc(order.invoiceNumber) + '</strong></td>' +
            '<td data-label="Tanggal">' + tanggal(order.createdAt) + '</td>' +
            '<td data-label="Pelanggan">' + esc(order.customerName) + '</td>' +
            '<td data-label="Total" class="text-right">' + rupiah(order.total) + '</td>' +
            '<td data-label="Pembayaran">' + badgeBayar(order.paymentStatus) + '</td>' +
            '<td data-label="Pesanan">' + badgePesanan(order.orderStatus) + '</td>' +
            '<td class="cell-actions"><a class="btn btn-outline btn-sm" href="/admin/transaksi-detail?id=' + esc(order._id) + '">Detail</a></td></tr>'
        )
        .join('');
    }
    document.getElementById('infoHalaman').textContent = 'Halaman ' + data.page + ' dari ' + data.pages + ' (' + data.total + ' transaksi)';
    document.getElementById('sebelumnya').disabled = data.page <= 1;
    document.getElementById('berikutnya').disabled = data.page >= data.pages;
  } catch (error) {
    tabelTransaksi.innerHTML = '<tr><td colspan="7" class="empty-box">' + esc(error.message) + '</td></tr>';
  }
}

async function muatTransaksiBayaraja() {
  const tbody = document.getElementById('tabelBayaraja');
  const query = new URLSearchParams();
  const status = document.getElementById('statusBayaraja').value;
  if (status) query.set('status', status);
  if (formFilter.from.value) query.set('from', formFilter.from.value);
  if (formFilter.to.value) query.set('to', formFilter.to.value);
  try {
    const data = await api('/api/admin/bayaraja-transactions?' + query.toString());
    tbody.innerHTML = data.transactions.length
      ? data.transactions
          .map(
            (item) =>
              '<tr><td data-label="ID Bayaraja">' + esc(item.externalId.slice(0, 8)) + '</td><td data-label="Waktu">' + tanggal(item.remoteCreatedAt || item.createdAt) + '</td>' +
              '<td data-label="Pembayar">' + esc(item.payerName || '-') + '</td><td data-label="Nominal" class="text-right">' + rupiah(item.amount) + '</td>' +
              '<td data-label="Status"><span class="badge badge-' + (item.status === 'confirmed' ? 'paid' : item.status === 'rejected' ? 'rejected' : 'pending') + '">' + esc(item.status || '-') + '</span></td></tr>'
          )
          .join('')
      : '<tr><td colspan="5" class="text-center muted">Belum ada data. Klik "Sinkronkan dengan Bayaraja" untuk mengambil transaksi.</td></tr>';
  } catch (error) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center muted">' + esc(error.message) + '</td></tr>';
  }
}

formFilter.addEventListener('submit', (event) => {
  event.preventDefault();
  halaman = 1;
  muatTransaksi();
  muatTransaksiBayaraja();
});

document.getElementById('resetFilter').addEventListener('click', () => {
  formFilter.reset();
  halaman = 1;
  muatTransaksi();
  muatTransaksiBayaraja();
});

document.getElementById('sebelumnya').addEventListener('click', () => {
  halaman -= 1;
  muatTransaksi();
});
document.getElementById('berikutnya').addEventListener('click', () => {
  halaman += 1;
  muatTransaksi();
});
document.getElementById('statusBayaraja').addEventListener('change', muatTransaksiBayaraja);

document.getElementById('tombolSinkron').addEventListener('click', async (event) => {
  const tombol = event.currentTarget;
  const hasilBox = document.getElementById('hasilSinkron');
  setLoading(tombol, true, 'Menyinkronkan...');
  try {
    const body = {};
    if (formFilter.from.value) body.from = formFilter.from.value;
    if (formFilter.to.value) body.to = formFilter.to.value;
    const hasil = await api('/api/admin/sync', { method: 'POST', body });
    hasilBox.className = 'alert ' + (hasil.peringatan ? 'alert-warning' : 'alert-success');
    hasilBox.textContent =
      hasil.diperiksa + ' pesanan diperiksa, ' + hasil.berubah + ' status berubah, ' + hasil.transaksiBayaraja + ' transaksi Bayaraja disimpan.' +
      (hasil.peringatan ? ' Peringatan: ' + hasil.peringatan : '');
    muatTransaksi();
    muatTransaksiBayaraja();
  } catch (error) {
    hasilBox.className = 'alert alert-error';
    hasilBox.textContent = error.message;
  }
  setLoading(tombol, false);
});

muatTransaksi();
muatTransaksiBayaraja();
