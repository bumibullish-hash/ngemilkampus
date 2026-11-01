const tabelPengeluaran = document.getElementById('tabelPengeluaran');
const formPengeluaran = document.getElementById('formPengeluaran');
const formFilter = document.getElementById('formFilter');
let daftar = [];

async function muatPengeluaran() {
  const query = new URLSearchParams();
  if (formFilter.from.value) query.set('from', formFilter.from.value);
  if (formFilter.to.value) query.set('to', formFilter.to.value);
  try {
    const data = await api('/api/admin/expenses?' + query.toString());
    daftar = data.expenses;
    document.getElementById('totalPengeluaran').textContent = rupiah(data.total);
    if (daftar.length === 0) {
      tabelPengeluaran.innerHTML = '<tr><td colspan="5" class="empty-box">Belum ada pengeluaran. Catat biaya operasional agar laba bersih dihitung dengan benar.</td></tr>';
      return;
    }
    tabelPengeluaran.innerHTML = daftar
      .map(
        (item) =>
          '<tr data-id="' + esc(item._id) + '"><td data-label="Tanggal">' + tanggalSaja(item.date) + '</td>' +
          '<td data-label="Keterangan"><strong>' + esc(item.title) + '</strong>' + (item.note ? '<div class="muted">' + esc(item.note) + '</div>' : '') + '</td>' +
          '<td data-label="Kategori">' + esc(item.category) + '</td>' +
          '<td data-label="Jumlah" class="text-right">' + rupiah(item.amount) + '</td>' +
          '<td class="cell-actions"><button type="button" class="btn btn-outline btn-sm" data-aksi="ubah">Ubah</button> ' +
          '<button type="button" class="btn btn-danger-outline btn-sm" data-aksi="hapus">Hapus</button></td></tr>'
      )
      .join('');
  } catch (error) {
    tabelPengeluaran.innerHTML = '<tr><td colspan="5" class="empty-box">' + esc(error.message) + '</td></tr>';
  }
}

function bukaForm(item) {
  bersihkanError(formPengeluaran);
  formPengeluaran.reset();
  formPengeluaran.id.value = item ? item._id : '';
  document.getElementById('judulForm').textContent = item ? 'Ubah pengeluaran' : 'Tambah pengeluaran';
  if (item) {
    formPengeluaran.title.value = item.title;
    formPengeluaran.category.value = item.category;
    formPengeluaran.amount.value = item.amount;
    formPengeluaran.date.value = tanggalInput(item.date);
    formPengeluaran.note.value = item.note || '';
  } else {
    formPengeluaran.date.value = tanggalInput(new Date());
  }
  bukaDialog('dialogPengeluaran');
}

document.getElementById('tombolTambah').addEventListener('click', () => bukaForm(null));

formPengeluaran.addEventListener('submit', async (event) => {
  event.preventDefault();
  bersihkanError(formPengeluaran);
  const tombol = document.getElementById('simpanPengeluaran');
  const id = formPengeluaran.id.value;
  setLoading(tombol, true, 'Menyimpan...');
  try {
    await api(id ? '/api/admin/expenses/' + id : '/api/admin/expenses', {
      method: id ? 'PUT' : 'POST',
      body: {
        title: formPengeluaran.title.value.trim(),
        category: formPengeluaran.category.value,
        amount: formPengeluaran.amount.value,
        date: formPengeluaran.date.value,
        note: formPengeluaran.note.value.trim()
      }
    });
    tutupDialog('dialogPengeluaran');
    toast(id ? 'Pengeluaran berhasil diubah' : 'Pengeluaran berhasil dicatat');
    muatPengeluaran();
  } catch (error) {
    tampilkanError(formPengeluaran, error);
  }
  setLoading(tombol, false);
});

tabelPengeluaran.addEventListener('click', async (event) => {
  const tombol = event.target.closest('[data-aksi]');
  if (!tombol) return;
  const id = tombol.closest('tr').dataset.id;
  const item = daftar.find((data) => data._id === id);
  if (tombol.dataset.aksi === 'ubah') bukaForm(item);
  if (tombol.dataset.aksi === 'hapus') {
    if (!(await konfirmasi('Hapus pengeluaran "' + item.title + '"?', 'Hapus'))) return;
    try {
      await api('/api/admin/expenses/' + id, { method: 'DELETE' });
      toast('Pengeluaran berhasil dihapus');
      muatPengeluaran();
    } catch (error) {
      toast(error.message, 'error');
    }
  }
});

formFilter.addEventListener('submit', (event) => {
  event.preventDefault();
  muatPengeluaran();
});
document.getElementById('resetFilter').addEventListener('click', () => {
  formFilter.reset();
  muatPengeluaran();
});

muatPengeluaran();
