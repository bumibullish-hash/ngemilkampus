const LABEL_BAYAR = { pending: 'Pending', paid: 'Paid', rejected: 'Rejected', expired: 'Expired' };
const LABEL_PESANAN = {
  menunggu_pembayaran: 'Menunggu pembayaran',
  diproses: 'Diproses',
  siap_diambil: 'Siap diambil',
  selesai: 'Selesai',
  dibatalkan: 'Dibatalkan'
};
const LABEL_METODE = { qris: 'QRIS', link: 'Payment Link' };

function esc(teks) {
  const peta = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(teks === undefined || teks === null ? '' : teks).replace(/[&<>"']/g, (huruf) => peta[huruf]);
}

function rupiah(angka) {
  return 'Rp ' + Number(angka || 0).toLocaleString('id-ID');
}

function tanggal(waktu) {
  if (!waktu) return '-';
  return new Date(waktu).toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function tanggalSaja(waktu) {
  if (!waktu) return '-';
  return new Date(waktu).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function tanggalInput(waktu) {
  return new Date(new Date(waktu).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function labelKunci(kunci) {
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const bagian = kunci.split('-');
  if (bagian.length === 2) return bulan[Number(bagian[1]) - 1] + ' ' + bagian[0];
  return Number(bagian[2]) + ' ' + bulan[Number(bagian[1]) - 1];
}

function badgeBayar(status) {
  return '<span class="badge badge-' + esc(status) + '">' + esc(LABEL_BAYAR[status] || status) + '</span>';
}

function badgePesanan(status) {
  return '<span class="badge badge-' + esc(status) + '">' + esc(LABEL_PESANAN[status] || status) + '</span>';
}

function warnaThumb(namaKategori) {
  const tetap = { camilan: 0, minuman: 1, 'paket hemat': 2 };
  const kunci = String(namaKategori || '').trim().toLowerCase();
  if (kunci in tetap) return tetap[kunci];
  let hitung = 0;
  for (const huruf of kunci) hitung = (hitung * 31 + huruf.charCodeAt(0)) % 97;
  return 3 + (hitung % 3);
}

function htmlPlaceholder(namaAsli, namaKategori, kecil) {
  const nama = String(namaAsli || '?').replace(/\s*\(.*\)\s*$/, '').trim();
  const teks = kecil ? nama.slice(0, 2).toUpperCase() : nama;
  return (
    '<div class="thumb-placeholder thumb-c' + warnaThumb(namaKategori) + (kecil ? ' kecil' : '') + '" role="img" aria-label="' + esc(namaAsli) + '">' +
    '<span>' + esc(teks) + '</span></div>'
  );
}

function thumbProduk(produk, kecil) {
  const kategori = produk.category && produk.category.name ? produk.category.name : '';
  if (produk.image) {
    return (
      '<img src="' + esc(produk.image) + '" alt="' + esc(produk.name) + '" loading="lazy"' +
      ' data-nama="' + esc(produk.name) + '" data-kategori="' + esc(kategori) + '" data-kecil="' + (kecil ? '1' : '0') + '">'
    );
  }
  return htmlPlaceholder(produk.name, kategori, kecil);
}

document.addEventListener(
  'error',
  (event) => {
    const gambar = event.target;
    if (!gambar || gambar.tagName !== 'IMG' || gambar.dataset.nama === undefined) return;
    const wadah = document.createElement('div');
    wadah.innerHTML = htmlPlaceholder(gambar.dataset.nama, gambar.dataset.kategori, gambar.dataset.kecil === '1');
    gambar.replaceWith(wadah.firstChild);
  },
  true
);

function infoStok(stok) {
  if (stok <= 0) return '<span class="product-stock out">Stok habis</span>';
  if (stok <= 5) return '<span class="product-stock low">Sisa ' + stok + '</span>';
  return '<span class="product-stock">Stok ' + stok + '</span>';
}

async function api(alamat, opsi = {}) {
  const pengaturan = { method: opsi.method || 'GET', headers: {}, credentials: 'same-origin' };
  if (opsi.body instanceof FormData) {
    pengaturan.body = opsi.body;
  } else if (opsi.body !== undefined) {
    pengaturan.headers['Content-Type'] = 'application/json';
    pengaturan.body = JSON.stringify(opsi.body);
  }

  let respons;
  try {
    respons = await fetch(alamat, pengaturan);
  } catch (error) {
    throw new Error('Tidak dapat terhubung ke server. Pastikan aplikasi masih berjalan.');
  }

  let data = {};
  try {
    data = await respons.json();
  } catch (error) {
    data = {};
  }

  if (!respons.ok) {
    if (respons.status === 401 && !opsi.tanpaRedirect) {
      location.href = '/login?next=' + encodeURIComponent(location.pathname + location.search);
    }
    const error = new Error(data.message || 'Terjadi kesalahan, silakan coba lagi');
    error.errors = data.errors || {};
    error.status = respons.status;
    throw error;
  }
  return data;
}

function toast(pesan, tipe) {
  let wadah = document.getElementById('toastWrap');
  if (!wadah) {
    wadah = document.createElement('div');
    wadah.id = 'toastWrap';
    wadah.className = 'toast-wrap';
    wadah.setAttribute('role', 'status');
    wadah.setAttribute('aria-live', 'polite');
    document.body.appendChild(wadah);
  }
  const item = document.createElement('div');
  item.className = 'toast toast-' + (tipe || 'success');
  item.textContent = pesan;
  wadah.appendChild(item);
  setTimeout(() => item.remove(), 4000);
}

function konfirmasi(pesan, labelYa) {
  return new Promise((selesai) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'modal';
    dialog.innerHTML =
      '<div class="modal-head"><h3>Konfirmasi</h3></div>' +
      '<div class="modal-body"><p></p></div>' +
      '<div class="modal-actions"><button type="button" class="btn btn-outline" data-ya="0">Batal</button>' +
      '<button type="button" class="btn btn-danger" data-ya="1"></button></div>';
    dialog.querySelector('p').textContent = pesan;
    dialog.querySelector('[data-ya="1"]').textContent = labelYa || 'Ya, lanjutkan';
    document.body.appendChild(dialog);
    dialog.addEventListener('click', (event) => {
      const tombol = event.target.closest('[data-ya]');
      if (!tombol) return;
      dialog.close();
      dialog.remove();
      selesai(tombol.dataset.ya === '1');
    });
    dialog.addEventListener('cancel', () => {
      dialog.remove();
      selesai(false);
    });
    dialog.showModal();
  });
}

function bersihkanError(form) {
  form.querySelectorAll('.field-error').forEach((item) => item.remove());
  form.querySelectorAll('.invalid').forEach((item) => item.classList.remove('invalid'));
  const alert = form.querySelector('.form-alert');
  if (alert) alert.classList.add('hidden');
}

function tampilkanError(form, error) {
  bersihkanError(form);
  let ada = false;
  Object.keys(error.errors || {}).forEach((nama) => {
    const kolom = form.querySelector('[name="' + nama + '"]');
    if (!kolom) return;
    ada = true;
    kolom.classList.add('invalid');
    const pesan = document.createElement('p');
    pesan.className = 'field-error';
    pesan.textContent = error.errors[nama];
    const pembungkus = kolom.closest('.field') || kolom.parentElement;
    pembungkus.appendChild(pesan);
  });
  const alert = form.querySelector('.form-alert');
  if (alert && !ada) {
    alert.textContent = error.message;
    alert.classList.remove('hidden');
  } else if (!alert && !ada) {
    toast(error.message, 'error');
  }
}

function setLoading(tombol, sedangProses, teks) {
  if (sedangProses) {
    tombol.dataset.teksAsal = tombol.textContent;
    tombol.disabled = true;
    tombol.textContent = teks || 'Memproses...';
  } else {
    tombol.disabled = false;
    tombol.textContent = tombol.dataset.teksAsal || tombol.textContent;
  }
}

function tundaKetik(fungsi, jeda) {
  let pewaktu;
  return (...argumen) => {
    clearTimeout(pewaktu);
    pewaktu = setTimeout(() => fungsi(...argumen), jeda || 300);
  };
}

function parameter(nama) {
  return new URLSearchParams(location.search).get(nama);
}

let promiseUser;
function ambilUser() {
  if (!promiseUser) {
    promiseUser = api('/api/auth/me', { tanpaRedirect: true })
      .then((data) => data.user)
      .catch(() => null);
  }
  return promiseUser;
}

async function keluar() {
  try {
    await api('/api/auth/logout', { method: 'POST', tanpaRedirect: true });
  } catch (error) {
    toast(error.message, 'error');
    return;
  }
  location.href = '/login';
}

async function bangunHeader() {
  const wadah = document.getElementById('siteHeader');
  if (!wadah) return;
  const aktif = document.body.dataset.nav || '';
  const user = await ambilUser();

  let menu = '<a href="/produk" class="' + (aktif === 'produk' ? 'active' : '') + '">Produk</a>';
  let tambahan = '';
  let aksi = '';
  if (!user) {
    aksi = '<a class="btn btn-ghost btn-sm hide-mobile" href="/login">Masuk</a><a class="btn btn-primary btn-sm hide-mobile" href="/register">Daftar</a>';
    tambahan = '<a class="btn btn-outline" href="/login">Masuk</a><a class="btn btn-primary" href="/register">Daftar</a>';
  } else if (user.role === 'admin') {
    menu += '<a href="/admin">Dashboard admin</a>';
    aksi = '<button type="button" class="btn btn-outline btn-sm hide-mobile" data-keluar>Keluar</button>';
    tambahan = '<button type="button" class="btn btn-outline" data-keluar>Keluar</button>';
  } else {
    menu += '<a href="/riwayat" class="' + (aktif === 'riwayat' ? 'active' : '') + '">Riwayat</a>';
    menu += '<a href="/akun" class="' + (aktif === 'akun' ? 'active' : '') + '">Akun saya</a>';
    aksi =
      '<a class="btn btn-outline btn-sm cart-link" href="/keranjang" aria-label="Keranjang">Keranjang <span class="count-badge hidden" id="cartCount">0</span></a>' +
      '<span class="user-name">' + esc(user.name) + '</span>' +
      '<button type="button" class="btn btn-ghost btn-sm hide-mobile" data-keluar>Keluar</button>';
    tambahan = '<button type="button" class="btn btn-outline" data-keluar>Keluar</button>';
  }

  wadah.className = 'site-header';
  wadah.innerHTML =
    '<div class="container header-inner">' +
    '<a class="logo" href="/">Ngemil<span>Kampus</span></a>' +
    '<nav class="nav" id="navMenu">' + menu + '<div class="nav-extra">' + tambahan + '</div></nav>' +
    '<div class="header-actions">' + aksi + '</div>' +
    '<button type="button" class="btn btn-outline btn-sm nav-toggle" id="navToggle" aria-label="Buka menu" aria-expanded="false">Menu</button>' +
    '</div>';

  const toggle = document.getElementById('navToggle');
  toggle.addEventListener('click', () => {
    const terbuka = document.getElementById('navMenu').classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(terbuka));
  });
  wadah.querySelectorAll('[data-keluar]').forEach((tombol) => tombol.addEventListener('click', keluar));

  if (user && user.role === 'user') perbaruiJumlahKeranjang();
}

async function perbaruiJumlahKeranjang() {
  const lencana = document.getElementById('cartCount');
  if (!lencana) return;
  try {
    const data = await api('/api/cart/count', { tanpaRedirect: true });
    lencana.textContent = data.count;
    lencana.classList.toggle('hidden', data.count === 0);
  } catch (error) {
    lencana.classList.add('hidden');
  }
}

async function bangunFooter() {
  const wadah = document.getElementById('siteFooter');
  if (!wadah) return;
  let usaha = { businessName: 'NgemilKampus', address: '', phone: '', pickupHours: '' };
  try {
    const data = await api('/api/settings/public', { tanpaRedirect: true });
    usaha = data.setting;
  } catch (error) {
    usaha = { businessName: 'NgemilKampus', address: '', phone: '', pickupHours: '' };
  }
  const kontak = [usaha.address, usaha.phone].filter(Boolean).map(esc).join(' | ');
  wadah.className = 'site-footer';
  wadah.innerHTML =
    '<div class="container footer-inner"><div><strong>' + esc(usaha.businessName) + '</strong><br>' +
    (kontak ? kontak + '<br>' : '') + esc(usaha.pickupHours) + '</div>' +
    '<div>Pembayaran QRIS melalui Bayaraja</div></div>';
}

async function bangunSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;
  const aktif = document.body.dataset.admin;
  const user = await ambilUser();
  const daftar = [
    ['dashboard', '/admin', 'Dashboard'],
    ['produk', '/admin/produk', 'Produk'],
    ['kategori', '/admin/kategori', 'Kategori'],
    ['transaksi', '/admin/transaksi', 'Transaksi'],
    ['pengguna', '/admin/pengguna', 'Pengguna'],
    ['pengeluaran', '/admin/pengeluaran', 'Pengeluaran'],
    ['grup', '', 'Laporan'],
    ['laporan-penjualan', '/admin/laporan-penjualan', 'Laporan penjualan'],
    ['laporan-keuangan', '/admin/laporan-keuangan', 'Laporan keuangan'],
    ['grup', '', 'Usaha'],
    ['pengaturan', '/admin/pengaturan', 'Pengaturan usaha']
  ];
  const tautan = daftar
    .map((item) =>
      item[0] === 'grup'
        ? '<div class="sidebar-group">' + item[2] + '</div>'
        : '<a href="' + item[1] + '" class="' + (item[0] === aktif ? 'active' : '') + '"' + (item[0] === aktif ? ' aria-current="page"' : '') + '>' + item[2] + '</a>'
    )
    .join('');

  sidebar.innerHTML =
    '<div class="sidebar-brand"><a class="logo" href="/admin">Ngemil<span>Kampus</span></a><small>Panel admin</small></div>' +
    '<nav class="sidebar-nav">' + tautan + '</nav>' +
    '<div class="sidebar-foot"><div class="who"><strong>' + esc(user ? user.name : '') + '</strong>' + esc(user ? user.email : '') + '</div>' +
    '<a class="btn btn-ghost btn-sm" href="/">Lihat toko</a>' +
    '<button type="button" class="btn btn-ghost btn-sm" data-keluar>Keluar</button></div>';
  sidebar.querySelector('[data-keluar]').addEventListener('click', keluar);

  const tombolMenu = document.getElementById('menuBtn');
  if (tombolMenu) {
    tombolMenu.innerHTML = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14"/></svg>';
    tombolMenu.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
  }
  const lapisan = document.getElementById('sidebarOverlay');
  if (lapisan) lapisan.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
}

function gambarGrafik(idCanvas, grafik, labelData) {
  const kanvas = document.getElementById(idCanvas);
  if (!kanvas || typeof Chart === 'undefined') return;
  if (kanvas.grafik) kanvas.grafik.destroy();
  kanvas.grafik = new Chart(kanvas, {
    type: 'bar',
    data: {
      labels: grafik.map((baris) => labelKunci(baris.key)),
      datasets: [
        {
          label: labelData || 'Omzet',
          data: grafik.map((baris) => baris.omzet),
          backgroundColor: '#f97316',
          borderRadius: 4,
          maxBarThickness: 36
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (konteks) => rupiah(konteks.parsed.y) + ' (' + grafik[konteks.dataIndex].transaksi + ' transaksi)'
          }
        }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: (nilai) => (nilai >= 1000 ? nilai / 1000 + 'rb' : nilai) } },
        x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } }
      }
    }
  });
}

function bukaDialog(id) {
  const dialog = document.getElementById(id);
  dialog.showModal();
  return dialog;
}

function tutupDialog(id) {
  document.getElementById(id).close();
}

document.addEventListener('click', (event) => {
  const tutup = event.target.closest('[data-tutup]');
  if (tutup) {
    const dialog = tutup.closest('dialog');
    if (dialog) dialog.close();
  }
});

document.addEventListener('DOMContentLoaded', () => {
  bangunHeader();
  bangunFooter();
  bangunSidebar();
});
