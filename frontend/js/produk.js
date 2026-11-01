const kolomCari = document.getElementById('cari');
const wadahKategori = document.getElementById('chipKategori');
const wadahProduk = document.getElementById('daftarProduk');
let kategoriAktif = parameter('category') || '';

async function muatKategori() {
  try {
    const data = await api('/api/categories', { tanpaRedirect: true });
    const semua = [{ _id: '', name: 'Semua' }].concat(data.categories);
    wadahKategori.innerHTML = semua
      .map((item) => '<button type="button" class="chip' + (item._id === kategoriAktif ? ' active' : '') + '" data-kategori="' + esc(item._id) + '">' + esc(item.name) + '</button>')
      .join('');
  } catch (error) {
    wadahKategori.innerHTML = '';
  }
}

async function muatProduk() {
  wadahProduk.innerHTML = '<div class="loading" data-span="1"><div class="spinner"></div>Memuat produk...</div>';
  const query = new URLSearchParams();
  if (kategoriAktif) query.set('category', kategoriAktif);
  if (kolomCari.value.trim()) query.set('search', kolomCari.value.trim());
  try {
    const data = await api('/api/products?' + query.toString(), { tanpaRedirect: true });
    if (data.products.length === 0) {
      wadahProduk.innerHTML = '<div class="empty-box" data-span="1"><h3>Produk tidak ditemukan</h3><p>Coba kata kunci lain atau pilih kategori yang berbeda.</p></div>';
      return;
    }
    wadahProduk.innerHTML = data.products.map(kartuProduk).join('');
  } catch (error) {
    wadahProduk.innerHTML = '<div class="empty-box" data-span="1"><h3>Produk gagal dimuat</h3><p>' + esc(error.message) + '</p></div>';
  }
}

function simpanUrl() {
  const query = new URLSearchParams();
  if (kategoriAktif) query.set('category', kategoriAktif);
  if (kolomCari.value.trim()) query.set('search', kolomCari.value.trim());
  history.replaceState(null, '', '/produk' + (query.toString() ? '?' + query.toString() : ''));
}

wadahKategori.addEventListener('click', (event) => {
  const chip = event.target.closest('[data-kategori]');
  if (!chip) return;
  kategoriAktif = chip.dataset.kategori;
  wadahKategori.querySelectorAll('.chip').forEach((item) => item.classList.toggle('active', item === chip));
  simpanUrl();
  muatProduk();
});

kolomCari.value = parameter('search') || '';
kolomCari.addEventListener(
  'input',
  tundaKetik(() => {
    simpanUrl();
    muatProduk();
  }, 350)
);

pasangTombolKeranjang(wadahProduk);
muatKategori();
muatProduk();
