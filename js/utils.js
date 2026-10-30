/**
 * Utility functions for Food Order App
 */

export const formatRupiah = (n) => {
  if (typeof n !== 'number' || isNaN(n)) return 'Rp 0';
  return 'Rp ' + Math.round(n).toLocaleString('id-ID');
};

/**
 * Normalizes phone numbers to 628xxxxxxxx format.
 * Accepts: '08123456789', '+628123456789', '628123456789', '0812-3456-7890', etc.
 * Returns normalized string or null if invalid.
 */
export function normalizePhone(input) {
  if (!input || typeof input !== 'string') return null;
  // Clean whitespace, dashes, plus, dots
  let cleaned = input.replace(/[\s\-\+\.\(\)]/g, '');
  if (/^08\d{8,12}$/.test(cleaned)) {
    return '62' + cleaned.substring(1);
  }
  if (/^628\d{8,12}$/.test(cleaned)) {
    return cleaned;
  }
  return null;
}

export const isValidPin = (pin) => {
  return typeof pin === 'string' && /^\d{6}$/.test(pin);
};

/**
 * Returns current date in YYYY-MM-DD (local time)
 */
export const todayISO = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Add days to an ISO date string (YYYY-MM-DD)
 */
export const addDaysISO = (isoDate, days) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Format ISO date string into Indonesian readable format: "Jumat, 30 Okt 2026"
 */
export const formatDate = (isoDate, withDay = true) => {
  if (!isoDate) return '-';
  const [y, m, d] = isoDate.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (isNaN(date.getTime())) return isoDate;

  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  if (withDay) {
    options.weekday = 'short';
  }
  return date.toLocaleDateString('id-ID', options);
};

export const formatDateTime = (isoDateTime) => {
  if (!isoDateTime) return '-';
  const d = new Date(isoDateTime);
  if (isNaN(d.getTime())) return isoDateTime;
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const uid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 9);
};

export const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Fallback image jika gambar tidak ditemukan / gagal dimuat (Delicious catering meal)
export const DEFAULT_FOOD_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

/**
 * Returns a reliable Unsplash dummy photo URL based on food name or category.
 * If food has an existing custom image/URL, it uses that instead.
 */
export const getFoodImageUrl = (food) => {
  if (food?.imageUrl && food.imageUrl.trim()) {
    return food.imageUrl.trim();
  }
  const name = (food?.name || '').toLowerCase();
  
  if (name.includes('ayam') || name.includes('chicken')) {
    // Roasted / fried chicken
    return 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('bebek') || name.includes('duck')) {
    // Roasted duck / crispy duck
    return 'https://images.unsplash.com/photo-1518492104633-130d0cc84637?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('rendang') || name.includes('sapi') || name.includes('daging') || name.includes('beef')) {
    // Beef steak / rendang
    return 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('teh') || name.includes('tea') || name.includes('es ') || name.includes('minum')) {
    // Ice tea / drink
    return 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('jus') || name.includes('alpukat') || name.includes('juice') || name.includes('smoothie')) {
    // Avocado juice / fruit drink
    return 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('choi pan') || name.includes('dimsum') || name.includes('snack')) {
    // Steamed dumpling / choi pan
    return 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('susu') || name.includes('kedelai') || name.includes('milk')) {
    // Soy milk / bottle drink
    return 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('ikan') || name.includes('fish') || name.includes('seafood')) {
    return 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80';
  }
  if (name.includes('nasi') || name.includes('rice')) {
    return 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80';
  }
  // Neutral delicious catering plate default
  return DEFAULT_FOOD_IMAGE;
};
