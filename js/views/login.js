import { login } from '../auth.js';
import { toast } from '../ui.js';

export function render(container) {
  container.innerHTML = `
    <div style="max-width: 400px; margin: 3rem auto;">
      <div class="card">
        <h1 style="font-size: 1.4rem;">Masuk Akun</h1>
        <p class="subtitle">Gunakan nomor HP dan PIN Anda untuk memesan atau mengelola pesanan.</p>

        <form id="login-form">
          <div class="form-group">
            <label for="login-phone">Nomor HP</label>
            <input type="tel" id="login-phone" class="input" placeholder="08123456789" required autofocus />
          </div>

          <div class="form-group">
            <label for="login-pin">PIN Keamanan (6 Digit)</label>
            <input type="password" id="login-pin" class="input font-mono" maxlength="6" inputmode="numeric" placeholder="6 angka" required />
          </div>

          <button type="submit" id="login-btn" class="btn btn-primary" style="width: 100%; margin-top: 0.5rem;">
            Masuk
          </button>
        </form>

        <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border); font-size: 0.8rem; color: var(--fg-muted);">
          <p><strong>Belum punya akun?</strong> Pendaftaran pelanggan dilakukan langsung oleh Admin. Silakan hubungi admin pengelola katering/kantin.</p>
        </div>
      </div>
    </div>
  `;

  const form = container.querySelector('#login-form');
  const btn = container.querySelector('#login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const phone = form.querySelector('#login-phone').value.trim();
    const pin = form.querySelector('#login-pin').value.trim();

    btn.disabled = true;
    btn.textContent = 'Memverifikasi...';

    try {
      const user = await login(phone, pin);
      toast(`Selamat datang, ${user.name}!`, 'success');
      if (user.role === 'admin') {
        window.location.hash = '#/admin';
      } else {
        window.location.hash = '#/order';
      }
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Masuk';
    }
  });
}
