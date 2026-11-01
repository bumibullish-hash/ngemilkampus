const wadahRiwayat = document.getElementById('daftarRiwayat');
let statusAktif = '';

function kartuPesanan(order) {
  const ringkas = order.items.map((item) => item.name + ' x' + item.quantity).join(', ');
  return (
    '<a class="order-card" href="/transaksi?id=' + esc(order._id) + '">' +
    '<div class="order-card-top"><strong>' + esc(order.invoiceNumber) + '</strong>' +
    '<div class="badges">' + badgeBayar(order.paymentStatus) + badgePesanan(order.orderStatus) + '</div></div>' +
    '<div class="muted">' + tanggal(order.createdAt) + ' WIB</div>' +
    '<div>' + esc(ringkas) + '</div>' +
    '<div class="mt-1"><strong>' + rupiah(order.total) + '</strong> <span class="muted">via ' + esc(LABEL_METODE[order.paymentMethod]) + '</span></div></a>'
  );
}

async function muatRiwayat() {
  wadahRiwayat.innerHTML = '<div class="loading"><div class="spinner"></div>Memuat riwayat...</div>';
  try {
    const data = await api('/api/orders' + (statusAktif ? '?status=' + statusAktif : ''));
    if (data.orders.length === 0) {
      wadahRiwayat.innerHTML = '<div class="empty-box"><h3>Belum ada transaksi</h3><p>' + (statusAktif ? 'Tidak ada transaksi dengan status ini.' : 'Transaksi akan muncul setelah Anda melakukan pemesanan.') + '</p><a class="btn btn-primary" href="/produk">Lihat produk</a></div>';
      return;
    }
    wadahRiwayat.innerHTML = data.orders.map(kartuPesanan).join('');
  } catch (error) {
    wadahRiwayat.innerHTML = '<div class="empty-box"><h3>Riwayat gagal dimuat</h3><p>' + esc(error.message) + '</p></div>';
  }
}

document.getElementById('filterStatus').addEventListener('click', (event) => {
  const chip = event.target.closest('[data-status]');
  if (!chip) return;
  statusAktif = chip.dataset.status;
  document.querySelectorAll('#filterStatus .chip').forEach((item) => item.classList.toggle('active', item === chip));
  muatRiwayat();
});

muatRiwayat();
