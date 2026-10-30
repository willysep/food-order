import { store } from '../store.js';
import { hashPin } from '../auth.js';
import { toast } from '../ui.js';
import { normalizePhone, isValidPin, uid } from '../utils.js';

export function render(container) {
  container.innerHTML = `
    <div style="max-width: 440px; margin: 2rem auto;">
      <div class="card">
        <h1 style="font-size: 1.4rem;">Setup Admin Pertama</h1>
        <p class="subtitle">Buat akun pengelola untuk memulai aplikasi pemesanan makanan.</p>

        <form id="setup-form">
          <div class="form-group">
            <label for="admin-name">Nama Admin</label>
            <input type="text" id="admin-name" class="input" placeholder="Misal: Bu Siti Admin" required autofocus />
          </div>

          <div class="form-group">
            <label for="admin-phone">Nomor HP</label>
            <input type="tel" id="admin-phone" class="input" placeholder="Contoh: 08123456789" required />
            <div class="form-hint">Digunakan untuk login ke sistem</div>
          </div>

          <div class="form-group">
            <label for="admin-pin">PIN Keamanan (6 Digit)</label>
            <input type="password" id="admin-pin" class="input font-mono" maxlength="6" inputmode="numeric" placeholder="6 angka, misal: 123456" required />
            <div class="form-hint">Hanya angka 6 digit</div>
          </div>

          <div class="form-group">
            <label for="admin-pin-confirm">Konfirmasi PIN</label>
            <input type="password" id="admin-pin-confirm" class="input font-mono" maxlength="6" inputmode="numeric" placeholder="Ulangi 6 angka PIN" required />
          </div>

          <button type="submit" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">
            Simpan & Masuk
          </button>
        </form>

        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dashed var(--border); text-align: center;">
          <p class="text-sm text-muted" style="margin-bottom: 0.5rem;">Hanya ingin mencoba demo?</p>
          <button type="button" id="seed-demo-btn" class="btn btn-ghost btn-sm">
            Muat Data Contoh / Demo
          </button>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#setup-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = form.querySelector('#admin-name').value.trim();
    const phone = form.querySelector('#admin-phone').value.trim();
    const pin = form.querySelector('#admin-pin').value.trim();
    const pinConfirm = form.querySelector('#admin-pin-confirm').value.trim();

    const normPhone = normalizePhone(phone);
    if (!normPhone) {
      toast('Format nomor HP tidak valid (minimal 10 digit, misal: 08123456789)', 'error');
      return;
    }
    if (!isValidPin(pin)) {
      toast('PIN harus berupa 6 angka', 'error');
      return;
    }
    if (pin !== pinConfirm) {
      toast('Konfirmasi PIN tidak cocok', 'error');
      return;
    }

    try {
      const salt = uid();
      const pinHash = await hashPin(pin, salt);
      store.addAdmin({ name, phone: normPhone, pinHash, salt });
      toast('Akun admin berhasil dibuat. Silakan login.', 'success');
      window.location.hash = '#/login';
    } catch (err) {
      toast(err.message, 'error');
    }
  });

  container.querySelector('#seed-demo-btn').addEventListener('click', async () => {
    try {
      await store.seedDemo(hashPin);
      toast('Data demo berhasil dimuat! Admin: 0811000001 (PIN: 123456)', 'success', 5000);
      window.location.hash = '#/login';
    } catch (err) {
      toast('Gagal memuat demo: ' + err.message, 'error');
    }
  });
}
