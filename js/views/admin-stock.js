import { store } from '../store.js';
import { formatRupiah, formatDate, todayISO, addDaysISO, escapeHtml, getFoodImageUrl, DEFAULT_FOOD_IMAGE } from '../utils.js';
import { toast, confirmModal } from '../ui.js';

export function render(container) {
  // Default to tomorrow for preparation, or today
  let selectedDate = addDaysISO(todayISO(), 1);

  function refresh() {
    const today = todayISO();
    const avails = store.getAvailability(selectedDate);
    const activeFoods = store.listFoods(false);

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Jadwal & Kuota Makanan</h1>
          <p class="subtitle">Atur menu apa saja yang tersedia pada tanggal tertentu beserta batas porsi (kuota).</p>
        </div>
        <div class="flex-row">
          <button id="copy-quota-btn" class="btn btn-ghost btn-sm">
            Salin Kuota dari Tanggal Lain...
          </button>
        </div>
      </div>

      <!-- Date Selector Card -->
      <div class="card" style="margin-bottom: 1.25rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <div class="flex-row">
            <label for="stock-date-picker" style="font-weight: 600; font-size: 0.9rem;">Pilih Tanggal:</label>
            <input type="date" id="stock-date-picker" class="input" style="width: auto;" value="${selectedDate}" min="${today}" />
          </div>

          <div class="chip-group">
            <button class="chip ${selectedDate === today ? 'active' : ''}" data-day="0">Hari Ini</button>
            <button class="chip ${selectedDate === addDaysISO(today, 1) ? 'active' : ''}" data-day="1">Besok</button>
            <button class="chip ${selectedDate === addDaysISO(today, 2) ? 'active' : ''}" data-day="2">Lusa</button>
          </div>
        </div>
      </div>

      <!-- Availability Editor -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3>Menu untuk ${formatDate(selectedDate)}</h3>
            <span class="text-xs text-muted">Isi kuota > 0 untuk mengaktifkan pemesanan pada tanggal ini.</span>
          </div>
          <button id="save-all-quotas-btn" class="btn btn-primary btn-sm">
            Simpan Perubahan
          </button>
        </div>

        ${activeFoods.length === 0 ? `
          <div style="text-align: center; padding: 2rem;">
            <p class="text-muted" style="margin-bottom: 0.75rem;">Belum ada master data makanan yang aktif.</p>
            <a href="#/admin/foods" class="btn btn-primary btn-sm">Tambah Menu Makanan &rarr;</a>
          </div>
        ` : `
          <form id="stock-form">
            <div class="table-responsive" style="border: none;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th style="width: 70px;">Foto</th>
                    <th>Menu Makanan</th>
                    <th>Harga Satuan</th>
                    <th style="width: 130px;">Kuota Porsi</th>
                    <th class="text-right" style="width: 100px;">Terpesan</th>
                    <th class="text-right" style="width: 100px;">Sisa Stok</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${avails.map(item => {
                    const img = getFoodImageUrl(item.food);
                    return `
                    <tr>
                      <td data-label="Foto">
                        <img src="${escapeHtml(img)}" alt="${escapeHtml(item.food.name)}" onerror="this.onerror=null;this.src='${DEFAULT_FOOD_IMAGE}';" style="width: 48px; height: 48px; border-radius: var(--radius-sm); object-fit: cover; border: 1px solid var(--border);" />
                      </td>
                      <td data-label="Menu Makanan">
                        <strong>${escapeHtml(item.food.name)}</strong>
                        ${item.food.description ? `<div class="text-xs text-muted">${escapeHtml(item.food.description)}</div>` : ''}
                      </td>
                      <td data-label="Harga">${formatRupiah(item.food.price)}</td>
                      <td data-label="Kuota">
                        <input
                          type="number"
                          min="${item.sold}"
                          step="1"
                          class="input quota-input text-right"
                          data-food-id="${item.food.id}"
                          value="${item.quota}"
                          style="padding: 0.35rem 0.5rem;"
                        />
                      </td>
                      <td data-label="Terpesan" class="text-right font-mono">${item.sold}</td>
                      <td data-label="Sisa Stok" class="text-right font-mono">
                        <strong style="color: ${item.remaining > 0 ? 'var(--success)' : 'var(--fg-muted)'};">
                          ${item.remaining}
                        </strong>
                      </td>
                      <td data-label="Status">
                        ${item.quota === 0 ? `
                          <span class="badge" style="background: #f1f5f9; color: #64748b;">Tidak Ada Menu</span>
                        ` : (item.remaining === 0 ? `
                          <span class="badge badge-dibatalkan">Habis</span>
                        ` : `
                          <span class="badge badge-selesai">Tersedia</span>
                        `)}
                      </td>
                    </tr>
                  `;}).join('')}
                </tbody>
              </table>
            </div>
          </form>
        `}
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    const today = todayISO();

    container.querySelector('#stock-date-picker')?.addEventListener('change', (e) => {
      selectedDate = e.target.value;
      refresh();
    });

    container.querySelectorAll('.chip[data-day]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const offset = parseInt(e.currentTarget.dataset.day, 10);
        selectedDate = addDaysISO(today, offset);
        refresh();
      });
    });

    // Save quotas
    container.querySelector('#save-all-quotas-btn')?.addEventListener('click', () => {
      const inputs = container.querySelectorAll('.quota-input');
      let count = 0;
      let errorOccurred = false;

      inputs.forEach(inp => {
        const foodId = inp.dataset.foodId;
        const val = parseInt(inp.value, 10) || 0;
        try {
          store.setQuota(foodId, selectedDate, val);
          count++;
        } catch (err) {
          toast(err.message, 'error');
          errorOccurred = true;
        }
      });

      if (!errorOccurred) {
        toast(`Kuota tanggal ${formatDate(selectedDate)} berhasil disimpan!`, 'success');
        refresh();
      }
    });

    // Copy from date
    container.querySelector('#copy-quota-btn')?.addEventListener('click', async () => {
      const sourceDate = prompt('Masukkan tanggal sumber (format YYYY-MM-DD):', today);
      if (!sourceDate) return;

      try {
        store.copyQuotaFromDate(sourceDate, selectedDate);
        toast(`Berhasil menyalin kuota dari ${sourceDate} ke ${selectedDate}!`, 'success');
        refresh();
      } catch (err) {
        toast(err.message, 'error');
      }
    });
  }

  refresh();
}
