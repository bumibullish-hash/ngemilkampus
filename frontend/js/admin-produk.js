const tabelProduk = document.getElementById('tabelProduk');
const formProduk = document.getElementById('formProduk');
const kolomCari = document.getElementById('cariProduk');
const filterKategori = document.getElementById('filterKategori');
let daftarKategori = [];
let daftarProduk = [];

async function muatKategori() {
  const data = await api('/api/admin/categories');
  daftarKategori = data.categories;
  const opsi = daftarKategori.map((item) => '<option value="' + esc(item._id) + '">' + esc(item.name) + '</option>').join('');
  filterKategori.innerHTML = '<option value="">Semua kategori</option>' + opsi;
  formProduk.category.innerHTML = '<option value="">Pilih kategori</option>' + opsi;
}

async function muatProduk() {
  tabelProduk.innerHTML = '<tr><td colspan="8" class="loading"><div class="spinner"></div>Memuat produk...</td></tr>';
  const query = new URLSearchParams();
  if (kolomCari.value.trim()) query.set('search', kolomCari.value.trim());
  if (filterKategori.value) query.set('category', filterKategori.value);
  try {
    const data = await api('/api/admin/products?' + query.toString());
    daftarProduk = data.products;
    if (daftarProduk.length === 0) {
      tabelProduk.innerHTML = '<tr><td colspan="8" class="empty-box">Belum ada produk. Klik "Tambah produk" untuk mulai.</td></tr>';
      return;
    }
    tabelProduk.innerHTML = daftarProduk
      .map(
        (produk) =>
          '<tr data-id="' + esc(produk._id) + '">' +
          '<td data-label="Foto"><div class="product-thumb mini">' + thumbProduk(produk, true) + '</div></td>' +
          '<td data-label="Nama"><strong>' + esc(produk.name) + '</strong></td>' +
          '<td data-label="Kategori">' + esc(produk.category ? produk.category.name : '-') + '</td>' +
          '<td data-label="Harga jual" class="text-right">' + rupiah(produk.price) + '</td>' +
          '<td data-label="Harga modal" class="text-right">' + rupiah(produk.costPrice) + '</td>' +
          '<td data-label="Stok" class="text-right">' + produk.stock + '</td>' +
          '<td data-label="Status">' + (produk.isActive ? '<span class="badge badge-paid">Aktif</span>' : '<span class="badge badge-expired">Nonaktif</span>') + '</td>' +
          '<td class="cell-actions"><button type="button" class="btn btn-outline btn-sm" data-aksi="ubah">Ubah</button> ' +
          '<button type="button" class="btn btn-outline btn-sm" data-aksi="toggle">' + (produk.isActive ? 'Nonaktifkan' : 'Aktifkan') + '</button> ' +
          '<button type="button" class="btn btn-danger-outline btn-sm" data-aksi="hapus">Hapus</button></td></tr>'
      )
      .join('');
  } catch (error) {
    tabelProduk.innerHTML = '<tr><td colspan="8" class="empty-box">' + esc(error.message) + '</td></tr>';
  }
}

function bukaForm(produk) {
  bersihkanError(formProduk);
  formProduk.reset();
  formProduk.id.value = produk ? produk._id : '';
  document.getElementById('judulForm').textContent = produk ? 'Ubah produk' : 'Tambah produk';
  document.getElementById('fotoSaatIni').textContent = '';
  if (produk) {
    formProduk.name.value = produk.name;
    formProduk.category.value = produk.category ? produk.category._id : '';
    formProduk.price.value = produk.price;
    formProduk.costPrice.value = produk.costPrice;
    formProduk.stock.value = produk.stock;
    formProduk.description.value = produk.description || '';
    formProduk.isActive.checked = produk.isActive;
    if (produk.image) document.getElementById('fotoSaatIni').textContent = 'Foto saat ini akan dipertahankan jika Anda tidak memilih foto baru.';
  } else {
    formProduk.isActive.checked = true;
    formProduk.stock.value = 0;
  }
  bukaDialog('dialogProduk');
}

document.getElementById('tombolTambah').addEventListener('click', () => {
  if (daftarKategori.length === 0) {
    toast('Buat kategori terlebih dahulu di menu Kategori', 'error');
    return;
  }
  bukaForm(null);
});

formProduk.addEventListener('submit', async (event) => {
  event.preventDefault();
  bersihkanError(formProduk);
  const tombol = document.getElementById('simpanProduk');
  const data = new FormData();
  ['name', 'category', 'price', 'costPrice', 'stock', 'description'].forEach((nama) => data.append(nama, formProduk[nama].value.trim()));
  data.append('isActive', formProduk.isActive.checked ? 'true' : 'false');
  if (formProduk.image.files[0]) data.append('image', formProduk.image.files[0]);
  const id = formProduk.id.value;
  setLoading(tombol, true, 'Menyimpan...');
  try {
    await api(id ? '/api/admin/products/' + id : '/api/admin/products', { method: id ? 'PUT' : 'POST', body: data });
    tutupDialog('dialogProduk');
    toast(id ? 'Produk berhasil diubah' : 'Produk berhasil ditambahkan');
    muatProduk();
  } catch (error) {
    tampilkanError(formProduk, error);
  }
  setLoading(tombol, false);
});

tabelProduk.addEventListener('click', async (event) => {
  const tombol = event.target.closest('[data-aksi]');
  if (!tombol) return;
  const id = tombol.closest('tr').dataset.id;
  const produk = daftarProduk.find((item) => item._id === id);
  if (tombol.dataset.aksi === 'ubah') bukaForm(produk);
  if (tombol.dataset.aksi === 'toggle') {
    try {
      await api('/api/admin/products/' + id + '/toggle', { method: 'PATCH' });
      toast('Status produk diperbarui');
      muatProduk();
    } catch (error) {
      toast(error.message, 'error');
    }
  }
  if (tombol.dataset.aksi === 'hapus') {
    if (!(await konfirmasi('Hapus produk "' + produk.name + '"? Riwayat transaksi lama tidak terpengaruh.', 'Hapus produk'))) return;
    try {
      await api('/api/admin/products/' + id, { method: 'DELETE' });
      toast('Produk berhasil dihapus');
      muatProduk();
    } catch (error) {
      toast(error.message, 'error');
    }
  }
});

kolomCari.addEventListener('input', tundaKetik(muatProduk, 350));
filterKategori.addEventListener('change', muatProduk);

muatKategori().then(muatProduk).catch((error) => toast(error.message, 'error'));
