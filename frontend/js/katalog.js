function kartuProduk(produk) {
  const habis = produk.stock <= 0;
  const kategori = produk.category ? produk.category.name : '';
  return (
    '<article class="product-card">' +
    '<a class="product-thumb" href="/produk-detail?id=' + esc(produk._id) + '" aria-label="' + esc(produk.name) + '">' + thumbProduk(produk) + '</a>' +
    '<div class="product-info">' +
    '<span class="product-cat">' + esc(kategori) + '</span>' +
    '<a class="product-name" href="/produk-detail?id=' + esc(produk._id) + '">' + esc(produk.name) + '</a>' +
    '<span class="product-price">' + rupiah(produk.price) + '</span>' +
    infoStok(produk.stock) +
    '</div>' +
    '<div class="product-actions"><button type="button" class="btn btn-primary btn-sm btn-block" data-tambah="' + esc(produk._id) + '"' + (habis ? ' disabled' : '') + '>' +
    (habis ? 'Stok habis' : 'Tambah ke keranjang') + '</button></div>' +
    '</article>'
  );
}

async function tambahKeKeranjang(idProduk, jumlah) {
  const user = await ambilUser();
  if (!user) {
    location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search);
    return false;
  }
  if (user.role === 'admin') {
    toast('Akun admin tidak dapat berbelanja. Gunakan akun user.', 'error');
    return false;
  }
  try {
    const data = await api('/api/cart', { method: 'POST', body: { productId: idProduk, quantity: jumlah || 1 } });
    toast(data.message);
    perbaruiJumlahKeranjang();
    return true;
  } catch (error) {
    toast(error.message, 'error');
    return false;
  }
}

function pasangTombolKeranjang(wadah) {
  wadah.addEventListener('click', async (event) => {
    const tombol = event.target.closest('[data-tambah]');
    if (!tombol) return;
    tombol.disabled = true;
    await tambahKeKeranjang(tombol.dataset.tambah, 1);
    tombol.disabled = false;
  });
}
