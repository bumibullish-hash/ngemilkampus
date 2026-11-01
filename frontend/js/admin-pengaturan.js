const formUsaha = document.getElementById('formUsaha');

async function muatPengaturan() {
  try {
    const data = await api('/api/admin/settings');
    const s = data.setting;
    formUsaha.businessName.value = s.businessName;
    formUsaha.tagline.value = s.tagline || '';
    formUsaha.address.value = s.address || '';
    formUsaha.phone.value = s.phone || '';
    formUsaha.email.value = s.email || '';
    formUsaha.pickupHours.value = s.pickupHours || '';
    formUsaha.pickupPoints.value = s.pickupPoints.join('\n');
  } catch (error) {
    toast(error.message, 'error');
  }
}

formUsaha.addEventListener('submit', async (event) => {
  event.preventDefault();
  bersihkanError(formUsaha);
  const tombol = formUsaha.querySelector('button[type="submit"]');
  setLoading(tombol, true, 'Menyimpan...');
  try {
    await api('/api/admin/settings', {
      method: 'PUT',
      body: {
        businessName: formUsaha.businessName.value.trim(),
        tagline: formUsaha.tagline.value.trim(),
        address: formUsaha.address.value.trim(),
        phone: formUsaha.phone.value.trim(),
        email: formUsaha.email.value.trim(),
        pickupHours: formUsaha.pickupHours.value.trim(),
        pickupPoints: formUsaha.pickupPoints.value.split('\n').map((item) => item.trim()).filter(Boolean)
      }
    });
    toast('Informasi usaha berhasil disimpan');
  } catch (error) {
    tampilkanError(formUsaha, error);
  }
  setLoading(tombol, false);
});

muatPengaturan();
