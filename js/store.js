import { todayISO, uid, normalizePhone } from './utils.js';

export const ORDER_STATUS = {
  MENUNGGU: 'menunggu',
  DIPROSES: 'diproses',
  SIAP: 'siap',
  SELESAI: 'selesai',
  DIBATALKAN: 'dibatalkan'
};

export const PAYMENT_STATUS = {
  BELUM: 'belum',
  LUNAS: 'lunas'
};

const STORAGE_KEYS = {
  USERS: 'fo_users',
  FOODS: 'fo_foods',
  AVAILABILITY: 'fo_availability',
  ORDERS: 'fo_orders',
  SETTINGS: 'fo_settings'
};

export class MemoryStorage {
  constructor() {
    this.data = {};
  }
  getItem(key) {
    return this.data.hasOwnProperty(key) ? this.data[key] : null;
  }
  setItem(key, value) {
    this.data[key] = String(value);
  }
  removeItem(key) {
    delete this.data[key];
  }
  clear() {
    this.data = {};
  }
}

export function createStore(storage = (typeof window !== 'undefined' ? window.localStorage : new MemoryStorage())) {
  const getRaw = (key, defaultVal) => {
    try {
      const item = storage.getItem(key);
      return item ? JSON.parse(item) : defaultVal;
    } catch (e) {
      console.error(`Error reading ${key}`, e);
      return defaultVal;
    }
  };

  const setRaw = (key, val) => {
    try {
      storage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error(`Error saving ${key}`, e);
      throw e;
    }
  };

  // --- USERS / CUSTOMERS ---
  const listUsers = () => getRaw(STORAGE_KEYS.USERS, []);
  
  const saveUsers = (users) => setRaw(STORAGE_KEYS.USERS, users);

  const findUserByPhone = (phone) => {
    const norm = normalizePhone(phone);
    if (!norm) return null;
    return listUsers().find(u => u.phone === norm) || null;
  };

  const findUserById = (id) => listUsers().find(u => u.id === id) || null;

  const hasAdmin = () => listUsers().some(u => u.role === 'admin' && u.active);

  const addCustomer = ({ name, phone, pinHash, salt }) => {
    const norm = normalizePhone(phone);
    if (!norm) throw new Error('Nomor HP tidak valid');
    const users = listUsers();
    if (users.some(u => u.phone === norm)) {
      throw new Error(`Nomor HP ${norm} sudah terdaftar`);
    }
    const customer = {
      id: uid(),
      role: 'customer',
      name: name.trim(),
      phone: norm,
      pinHash,
      salt,
      active: true,
      createdAt: new Date().toISOString()
    };
    users.push(customer);
    saveUsers(users);
    return customer;
  };

  const addAdmin = ({ name, phone, pinHash, salt }) => {
    const norm = normalizePhone(phone);
    if (!norm) throw new Error('Nomor HP tidak valid');
    const users = listUsers();
    if (users.some(u => u.phone === norm)) {
      throw new Error(`Nomor HP ${norm} sudah terdaftar`);
    }
    const admin = {
      id: uid(),
      role: 'admin',
      name: name.trim(),
      phone: norm,
      pinHash,
      salt,
      active: true,
      createdAt: new Date().toISOString()
    };
    users.push(admin);
    saveUsers(users);
    return admin;
  };

  const updateCustomer = (id, patch) => {
    const users = listUsers();
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) throw new Error('Pelanggan tidak ditemukan');

    if (patch.phone) {
      const norm = normalizePhone(patch.phone);
      if (!norm) throw new Error('Nomor HP tidak valid');
      if (users.some(u => u.id !== id && u.phone === norm)) {
        throw new Error(`Nomor HP ${norm} sudah digunakan pelanggan lain`);
      }
      patch.phone = norm;
    }

    users[idx] = { ...users[idx], ...patch, updatedAt: new Date().toISOString() };
    saveUsers(users);
    return users[idx];
  };

  // --- FOODS (MASTER MENU) ---
  const listFoods = (includeInactive = false) => {
    const foods = getRaw(STORAGE_KEYS.FOODS, []);
    return includeInactive ? foods : foods.filter(f => f.active);
  };

  const saveFood = (foodData) => {
    const foods = listFoods(true);
    if (foodData.id) {
      const idx = foods.findIndex(f => f.id === foodData.id);
      if (idx === -1) throw new Error('Makanan tidak ditemukan');
      foods[idx] = {
        ...foods[idx],
        name: foodData.name.trim(),
        description: (foodData.description || '').trim(),
        price: Number(foodData.price),
        imageUrl: (foodData.imageUrl || '').trim(),
        active: foodData.active !== undefined ? Boolean(foodData.active) : foods[idx].active,
        updatedAt: new Date().toISOString()
      };
      setRaw(STORAGE_KEYS.FOODS, foods);
      return foods[idx];
    } else {
      const newFood = {
        id: uid(),
        name: foodData.name.trim(),
        description: (foodData.description || '').trim(),
        price: Number(foodData.price),
        imageUrl: (foodData.imageUrl || '').trim(),
        active: true,
        createdAt: new Date().toISOString()
      };
      foods.push(newFood);
      setRaw(STORAGE_KEYS.FOODS, foods);
      return newFood;
    }
  };

  const toggleFood = (id) => {
    const foods = listFoods(true);
    const idx = foods.findIndex(f => f.id === id);
    if (idx === -1) throw new Error('Makanan tidak ditemukan');
    foods[idx].active = !foods[idx].active;
    setRaw(STORAGE_KEYS.FOODS, foods);
    return foods[idx];
  };

  const deleteFood = (id) => {
    const orders = getRaw(STORAGE_KEYS.ORDERS, []);
    const isUsed = orders.some(o => (o.items || []).some(item => item.foodId === id));
    if (isUsed) {
      throw new Error('Makanan tidak bisa dihapus karena sudah ada riwayat pesanan. Anda bisa menonaktifkannya.');
    }
    let foods = listFoods(true);
    foods = foods.filter(f => f.id !== id);
    setRaw(STORAGE_KEYS.FOODS, foods);
    // remove availability
    let avails = getRaw(STORAGE_KEYS.AVAILABILITY, []);
    avails = avails.filter(a => a.foodId !== id);
    setRaw(STORAGE_KEYS.AVAILABILITY, avails);
    return true;
  };

  // --- AVAILABILITY / STOK HARIAN ---
  const listAvailability = () => getRaw(STORAGE_KEYS.AVAILABILITY, []);

  const getAvailability = (date) => {
    const foods = listFoods(false); // active foods
    const avails = listAvailability().filter(a => a.date === date);
    const orders = getRaw(STORAGE_KEYS.ORDERS, []).filter(
      o => o.date === date && o.status !== ORDER_STATUS.DIBATALKAN
    );

    // Calculate sold per food
    const soldMap = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        soldMap[item.foodId] = (soldMap[item.foodId] || 0) + (item.qty || 0);
      });
    });

    return foods.map(food => {
      const avail = avails.find(a => a.foodId === food.id);
      const quota = avail ? Number(avail.quota) : 0;
      const sold = soldMap[food.id] || 0;
      const remaining = Math.max(0, quota - sold);
      return {
        food,
        foodId: food.id,
        date,
        quota,
        sold,
        remaining
      };
    });
  };

  const setQuota = (foodId, date, quota) => {
    const numQuota = Math.max(0, parseInt(quota, 10) || 0);
    // check currently sold
    const orders = getRaw(STORAGE_KEYS.ORDERS, []).filter(
      o => o.date === date && o.status !== ORDER_STATUS.DIBATALKAN
    );
    let sold = 0;
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        if (item.foodId === foodId) sold += item.qty;
      });
    });

    if (numQuota < sold) {
      throw new Error(`Kuota (${numQuota}) tidak boleh lebih kecil dari jumlah yang sudah dipesan (${sold})`);
    }

    const avails = listAvailability();
    const idx = avails.findIndex(a => a.foodId === foodId && a.date === date);
    if (idx !== -1) {
      avails[idx].quota = numQuota;
    } else {
      avails.push({
        id: uid(),
        foodId,
        date,
        quota: numQuota
      });
    }
    setRaw(STORAGE_KEYS.AVAILABILITY, avails);
    return true;
  };

  const copyQuotaFromDate = (fromDate, toDate) => {
    const sourceAvails = listAvailability().filter(a => a.date === fromDate);
    if (sourceAvails.length === 0) {
      throw new Error(`Tidak ada data kuota pada tanggal sumber (${fromDate})`);
    }
    sourceAvails.forEach(sa => {
      setQuota(sa.foodId, toDate, sa.quota);
    });
    return true;
  };

  // --- ORDERS ---
  const listOrders = (filters = {}) => {
    let orders = getRaw(STORAGE_KEYS.ORDERS, []);
    const users = listUsers();
    const userMap = Object.fromEntries(users.map(u => [u.id, u]));

    // Attach customer info
    orders = orders.map(o => ({
      ...o,
      customer: userMap[o.customerId] || { name: 'Tidak Dikenal', phone: '-' }
    }));

    if (filters.customerId) {
      orders = orders.filter(o => o.customerId === filters.customerId);
    }
    if (filters.date) {
      orders = orders.filter(o => o.date === filters.date);
    }
    if (filters.from) {
      orders = orders.filter(o => o.date >= filters.from);
    }
    if (filters.to) {
      orders = orders.filter(o => o.date <= filters.to);
    }
    if (filters.status && filters.status !== 'all') {
      orders = orders.filter(o => o.status === filters.status);
    }
    if (filters.paymentStatus && filters.paymentStatus !== 'all') {
      orders = orders.filter(o => o.paymentStatus === filters.paymentStatus);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      orders = orders.filter(o =>
        o.code.toLowerCase().includes(q) ||
        (o.customer?.name || '').toLowerCase().includes(q) ||
        (o.customer?.phone || '').includes(q)
      );
    }

    // Sort by createdAt descending
    orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return orders;
  };

  const generateOrderCode = (date) => {
    const orders = getRaw(STORAGE_KEYS.ORDERS, []);
    const cleanDate = date.replace(/-/g, '');
    const prefix = `ORD-${cleanDate}-`;
    const countToday = orders.filter(o => (o.code || '').startsWith(prefix)).length + 1;
    return `${prefix}${String(countToday).padStart(4, '0')}`;
  };

  const createOrder = ({ customerId, date, items, note = '' }) => {
    if (!customerId) throw new Error('Customer ID wajib');
    if (!date) throw new Error('Tanggal pemesanan wajib');
    const today = todayISO();
    if (date < today) {
      throw new Error('Tidak bisa memesan untuk tanggal yang sudah lewat');
    }
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Pilih minimal satu makanan');
    }

    // Check stocks
    const avails = getAvailability(date);
    const availMap = Object.fromEntries(avails.map(a => [a.foodId, a]));

    const processedItems = [];
    let grandTotal = 0;

    for (const item of items) {
      const qty = parseInt(item.qty, 10);
      if (qty <= 0) continue;

      const avail = availMap[item.foodId];
      if (!avail || !avail.food.active) {
        throw new Error(`Makanan '${item.name || item.foodId}' tidak tersedia`);
      }
      if (avail.remaining < qty) {
        throw new Error(
          `Stok '${avail.food.name}' tidak mencukupi (sisa ${avail.remaining}, diminta ${qty})`
        );
      }

      const itemTotal = avail.food.price * qty;
      grandTotal += itemTotal;
      processedItems.push({
        foodId: avail.food.id,
        name: avail.food.name,
        price: avail.food.price,
        qty,
        subtotal: itemTotal
      });
    }

    if (processedItems.length === 0) {
      throw new Error('Jumlah pesanan harus lebih dari 0');
    }

    const order = {
      id: uid(),
      code: generateOrderCode(date),
      customerId,
      date,
      items: processedItems,
      total: grandTotal,
      note: (note || '').trim(),
      status: ORDER_STATUS.MENUNGGU,
      paymentStatus: PAYMENT_STATUS.BELUM,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const orders = getRaw(STORAGE_KEYS.ORDERS, []);
    orders.push(order);
    setRaw(STORAGE_KEYS.ORDERS, orders);
    return order;
  };

  const cancelOrder = (orderId, byUserId, isAdmin = false) => {
    const orders = getRaw(STORAGE_KEYS.ORDERS, []);
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Pesanan tidak ditemukan');

    const order = orders[idx];

    if (!isAdmin) {
      if (order.customerId !== byUserId) {
        throw new Error('Anda tidak memiliki akses untuk membatalkan pesanan ini');
      }
      if (order.status !== ORDER_STATUS.MENUNGGU) {
        throw new Error('Pesanan hanya dapat dibatalkan jika status masih Menunggu');
      }
    } else {
      if (order.status === ORDER_STATUS.SELESAI) {
        throw new Error('Pesanan yang sudah selesai tidak dapat dibatalkan');
      }
    }

    orders[idx].status = ORDER_STATUS.DIBATALKAN;
    orders[idx].updatedAt = new Date().toISOString();
    setRaw(STORAGE_KEYS.ORDERS, orders);
    return orders[idx];
  };

  const updateOrderStatus = (orderId, newStatus) => {
    const validStatuses = Object.values(ORDER_STATUS);
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Status ${newStatus} tidak valid`);
    }

    const orders = getRaw(STORAGE_KEYS.ORDERS, []);
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Pesanan tidak ditemukan');

    const curr = orders[idx].status;
    if (curr === ORDER_STATUS.DIBATALKAN && newStatus !== ORDER_STATUS.DIBATALKAN) {
      throw new Error('Pesanan yang sudah dibatalkan tidak bisa diubah statusnya');
    }

    orders[idx].status = newStatus;
    orders[idx].updatedAt = new Date().toISOString();
    setRaw(STORAGE_KEYS.ORDERS, orders);
    return orders[idx];
  };

  const setPaymentStatus = (orderId, status) => {
    if (![PAYMENT_STATUS.BELUM, PAYMENT_STATUS.LUNAS].includes(status)) {
      throw new Error('Status pembayaran tidak valid');
    }
    const orders = getRaw(STORAGE_KEYS.ORDERS, []);
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx === -1) throw new Error('Pesanan tidak ditemukan');

    orders[idx].paymentStatus = status;
    orders[idx].updatedAt = new Date().toISOString();
    setRaw(STORAGE_KEYS.ORDERS, orders);
    return orders[idx];
  };

  // --- STATS / DASHBOARD ---
  const getStats = ({ from, to } = {}) => {
    let orders = getRaw(STORAGE_KEYS.ORDERS, []);
    if (from) orders = orders.filter(o => o.date >= from);
    if (to) orders = orders.filter(o => o.date <= to);

    const nonCancelled = orders.filter(o => o.status !== ORDER_STATUS.DIBATALKAN);

    const totalOrders = orders.length;
    const waitingOrders = orders.filter(o => o.status === ORDER_STATUS.MENUNGGU).length;
    const processingOrders = orders.filter(o => o.status === ORDER_STATUS.DIPROSES).length;
    const readyOrders = orders.filter(o => o.status === ORDER_STATUS.SIAP).length;
    const completedOrders = orders.filter(o => o.status === ORDER_STATUS.SELESAI).length;
    const cancelledOrders = orders.filter(o => o.status === ORDER_STATUS.DIBATALKAN).length;

    // Revenue: Hanya pesanan LUNAS yang tidak dibatalkan
    let income = 0;
    // Piutang: Belum bayar dan tidak dibatalkan
    let receivables = 0;
    let totalPortions = 0;

    const foodSalesMap = {}; // foodId -> { name, portions, total }
    const dailyMap = {}; // date -> { date, income, ordersCount }

    nonCancelled.forEach(o => {
      if (o.paymentStatus === PAYMENT_STATUS.LUNAS) {
        income += o.total;
      } else {
        receivables += o.total;
      }

      // Group per date for charts
      if (!dailyMap[o.date]) {
        dailyMap[o.date] = { date: o.date, income: 0, ordersCount: 0 };
      }
      dailyMap[o.date].ordersCount += 1;
      if (o.paymentStatus === PAYMENT_STATUS.LUNAS) {
        dailyMap[o.date].income += o.total;
      }

      (o.items || []).forEach(item => {
        totalPortions += item.qty;
        if (!foodSalesMap[item.foodId]) {
          foodSalesMap[item.foodId] = {
            id: item.foodId,
            name: item.name,
            portions: 0,
            revenue: 0
          };
        }
        foodSalesMap[item.foodId].portions += item.qty;
        if (o.paymentStatus === PAYMENT_STATUS.LUNAS) {
          foodSalesMap[item.foodId].revenue += item.subtotal;
        }
      });
    });

    const topFoods = Object.values(foodSalesMap)
      .sort((a, b) => b.portions - a.portions)
      .slice(0, 5);

    const dailyTrends = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalOrders,
      waitingOrders,
      processingOrders,
      readyOrders,
      completedOrders,
      cancelledOrders,
      income,
      receivables,
      totalPortions,
      topFoods,
      dailyTrends
    };
  };

  // --- DATA MANAGEMENT & DEMO SEED ---
  const exportJSON = () => {
    return JSON.stringify({
      version: 1,
      exportedAt: new Date().toISOString(),
      users: getRaw(STORAGE_KEYS.USERS, []),
      foods: getRaw(STORAGE_KEYS.FOODS, []),
      availability: getRaw(STORAGE_KEYS.AVAILABILITY, []),
      orders: getRaw(STORAGE_KEYS.ORDERS, [])
    }, null, 2);
  };

  const importJSON = (jsonString) => {
    const data = JSON.parse(jsonString);
    if (!data.users || !data.foods) {
      throw new Error('Format file JSON tidak valid');
    }
    setRaw(STORAGE_KEYS.USERS, data.users || []);
    setRaw(STORAGE_KEYS.FOODS, data.foods || []);
    setRaw(STORAGE_KEYS.AVAILABILITY, data.availability || []);
    setRaw(STORAGE_KEYS.ORDERS, data.orders || []);
    return true;
  };

  const resetAll = () => {
    storage.removeItem(STORAGE_KEYS.USERS);
    storage.removeItem(STORAGE_KEYS.FOODS);
    storage.removeItem(STORAGE_KEYS.AVAILABILITY);
    storage.removeItem(STORAGE_KEYS.ORDERS);
    storage.removeItem(STORAGE_KEYS.SETTINGS);
    storage.removeItem('fo_session');
  };

  const seedDemo = async (hashPinFn) => {
    resetAll();
    const adminSalt = uid();
    const adminHash = await hashPinFn('123456', adminSalt);
    const admin = {
      id: 'usr-admin-demo',
      role: 'admin',
      name: 'Admin Utama',
      phone: '62811000001',
      pinHash: adminHash,
      salt: adminSalt,
      active: true,
      createdAt: new Date().toISOString()
    };

    const cust1Salt = uid();
    const cust1Hash = await hashPinFn('111111', cust1Salt);
    const cust1 = {
      id: 'usr-cust-1',
      role: 'customer',
      name: 'Budi Santoso',
      phone: '628123456789',
      pinHash: cust1Hash,
      salt: cust1Salt,
      active: true,
      createdAt: new Date().toISOString()
    };

    const cust2Salt = uid();
    const cust2Hash = await hashPinFn('222222', cust2Salt);
    const cust2 = {
      id: 'usr-cust-2',
      role: 'customer',
      name: 'Siti Aminah',
      phone: '628987654321',
      pinHash: cust2Hash,
      salt: cust2Salt,
      active: true,
      createdAt: new Date().toISOString()
    };

    setRaw(STORAGE_KEYS.USERS, [admin, cust1, cust2]);

    const foods = [
      { id: 'food-1', name: 'Nasi Ayam Bakar Madu', description: 'Nasi, ayam bakar manis gurih, lalapan, sambal terasi', price: 25000, active: true },
      { id: 'food-2', name: 'Nasi Bebek Goreng Sambal Korek', description: 'Nasi hangat, bebek empuk krispi, sambal korek pedas', price: 32000, active: true },
      { id: 'food-3', name: 'Paket Nasi Rendang Sapi', description: 'Daging sapi empuk bumbu Padang autentik + daun singkong', price: 30000, active: true },
      { id: 'food-4', name: 'Es Teh Manis Melati', description: 'Teh melati wangi segar dingin', price: 5000, active: true },
      { id: 'food-5', name: 'Jus Alpukat Kocok', description: 'Alpukat mentega asli dengan krimer cokelat', price: 15000, active: true }
    ];
    setRaw(STORAGE_KEYS.FOODS, foods);

    const today = todayISO();
    const d = new Date();
    const tomorrow = new Date(d); tomorrow.setDate(d.getDate() + 1);
    const tomStr = tomorrow.toISOString().split('T')[0];
    const dayAfter = new Date(d); dayAfter.setDate(d.getDate() + 2);
    const daStr = dayAfter.toISOString().split('T')[0];

    const avails = [
      { id: uid(), foodId: 'food-1', date: today, quota: 20 },
      { id: uid(), foodId: 'food-2', date: today, quota: 15 },
      { id: uid(), foodId: 'food-3', date: today, quota: 10 },
      { id: uid(), foodId: 'food-4', date: today, quota: 50 },
      { id: uid(), foodId: 'food-5', date: today, quota: 25 },

      { id: uid(), foodId: 'food-1', date: tomStr, quota: 25 },
      { id: uid(), foodId: 'food-2', date: tomStr, quota: 20 },
      { id: uid(), foodId: 'food-3', date: tomStr, quota: 15 },
      { id: uid(), foodId: 'food-4', date: tomStr, quota: 50 },

      { id: uid(), foodId: 'food-1', date: daStr, quota: 30 },
      { id: uid(), foodId: 'food-3', date: daStr, quota: 20 },
      { id: uid(), foodId: 'food-4', date: daStr, quota: 40 }
    ];
    setRaw(STORAGE_KEYS.AVAILABILITY, avails);

    const orders = [
      {
        id: uid(),
        code: `ORD-${today.replace(/-/g, '')}-0001`,
        customerId: cust1.id,
        date: today,
        items: [
          { foodId: 'food-1', name: 'Nasi Ayam Bakar Madu', price: 25000, qty: 2, subtotal: 50000 },
          { foodId: 'food-4', name: 'Es Teh Manis Melati', price: 5000, qty: 2, subtotal: 10000 }
        ],
        total: 60000,
        note: 'Sambal dipisah ya',
        status: ORDER_STATUS.SELESAI,
        paymentStatus: PAYMENT_STATUS.LUNAS,
        createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
        updatedAt: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: uid(),
        code: `ORD-${today.replace(/-/g, '')}-0002`,
        customerId: cust2.id,
        date: today,
        items: [
          { foodId: 'food-2', name: 'Nasi Bebek Goreng Sambal Korek', price: 32000, qty: 1, subtotal: 32000 },
          { foodId: 'food-5', name: 'Jus Alpukat Kocok', price: 15000, qty: 1, subtotal: 15000 }
        ],
        total: 47000,
        note: '',
        status: ORDER_STATUS.DIPROSES,
        paymentStatus: PAYMENT_STATUS.BELUM,
        createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
        updatedAt: new Date(Date.now() - 3600000 * 1).toISOString()
      },
      {
        id: uid(),
        code: `ORD-${tomStr.replace(/-/g, '')}-0001`,
        customerId: cust1.id,
        date: tomStr,
        items: [
          { foodId: 'food-3', name: 'Paket Nasi Rendang Sapi', price: 30000, qty: 3, subtotal: 90000 },
          { foodId: 'food-4', name: 'Es Teh Manis Melati', price: 5000, qty: 3, subtotal: 15000 }
        ],
        total: 105000,
        note: 'Antar jam 11:30',
        status: ORDER_STATUS.MENUNGGU,
        paymentStatus: PAYMENT_STATUS.LUNAS,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    setRaw(STORAGE_KEYS.ORDERS, orders);
    return true;
  };

  return {
    // Users
    listUsers,
    findUserByPhone,
    findUserById,
    hasAdmin,
    addCustomer,
    addAdmin,
    updateCustomer,
    // Foods
    listFoods,
    saveFood,
    toggleFood,
    deleteFood,
    // Availability
    listAvailability,
    getAvailability,
    setQuota,
    copyQuotaFromDate,
    // Orders
    listOrders,
    createOrder,
    cancelOrder,
    updateOrderStatus,
    setPaymentStatus,
    // Stats
    getStats,
    // Utils
    exportJSON,
    importJSON,
    resetAll,
    seedDemo
  };
}

// Default singleton store instance for browser
export const store = createStore();
