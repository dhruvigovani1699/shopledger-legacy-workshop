var assert = require('node:assert/strict');
var test = require('node:test');
var inventory = require('../lib/inventory');
var ledger = require('../lib/ledger');
var orders = require('../lib/orders');

test('inventory allows selling exactly the remaining sellable quantity', function () {
  var products = [
    { id: 1, name: 'Last unit', stock: 1, reserved: 0 },
    { id: 2, name: 'Reserved stock', stock: 4, reserved: 3 }
  ];

  assert.deepEqual(inventory.check(products, [{ id: 1, qty: 1 }]), { ok: true });
  assert.deepEqual(inventory.check(products, [{ id: 2, qty: 1 }]), { ok: true });
  assert.equal(inventory.check(products, [{ id: 2, qty: 2 }]).ok, false);
});

test('cancelling an order restores physical stock once', function () {
  var db = {
    nextOrderId: 2,
    products: [{ id: 1, name: 'Ghee', stock: 3, reserved: 0 }],
    orders: [{
      id: 1,
      status: 'pending',
      items: [{ id: 1, name: 'Ghee', qty: 2 }],
      paymentMode: 'cash',
      total: 100
    }]
  };

  assert.equal(orders.cancel(db, 1, 'Customer request').ok, true);
  assert.equal(db.products[0].stock, 5);
  assert.equal(orders.cancel(db, 1).ok, false);
  assert.equal(db.products[0].stock, 5);
});

test('order history sorts newest first and filters ISO date ranges chronologically', function () {
  var db = { orders: [
    { id: 1004, date: '30/01/2022' },
    { id: 1001, date: '28/12/2021' },
    { id: 1008, date: '15/03/2022' },
    { id: 1007, date: '04/03/2022' }
  ] };

  assert.deepEqual(orders.list(db, {}).map(function (order) { return order.id; }), [1008, 1007, 1004, 1001]);
  assert.deepEqual(
    orders.list(db, { from: '2022-01-01', to: '2022-01-31' }).map(function (order) { return order.id; }),
    [1004]
  );
});

test('Khata settlements treat submitted amounts as numbers', function () {
  var db = {
    nextSettlementId: 1,
    customers: [{
      id: 1,
      name: 'Meera Joshi',
      openingBalance: 450,
      totalBilled: 1982.01,
      totalSettled: 1200
    }],
    settlements: []
  };

  var result = ledger.recordSettlement(db, 1, '500', 'upi', '');

  assert.equal(result.ok, true);
  assert.equal(result.customer.totalSettled, 1700);
  assert.equal(result.customer.balance, 732.01);
  assert.equal(result.settlement.amount, 500);
});
