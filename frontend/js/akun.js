async function muatAkun() {
  const user = await ambilUser();
  const formProfil = document.getElementById('formProfil');
  formProfil.name.value = user.name;
  formProfil.phone.value = user.phone || '';
  document.getElementById('emailAkun').textContent = user.email;

  try {
    const data = await api('/api/orders/summary');
    document.getElementById('statTotal').textContent = data.ringkasan.totalPesanan;
    document.getElementById('statMenunggu').textContent = data.ringkasan.menungguBayar;
    document.getElementById('statBerhasil').textContent = data.ringkasan.berhasil;
    document.getElementById('statBelanja').textContent = rupiah(data.ringkasan.totalBelanja);
    const wadah = document.getElementById('pesananTerbaru');
    if (data.terbaru.length === 0) {
      wadah.innerHTML = '<div class="empty-box"><p>Belum ada transaksi.</p><a class="btn btn-primary" href="/produk">Mulai belanja</a></div>';
      return;
    }
    wadah.innerHTML = data.terbaru
      .map((order) => '<a class="order-card" href="/transaksi?id=' + esc(order._id) + '"><div class="order-card-top"><strong>' + esc(order.invoiceNumber) + '</strong><div class="badges">' + badgeBayar(order.paymentStatus) + '</div></div><div class="muted">' + tanggal(order.createdAt) + ' WIB</div><strong>' + rupiah(order.total) + '</strong></a>')
      .join('');
  } catch (error) {
    document.getElementById('pesananTerbaru').innerHTML = '<p class="muted">' + esc(error.message) + '</p>';
  }
}

document.getElementById('formProfil').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  bersihkanError(form);
  const tombol = form.querySelector('button[type="submit"]');
  setLoading(tombol, true, 'Menyimpan...');
  try {
    await api('/api/auth/profile', { method: 'PUT', body: { name: form.name.value.trim(), phone: form.phone.value.trim() } });
    toast('Profil berhasil disimpan');
    location.reload();
  } catch (error) {
    tampilkanError(form, error);
    setLoading(tombol, false);
  }
});

document.getElementById('formPassword').addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.target;
  bersihkanError(form);
  if (form.newPassword.value !== form.konfirmasi.value) {
    tampilkanError(form, { message: 'Konfirmasi password tidak sama', errors: { konfirmasi: 'Konfirmasi password tidak sama' } });
    return;
  }
  const tombol = form.querySelector('button[type="submit"]');
  setLoading(tombol, true, 'Menyimpan...');
  try {
    await api('/api/auth/password', { method: 'PUT', body: { oldPassword: form.oldPassword.value, newPassword: form.newPassword.value } });
    toast('Password berhasil diubah');
    form.reset();
  } catch (error) {
    tampilkanError(form, error);
  }
  setLoading(tombol, false);
});

muatAkun();
