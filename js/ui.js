/**
 * UI components, toast notifications, and modal dialog helpers
 */
import { escapeHtml } from './utils.js';

export function toast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;

  container.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    el.style.transition = 'all 0.2s ease-out';
    setTimeout(() => el.remove(), 200);
  }, duration);
}

export function openModal({ title, bodyHtml, footerHtml, onOpen, onClose }) {
  const dialog = document.createElement('dialog');
  dialog.className = 'native-modal';

  dialog.innerHTML = `
    <div class="modal-header">
      <h3>${escapeHtml(title)}</h3>
      <button type="button" class="btn btn-ghost btn-sm close-modal-btn">&times;</button>
    </div>
    <div class="modal-body">${bodyHtml}</div>
    ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ''}
  `;

  document.body.appendChild(dialog);

  const closeDialog = () => {
    dialog.close();
    dialog.remove();
    if (onClose) onClose();
  };

  dialog.querySelector('.close-modal-btn').addEventListener('click', closeDialog);

  dialog.addEventListener('click', (e) => {
    const rect = dialog.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX && e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      closeDialog();
    }
  });

  dialog.showModal();
  if (onOpen) onOpen(dialog, closeDialog);
  return { dialog, close: closeDialog };
}

export function confirmModal(message, { title = 'Konfirmasi', confirmText = 'Ya, Lanjutkan', danger = false } = {}) {
  return new Promise((resolve) => {
    let resolved = false;
    openModal({
      title,
      bodyHtml: `<p style="font-size:0.95rem; margin-bottom: 0.5rem;">${escapeHtml(message)}</p>`,
      footerHtml: `
        <button type="button" class="btn btn-ghost" id="confirm-cancel">Batal</button>
        <button type="button" class="btn ${danger ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">${escapeHtml(confirmText)}</button>
      `,
      onOpen: (dialog, close) => {
        dialog.querySelector('#confirm-cancel').addEventListener('click', () => {
          resolved = true;
          close();
          resolve(false);
        });
        dialog.querySelector('#confirm-ok').addEventListener('click', () => {
          resolved = true;
          close();
          resolve(true);
        });
      },
      onClose: () => {
        if (!resolved) {
          resolve(false);
        }
      }
    });
  });
}

export function renderBadgeStatus(status) {
  const map = {
    menunggu: { label: 'Menunggu', class: 'badge-menunggu' },
    diproses: { label: 'Diproses', class: 'badge-diproses' },
    siap: { label: 'Siap', class: 'badge-siap' },
    selesai: { label: 'Selesai', class: 'badge-selesai' },
    dibatalkan: { label: 'Dibatalkan', class: 'badge-dibatalkan' }
  };
  const item = map[status] || { label: status, class: '' };
  return `<span class="badge ${item.class}">${escapeHtml(item.label)}</span>`;
}

export function renderBadgePayment(status) {
  if (status === 'lunas') {
    return `<span class="badge badge-lunas">Lunas</span>`;
  }
  return `<span class="badge badge-belum">Belum Bayar</span>`;
}
