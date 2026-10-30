import { store } from '../store.js';
import { hashPin } from '../auth.js';
import { formatDateTime, normalizePhone, isValidPin, uid, escapeHtml } from '../utils.js';
import { openModal, confirmModal, toast } from '../ui.js';

export function render(container) {
  let search = '';

  function refresh() {
    let customers = store.listUsers().filter(u => u.role === 'customer');
    if (search) {
      const q = search.toLowerCase();
      customers = customers.filter(c => c.name.toLowerCase().includes(q) || c.phone.includes(q));
    }

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Daftar Pelanggan</h1>
          <p class="subtitle">Registrasi pelanggan baru dengan nomor HP dan PIN untuk memesan makanan.</p>
        </div>
        <button id="add-customer-btn" class="btn btn-primary">
          + Daftarkan Pelanggan Baru
        </button>
      </div>

      <div class="card" style="margin-bottom: 1rem; padding: 0.85rem 1rem;">
        <input type="text" id="cust-search" class="input" placeholder="Cari berdasarkan nama atau no HP..." value="${escapeHtml(search)}" />
      </div>

      <div class="card" style="padding: 0;">
        ${customers.length === 0 ? `
          <p class="text-sm text-muted" style="text-align: center; padding: 2.5rem 1rem;">
            Belum ada pelanggan terdaftar. Daftarkan pelanggan menggunakan tombol di atas.
          </p>
        ` : `
          <div class="table-responsive" style="border: none;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Nama Pelanggan</th>
                  <th>Nomor HP</th>
                  <th>Status</th>
                  <th>Terdaftar</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${customers.map(c => `
                  <tr>
                    <td><strong>${escapeHtml(c.name)}</strong></td>
                    <td class="font-mono text-sm">${escapeHtml(c.phone)}</td>
                    <td>
                      <span class="badge ${c.active ? 'badge-selesai' : 'badge-dibatalkan'}">
                        ${c.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td class="text-xs text-muted">${formatDateTime(c.createdAt)}</td>
                    <td class="text-right">
                      <div class="flex-row" style="justify-content: flex-end;">
                        <button class="btn btn-ghost btn-sm edit-cust-btn" data-id="${c.id}">Edit</button>
                        <button class="btn btn-ghost btn-sm reset-pin-btn" data-id="${c.id}">Reset PIN</button>
                        <button class="btn btn-ghost btn-sm toggle-cust-btn" data-id="${c.id}">
                          ${c.active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                      </div>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    container.querySelector('#cust-search')?.addEventListener('input', (e) => {
      search = e.target.value;
      refresh();
    });

    container.querySelector('#add-customer-btn')?.addEventListener('click', () => {
      showAddCustomerModal();
    });

    container.querySelectorAll('.edit-cust-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const cust = store.findUserById(id);
        if (cust) showEditCustomerModal(cust);
      });
    });

    container.querySelectorAll('.reset-pin-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const cust = store.findUserById(id);
        if (cust) showResetPinModal(cust);
      });
    });

    container.querySelectorAll('.toggle-cust-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const cust = store.findUserById(id);
        if (!cust) return;
        store.updateCustomer(id, { active: !cust.active });
        toast(`Status ${cust.name} diubah`, 'info');
        refresh();
      });
    });
  }

  function showAddCustomerModal() {
    openModal({
      title: 'Daftarkan Pelanggan Baru',
      bodyHtml: `
        <form id="add-cust-form">
          <div class="form-group">
            <label for="new-cust-name">Nama Pelanggan</label>
            <input type="text" id="new-cust-name" class="input" placeholder="Misal: Bapak Rian" required />
          </div>

          <div class="form-group">
            <label for="new-cust-phone">Nomor HP</label>
            <input type="tel" id="new-cust-phone" class="input" placeholder="08123456789" required />
            <div class="form-hint">Format bebas (08... / 628...). Sistem akan otomatis memvalidasi.</div>
          </div>

          <div class="form-group">
            <label for="new-cust-pin">PIN Keamanan Pelanggan (6 Digit)</label>
            <input type="password" id="new-cust-pin" class="input font-mono" maxlength="6" inputmode="numeric" placeholder="6 angka, misal: 123456" required />
            <div class="form-hint">Berikan PIN ini kepada pelanggan untuk login mandiri.</div>
          </div>
        </form>
      `,
      footerHtml: `
        <button type="button" class="btn btn-ghost" id="add-cust-cancel">Batal</button>
        <button type="button" class="btn btn-primary" id="add-cust-submit">Daftarkan</button>
      `,
      onOpen: (dialog, close) => {
        dialog.querySelector('#add-cust-cancel').addEventListener('click', close);
        dialog.querySelector('#add-cust-submit').addEventListener('click', async () => {
          const name = dialog.querySelector('#new-cust-name').value.trim();
          const phone = dialog.querySelector('#new-cust-phone').value.trim();
          const pin = dialog.querySelector('#new-cust-pin').value.trim();

          const normPhone = normalizePhone(phone);
          if (!normPhone) {
            toast('Nomor HP tidak valid (minimal 10 digit)', 'error');
            return;
          }
          if (!isValidPin(pin)) {
            toast('PIN harus 6 digit angka', 'error');
            return;
          }

          try {
            const salt = uid();
            const pinHash = await hashPin(pin, salt);
            store.addCustomer({ name, phone: normPhone, pinHash, salt });
            toast(`Pelanggan "${name}" (${normPhone}) berhasil didaftarkan!`, 'success');
            close();
            refresh();
          } catch (err) {
            toast(err.message, 'error');
          }
        });
      }
    });
  }

  function showEditCustomerModal(cust) {
    openModal({
      title: 'Edit Data Pelanggan',
      bodyHtml: `
        <form id="edit-cust-form">
          <div class="form-group">
            <label for="edit-cust-name">Nama Pelanggan</label>
            <input type="text" id="edit-cust-name" class="input" value="${escapeHtml(cust.name)}" required />
          </div>

          <div class="form-group">
            <label for="edit-cust-phone">Nomor HP</label>
            <input type="tel" id="edit-cust-phone" class="input" value="${escapeHtml(cust.phone)}" required />
          </div>
        </form>
      `,
      footerHtml: `
        <button type="button" class="btn btn-ghost" id="edit-cust-cancel">Batal</button>
        <button type="button" class="btn btn-primary" id="edit-cust-save">Simpan Perubahan</button>
      `,
      onOpen: (dialog, close) => {
        dialog.querySelector('#edit-cust-cancel').addEventListener('click', close);
        dialog.querySelector('#edit-cust-save').addEventListener('click', () => {
          const name = dialog.querySelector('#edit-cust-name').value.trim();
          const phone = dialog.querySelector('#edit-cust-phone').value.trim();

          if (!name) {
            toast('Nama tidak boleh kosong', 'error');
            return;
          }
          const normPhone = normalizePhone(phone);
          if (!normPhone) {
            toast('Nomor HP tidak valid', 'error');
            return;
          }

          try {
            store.updateCustomer(cust.id, { name, phone: normPhone });
            toast('Data pelanggan berhasil diubah', 'success');
            close();
            refresh();
          } catch (err) {
            toast(err.message, 'error');
          }
        });
      }
    });
  }

  function showResetPinModal(cust) {
    openModal({
      title: `Reset PIN - ${cust.name}`,
      bodyHtml: `
        <form id="reset-pin-form">
          <div class="form-group">
            <label for="new-pin-input">PIN Baru (6 Digit)</label>
            <input type="password" id="new-pin-input" class="input font-mono" maxlength="6" inputmode="numeric" placeholder="6 angka baru" required autofocus />
          </div>
        </form>
      `,
      footerHtml: `
        <button type="button" class="btn btn-ghost" id="reset-cancel">Batal</button>
        <button type="button" class="btn btn-primary" id="reset-save">Simpan PIN Baru</button>
      `,
      onOpen: (dialog, close) => {
        dialog.querySelector('#reset-cancel').addEventListener('click', close);
        dialog.querySelector('#reset-save').addEventListener('click', async () => {
          const pin = dialog.querySelector('#new-pin-input').value.trim();
          if (!isValidPin(pin)) {
            toast('PIN harus 6 angka', 'error');
            return;
          }

          try {
            const salt = uid();
            const pinHash = await hashPin(pin, salt);
            store.updateCustomer(cust.id, { pinHash, salt });
            toast(`PIN pelanggan ${cust.name} berhasil diperbarui!`, 'success');
            close();
          } catch (err) {
            toast(err.message, 'error');
          }
        });
      }
    });
  }

  refresh();
}
