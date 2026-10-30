import { store, ORDER_STATUS, PAYMENT_STATUS } from '../store.js';
import { formatRupiah, todayISO, formatDate, addDaysISO, escapeHtml } from '../utils.js';

export function render(container) {
  let period = '7days'; // 'today', '7days', '30days', 'month'

  function calculateRange() {
    const today = todayISO();
    if (period === 'today') {
      return { from: today, to: today, label: 'Hari Ini' };
    }
    if (period === '7days') {
      return { from: addDaysISO(today, -6), to: today, label: '7 Hari Terakhir' };
    }
    if (period === '30days') {
      return { from: addDaysISO(today, -29), to: today, label: '30 Hari Terakhir' };
    }
    if (period === 'month') {
      const parts = today.split('-');
      return { from: `${parts[0]}-${parts[1]}-01`, to: today, label: 'Bulan Berjalan' };
    }
    return { from: addDaysISO(today, -6), to: today, label: '7 Hari Terakhir' };
  }

  function renderChartSVG(dailyTrends) {
    if (!dailyTrends || dailyTrends.length === 0) {
      return `<p class="text-sm text-muted" style="text-align:center; padding: 2rem 0;">Belum ada riwayat pesanan dalam periode ini.</p>`;
    }

    const maxIncome = Math.max(...dailyTrends.map(d => d.income), 100000);
    const chartHeight = 140;
    const barWidth = 36;
    const gap = 20;
    const totalWidth = Math.max(dailyTrends.length * (barWidth + gap) + 40, 320);

    const bars = dailyTrends.map((d, i) => {
      const x = 30 + i * (barWidth + gap);
      const height = Math.round((d.income / maxIncome) * (chartHeight - 30));
      const y = chartHeight - height;
      const dayLabel = d.date.substring(5); // MM-DD
      return `
        <g class="bar-group">
          <rect x="${x}" y="${y}" width="${barWidth}" height="${height}" rx="4" fill="#0284c7" />
          <text x="${x + barWidth / 2}" y="${y - 6}" font-size="10" font-weight="600" fill="#0f172a" text-anchor="middle">
            ${d.income > 0 ? (d.income >= 1000 ? Math.round(d.income / 1000) + 'k' : d.income) : ''}
          </text>
          <text x="${x + barWidth / 2}" y="${chartHeight + 16}" font-size="10" fill="#64748b" text-anchor="middle">
            ${dayLabel}
          </text>
        </g>
      `;
    }).join('');

    return `
      <div style="overflow-x: auto; padding-bottom: 0.5rem;">
        <svg class="chart-svg" viewBox="0 0 ${totalWidth} ${chartHeight + 25}" style="min-width: ${totalWidth}px;">
          <line x1="20" y1="${chartHeight}" x2="${totalWidth - 10}" y2="${chartHeight}" stroke="#e2e8f0" stroke-width="1" />
          ${bars}
        </svg>
      </div>
    `;
  }

  function updateView() {
    const range = calculateRange();
    const stats = store.getStats({ from: range.from, to: range.to });
    const today = todayISO();
    const tomorrow = addDaysISO(today, 1);

    // Urgent orders (today & tomorrow needing prep)
    const upcomingOrders = store.listOrders({ from: today, to: tomorrow })
      .filter(o => o.status !== ORDER_STATUS.SELESAI && o.status !== ORDER_STATUS.DIBATALKAN);

    container.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Dashboard & Pemasukan</h1>
          <p class="subtitle">Ringkasan aktivitas pesanan, pendapatan katering, dan statistik penjualan.</p>
        </div>
        <div class="chip-group">
          <button class="chip ${period === 'today' ? 'active' : ''}" data-p="today">Hari Ini</button>
          <button class="chip ${period === '7days' ? 'active' : ''}" data-p="7days">7 Hari</button>
          <button class="chip ${period === '30days' ? 'active' : ''}" data-p="30days">30 Hari</button>
          <button class="chip ${period === 'month' ? 'active' : ''}" data-p="month">Bulan Ini</button>
        </div>
      </div>

      <!-- Stat Cards -->
      <div class="stats-grid">
        <div class="stat-card success">
          <div class="stat-label">Pemasukan (Lunas)</div>
          <div class="stat-value">${formatRupiah(stats.income)}</div>
          <div class="stat-sub">Dari pesanan terbayar lunas</div>
        </div>

        <div class="stat-card warning">
          <div class="stat-label">Piutang (Belum Bayar)</div>
          <div class="stat-value">${formatRupiah(stats.receivables)}</div>
          <div class="stat-sub">Pesanan aktif belum dibayar</div>
        </div>

        <div class="stat-card primary">
          <div class="stat-label">Total Pesanan</div>
          <div class="stat-value">${stats.totalOrders}</div>
          <div class="stat-sub">${stats.waitingOrders} menunggu &bull; ${stats.completedOrders} selesai</div>
        </div>

        <div class="stat-card">
          <div class="stat-label">Porsi Terjual</div>
          <div class="stat-value">${stats.totalPortions} <span class="text-sm font-normal text-muted">porsi</span></div>
          <div class="stat-sub">Periode: ${range.label}</div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem; margin-bottom: 1.5rem;">
        <!-- Chart Trend Pendapatan -->
        <div class="card">
          <div class="card-header">
            <h3>Grafik Pemasukan Harian</h3>
            <span class="text-xs text-muted">Hanya pesanan lunas</span>
          </div>
          ${renderChartSVG(stats.dailyTrends)}
        </div>

        <!-- Makanan Terlaris -->
        <div class="card">
          <div class="card-header">
            <h3>5 Menu Terlaris</h3>
            <span class="text-xs text-muted">Berdasarkan porsi</span>
          </div>
          ${stats.topFoods.length === 0 ? '<p class="text-sm text-muted">Belum ada data penjualan.</p>' : `
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Menu</th>
                    <th class="text-right">Porsi</th>
                    <th class="text-right">Pendapatan</th>
                  </tr>
                </thead>
                <tbody>
                  ${stats.topFoods.map(f => `
                    <tr>
                      <td><strong>${escapeHtml(f.name)}</strong></td>
                      <td class="text-right">${f.portions}</td>
                      <td class="text-right">${formatRupiah(f.revenue)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>
      </div>

      <!-- Pesanan Mendesak (Hari Ini & Besok) -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3>Pesanan Perlu Diproses (Hari Ini & Besok)</h3>
            <p class="text-xs text-muted">Pesanan aktif yang belum selesai atau menunggu penanganan</p>
          </div>
          <a href="#/admin/orders" class="btn btn-ghost btn-sm">Lihat Semua Pesanan &rarr;</a>
        </div>

        ${upcomingOrders.length === 0 ? `
          <p class="text-sm text-muted" style="text-align: center; padding: 1.5rem;">
            Tidak ada pesanan tertunda untuk hari ini & besok. Semua beres!
          </p>
        ` : `
          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Pelanggan</th>
                  <th>Tanggal Makan</th>
                  <th>Item Menu</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${upcomingOrders.slice(0, 10).map(o => `
                  <tr>
                    <td class="font-mono text-sm">${escapeHtml(o.code)}</td>
                    <td>
                      <div><strong>${escapeHtml(o.customer?.name || '-')}</strong></div>
                      <div class="text-xs text-muted">${escapeHtml(o.customer?.phone || '-')}</div>
                    </td>
                    <td>${formatDate(o.date)}</td>
                    <td>
                      <div class="text-xs">
                        ${(o.items || []).map(i => `${escapeHtml(i.name)} &times; ${i.qty}`).join(', ')}
                      </div>
                      ${o.note ? `<div class="text-xs" style="color:#d97706; font-style: italic;">"${escapeHtml(o.note)}"</div>` : ''}
                    </td>
                    <td><strong>${formatRupiah(o.total)}</strong></td>
                    <td><span class="badge badge-${o.status}">${escapeHtml(o.status)}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;

    // Chip listeners
    container.querySelectorAll('.chip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        period = e.currentTarget.dataset.p;
        updateView();
      });
    });
  }

  updateView();
}
