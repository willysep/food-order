import { store } from '../store.js';
import { formatRupiah, formatDate, todayISO, addDaysISO, escapeHtml, getFoodImageUrl, DEFAULT_FOOD_IMAGE } from '../utils.js';
import { toast, confirmModal } from '../ui.js';

export function render(container, ctx) {
  const user = ctx.user;
  const today = todayISO();
  // Default to tomorrow or today
  let selectedDate = addDaysISO(today, 1);
  // Track selected quantities: { [foodId]: number }
  let cart = {};
  let orderNote = '';

  function refresh() {
    const avails = store.getAvailability(selectedDate);
    // Filter only foods that have quota > 0 for this date
    const availableItems = avails.filter(a => a.quota > 0);

    // Calculate cart totals
    let totalItems = 0;
    let totalPrice = 0;
    const cartList = [];

    Object.entries(cart).forEach(([foodId, qty]) => {
      if (qty > 0) {
        const item = avails.find(a => a.foodId === foodId);
        if (item) {
          totalItems += qty;
          totalPrice += item.food.price * qty;
          cartList.push({ ...item, qty });
        }
      }
    });

    // Toggle body class to add bottom padding so content is not obscured
    if (totalItems > 0) {
      document.body.classList.add('has-order-bar');
    } else {
      document.body.classList.remove('has-order-bar');
    }

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Pesan Makanan</h1>
          <p class="subtitle">Halo, <strong>${escapeHtml(user.name)}</strong>! Pilih tanggal konsumsi dan menu lezat yang Anda inginkan.</p>
        </div>
      </div>

      <!-- Date Selection -->
      <div class="card" style="margin-bottom: 1.5rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <div class="flex-row">
            <label for="order-date-input" style="font-weight: 600; font-size: 0.9rem;">Tanggal Pesanan:</label>
            <input type="date" id="order-date-input" class="input" style="width: auto;" value="${selectedDate}" min="${today}" />
          </div>

          <div class="chip-group">
            <button class="chip ${selectedDate === today ? 'active' : ''}" data-day="0">Hari Ini</button>
            <button class="chip ${selectedDate === addDaysISO(today, 1) ? 'active' : ''}" data-day="1">Besok</button>
            <button class="chip ${selectedDate === addDaysISO(today, 2) ? 'active' : ''}" data-day="2">Lusa</button>
          </div>
        </div>
      </div>

      <!-- Menu Grid -->
      <div class="menu-list-container" style="margin-bottom: 2rem;">
        <h3 style="margin-bottom: 0.75rem;">Menu Tersedia: ${formatDate(selectedDate)}</h3>

        ${availableItems.length === 0 ? `
          <div class="card" style="text-align: center; padding: 3rem 1rem;">
            <p style="font-size: 1.05rem; font-weight: 600; color: var(--fg); margin-bottom: 0.25rem;">
              Belum ada menu yang dijadwalkan
            </p>
            <p class="text-sm text-muted">
              Admin katering belum membuka kuota pesanan untuk tanggal ${formatDate(selectedDate)}. Silakan pilih tanggal lain atau cek kembali nanti.
            </p>
          </div>
        ` : `
          <div class="food-grid">
            ${availableItems.map(item => {
              const currentQty = cart[item.foodId] || 0;
              const isOutOfStock = item.remaining <= 0;
              const isSelected = currentQty > 0;
              const imgUrl = getFoodImageUrl(item.food);

              return `
                <div class="food-card ${isOutOfStock ? 'out-of-stock' : ''} ${isSelected ? 'selected-item' : ''}">
                  <div class="food-card-img-wrap">
                    <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.food.name)}" class="food-card-thumb" loading="lazy" onerror="this.onerror=null;this.src='${DEFAULT_FOOD_IMAGE}';" />
                    <span class="badge ${isOutOfStock ? 'badge-dibatalkan' : 'badge-selesai'} food-card-badge-float">
                      ${isOutOfStock ? 'Habis' : `Sisa ${item.remaining}`}
                    </span>
                  </div>

                  <div class="food-card-body">
                    <h4 class="food-card-title">${escapeHtml(item.food.name)}</h4>
                    ${item.food.description ? `
                      <p class="text-sm text-muted food-card-desc">
                        ${escapeHtml(item.food.description)}
                      </p>
                    ` : ''}
                  </div>

                  <div class="food-card-footer">
                    <div>
                      <div class="text-xs text-muted" style="text-transform: uppercase; font-weight: 600;">Harga</div>
                      <div class="food-card-price">
                        ${formatRupiah(item.food.price)}
                      </div>
                    </div>

                    ${isOutOfStock ? `
                      <span class="badge badge-dibatalkan" style="padding: 0.4rem 0.75rem;">Stok Habis</span>
                    ` : `
                      <div class="stepper">
                        <button type="button" class="step-btn minus" data-id="${item.foodId}" ${currentQty <= 0 ? 'disabled' : ''} aria-label="Kurangi porsi">&minus;</button>
                        <span class="qty">${currentQty}</span>
                        <button type="button" class="step-btn plus" data-id="${item.foodId}" ${currentQty >= item.remaining ? 'disabled' : ''} aria-label="Tambah porsi">&#43;</button>
                      </div>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>

      <!-- Sticky Order Summary Bar -->
      ${totalItems > 0 ? `
        <div class="order-summary-bar">
          <div class="order-summary-inner">
            <div class="order-summary-top-mobile" style="flex: 1;">
              <div>
                <div style="font-size: 0.75rem; color: var(--fg-muted);">
                  Total (${totalItems} item &bull; ${formatDate(selectedDate, false)}):
                </div>
                <div style="font-size: 1.25rem; font-weight: 700; color: var(--primary); line-height: 1.2;">
                  ${formatRupiah(totalPrice)}
                </div>
              </div>
            </div>

            <div style="flex: 1.5; min-width: 200px;">
              <input
                type="text"
                id="order-note-input"
                class="input"
                placeholder="Catatan (misal: sambal dipisah, tanpa bawang)"
                value="${escapeHtml(orderNote)}"
              />
            </div>

            <button id="submit-order-btn" class="btn btn-primary btn-lg">
              Kirim Pesanan &rarr;
            </button>
          </div>
        </div>
      ` : ''}
    `;

    bindEvents();
  }

  function bindEvents() {
    container.querySelector('#order-date-input')?.addEventListener('change', (e) => {
      selectedDate = e.target.value;
      cart = {}; // reset cart when changing date
      refresh();
    });

    container.querySelectorAll('.chip[data-day]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const offset = parseInt(e.currentTarget.dataset.day, 10);
        selectedDate = addDaysISO(today, offset);
        cart = {};
        refresh();
      });
    });

    // Stepper buttons
    container.querySelectorAll('.step-btn.plus').forEach(btn => {
      btn.addEventListener('click', () => {
        const foodId = btn.dataset.id;
        const avails = store.getAvailability(selectedDate);
        const item = avails.find(a => a.foodId === foodId);
        const current = cart[foodId] || 0;
        if (item && current < item.remaining) {
          cart[foodId] = current + 1;
          saveNoteBeforeRefresh();
          refresh();
        }
      });
    });

    container.querySelectorAll('.step-btn.minus').forEach(btn => {
      btn.addEventListener('click', () => {
        const foodId = btn.dataset.id;
        const current = cart[foodId] || 0;
        if (current > 0) {
          cart[foodId] = current - 1;
          if (cart[foodId] === 0) delete cart[foodId];
          saveNoteBeforeRefresh();
          refresh();
        }
      });
    });

    function saveNoteBeforeRefresh() {
      const noteInput = container.querySelector('#order-note-input');
      if (noteInput) orderNote = noteInput.value;
    }

    // Submit Order
    const submitBtn = container.querySelector('#submit-order-btn');
    submitBtn?.addEventListener('click', async (e) => {
      e.preventDefault();
      const noteInput = container.querySelector('#order-note-input');
      if (noteInput) orderNote = noteInput.value.trim();

      const items = Object.entries(cart)
        .filter(([_, qty]) => qty > 0)
        .map(([foodId, qty]) => ({ foodId, qty }));

      if (items.length === 0) {
        toast('Pilih minimal satu makanan', 'error');
        return;
      }

      // Hitung total harga saat ini
      const avails = store.getAvailability(selectedDate);
      let calculatedTotal = 0;
      items.forEach(item => {
        const foodItem = avails.find(a => a.foodId === item.foodId);
        if (foodItem) {
          calculatedTotal += foodItem.food.price * item.qty;
        }
      });

      // Pastikan konfirmasi user
      const confirmed = window.confirm(`Kirim pesanan untuk tanggal ${formatDate(selectedDate)}? Total: ${formatRupiah(calculatedTotal)}`);
      if (!confirmed) return;

      try {
        const order = store.createOrder({
          customerId: user.id,
          date: selectedDate,
          items,
          note: orderNote
        });

        cart = {};
        orderNote = '';
        document.body.classList.remove('has-order-bar');
        toast(`Pesanan #${order.code} berhasil dibuat!`, 'success', 5000);
        window.location.hash = '#/my-orders';
      } catch (err) {
        console.error('Error saat submit order:', err);
        alert('Gagal membuat pesanan: ' + err.message);
        refresh(); // re-sync availability
      }
    });
  }

  refresh();
}
