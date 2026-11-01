const tabelKategori = document.getElementById('tabelKategori');
const formKategori = document.getElementById('formKategori');
let daftar = [];

async function muatKategori() {
  try {
    const data = await api('/api/admin/categories');
    daftar = data.categories;
    if (daftar.length === 0) {
      tabelKategori.innerHTML = '<tr><td colspan="4" class="empty-box">Belum ada kategori. Klik "Tambah kategori".</td></tr>';
      return;
    }
    tabelKategori.innerHTML = daftar
      .map(
        (item) =>
          '<tr data-id="' + esc(item._id) + '"><td data-label="Nama"><strong>' + esc(item.name) + '</strong></td>' +
          '<td data-label="Deskripsi">' + esc(item.description || '-') + '</td>' +
          '<td data-label="Jumlah produk" class="text-right">' + item.productCount + '</td>' +
          '<td class="cell-actions"><button type="button" class="btn btn-outline btn-sm" data-aksi="ubah">Ubah</button> ' +
          '<button type="button" class="btn btn-danger-outline btn-sm" data-aksi="hapus">Hapus</button></td></tr>'
      )
      .join('');
  } catch (error) {
    tabelKategori.innerHTML = '<tr><td colspan="4" class="empty-box">' + esc(error.message) + '</td></tr>';
  }
}

function bukaForm(item) {
  bersihkanError(formKategori);
  formKategori.reset();
  formKategori.id.value = item ? item._id : '';
  document.getElementById('judulForm').textContent = item ? 'Ubah kategori' : 'Tambah kategori';
  if (item) {
    formKategori.name.value = item.name;
    formKategori.description.value = item.description || '';
  }
  bukaDialog('dialogKategori');
}

document.getElementById('tombolTambah').addEventListener('click', () => bukaForm(null));

formKategori.addEventListener('submit', async (event) => {
  event.preventDefault();
  bersihkanError(formKategori);
  const tombol = document.getElementById('simpanKategori');
  const id = formKategori.id.value;
  setLoading(tombol, true, 'Menyimpan...');
  try {
    await api(id ? '/api/admin/categories/' + id : '/api/admin/categories', {
      method: id ? 'PUT' : 'POST',
      body: { name: formKategori.name.value.trim(), description: formKategori.description.value.trim() }
    });
    tutupDialog('dialogKategori');
    toast(id ? 'Kategori berhasil diubah' : 'Kategori berhasil ditambahkan');
    muatKategori();
  } catch (error) {
    tampilkanError(formKategori, error);
  }
  setLoading(tombol, false);
});

tabelKategori.addEventListener('click', async (event) => {
  const tombol = event.target.closest('[data-aksi]');
  if (!tombol) return;
  const id = tombol.closest('tr').dataset.id;
  const item = daftar.find((data) => data._id === id);
  if (tombol.dataset.aksi === 'ubah') bukaForm(item);
  if (tombol.dataset.aksi === 'hapus') {
    if (!(await konfirmasi('Hapus kategori "' + item.name + '"?', 'Hapus kategori'))) return;
    try {
      await api('/api/admin/categories/' + id, { method: 'DELETE' });
      toast('Kategori berhasil dihapus');
      muatKategori();
    } catch (error) {
      toast(error.message, 'error');
    }
  }
});

muatKategori();
