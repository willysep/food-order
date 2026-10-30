import { store } from '../store.js';
import { hashPin } from '../auth.js';
import { confirmModal, toast } from '../ui.js';

export function render(container) {
  container.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Pengaturan & Backup Data</h1>
        <p class="subtitle">Ekspor, impor cadangan data JSON, dan reset sistem penyimpanan lokal.</p>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.5rem;">
      <!-- Export Card -->
      <div class="card">
        <h3>Ekspor Cadangan (Backup)</h3>
        <p class="text-sm text-muted" style="margin: 0.5rem 0 1rem 0;">
          Unduh seluruh data (pelanggan, menu, jadwal kuota, dan riwayat pesanan) dalam satu berkas format JSON untuk disimpan di komputer Anda.
        </p>
        <button id="export-json-btn" class="btn btn-primary">
          Unduh File JSON
        </button>
      </div>

      <!-- Import Card -->
      <div class="card">
        <h3>Impor Cadangan (Restore)</h3>
        <p class="text-sm text-muted" style="margin: 0.5rem 0 1rem 0;">
          Pulihkan data dari berkas backup JSON yang sebelumnya pernah diunduh.
        </p>
        <input type="file" id="import-file-input" accept=".json" style="display: none;" />
        <button id="import-json-btn" class="btn">
          Pilih File Cadangan JSON...
        </button>
      </div>

      <!-- Seed Demo Card -->
      <div class="card">
        <h3>Muat Data Demo / Contoh</h3>
        <p class="text-sm text-muted" style="margin: 0.5rem 0 1rem 0;">
          Isi sistem dengan sampel menu katering, pelanggan uji coba, stok 3 hari, dan beberapa pesanan.
        </p>
        <button id="seed-demo-btn" class="btn">
          Muat Data Demo
        </button>
      </div>

      <!-- Reset Card -->
      <div class="card" style="border-color: #fecaca;">
        <h3 style="color: var(--danger);">Reset Seluruh Data</h3>
        <p class="text-sm text-muted" style="margin: 0.5rem 0 1rem 0;">
          Hapus semua data dari localStorage browser ini. Sistem akan kembali ke kondisi awal (layar setup admin).
        </p>
        <button id="reset-all-btn" class="btn btn-danger">
          Hapus Semua Data
        </button>
      </div>
    </div>
  `;

  // Export
  container.querySelector('#export-json-btn').addEventListener('click', () => {
    try {
      const json = store.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-food-order-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('Berkas cadangan berhasil diunduh', 'success');
    } catch (err) {
      toast('Gagal mengunduh: ' + err.message, 'error');
    }
  });

  // Import
  const fileInput = container.querySelector('#import-file-input');
  container.querySelector('#import-json-btn').addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ok = await confirmModal('Mengimpor data cadangan akan menimpa seluruh data saat ini. Lanjutkan?', {
      title: 'Konfirmasi Impor',
      confirmText: 'Ya, Timpa Data',
      danger: true
    });
    if (!ok) {
      fileInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        store.importJSON(event.target.result);
        toast('Data berhasil dipulihkan dari cadangan!', 'success');
        setTimeout(() => {
          window.location.hash = '#/admin';
          window.location.reload();
        }, 1000);
      } catch (err) {
        toast('Gagal mengimpor file: ' + err.message, 'error');
      }
    };
    reader.readAsText(file);
  });

  // Demo
  container.querySelector('#seed-demo-btn').addEventListener('click', async () => {
    const ok = await confirmModal('Muat data contoh? Data yang ada sekarang akan digantikan dengan data demo.', {
      title: 'Muat Data Demo',
      confirmText: 'Muat Sekarang'
    });
    if (!ok) return;

    try {
      await store.seedDemo(hashPin);
      toast('Data demo berhasil dimuat!', 'success');
      setTimeout(() => {
        window.location.hash = '#/admin';
        window.location.reload();
      }, 800);
    } catch (err) {
      toast('Gagal memuat demo: ' + err.message, 'error');
    }
  });

  // Reset
  container.querySelector('#reset-all-btn').addEventListener('click', async () => {
    const ok1 = await confirmModal('PERINGATAN: Tindakan ini akan menghapus semua pelanggan, menu, kuota, dan pesanan secara permanen dari browser.', {
      title: 'Hapus Semua Data',
      confirmText: 'Ya, Lanjutkan',
      danger: true
    });
    if (!ok1) return;

    const ok2 = await confirmModal('Ketik konfirmasi terakhir. Anda yakin ingin mereset aplikasi ke kondisi awal?', {
      title: 'Konfirmasi Akhir',
      confirmText: 'Hapus Bersih',
      danger: true
    });
    if (!ok2) return;

    store.resetAll();
    toast('Semua data berhasil dibersihkan', 'info');
    setTimeout(() => {
      window.location.hash = '#/setup';
      window.location.reload();
    }, 500);
  });
}
