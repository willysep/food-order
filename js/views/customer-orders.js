import { store, ORDER_STATUS } from '../store.js';
import { formatRupiah, formatDate, formatDateTime, escapeHtml } from '../utils.js';
import { confirmModal, toast, renderBadgeStatus, renderBadgePayment } from '../ui.js';

export function render(container, ctx) {
  const user = ctx.user;

  function refresh() {
    const orders = store.listOrders({ customerId: user.id });

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Riwayat Pesanan Saya</h1>
          <p class="subtitle">Pantau status makanan dan tagihan pesanan Anda.</p>
        </div>
        <a href="#/order" class="btn btn-primary">
          + Pesan Makanan Baru
        </a>
      </div>

      <div class="card" style="padding: 0;">
        ${orders.length === 0 ? `
          <div style="text-align: center; padding: 3rem 1rem;">
            <p style="font-weight: 600; margin-bottom: 0.25rem;">Belum ada riwayat pesanan</p>
            <p class="text-sm text-muted" style="margin-bottom: 1rem;">Anda belum pernah memesan makanan katering.</p>
            <a href="#/order" class="btn btn-primary btn-sm">Mulai Pesan Sekarang &rarr;</a>
          </div>
        ` : `
          <div class="table-responsive" style="border: none;">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Kode & Tanggal</th>
                  <th>Untuk Tanggal</th>
                  <th>Menu Pesanan</th>
                  <th>Total</th>
                  <th>Status Pesanan</th>
                  <th>Pembayaran</th>
                  <th class="text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${orders.map(o => `
                  <tr>
                    <td data-label="Kode & Waktu" class="font-mono text-xs">
                      <strong>${escapeHtml(o.code)}</strong>
                      <div class="text-xs text-muted">${formatDateTime(o.createdAt)}</div>
                    </td>
                    <td data-label="Untuk Tanggal">
                      <strong>${formatDate(o.date)}</strong>
                    </td>
                    <td data-label="Menu Pesanan">
                      <div class="text-xs">
                        ${(o.items || []).map(i => `${escapeHtml(i.name)} &times; ${i.qty}`).join('<br>')}
                      </div>
                      ${o.note ? `<div class="text-xs" style="color:#d97706; margin-top: 3px; font-style:italic;">Catatan: ${escapeHtml(o.note)}</div>` : ''}
                    </td>
                    <td data-label="Total"><strong>${formatRupiah(o.total)}</strong></td>
                    <td data-label="Status">${renderBadgeStatus(o.status)}</td>
                    <td data-label="Pembayaran">${renderBadgePayment(o.paymentStatus)}</td>
                    <td data-label="Aksi" class="text-right">
                      ${o.status === ORDER_STATUS.MENUNGGU ? `
                        <button class="btn btn-danger btn-sm cancel-my-order-btn" data-id="${o.id}" data-code="${o.code}">
                          Batalkan
                        </button>
                      ` : `
                        <span class="text-xs text-muted">-</span>
                      `}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>

      <div class="card" style="margin-top: 1.5rem; background: var(--surface-alt);">
        <h4 style="font-size: 0.9rem; margin-bottom: 0.35rem;">Informasi Pembatalan & Pembayaran:</h4>
        <ul style="font-size: 0.8rem; color: var(--fg-muted); padding-left: 1.2rem; line-height: 1.6;">
          <li>Pesanan hanya dapat dibatalkan mandiri selama status masih <strong>Menunggu</strong>. Begitu pesanan mulai <em>Diproses</em> oleh katering, pesanan tidak bisa dibatalkan lagi.</li>
          <li>Pembayaran dilakukan secara tunai/transfer langsung kepada Admin pengelola katering. Admin akan memperbarui status tagihan menjadi <strong>Lunas</strong> setelah menerima pembayaran.</li>
        </ul>
      </div>
    `;

    bindEvents();
  }

  function bindEvents() {
    container.querySelectorAll('.cancel-my-order-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const orderId = btn.dataset.id;
        const orderCode = btn.dataset.code;

        const ok = await confirmModal(`Apakah Anda yakin ingin membatalkan pesanan #${orderCode}? Porsi akan dikembalikan ke kuota katering.`, {
          title: 'Batalkan Pesanan',
          confirmText: 'Ya, Batalkan Pesanan',
          danger: true
        });
        if (!ok) return;

        try {
          store.cancelOrder(orderId, user.id, false);
          toast(`Pesanan #${orderCode} berhasil dibatalkan.`, 'info');
          refresh();
        } catch (err) {
          toast(err.message, 'error');
        }
      });
    });
  }

  refresh();
}
