import { store } from '../store.js';
import { formatRupiah, escapeHtml, getFoodImageUrl, DEFAULT_FOOD_IMAGE } from '../utils.js';
import { openModal, confirmModal, toast } from '../ui.js';

export function render(container) {
  function refresh() {
    const foods = store.listFoods(true);

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Master Menu Makanan</h1>
          <p class="subtitle">Daftar masakan atau minuman yang ditawarkan oleh katering.</p>
        </div>
        <button id="add-food-btn" class="btn btn-primary">
          + Tambah Menu Baru
        </button>
      </div>

      <div class="card" style="padding: 0;">
        ${foods.length === 0 ? `
          <p class="text-sm text-muted" style="text-align: center; padding: 2.5rem 1rem;">
            Belum ada menu makanan. Klik tombol '+ Tambah Menu Baru' di atas.
          </p>
        ` : `
          <div class="table-responsive" style="border: none;">
            <table class="data-table">
              <thead>
                <tr>
                  <th style="width: 70px;">Foto</th>
                  <th>Nama Makanan</th>
                  <th>Deskripsi</th>
                  <th>Harga Satuan</th>
                  <th>Status</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${foods.map(f => {
                  const img = getFoodImageUrl(f);
                  return `
                  <tr>
                    <td data-label="Foto">
                      <img src="${escapeHtml(img)}" alt="${escapeHtml(f.name)}" onerror="this.onerror=null;this.src='${DEFAULT_FOOD_IMAGE}';" style="width: 52px; height: 52px; border-radius: var(--radius-sm); object-fit: cover; border: 1px solid var(--border);" />
                    </td>
                    <td data-label="Nama Menu"><strong>${escapeHtml(f.name)}</strong></td>
                    <td data-label="Deskripsi" class="text-sm text-muted">${escapeHtml(f.description || '-')}</td>
                    <td data-label="Harga"><strong>${formatRupiah(f.price)}</strong></td>
                    <td data-label="Status">
                      <span class="badge ${f.active ? 'badge-selesai' : 'badge-dibatalkan'}">
                        ${f.active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td data-label="Aksi" class="text-right">
                      <div class="flex-row" style="justify-content: flex-end;">
                        <button class="btn btn-ghost btn-sm edit-food-btn" data-id="${f.id}">Edit</button>
                        <button class="btn btn-ghost btn-sm toggle-food-btn" data-id="${f.id}">
                          ${f.active ? 'Nonaktifkan' : 'Aktifkan'}
                        </button>
                        <button class="btn btn-danger btn-sm delete-food-btn" data-id="${f.id}">Hapus</button>
                      </div>
                    </td>
                  </tr>
                `;}).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    container.querySelector('#add-food-btn')?.addEventListener('click', () => {
      showFoodFormModal();
    });

    container.querySelectorAll('.edit-food-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const food = store.listFoods(true).find(f => f.id === id);
        if (food) showFoodFormModal(food);
      });
    });

    container.querySelectorAll('.toggle-food-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        try {
          const res = store.toggleFood(id);
          toast(`Menu "${res.name}" sekarang ${res.active ? 'Aktif' : 'Nonaktif'}`, 'info');
          refresh();
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    });

    container.querySelectorAll('.delete-food-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        const ok = await confirmModal('Hapus menu makanan ini? Makanan yang sudah memiliki riwayat pesanan tidak bisa dihapus permanen (bisa dinonaktifkan).', {
          title: 'Hapus Menu',
          confirmText: 'Hapus',
          danger: true
        });
        if (!ok) return;

        try {
          store.deleteFood(id);
          toast('Menu berhasil dihapus', 'success');
          refresh();
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    });
  }

  function showFoodFormModal(food = null) {
    const isEdit = Boolean(food);

    openModal({
      title: isEdit ? 'Edit Menu Makanan' : 'Tambah Menu Makanan',
      bodyHtml: `
        <form id="food-modal-form">
          <div class="form-group">
            <label for="food-name">Nama Makanan / Minuman</label>
            <input type="text" id="food-name" class="input" value="${escapeHtml(food?.name || '')}" placeholder="Misal: Nasi Rendang Sapi" required />
          </div>

          <div class="form-group">
            <label for="food-price">Harga (Rupiah)</label>
            <input type="number" id="food-price" min="0" step="500" class="input" value="${food ? food.price : ''}" placeholder="25000" required />
          </div>

          <div class="form-group">
            <label for="food-desc">Deskripsi Singkat / Lauk</label>
            <textarea id="food-desc" class="textarea" rows="2" placeholder="Nasi, rendang daging sapi, daun singkong, sambal hijau">${escapeHtml(food?.description || '')}</textarea>
          </div>

          <div class="form-group">
            <label for="food-img-url">URL Gambar / Foto (Opsional)</label>
            <input type="url" id="food-img-url" class="input text-xs" value="${escapeHtml(food?.imageUrl || '')}" placeholder="https://... (Kosongkan untuk memakai dummy foto otomatis)" />
            <div class="form-hint">Saat ini mendukung tautan gambar langsung. Fitur unggah file foto lokal akan tersedia setelah integrasi database storage backend.</div>
          </div>

          ${isEdit ? `
            <div class="form-group">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="checkbox" id="food-active" ${food.active ? 'checked' : ''} />
                <span>Status Aktif (dapat dijadwalkan pada menu harian)</span>
              </label>
            </div>
          ` : ''}
        </form>
      `,
      footerHtml: `
        <button type="button" class="btn btn-ghost" id="food-cancel-btn">Batal</button>
        <button type="button" class="btn btn-primary" id="food-save-btn">Simpan</button>
      `,
      onOpen: (dialog, close) => {
        dialog.querySelector('#food-cancel-btn').addEventListener('click', close);
        dialog.querySelector('#food-save-btn').addEventListener('click', () => {
          const name = dialog.querySelector('#food-name').value.trim();
          const price = parseInt(dialog.querySelector('#food-price').value, 10);
          const description = dialog.querySelector('#food-desc').value.trim();
          const imageUrl = dialog.querySelector('#food-img-url').value.trim();
          const activeCheckbox = dialog.querySelector('#food-active');
          const active = activeCheckbox ? activeCheckbox.checked : true;

          if (!name) {
            toast('Nama makanan wajib diisi', 'error');
            return;
          }
          if (isNaN(price) || price < 0) {
            toast('Harga harus berupa angka valid', 'error');
            return;
          }

          try {
            store.saveFood({
              id: food?.id,
              name,
              price,
              description,
              imageUrl,
              active
            });
            toast(`Menu "${name}" berhasil disimpan!`, 'success');
            close();
            refresh();
          } catch (err) {
            toast(err.message, 'error');
          }
        });
      }
    });
  }

  refresh();
}
