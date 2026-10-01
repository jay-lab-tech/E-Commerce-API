import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import jwt from 'jsonwebtoken';

const baseUrl = process.env.TEST_BASE_URL ?? 'http://localhost:3001';
const secret = process.env.JWT_ACCESS_SECRET ?? 'local-ecommerce-development-secret-32chars-min';

function token(role: 'USER' | 'ADMIN') {
  return jwt.sign({ role }, secret, {
    subject: randomUUID(),
    issuer: 'auth-service',
    audience: 'auth-service',
    expiresIn: '10m',
  });
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  const body = await response.json() as { data?: any; error?: { code: string } };
  return { response, body };
}

test('catalog to checkout lifecycle', async () => {
  const adminToken = token('ADMIN');
  const userToken = token('USER');
  const adminHeaders = { authorization: `Bearer ${adminToken}` };
  const userHeaders = { authorization: `Bearer ${userToken}` };
  const suffix = randomUUID().slice(0, 8);

  const categoryResult = await request('/api/categories', {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({ name: `Integration ${suffix}` }),
  });
  assert.equal(categoryResult.response.status, 201);

  const productResult = await request('/api/products', {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({
      categoryId: categoryResult.body.data.id,
      name: `Integration Product ${suffix}`,
      price: '12500.00',
      stock: 7,
    }),
  });
  assert.equal(productResult.response.status, 201);
  const product = productResult.body.data;

  const addResult = await request('/api/cart/items', {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ productId: product.id, quantity: 2 }),
  });
  assert.equal(addResult.response.status, 201);

  const checkoutResult = await request('/api/orders', {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ shippingAddress: 'Jl. Integration No. 1, Jakarta' }),
  });
  assert.equal(checkoutResult.response.status, 201);
  assert.equal(checkoutResult.body.data.status, 'PENDING');
  assert.equal(checkoutResult.body.data.payment.status, 'PENDING');

  const productAfterCheckout = await request(`/api/products/${product.slug}`);
  assert.equal(productAfterCheckout.body.data.stock, 5);

  const orderId = checkoutResult.body.data.id;
  const paymentResult = await request(`/api/orders/${orderId}/pay`, { method: 'POST', headers: userHeaders });
  assert.equal(paymentResult.response.status, 200);
  assert.equal(paymentResult.body.data.status, 'PAID');

  const repeatedPayment = await request(`/api/orders/${orderId}/pay`, { method: 'POST', headers: userHeaders });
  assert.equal(repeatedPayment.response.status, 200);
  assert.equal(repeatedPayment.body.data.status, 'PAID');

  for (const status of ['PROCESSING', 'SHIPPED', 'COMPLETED']) {
    const result = await request(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ status }),
    });
    assert.equal(result.response.status, 200);
    assert.equal(result.body.data.status, status);
  }
});

test('validation, authorization, stock, and cancellation rules', async () => {
  const adminHeaders = { authorization: `Bearer ${token('ADMIN')}` };
  const userHeaders = { authorization: `Bearer ${token('USER')}` };
  const suffix = randomUUID().slice(0, 8);

  const emptyCheckout = await request('/api/orders', {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ shippingAddress: 'Jl. Empty Cart No. 1, Jakarta' }),
  });
  assert.equal(emptyCheckout.response.status, 400);
  assert.equal(emptyCheckout.body.error?.code, 'EMPTY_CART');

  const forbiddenAdminList = await request('/api/admin/orders', { headers: userHeaders });
  assert.equal(forbiddenAdminList.response.status, 403);

  const categoryResult = await request('/api/categories', {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({ name: `Error Cases ${suffix}` }),
  });
  assert.equal(categoryResult.response.status, 201);

  const productResult = await request('/api/products', {
    method: 'POST', headers: adminHeaders,
    body: JSON.stringify({
      categoryId: categoryResult.body.data.id,
      name: `Limited Product ${suffix}`,
      price: '9900.00',
      stock: 4,
    }),
  });
  assert.equal(productResult.response.status, 201);
  const product = productResult.body.data;

  const insufficientStock = await request('/api/cart/items', {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ productId: product.id, quantity: 5 }),
  });
  assert.equal(insufficientStock.response.status, 409);
  assert.equal(insufficientStock.body.error?.code, 'INSUFFICIENT_STOCK');

  const addItem = await request('/api/cart/items', {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ productId: product.id, quantity: 3 }),
  });
  assert.equal(addItem.response.status, 201);

  const checkout = await request('/api/orders', {
    method: 'POST', headers: userHeaders,
    body: JSON.stringify({ shippingAddress: 'Jl. Cancellation No. 4, Jakarta' }),
  });
  assert.equal(checkout.response.status, 201);
  const orderId = checkout.body.data.id;

  const reducedProduct = await request(`/api/products/${product.slug}`);
  assert.equal(reducedProduct.body.data.stock, 1);

  const cancelled = await request(`/api/admin/orders/${orderId}/status`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ status: 'CANCELLED' }),
  });
  assert.equal(cancelled.response.status, 200);
  assert.equal(cancelled.body.data.status, 'CANCELLED');
  assert.equal(cancelled.body.data.payment.status, 'EXPIRED');

  const restoredProduct = await request(`/api/products/${product.slug}`);
  assert.equal(restoredProduct.body.data.stock, 4);

  const invalidTransition = await request(`/api/admin/orders/${orderId}/status`, {
    method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ status: 'PROCESSING' }),
  });
  assert.equal(invalidTransition.response.status, 409);
  assert.equal(invalidTransition.body.error?.code, 'INVALID_STATUS_TRANSITION');
});
