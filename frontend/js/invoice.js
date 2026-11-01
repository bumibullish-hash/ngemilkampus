const wadahInvoice = document.getElementById('areaInvoice');
const barTombol = document.getElementById('barTombol');

async function muatInvoice() {
  const id = parameter('id');
  const user = await ambilUser();
  const kembali = user && user.role === 'admin' ? '/admin/transaksi-detail?id=' + encodeURIComponent(id || '') : '/transaksi?id=' + encodeURIComponent(id || '');
  document.getElementById('linkKembali').href = kembali;
  if (!id) {
    wadahInvoice.innerHTML = '<div class="empty-box"><h2>Invoice tidak ditemukan</h2></div>';
    return;
  }
  try {
    const data = await api('/api/orders/' + encodeURIComponent(id));
    const order = data.order;
    const usaha = data.setting;
    document.title = 'Invoice ' + order.invoiceNumber;
    const baris = order.items
      .map((item, indeks) => '<tr><td data-label="No">' + (indeks + 1) + '</td><td data-label="Produk">' + esc(item.name) + '</td><td data-label="Jumlah" class="text-right">' + item.quantity + '</td><td data-label="Harga satuan" class="text-right">' + rupiah(item.price) + '</td><td data-label="Subtotal" class="text-right">' + rupiah(item.subtotal) + '</td></tr>')
      .join('');
    const kontak = [usaha.address, usaha.phone, usaha.email].filter(Boolean).map(esc).join('<br>');

    wadahInvoice.innerHTML =
      '<div class="invoice-head"><div><h1>INVOICE</h1><strong>' + esc(usaha.businessName) + '</strong><div class="muted">' + kontak + '</div></div>' +
      '<div class="text-right"><div class="muted">Nomor invoice</div><strong>' + esc(order.invoiceNumber) + '</strong></div></div>' +
      (order.paymentStatus === 'paid' ? '' : '<div class="alert alert-warning no-print">Invoice ini belum lunas. Status pembayaran saat ini: ' + esc(LABEL_BAYAR[order.paymentStatus]) + '.</div>') +
      '<div class="invoice-meta"><div><strong>Tanggal transaksi</strong>' + tanggal(order.createdAt) + ' WIB</div>' +
      '<div><strong>Status pembayaran</strong>' + badgeBayar(order.paymentStatus) + '</div>' +
      '<div><strong>Metode pembayaran</strong>' + esc(LABEL_METODE[order.paymentMethod]) + ' via Bayaraja</div></div>' +
      '<div class="invoice-grid"><div><strong>Pelanggan</strong>' + esc(order.customerName) + '<br>' + esc(order.customerEmail) + (order.customerPhone ? '<br>' + esc(order.customerPhone) : '') + '</div>' +
      '<div><strong>Pengambilan pesanan</strong>' + esc(order.pickupPoint) + '<br>' + tanggal(order.pickupTime) + ' WIB</div></div>' +
      '<div class="table-wrap"><table class="table responsive"><thead><tr><th>No</th><th>Produk</th><th class="text-right">Jumlah</th><th class="text-right">Harga satuan</th><th class="text-right">Subtotal</th></tr></thead><tbody>' + baris + '</tbody></table></div>' +
      '<div class="invoice-total"><div class="summary-row"><span>Subtotal</span><span>' + rupiah(order.subtotal) + '</span></div>' +
      '<div class="summary-row summary-total"><span>Total pembayaran</span><span>' + rupiah(order.total) + '</span></div></div>' +
      (order.note ? '<p class="mt-2"><strong>Catatan:</strong> ' + esc(order.note) + '</p>' : '') +
      '<div class="invoice-foot">Dokumen ini dibuat otomatis oleh sistem NgemilKampus' + (order.paidAt ? ' dan dibayar pada ' + tanggal(order.paidAt) + ' WIB' : '') + '.</div>';

    document.getElementById('linkPdf').href = '/api/orders/' + encodeURIComponent(id) + '/invoice.pdf';
    barTombol.classList.remove('hidden');
  } catch (error) {
    wadahInvoice.innerHTML = '<div class="empty-box"><h2>Invoice tidak ditemukan</h2><p>' + esc(error.message) + '</p></div>';
  }
}

document.getElementById('tombolCetak').addEventListener('click', () => window.print());
muatInvoice();
