const wadahDetail = document.getElementById('detailAdmin');
const idPesanan = parameter('id');

async function muatDetail() {
  if (!idPesanan) {
    wadahDetail.innerHTML = '<div class="empty-box"><h2>Transaksi tidak ditemukan</h2><a class="btn btn-primary" href="/admin/transaksi">Kembali</a></div>';
    return;
  }
  try {
    const data = await api('/api/orders/' + encodeURIComponent(idPesanan));
    gambar(data.order, data.payment);
  } catch (error) {
    wadahDetail.innerHTML = '<div class="empty-box"><h2>Transaksi tidak ditemukan</h2><p>' + esc(error.message) + '</p><a class="btn btn-primary" href="/admin/transaksi">Kembali</a></div>';
  }
}

function gambar(order, payment) {
  const baris = order.items
    .map((item) => '<tr><td data-label="Produk">' + esc(item.name) + '</td><td data-label="Jumlah" class="text-right">' + item.quantity + '</td><td data-label="Harga" class="text-right">' + rupiah(item.price) + '</td><td data-label="Subtotal" class="text-right">' + rupiah(item.subtotal) + '</td></tr>')
    .join('');
  const bisaUbah = order.paymentStatus === 'paid';
  const opsiStatus = ['diproses', 'siap_diambil', 'selesai']
    .map((nilai) => '<option value="' + nilai + '"' + (order.orderStatus === nilai ? ' selected' : '') + '>' + LABEL_PESANAN[nilai] + '</option>')
    .join('');

  wadahDetail.innerHTML =
    '<div class="grid-2"><div class="panel"><div class="panel-head"><h2>' + esc(order.invoiceNumber) + '</h2><div class="badges">' + badgeBayar(order.paymentStatus) + badgePesanan(order.orderStatus) + '</div></div><div class="panel-body">' +
    (order.adminNote ? '<div class="alert alert-warning">' + esc(order.adminNote) + '</div>' : '') +
    '<dl class="kv"><dt>Tanggal transaksi</dt><dd>' + tanggal(order.createdAt) + ' WIB</dd>' +
    '<dt>Pelanggan</dt><dd>' + esc(order.customerName) + '</dd><dt>Email</dt><dd>' + esc(order.customerEmail) + '</dd>' +
    '<dt>Nomor HP</dt><dd>' + esc(order.customerPhone || '-') + '</dd>' +
    '<dt>Metode pembayaran</dt><dd>' + esc(LABEL_METODE[order.paymentMethod]) + '</dd>' +
    '<dt>Batas pembayaran</dt><dd>' + tanggal(order.expiresAt) + ' WIB</dd>' +
    (order.paidAt ? '<dt>Dibayar pada</dt><dd>' + tanggal(order.paidAt) + ' WIB</dd>' : '') +
    '<dt>Titik ambil</dt><dd>' + esc(order.pickupPoint) + '</dd><dt>Waktu ambil</dt><dd>' + tanggal(order.pickupTime) + ' WIB</dd>' +
    (order.note ? '<dt>Catatan</dt><dd>' + esc(order.note) + '</dd>' : '') + '</dl>' +
    '<div class="table-wrap mt-2"><table class="table responsive"><thead><tr><th>Produk</th><th class="text-right">Jumlah</th><th class="text-right">Harga</th><th class="text-right">Subtotal</th></tr></thead><tbody>' + baris + '</tbody></table></div>' +
    '<div class="summary-row summary-total"><span>Total</span><span>' + rupiah(order.total) + '</span></div></div></div>' +
    '<div><div class="panel"><div class="panel-head"><h3>Pembayaran Bayaraja</h3></div><div class="panel-body">' +
    '<p class="muted">Status Paid hanya diberikan setelah Bayaraja mengonfirmasi pembayaran. Konfirmasi dilakukan di dashboard Bayaraja.</p>' +
    '<div class="flex gap wrap"><button type="button" class="btn btn-primary btn-sm" id="cekStatus">Cek status ke Bayaraja</button>' +
    (payment && payment.paymentUrl ? '<a class="btn btn-outline btn-sm" href="' + esc(payment.paymentUrl) + '" target="_blank" rel="noopener noreferrer">Halaman pembayaran</a>' : '') + '</div>' +
    '<div id="hasilCek" class="mt-1"></div></div></div>' +
    '<div class="panel"><div class="panel-head"><h3>Status pesanan</h3></div><div class="panel-body">' +
    (bisaUbah
      ? '<div class="field"><label for="statusPesanan">Ubah status</label><select class="select" id="statusPesanan">' + opsiStatus + '</select></div><button type="button" class="btn btn-primary btn-sm" id="simpanStatus">Simpan status</button>'
      : '<p class="muted">Status pesanan dapat diubah setelah pembayaran berstatus Paid.</p>') +
    '</div></div>' +
    '<div class="panel"><div class="panel-head"><h3>Invoice</h3></div><div class="panel-body flex gap wrap"><a class="btn btn-outline btn-sm" href="/invoice?id=' + esc(order._id) + '">Lihat dan cetak</a>' +
    '<a class="btn btn-outline btn-sm" href="/api/orders/' + esc(order._id) + '/invoice.pdf">Unduh PDF</a></div></div></div></div>';

  document.getElementById('cekStatus').addEventListener('click', cekStatus);
  const simpan = document.getElementById('simpanStatus');
  if (simpan) simpan.addEventListener('click', simpanStatus);
}

async function cekStatus(event) {
  const tombol = event.currentTarget;
  const hasil = document.getElementById('hasilCek');
  setLoading(tombol, true, 'Memeriksa...');
  try {
    const data = await api('/api/orders/' + idPesanan + '/refresh', { method: 'POST' });
    if (data.peringatan) {
      hasil.innerHTML = '<div class="alert alert-warning">' + esc(data.peringatan) + '</div>';
      setLoading(tombol, false);
      return;
    }
    toast('Status pembayaran: ' + LABEL_BAYAR[data.order.paymentStatus]);
    muatDetail();
  } catch (error) {
    hasil.innerHTML = '<div class="alert alert-error">' + esc(error.message) + '</div>';
    setLoading(tombol, false);
  }
}

async function simpanStatus(event) {
  const tombol = event.currentTarget;
  setLoading(tombol, true, 'Menyimpan...');
  try {
    await api('/api/admin/orders/' + idPesanan + '/status', { method: 'PATCH', body: { orderStatus: document.getElementById('statusPesanan').value } });
    toast('Status pesanan diperbarui');
    muatDetail();
  } catch (error) {
    toast(error.message, 'error');
    setLoading(tombol, false);
  }
}

muatDetail();
