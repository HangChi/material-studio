// Run inside the frontend container: docker compose exec -T frontend node --input-type=module < scripts/verify-003.mjs
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:3000';
async function request(path, method = 'GET', cookie, body) {
  const headers = new Headers();
  if (cookie) headers.set('cookie', cookie);
  if (method !== 'GET') headers.set('origin', base);
  if (body && !(body instanceof FormData)) { headers.set('content-type', 'application/json'); body = JSON.stringify(body); }
  return fetch(base + path, { method, headers, body });
}
async function session() {
  const response = await request('/api/session', 'POST');
  assert.equal(response.status, 200);
  const header = response.headers.getSetCookie()[0];
  assert.match(header, /HttpOnly/);
  return header.split(';')[0];
}
const owner = await session(), stranger = await session();
try {
  const png = new Uint8Array(await (await request('/api/demo/portrait.png')).arrayBuffer());
  async function upload() {
    const form = new FormData(); form.append('file', new Blob([png], { type: 'image/png' }), 'example.png');
    const response = await request('/api/assets', 'POST', owner, form);
    assert.equal(response.status, 201, await response.clone().text());
    return response.json();
  }
  const first = await upload(), second = await upload();
  const read = await request(first.url, 'GET', owner);
  assert.equal(read.status, 200); assert.equal(read.headers.get('cache-control'), 'no-store');
  assert.deepEqual(new Uint8Array(await read.arrayBuffer()), png);
  assert.equal((await request(first.url, 'GET', stranger)).status, 404);
  assert.equal((await request('/api/jobs', 'POST', owner, { templateId: 'demo-postcard', assetIds: [first.id] })).status, 422);
  const response = await request('/api/jobs', 'POST', owner, { templateId: 'demo-postcard', assetIds: [first.id, second.id] });
  assert.equal(response.status, 202, await response.clone().text());
  const { job } = await response.json();
  assert.equal(job.status, 'FAILED'); assert.equal(job.errorCode, 'PROCESSOR_NOT_AVAILABLE');
  assert.equal((await request('/api/jobs/' + job.id, 'GET', stranger)).status, 404);
  const stored = await (await request('/api/jobs/' + job.id, 'GET', owner)).json();
  assert.deepEqual(stored.job, job);
  const records = await (await request('/api/jobs', 'GET', owner)).json();
  assert.ok(records.items.some(item => item.id === job.id));
  assert.equal((await request('/api/jobs', 'POST', owner, { templateId: 'demo-portrait', assetIds: [first.id], ownerId: 'forged' })).status, 400);
  console.log('PASS: browser-origin proxy -> session -> multipart storage -> private read -> admission -> recorded rejection -> owner-only reconciliation');
} finally {
  await request('/api/session', 'DELETE', owner);
  await request('/api/session', 'DELETE', stranger);
}
