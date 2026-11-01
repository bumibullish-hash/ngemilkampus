const wadahTransaksi = document.getElementById('detailTransaksi');

async function muatTransaksi() {
  const id = parameter('id');
  if (!id) {
    wadahTransaksi.innerHTML = '<div class="empty-box"><h2>Transaksi tidak ditemukan</h2><a class="btn btn-primary" href="/riwayat">Riwayat transaksi</a></div>';
    return;
  }
  try {
    const data = await api('/api/orders/' + encodeURIComponent(id));
    const order = data.order;
    const baris = order.items
      .map((item) => '<tr><td data-label="Produk">' + esc(item.name) + '</td><td data-label="Jumlah" class="text-right">' + item.quantity + '</td><td data-label="Harga" class="text-right">' + rupiah(item.price) + '</td><td data-label="Subtotal" class="text-right">' + rupiah(item.subtotal) + '</td></tr>')
      .join('');
    const aksi = [];
    if (order.paymentStatus === 'pending') aksi.push('<a class="btn btn-primary" href="/pembayaran?id=' + esc(order._id) + '">Lanjutkan pembayaran</a>');
    aksi.push('<a class="btn btn-outline" href="/invoice?id=' + esc(order._id) + '">Lihat invoice</a>');
    aksi.push('<a class="btn btn-outline" href="/api/orders/' + esc(order._id) + '/invoice.pdf">Unduh PDF</a>');

    wadahTransaksi.innerHTML =
      '<div class="card"><div class="card-body">' +
      '<div class="flex-between"><h2 class="no-margin">' + esc(order.invoiceNumber) + '</h2><div class="badges">' + badgeBayar(order.paymentStatus) + badgePesanan(order.orderStatus) + '</div></div>' +
      '<dl class="kv mt-2"><dt>Tanggal transaksi</dt><dd>' + tanggal(order.createdAt) + ' WIB</dd>' +
      '<dt>Metode pembayaran</dt><dd>' + esc(LABEL_METODE[order.paymentMethod]) + '</dd>' +
      (order.paidAt ? '<dt>Dibayar pada</dt><dd>' + tanggal(order.paidAt) + ' WIB</dd>' : '') +
      '<dt>Titik ambil</dt><dd>' + esc(order.pickupPoint) + '</dd>' +
      '<dt>Waktu ambil</dt><dd>' + tanggal(order.pickupTime) + ' WIB</dd>' +
      (order.note ? '<dt>Catatan</dt><dd>' + esc(order.note) + '</dd>' : '') + '</dl>' +
      '<div class="table-wrap mt-2"><table class="table responsive"><thead><tr><th>Produk</th><th class="text-right">Jumlah</th><th class="text-right">Harga</th><th class="text-right">Subtotal</th></tr></thead><tbody>' + baris + '</tbody></table></div>' +
      '<div class="summary-row summary-total"><span>Total pembayaran</span><span>' + rupiah(order.total) + '</span></div>' +
      '<div class="flex gap wrap mt-2">' + aksi.join('') + '</div></div></div>';
  } catch (error) {
    wadahTransaksi.innerHTML = '<div class="empty-box"><h2>Transaksi tidak ditemukan</h2><p>' + esc(error.message) + '</p><a class="btn btn-primary" href="/riwayat">Riwayat transaksi</a></div>';
  }
}

muatTransaksi();
