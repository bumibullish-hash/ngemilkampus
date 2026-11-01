const wadahDetail = document.getElementById('detailProduk');

async function muatDetail() {
  const id = parameter('id');
  if (!id) {
    wadahDetail.innerHTML = '<div class="empty-box"><h2>Produk tidak ditemukan</h2><a class="btn btn-primary" href="/produk">Lihat semua produk</a></div>';
    return;
  }
  try {
    const data = await api('/api/products/' + encodeURIComponent(id), { tanpaRedirect: true });
    const produk = data.product;
    document.title = produk.name + ' - NgemilKampus';
    const habis = produk.stock <= 0;
    wadahDetail.innerHTML =
      '<div class="product-thumb">' + thumbProduk(produk) + '</div>' +
      '<div>' +
      '<p class="muted mb-half">' + esc(produk.category ? produk.category.name : '') + '</p>' +
      '<h1>' + esc(produk.name) + '</h1>' +
      '<p class="price">' + rupiah(produk.price) + '</p>' +
      '<p>' + infoStok(produk.stock) + '</p>' +
      '<p>' + esc(produk.description || 'Belum ada deskripsi untuk produk ini.') + '</p>' +
      '<div class="flex gap mt-2 center-y">' +
      '<div class="qty"><button type="button" id="kurang" aria-label="Kurangi jumlah">-</button>' +
      '<input id="jumlah" type="number" min="1" max="' + Math.max(produk.stock, 1) + '" value="1" aria-label="Jumlah"' + (habis ? ' disabled' : '') + '>' +
      '<button type="button" id="tambah" aria-label="Tambah jumlah">+</button></div>' +
      '<button type="button" class="btn btn-primary" id="tombolKeranjang"' + (habis ? ' disabled' : '') + '>' + (habis ? 'Stok habis' : 'Tambah ke keranjang') + '</button>' +
      '</div></div>';

    const kolom = document.getElementById('jumlah');
    const batas = produk.stock;
    document.getElementById('kurang').addEventListener('click', () => {
      kolom.value = Math.max(1, Number(kolom.value) - 1);
    });
    document.getElementById('tambah').addEventListener('click', () => {
      kolom.value = Math.min(batas, Number(kolom.value) + 1);
    });
    document.getElementById('tombolKeranjang').addEventListener('click', async (event) => {
      const jumlah = Math.floor(Number(kolom.value));
      if (!jumlah || jumlah < 1 || jumlah > batas) {
        toast('Jumlah harus antara 1 dan ' + batas, 'error');
        return;
      }
      event.target.disabled = true;
      await tambahKeKeranjang(produk._id, jumlah);
      event.target.disabled = false;
    });
  } catch (error) {
    wadahDetail.innerHTML = '<div class="empty-box" data-span="1"><h2>Produk tidak ditemukan</h2><p>' + esc(error.message) + '</p><a class="btn btn-primary" href="/produk">Lihat semua produk</a></div>';
  }
}

muatDetail();
