import { store, ORDER_STATUS, PAYMENT_STATUS } from '../store.js';
import { formatRupiah, formatDate, formatDateTime, escapeHtml } from '../utils.js';
import { openModal, confirmModal, toast, renderBadgeStatus, renderBadgePayment } from '../ui.js';

export function render(container) {
  let filterDate = '';
  let filterStatus = 'all';
  let filterPayment = 'all';
  let searchQuery = '';

  function refresh() {
    const orders = store.listOrders({
      date: filterDate || undefined,
      status: filterStatus,
      paymentStatus: filterPayment,
      search: searchQuery
    });

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Kelola Pesanan</h1>
          <p class="subtitle">Pantau seluruh pesanan, perbarui alur status, dan tanda pembayaran.</p>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="card" style="margin-bottom: 1rem; padding: 0.85rem 1rem;">
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
          <div style="flex: 1; min-width: 180px;">
            <input type="text" id="order-search" class="input" placeholder="Cari kode / nama / no HP..." value="${escapeHtml(searchQuery)}" />
          </div>

          <div style="width: 160px;">
            <input type="date" id="order-date" class="input" value="${filterDate}" />
          </div>

          <div style="width: 150px;">
            <select id="order-status" class="select">
              <option value="all" ${filterStatus === 'all' ? 'selected' : ''}>Semua Status</option>
              <option value="${ORDER_STATUS.MENUNGGU}" ${filterStatus === ORDER_STATUS.MENUNGGU ? 'selected' : ''}>Menunggu</option>
              <option value="${ORDER_STATUS.DIPROSES}" ${filterStatus === ORDER_STATUS.DIPROSES ? 'selected' : ''}>Diproses</option>
              <option value="${ORDER_STATUS.SIAP}" ${filterStatus === ORDER_STATUS.SIAP ? 'selected' : ''}>Siap</option>
              <option value="${ORDER_STATUS.SELESAI}" ${filterStatus === ORDER_STATUS.SELESAI ? 'selected' : ''}>Selesai</option>
              <option value="${ORDER_STATUS.DIBATALKAN}" ${filterStatus === ORDER_STATUS.DIBATALKAN ? 'selected' : ''}>Dibatalkan</option>
            </select>
          </div>

          <div style="width: 150px;">
            <select id="order-payment" class="select">
              <option value="all" ${filterPayment === 'all' ? 'selected' : ''}>Semua Bayar</option>
              <option value="${PAYMENT_STATUS.BELUM}" ${filterPayment === PAYMENT_STATUS.BELUM ? 'selected' : ''}>Belum Bayar</option>
              <option value="${PAYMENT_STATUS.LUNAS}" ${filterPayment === PAYMENT_STATUS.LUNAS ? 'selected' : ''}>Lunas</option>
            </select>
          </div>

          ${(filterDate || filterStatus !== 'all' || filterPayment !== 'all' || searchQuery) ? `
            <button id="reset-filter-btn" class="btn btn-ghost btn-sm">Reset Filter</button>
          ` : ''}
        </div>
      </div>

      <!-- Orders Table -->
      <div class="card" style="padding: 0;">
        ${orders.length === 0 ? `
          <p class="text-sm text-muted" style="text-align: center; padding: 2.5rem 1rem;">
            Tidak ada pesanan yang sesuai kriteria pencarian/filter.
          </p>
        ` : `
          <div class="table-responsive" style="border: none;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Pelanggan</th>
                  <th>Untuk Tanggal</th>
                  <th>Pesanan</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Bayar</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${orders.map(o => `
                  <tr data-order-id="${o.id}">
                    <td data-label="Kode Pesanan">
                      <div class="font-mono text-xs" style="font-weight: 700;">${escapeHtml(o.code)}</div>
                      <div class="text-xs text-muted">${formatDateTime(o.createdAt)}</div>
                    </td>
                    <td data-label="Pelanggan">
                      <div><strong>${escapeHtml(o.customer?.name || '-')}</strong></div>
                      <div class="text-xs text-muted font-mono">${escapeHtml(o.customer?.phone || '-')}</div>
                    </td>
                    <td data-label="Tgl Makan">
                      <strong>${formatDate(o.date)}</strong>
                    </td>
                    <td data-label="Pesanan">
                      <div class="text-xs" style="line-height: 1.4;">
                        ${(o.items || []).map(i => `${escapeHtml(i.name)} &times; <strong>${i.qty}</strong>`).join(', ')}
                      </div>
                      ${o.note ? `<div class="text-xs" style="color:#d97706; margin-top: 3px; font-style:italic;">Catatan: "${escapeHtml(o.note)}"</div>` : ''}
                    </td>
                    <td data-label="Total"><strong style="color: var(--primary); font-size: 1rem;">${formatRupiah(o.total)}</strong></td>
                    <td data-label="Status">
                      <select class="select change-status-select text-xs" data-id="${o.id}" style="padding: 0.35rem 0.5rem; width: auto; max-width: 140px;" ${o.status === ORDER_STATUS.DIBATALKAN ? 'disabled' : ''}>
                        <option value="${ORDER_STATUS.MENUNGGU}" ${o.status === ORDER_STATUS.MENUNGGU ? 'selected' : ''}>Menunggu</option>
                        <option value="${ORDER_STATUS.DIPROSES}" ${o.status === ORDER_STATUS.DIPROSES ? 'selected' : ''}>Diproses</option>
                        <option value="${ORDER_STATUS.SIAP}" ${o.status === ORDER_STATUS.SIAP ? 'selected' : ''}>Siap</option>
                        <option value="${ORDER_STATUS.SELESAI}" ${o.status === ORDER_STATUS.SELESAI ? 'selected' : ''}>Selesai</option>
                        <option value="${ORDER_STATUS.DIBATALKAN}" ${o.status === ORDER_STATUS.DIBATALKAN ? 'selected' : ''}>Dibatalkan</option>
                      </select>
                    </td>
                    <td data-label="Bayar">
                      <button class="btn btn-sm toggle-payment-btn" data-id="${o.id}" data-current="${o.paymentStatus}" style="padding: 0.25rem 0.65rem;">
                        ${renderBadgePayment(o.paymentStatus)}
                      </button>
                    </td>
                    <td data-label="Aksi" class="text-right">
                      <button class="btn btn-ghost btn-sm view-detail-btn" data-id="${o.id}">Lihat Detail &rarr;</button>
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
    const searchInput = container.querySelector('#order-search');
    let debounceTimer;
    searchInput?.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = e.target.value;
        refresh();
      }, 300);
    });

    container.querySelector('#order-date')?.addEventListener('change', (e) => {
      filterDate = e.target.value;
      refresh();
    });

    container.querySelector('#order-status')?.addEventListener('change', (e) => {
      filterStatus = e.target.value;
      refresh();
    });

    container.querySelector('#order-payment')?.addEventListener('change', (e) => {
      filterPayment = e.target.value;
      refresh();
    });

    container.querySelector('#reset-filter-btn')?.addEventListener('click', () => {
      filterDate = '';
      filterStatus = 'all';
      filterPayment = 'all';
      searchQuery = '';
      refresh();
    });

    // Change status dropdown
    container.querySelectorAll('.change-status-select').forEach(select => {
      select.addEventListener('change', async (e) => {
        const id = e.target.dataset.id;
        const newStatus = e.target.value;
        try {
          if (newStatus === ORDER_STATUS.DIBATALKAN) {
            const ok = await confirmModal('Yakin ingin membatalkan pesanan ini? Stok yang dialokasikan akan dikembalikan.', {
              title: 'Batalkan Pesanan',
              confirmText: 'Ya, Batalkan',
              danger: true
            });
            if (!ok) {
              refresh();
              return;
            }
          }
          store.updateOrderStatus(id, newStatus);
          toast(`Status pesanan diperbarui menjadi ${newStatus}`, 'success');
          refresh();
        } catch (err) {
          toast(err.message, 'error');
          refresh();
        }
      });
    });

    // Toggle Payment status
    container.querySelectorAll('.toggle-payment-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const current = btn.dataset.current;
        const next = current === PAYMENT_STATUS.LUNAS ? PAYMENT_STATUS.BELUM : PAYMENT_STATUS.LUNAS;
        try {
          store.setPaymentStatus(id, next);
          toast(`Status pembayaran diubah menjadi ${next.toUpperCase()}`, 'success');
          refresh();
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    });

    // Detail modal
    container.querySelectorAll('.view-detail-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        showDetailModal(id);
      });
    });
  }

  function showDetailModal(orderId) {
    const orders = store.listOrders();
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    openModal({
      title: `Detail Pesanan #${order.code}`,
      bodyHtml: `
        <div style="font-size: 0.875rem;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem; background: var(--surface-alt); padding: 0.75rem; border-radius: var(--radius-sm);">
            <div>
              <div class="text-xs text-muted">Pelanggan</div>
              <strong>${escapeHtml(order.customer?.name || '-')}</strong>
              <div class="text-xs font-mono">${escapeHtml(order.customer?.phone || '-')}</div>
            </div>
            <div>
              <div class="text-xs text-muted">Tanggal Konsumsi</div>
              <strong>${formatDate(order.date)}</strong>
            </div>
            <div>
              <div class="text-xs text-muted">Waktu Dibuat</div>
              <div>${formatDateTime(order.createdAt)}</div>
            </div>
            <div>
              <div class="text-xs text-muted">Status / Pembayaran</div>
              <div>${renderBadgeStatus(order.status)} ${renderBadgePayment(order.paymentStatus)}</div>
            </div>
          </div>

          <h4 style="margin-bottom: 0.5rem;">Daftar Item:</h4>
          <table class="data-table" style="margin-bottom: 1rem;">
            <thead>
              <tr>
                <th>Menu</th>
                <th class="text-right">Harga</th>
                <th class="text-right">Qty</th>
                <th class="text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${(order.items || []).map(item => `
                <tr>
                  <td>${escapeHtml(item.name)}</td>
                  <td class="text-right">${formatRupiah(item.price)}</td>
                  <td class="text-right">${item.qty}</td>
                  <td class="text-right"><strong>${formatRupiah(item.subtotal)}</strong></td>
                </tr>
              `).join('')}
            </tbody>
            <tfoot>
              <tr>
                <th colspan="3" class="text-right">Total:</th>
                <th class="text-right" style="font-size: 1rem; color: var(--primary);">${formatRupiah(order.total)}</th>
              </tr>
            </tfoot>
          </table>

          ${order.note ? `
            <div style="background: #fffbeb; border: 1px solid #fef3c7; padding: 0.75rem; border-radius: var(--radius-sm);">
              <strong>Catatan dari Pelanggan:</strong>
              <p style="margin-top: 0.25rem; font-style: italic;">"${escapeHtml(order.note)}"</p>
            </div>
          ` : ''}
        </div>
      `,
      footerHtml: `
        <button type="button" class="btn btn-ghost" onclick="this.closest('dialog').close()">Tutup</button>
      `
    });
  }

  refresh();
}
