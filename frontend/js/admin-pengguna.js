const tabelPengguna = document.getElementById('tabelPengguna');

async function muatPengguna() {
  const cari = document.getElementById('cariPengguna').value.trim();
  try {
    const data = await api('/api/admin/users' + (cari ? '?search=' + encodeURIComponent(cari) : ''));
    if (data.users.length === 0) {
      tabelPengguna.innerHTML = '<tr><td colspan="7" class="empty-box">Pengguna tidak ditemukan.</td></tr>';
      return;
    }
    tabelPengguna.innerHTML = data.users
      .map(
        (user) =>
          '<tr><td data-label="Nama"><strong>' + esc(user.name) + '</strong></td><td data-label="Email">' + esc(user.email) + '</td>' +
          '<td data-label="Nomor HP">' + esc(user.phone || '-') + '</td>' +
          '<td data-label="Role"><span class="badge ' + (user.role === 'admin' ? 'badge-siap_diambil' : 'badge-diproses') + '">' + (user.role === 'admin' ? 'Admin' : 'User') + '</span></td>' +
          '<td data-label="Terdaftar">' + tanggalSaja(user.createdAt) + '</td>' +
          '<td data-label="Pesanan" class="text-right">' + user.jumlahPesanan + '</td>' +
          '<td data-label="Total belanja" class="text-right">' + rupiah(user.totalBelanja) + '</td></tr>'
      )
      .join('');
  } catch (error) {
    tabelPengguna.innerHTML = '<tr><td colspan="7" class="empty-box">' + esc(error.message) + '</td></tr>';
  }
}

document.getElementById('cariPengguna').addEventListener('input', tundaKetik(muatPengguna, 350));
muatPengguna();
