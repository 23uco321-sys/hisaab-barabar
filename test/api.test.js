import test from 'node:test';
import assert from 'node:assert/strict';
import app from '../src/server.js';
import { store } from '../src/store.js';

let server;
let baseUrl;

test.before(async () => {
  store.reset();
  await new Promise((resolve) => {
    // Listen on port 0 for ephemeral testing port
    server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET /healthz returns 200 OK with SDG 8 metadata', async () => {
  const res = await fetch(`${baseUrl}/healthz`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.service, 'Hisaab-Barabar');
  assert.equal(data.version, '1.0.0');
  assert.match(data.sdg, /UN SDG 8/);
});

test('GET /api/sectors returns configured sectors', async () => {
  const res = await fetch(`${baseUrl}/api/sectors`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.sectors.construction);
  assert.ok(data.sectors.college);
  assert.equal(data.sectors.construction.standardShiftHours, 8.0);
  assert.equal(data.sectors.college.standardShiftHours, 7.0);
});

test('PUT /api/sectors/:id updates sector base rates and hours', async () => {
  const res = await fetch(`${baseUrl}/api/sectors/construction`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hourlyBaseRate: 135.0 })
  });
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.sector.hourlyBaseRate, 135.0);

  // Restore
  store.updateSectorConfig('construction', { hourlyBaseRate: 120.0 });
});

test('GET /api/workers returns seeded workers', async () => {
  const res = await fetch(`${baseUrl}/api/workers`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.workers.length >= 6);
  assert.ok(data.workers.some(w => w.name === 'Ramesh Kumar'));
});

test('POST /api/workers registers a new worker', async () => {
  const res = await fetch(`${baseUrl}/api/workers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Kavita Rawat',
      role: 'Safety Steward',
      sectorId: 'construction',
      phone: '+91 98999 11111'
    })
  });
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.worker.name, 'Kavita Rawat');
  assert.equal(data.worker.sectorId, 'construction');
});

test('POST /api/shifts/check-in and check-out calculates hours and payslip', async () => {
  const workerId = 'W-CONST-02'; // Sunita Devi

  // Ensure no active shift initially
  const activeCheck = store.getActiveShift(workerId);
  if (activeCheck) {
    store.checkOut(workerId);
  }

  // 1. Check in 8 hours in the past
  const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
  const inRes = await fetch(`${baseUrl}/api/shifts/check-in`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workerId,
      startTime: eightHoursAgo,
      notes: 'Morning shift check-in'
    })
  });
  assert.equal(inRes.status, 201);
  const inData = await inRes.json();
  assert.equal(inData.success, true);
  assert.equal(inData.shift.status, 'active');

  // 2. Check out
  const now = new Date().toISOString();
  const outRes = await fetch(`${baseUrl}/api/shifts/check-out`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      workerId,
      endTime: now,
      notes: 'Shift completed safely'
    })
  });
  assert.equal(outRes.status, 200);
  const outData = await outRes.json();
  assert.equal(outData.success, true);
  assert.equal(outData.shift.status, 'completed');
  assert.equal(outData.shift.totalHours, 8.0);
  assert.equal(outData.shift.netPay, 891.6);

  // 3. Inspect Payslip endpoint
  const slipRes = await fetch(`${baseUrl}/api/shifts/${outData.shift.id}/payslip`);
  assert.equal(slipRes.status, 200);
  const slipData = await slipRes.json();
  assert.equal(slipData.success, true);
  assert.equal(slipData.payslip.accounting.netPay, 891.6);
  assert.equal(slipData.payslip.compliance.fatigueFlag, 'CLEAR');
});

test('POST /api/hazards and PATCH /api/hazards/:id updates triage status', async () => {
  // Create hazard
  const postRes = await fetch(`${baseUrl}/api/hazards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sectorId: 'college',
      category: 'Electrical / Fuse Panel',
      severity: 'high',
      location: 'Sub-station Room B',
      description: 'Water seepage near main 415V breaker busbar.'
    })
  });
  assert.equal(postRes.status, 201);
  const postData = await postRes.json();
  assert.equal(postData.success, true);
  const hazardId = postData.hazard.id;
  assert.equal(postData.hazard.status, 'reported');

  // Patch hazard status
  const patchRes = await fetch(`${baseUrl}/api/hazards/${hazardId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status: 'investigating',
      adminNotes: 'Sub-station power isolated. Maintenance technician en route.'
    })
  });
  assert.equal(patchRes.status, 200);
  const patchData = await patchRes.json();
  assert.equal(patchData.success, true);
  assert.equal(patchData.hazard.status, 'investigating');
  assert.match(patchData.hazard.adminNotes, /Sub-station power isolated/);
});

test('GET /api/dashboard returns metrics aggregate', async () => {
  const res = await fetch(`${baseUrl}/api/dashboard`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.metrics.totalWorkers >= 6);
  assert.ok(data.metrics.completedShiftsCount >= 1);
  assert.ok(data.metrics.totalHoursWorked > 0);
});
