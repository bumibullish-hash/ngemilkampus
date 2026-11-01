function tujuanSetelahMasuk(user) {
  const tujuan = parameter('next');
  if (tujuan && tujuan.startsWith('/') && !tujuan.startsWith('//')) {
    if (user.role === 'admin' && !tujuan.startsWith('/admin')) return '/admin';
    return tujuan;
  }
  return user.role === 'admin' ? '/admin' : '/';
}

async function sudahMasuk() {
  const user = await ambilUser();
  if (user) location.replace(tujuanSetelahMasuk(user));
}

function pasangForm(idForm, alamat, ambilData) {
  const form = document.getElementById(idForm);
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    bersihkanError(form);
    const tombol = form.querySelector('button[type="submit"]');
    setLoading(tombol, true);
    try {
      const data = await api(alamat, { method: 'POST', body: ambilData(form), tanpaRedirect: true });
      location.href = tujuanSetelahMasuk(data.user);
    } catch (error) {
      tampilkanError(form, error);
      setLoading(tombol, false);
    }
  });
}

pasangForm('formLogin', '/api/auth/login', (form) => ({
  email: form.email.value.trim(),
  password: form.password.value
}));

pasangForm('formRegister', '/api/auth/register', (form) => ({
  name: form.name.value.trim(),
  email: form.email.value.trim(),
  phone: form.phone.value.trim(),
  password: form.password.value
}));

const formRegister = document.getElementById('formRegister');
if (formRegister) {
  formRegister.addEventListener(
    'submit',
    (event) => {
      if (formRegister.password.value !== formRegister.konfirmasi.value) {
        event.preventDefault();
        event.stopImmediatePropagation();
        tampilkanError(formRegister, { message: 'Konfirmasi password tidak sama', errors: { konfirmasi: 'Konfirmasi password tidak sama' } });
      }
    },
    true
  );
}

sudahMasuk();
