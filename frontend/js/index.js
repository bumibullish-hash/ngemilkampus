async function muatBeranda() {
  const [pengaturan, kategori, produk] = await Promise.allSettled([
    api('/api/settings/public', { tanpaRedirect: true }),
    api('/api/categories', { tanpaRedirect: true }),
    api('/api/products?limit=8', { tanpaRedirect: true })
  ]);

  const usaha = pengaturan.status === 'fulfilled' ? pengaturan.value.setting : null;
  if (usaha) {
    document.getElementById('heroTagline').textContent = usaha.tagline || 'Pesan camilan dan minuman, ambil tanpa antre';
    const info = [];
    if (usaha.pickupHours) info.push(usaha.pickupHours);
    if (usaha.pickupPoints.length) info.push(usaha.pickupPoints.length + ' titik ambil');
    document.getElementById('heroInfo').innerHTML = info.map((teks) => '<span class="hero-pill">' + esc(teks) + '</span>').join('');
    document.getElementById('infoJam').textContent = usaha.pickupHours || '-';
    document.getElementById('infoTitik').textContent = usaha.pickupPoints.join(', ') || '-';
    document.getElementById('infoKontak').textContent = [usaha.address, usaha.phone].filter(Boolean).join(' | ') || '-';
  }

  const daftarKategori = kategori.status === 'fulfilled' ? kategori.value.categories : [];
  document.getElementById('chipKategori').innerHTML = daftarKategori
    .map((item) => '<a class="chip" href="/produk?category=' + esc(item._id) + '">' + esc(item.name) + '</a>')
    .join('');

  const daftarProduk = produk.status === 'fulfilled' ? produk.value.products : [];
  const wadah = document.getElementById('produkUnggulan');
  if (produk.status === 'rejected') {
    wadah.innerHTML = '<div class="empty-box" data-span="1"><h3>Produk gagal dimuat</h3><p>' + esc(produk.reason.message) + '</p></div>';
    return;
  }
  if (daftarProduk.length === 0) {
    wadah.innerHTML = '<div class="empty-box" data-span="1"><h3>Belum ada produk</h3><p>Produk akan tampil di sini setelah ditambahkan oleh admin.</p></div>';
    return;
  }
  wadah.innerHTML = daftarProduk.map(kartuProduk).join('');

  document.getElementById('heroTiles').innerHTML = daftarProduk
    .slice(0, 4)
    .map(
      (item) =>
        '<a class="hero-tile" href="/produk-detail?id=' + esc(item._id) + '"><div class="product-thumb">' + thumbProduk(item) + '</div>' +
        '<div class="hero-tile-info"><strong>' + esc(item.name) + '</strong><span>' + rupiah(item.price) + '</span></div></a>'
    )
    .join('');
}

pasangTombolKeranjang(document.getElementById('produkUnggulan'));
muatBeranda();
