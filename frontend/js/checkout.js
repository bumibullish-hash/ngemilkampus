const formCheckout = document.getElementById('formCheckout');

function waktuWib(tambahMenit) {
  return new Date(Date.now() + 7 * 3600 * 1000 + tambahMenit * 60 * 1000).toISOString().slice(0, 16);
}

async function muatCheckout() {
  try {
    const [keranjang, pengaturan] = await Promise.all([api('/api/cart'), api('/api/settings/public')]);
    if (keranjang.items.length === 0) {
      location.replace('/keranjang');
      return;
    }
    if (keranjang.items.some((item) => !item.stokCukup)) {
      toast('Ada produk yang stoknya tidak mencukupi', 'error');
      location.replace('/keranjang');
      return;
    }

    document.getElementById('daftarItem').innerHTML = keranjang.items
      .map((item) => '<div class="summary-row"><span>' + esc(item.product.name) + ' x' + item.quantity + '</span><span>' + rupiah(item.subtotal) + '</span></div>')
      .join('');
    document.getElementById('subtotalCheckout').textContent = rupiah(keranjang.total);
    document.getElementById('totalCheckout').textContent = rupiah(keranjang.total);

    document.getElementById('titikAmbil').innerHTML = pengaturan.setting.pickupPoints
      .map((titik) => '<option value="' + esc(titik) + '">' + esc(titik) + '</option>')
      .join('');
    document.getElementById('jamAmbil').textContent = pengaturan.setting.pickupHours ? 'Jam ambil: ' + pengaturan.setting.pickupHours : '';

    const kolomWaktu = document.getElementById('waktuAmbil');
    kolomWaktu.min = waktuWib(15);
    kolomWaktu.max = waktuWib(7 * 24 * 60);
    kolomWaktu.value = waktuWib(60);
    formCheckout.classList.remove('hidden');
    document.getElementById('memuatCheckout').classList.add('hidden');
  } catch (error) {
    document.getElementById('memuatCheckout').innerHTML = '<div class="empty-box"><h2>Checkout gagal dimuat</h2><p>' + esc(error.message) + '</p><a class="btn btn-primary" href="/keranjang">Kembali ke keranjang</a></div>';
  }
}

formCheckout.addEventListener('submit', async (event) => {
  event.preventDefault();
  bersihkanError(formCheckout);
  const tombol = document.getElementById('tombolBayar');
  setLoading(tombol, true, 'Membuat pembayaran...');
  try {
    const data = await api('/api/orders/checkout', {
      method: 'POST',
      body: {
        paymentMethod: formCheckout.paymentMethod.value,
        pickupPoint: formCheckout.pickupPoint.value,
        pickupTime: formCheckout.pickupTime.value,
        note: formCheckout.note.value.trim()
      }
    });
    location.href = '/pembayaran?id=' + data.orderId;
  } catch (error) {
    tampilkanError(formCheckout, error);
    setLoading(tombol, false);
  }
});

muatCheckout();
