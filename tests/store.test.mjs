import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, MemoryStorage, ORDER_STATUS, PAYMENT_STATUS } from '../js/store.js';
import { todayISO, addDaysISO } from '../js/utils.js';

test('store customer management', () => {
  const store = createStore(new MemoryStorage());

  const cust = store.addCustomer({
    name: 'Budi Test',
    phone: '08123456789',
    pinHash: 'fakehash',
    salt: 'fakesalt'
  });

  assert.equal(cust.name, 'Budi Test');
  assert.equal(cust.phone, '628123456789');
  assert.equal(cust.role, 'customer');

  // Duplicate phone should throw
  assert.throws(() => {
    store.addCustomer({
      name: 'Budi 2',
      phone: '+628123456789',
      pinHash: 'fake',
      salt: 'fake'
    });
  }, /sudah terdaftar/);

  // Update customer
  const updated = store.updateCustomer(cust.id, { name: 'Budi Update' });
  assert.equal(updated.name, 'Budi Update');
});

test('store food and availability management', () => {
  const store = createStore(new MemoryStorage());
  const food1 = store.saveFood({
    name: 'Nasi Goreng',
    description: 'Enak',
    price: 20000
  });

  assert.equal(food1.name, 'Nasi Goreng');
  assert.equal(food1.price, 20000);
  assert.equal(food1.active, true);

  const today = todayISO();
  store.setQuota(food1.id, today, 10);

  const avails = store.getAvailability(today);
  assert.equal(avails.length, 1);
  assert.equal(avails[0].quota, 10);
  assert.equal(avails[0].sold, 0);
  assert.equal(avails[0].remaining, 10);
});

test('store order creation, stock deduction, and cancellation', () => {
  const store = createStore(new MemoryStorage());
  const cust = store.addCustomer({
    name: 'Pelanggan 1',
    phone: '081122334455',
    pinHash: 'hash',
    salt: 'salt'
  });

  const food = store.saveFood({
    name: 'Ayam Penyet',
    price: 25000
  });

  const today = todayISO();
  store.setQuota(food.id, today, 5);

  // Successful order
  const order = store.createOrder({
    customerId: cust.id,
    date: today,
    items: [{ foodId: food.id, qty: 3 }],
    note: 'Pedas'
  });

  assert.equal(order.total, 75000);
  assert.equal(order.status, ORDER_STATUS.MENUNGGU);
  assert.equal(order.paymentStatus, PAYMENT_STATUS.BELUM);

  // Check remaining stock
  let avails = store.getAvailability(today);
  assert.equal(avails[0].sold, 3);
  assert.equal(avails[0].remaining, 2);

  // Order exceeding stock should fail
  assert.throws(() => {
    store.createOrder({
      customerId: cust.id,
      date: today,
      items: [{ foodId: food.id, qty: 3 }] // only 2 left
    });
  }, /Stok.*tidak mencukupi/);

  // Cannot decrease quota below sold quantity
  assert.throws(() => {
    store.setQuota(food.id, today, 2); // sold is 3
  }, /tidak boleh lebih kecil/);

  // Customer cancels order while status is MENUNGGU
  const cancelled = store.cancelOrder(order.id, cust.id, false);
  assert.equal(cancelled.status, ORDER_STATUS.DIBATALKAN);

  // Stock restored
  avails = store.getAvailability(today);
  assert.equal(avails[0].sold, 0);
  assert.equal(avails[0].remaining, 5);
});

test('order status transitions and cancellation restrictions', () => {
  const store = createStore(new MemoryStorage());
  const cust = store.addCustomer({
    name: 'Pelanggan 2',
    phone: '089988776655',
    pinHash: 'hash',
    salt: 'salt'
  });
  const food = store.saveFood({ name: 'Sate Ayam', price: 20000 });
  const today = todayISO();
  store.setQuota(food.id, today, 10);

  const order = store.createOrder({
    customerId: cust.id,
    date: today,
    items: [{ foodId: food.id, qty: 2 }]
  });

  // Admin advances to DIPROSES
  store.updateOrderStatus(order.id, ORDER_STATUS.DIPROSES);

  // Customer tries to cancel now -> should fail
  assert.throws(() => {
    store.cancelOrder(order.id, cust.id, false);
  }, /hanya dapat dibatalkan jika status masih Menunggu/);

  // Another customer tries to cancel -> should fail
  assert.throws(() => {
    store.cancelOrder(order.id, 'other-customer-id', false);
  }, /tidak memiliki akses/);
});

test('dashboard stats calculation', () => {
  const store = createStore(new MemoryStorage());
  const cust = store.addCustomer({ name: 'User 1', phone: '081234567890', pinHash: 'h', salt: 's' });
  const food1 = store.saveFood({ name: 'Menu A', price: 10000 });
  const food2 = store.saveFood({ name: 'Menu B', price: 20000 });
  const today = todayISO();

  store.setQuota(food1.id, today, 20);
  store.setQuota(food2.id, today, 20);

  // Order 1: Lunas (10.000 * 2 = 20.000)
  const o1 = store.createOrder({
    customerId: cust.id,
    date: today,
    items: [{ foodId: food1.id, qty: 2 }]
  });
  store.setPaymentStatus(o1.id, PAYMENT_STATUS.LUNAS);

  // Order 2: Belum Bayar (20.000 * 1 = 20.000)
  const o2 = store.createOrder({
    customerId: cust.id,
    date: today,
    items: [{ foodId: food2.id, qty: 1 }]
  });

  // Order 3: Dibatalkan (tidak masuk pemasukan/piutang)
  const o3 = store.createOrder({
    customerId: cust.id,
    date: today,
    items: [{ foodId: food1.id, qty: 1 }]
  });
  store.cancelOrder(o3.id, cust.id, false);

  const stats = store.getStats({ from: today, to: today });
  assert.equal(stats.totalOrders, 3);
  assert.equal(stats.cancelledOrders, 1);
  assert.equal(stats.income, 20000); // Only LUNAS
  assert.equal(stats.receivables, 20000); // Only BELUM (not cancelled)
  assert.equal(stats.totalPortions, 3); // 2 of food1 + 1 of food2 (o3 is cancelled)
});
