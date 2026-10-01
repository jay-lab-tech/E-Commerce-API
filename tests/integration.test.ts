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
