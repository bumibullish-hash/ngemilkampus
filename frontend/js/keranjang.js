const wadahKeranjang = document.getElementById('isiKeranjang');
const ringkasan = document.getElementById('ringkasanKeranjang');

function barisKeranjang(item) {
  const produk = item.product;
  return (
    '<div class="cart-item" data-id="' + esc(produk._id) + '">' +
    '<a class="product-thumb" href="/produk-detail?id=' + esc(produk._id) + '">' + thumbProduk(produk, true) + '</a>' +
    '<div><h3>' + esc(produk.name) + '</h3>' +
    '<div class="muted">' + rupiah(produk.price) + ' per item</div>' +
    (item.stokCukup ? '' : '<div class="field-error">Stok tersisa ' + produk.stock + '. Kurangi jumlah pesanan.</div>') + '</div>' +
    '<div class="cart-item-side"><strong>' + rupiah(item.subtotal) + '</strong>' +
    '<div class="flex gap center-y">' +
    '<div class="qty"><button type="button" data-aksi="kurang" aria-label="Kurangi jumlah">-</button>' +
    '<input type="number" min="1" max="' + Math.min(Math.max(produk.stock, 1), 99) + '" value="' + item.quantity + '" data-aksi="ubah" aria-label="Jumlah ' + esc(produk.name) + '">' +
    '<button type="button" data-aksi="tambah" aria-label="Tambah jumlah">+</button></div>' +
    '<button type="button" class="btn btn-danger-outline btn-sm" data-aksi="hapus">Hapus</button></div></div></div>'
  );
}

async function muatKeranjang() {
  try {
    const data = await api('/api/cart');
    if (data.items.length === 0) {
      wadahKeranjang.innerHTML = '<div class="empty-box"><h2>Keranjang masih kosong</h2><p>Pilih camilan atau minuman yang ingin dipesan.</p><a class="btn btn-primary" href="/produk">Lihat produk</a></div>';
      ringkasan.classList.add('hidden');
      return;
    }
    wadahKeranjang.innerHTML = data.items.map(barisKeranjang).join('');
    const adaMasalah = data.items.some((item) => !item.stokCukup);
    document.getElementById('jumlahItem').textContent = data.items.reduce((jumlah, item) => jumlah + item.quantity, 0);
    document.getElementById('totalKeranjang').textContent = rupiah(data.total);
    const tombol = document.getElementById('lanjutCheckout');
    tombol.classList.toggle('disabled', adaMasalah);
    tombol.setAttribute('aria-disabled', String(adaMasalah));
    tombol.dataset.blokir = adaMasalah ? '1' : '';
    ringkasan.classList.remove('hidden');
    perbaruiJumlahKeranjang();
  } catch (error) {
    wadahKeranjang.innerHTML = '<div class="empty-box"><h2>Keranjang gagal dimuat</h2><p>' + esc(error.message) + '</p></div>';
  }
}

async function ubahJumlah(id, jumlah) {
  try {
    await api('/api/cart/' + id, { method: 'PUT', body: { quantity: jumlah } });
  } catch (error) {
    toast(error.message, 'error');
  }
  muatKeranjang();
}

wadahKeranjang.addEventListener('click', async (event) => {
  const tombol = event.target.closest('[data-aksi]');
  if (!tombol) return;
  const baris = tombol.closest('.cart-item');
  const id = baris.dataset.id;
  const kolom = baris.querySelector('input');
  const aksi = tombol.dataset.aksi;
  if (aksi === 'tambah') ubahJumlah(id, Number(kolom.value) + 1);
  if (aksi === 'kurang') {
    if (Number(kolom.value) <= 1) return;
    ubahJumlah(id, Number(kolom.value) - 1);
  }
  if (aksi === 'hapus') {
    if (!(await konfirmasi('Hapus produk ini dari keranjang?', 'Hapus'))) return;
    try {
      await api('/api/cart/' + id, { method: 'DELETE' });
      toast('Produk dihapus dari keranjang');
    } catch (error) {
      toast(error.message, 'error');
    }
    muatKeranjang();
  }
});

wadahKeranjang.addEventListener('change', (event) => {
  if (event.target.dataset.aksi !== 'ubah') return;
  const jumlah = Math.floor(Number(event.target.value));
  if (!jumlah || jumlah < 1) {
    muatKeranjang();
    return;
  }
  ubahJumlah(event.target.closest('.cart-item').dataset.id, jumlah);
});

document.getElementById('lanjutCheckout').addEventListener('click', (event) => {
  if (event.currentTarget.dataset.blokir) {
    event.preventDefault();
    toast('Perbaiki jumlah pesanan yang melebihi stok terlebih dahulu', 'error');
  }
});

muatKeranjang();
