import { currentUser, logout, hasAdmin } from './auth.js';
import { toast } from './ui.js';
import { escapeHtml } from './utils.js';

// Route Definitions
const routes = {
  '#/setup': {
    role: null,
    module: () => import('./views/setup.js')
  },
  '#/login': {
    role: null,
    module: () => import('./views/login.js')
  },
  '#/admin': {
    role: 'admin',
    module: () => import('./views/admin-dashboard.js')
  },
  '#/admin/orders': {
    role: 'admin',
    module: () => import('./views/admin-orders.js')
  },
  '#/admin/stock': {
    role: 'admin',
    module: () => import('./views/admin-stock.js')
  },
  '#/admin/foods': {
    role: 'admin',
    module: () => import('./views/admin-foods.js')
  },
  '#/admin/customers': {
    role: 'admin',
    module: () => import('./views/admin-customers.js')
  },
  '#/admin/settings': {
    role: 'admin',
    module: () => import('./views/admin-settings.js')
  },
  '#/order': {
    role: 'customer',
    module: () => import('./views/customer-order.js')
  },
  '#/my-orders': {
    role: 'customer',
    module: () => import('./views/customer-orders.js')
  }
};

function renderNavigation(user, currentHash) {
  const navContainer = document.getElementById('nav-container');
  const userContainer = document.getElementById('user-container');
  if (!navContainer || !userContainer) return;

  if (!user) {
    navContainer.innerHTML = '';
    userContainer.innerHTML = `
      <a href="#/login" class="btn btn-primary btn-sm">Masuk</a>
    `;
    return;
  }

  // Render navigation links
  if (user.role === 'admin') {
    navContainer.innerHTML = `
      <a href="#/admin" class="${currentHash === '#/admin' ? 'active' : ''}">Dashboard</a>
      <a href="#/admin/orders" class="${currentHash === '#/admin/orders' ? 'active' : ''}">Pesanan</a>
      <a href="#/admin/stock" class="${currentHash === '#/admin/stock' ? 'active' : ''}">Kuota & Jadwal</a>
      <a href="#/admin/foods" class="${currentHash === '#/admin/foods' ? 'active' : ''}">Menu</a>
      <a href="#/admin/customers" class="${currentHash === '#/admin/customers' ? 'active' : ''}">Pelanggan</a>
      <a href="#/admin/settings" class="${currentHash === '#/admin/settings' ? 'active' : ''}">Pengaturan</a>
    `;
  } else {
    navContainer.innerHTML = `
      <a href="#/order" class="${currentHash === '#/order' ? 'active' : ''}">Pesan Makanan</a>
      <a href="#/my-orders" class="${currentHash === '#/my-orders' ? 'active' : ''}">Pesanan Saya</a>
    `;
  }

  // Render user info + logout
  userContainer.innerHTML = `
    <div class="user-profile">
      <span class="user-tag">
        <strong>${escapeHtml(user.name)}</strong>
        <span class="badge ${user.role === 'admin' ? 'badge-diproses' : 'badge-menunggu'}" style="font-size: 0.65rem; padding: 1px 5px;">
          ${user.role}
        </span>
      </span>
      <button id="logout-btn" class="btn btn-ghost btn-sm" title="Keluar">Keluar</button>
    </div>
  `;

  document.getElementById('logout-btn')?.addEventListener('click', () => {
    logout();
    toast('Anda telah keluar', 'info');
    navigate('#/login');
  });
}

async function navigate(targetHash) {
  let hash = targetHash || window.location.hash || '';
  if (!hash) {
    hash = '#/login';
  }

  // If no admin registered yet and not on setup, redirect to setup
  if (!hasAdmin() && hash !== '#/setup') {
    window.location.hash = '#/setup';
    return;
  }

  const user = currentUser();

  // If admin already exists and user tries to access setup, go to login
  if (hasAdmin() && hash === '#/setup') {
    window.location.hash = user ? (user.role === 'admin' ? '#/admin' : '#/order') : '#/login';
    return;
  }

  const route = routes[hash];

  // Route not found -> redirect to appropriate default
  if (!route) {
    if (!user) {
      window.location.hash = '#/login';
    } else {
      window.location.hash = user.role === 'admin' ? '#/admin' : '#/order';
    }
    return;
  }

  // Role guard
  if (route.role) {
    if (!user) {
      toast('Silakan masuk terlebih dahulu', 'error');
      window.location.hash = '#/login';
      return;
    }
    if (user.role !== route.role) {
      toast('Akses tidak diizinkan untuk peran Anda', 'error');
      window.location.hash = user.role === 'admin' ? '#/admin' : '#/order';
      return;
    }
  }

  // If user is logged in and visits #/login, redirect to their home
  if (user && hash === '#/login') {
    window.location.hash = user.role === 'admin' ? '#/admin' : '#/order';
    return;
  }

  // Render navigation bar
  renderNavigation(user, hash);

  // Render main view
  const appContainer = document.getElementById('app');
  // Reset any view-specific body class
  document.body.classList.remove('has-order-bar');
  try {
    const mod = await route.module();
    appContainer.innerHTML = '';
    mod.render(appContainer, { user, route: hash });
  } catch (err) {
    console.error('Failed to load view for route', hash, err);
    appContainer.innerHTML = `
      <div class="card" style="text-align: center; margin: 2rem auto; max-width: 450px;">
        <h3 style="color: var(--danger);">Gagal Memuat Halaman</h3>
        <p class="text-sm text-muted" style="margin: 0.5rem 0 1rem 0;">${escapeHtml(err.message)}</p>
        <button class="btn btn-primary btn-sm" onclick="location.reload()">Muat Ulang</button>
      </div>
    `;
  }
}

// Global initialization
window.addEventListener('hashchange', () => {
  navigate(window.location.hash);
});

// React to storage changes across tabs
window.addEventListener('storage', () => {
  navigate(window.location.hash);
});

// Initial boot
document.addEventListener('DOMContentLoaded', () => {
  navigate(window.location.hash);
});
