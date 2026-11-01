let hariAktif = 7;

async function muatDashboard() {
  try {
    const data = await api('/api/admin/dashboard?days=' + hariAktif);
    const r = data.ringkasan;
    document.getElementById('statOmzet').textContent = rupiah(r.omzet);
    document.getElementById('statTransaksi').textContent = r.totalTransaksi;
    document.getElementById('statBerhasil').textContent = r.berhasil;
    document.getElementById('statPending').textContent = r.pending;
    document.getElementById('statProduk').textContent = r.jumlahProduk;

    gambarGrafik('grafikPenjualan', data.grafik, 'Omzet');

    const terlaris = document.getElementById('produkTerlaris');
    terlaris.innerHTML = data.terlaris.length
      ? data.terlaris.map((item, indeks) => '<div class="summary-row"><span>' + (indeks + 1) + '. ' + esc(item.name) + '</span><strong>' + item.jumlah + ' terjual</strong></div>').join('')
      : '<p class="muted">Belum ada produk terjual. Data muncul setelah ada transaksi berstatus Paid.</p>';

    const tbody = document.getElementById('transaksiTerbaru');
    tbody.innerHTML = data.terbaru.length
      ? data.terbaru
          .map(
            (order) =>
              '<tr><td data-label="No. transaksi"><a href="/admin/transaksi-detail?id=' + esc(order._id) + '">' + esc(order.invoiceNumber) + '</a></td>' +
              '<td data-label="Tanggal">' + tanggal(order.createdAt) + '</td><td data-label="Pelanggan">' + esc(order.customerName) + '</td>' +
              '<td data-label="Total" class="text-right">' + rupiah(order.total) + '</td><td data-label="Status">' + badgeBayar(order.paymentStatus) + '</td></tr>'
          )
          .join('')
      : '<tr><td colspan="5" class="text-center muted">Belum ada transaksi.</td></tr>';
  } catch (error) {
    toast(error.message, 'error');
  }
}

document.getElementById('pilihHari').addEventListener('click', (event) => {
  const chip = event.target.closest('[data-hari]');
  if (!chip) return;
  hariAktif = Number(chip.dataset.hari);
  document.querySelectorAll('#pilihHari .chip').forEach((item) => item.classList.toggle('active', item === chip));
  muatDashboard();
});

muatDashboard();
