import { Router } from 'express';
import { store } from '../store.js';
import { generatePayslip } from '../calculations.js';

export const apiRouter = Router();

// 1. Sectors
apiRouter.get('/sectors', (req, res) => {
  res.json({ success: true, sectors: store.sectors });
});

apiRouter.put('/sectors/:id', (req, res) => {
  try {
    const updated = store.updateSectorConfig(req.params.id, req.body);
    res.json({ success: true, sector: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 2. Workers
apiRouter.get('/workers', (req, res) => {
  const { sectorId } = req.query;
  const workers = store.getWorkers(sectorId);
  res.json({ success: true, workers });
});

apiRouter.post('/workers', (req, res) => {
  try {
    const { name, phone, role, sectorId, badgeNumber, emergencyContact } = req.body;
    if (!name || !role || !sectorId) {
      return res.status(400).json({ success: false, error: 'Name, role, and sectorId are required.' });
    }
    const worker = store.addWorker({ name, phone, role, sectorId, badgeNumber, emergencyContact });
    res.status(201).json({ success: true, worker });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.get('/workers/:id', (req, res) => {
  const worker = store.getWorkerById(req.params.id);
  if (!worker) {
    return res.status(404).json({ success: false, error: 'Worker not found.' });
  }
  const activeShift = store.getActiveShift(worker.id);
  res.json({ success: true, worker, activeShift: activeShift || null });
});

// 3. Shifts
apiRouter.get('/shifts', (req, res) => {
  const { sectorId, workerId, status } = req.query;
  const shifts = store.getShifts({ sectorId, workerId, status });
  // Enrich with worker details
  const enriched = shifts.map(s => {
    const w = store.getWorkerById(s.workerId);
    return {
      ...s,
      workerName: w ? w.name : 'Unknown Worker',
      workerRole: w ? w.role : '',
      workerBadge: w ? w.badgeNumber : ''
    };
  });
  res.json({ success: true, shifts: enriched });
});

apiRouter.post('/shifts/check-in', (req, res) => {
  try {
    const { workerId, startTime, notes } = req.body;
    if (!workerId) {
      return res.status(400).json({ success: false, error: 'Worker ID is required to check in.' });
    }
    const shift = store.checkIn(workerId, startTime, notes);
    res.status(201).json({ success: true, shift });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.post('/shifts/check-out', (req, res) => {
  try {
    const { workerId, endTime, notes } = req.body;
    if (!workerId) {
      return res.status(400).json({ success: false, error: 'Worker ID is required to check out.' });
    }
    const result = store.checkOut(workerId, endTime, notes);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.post('/shifts/manual', (req, res) => {
  try {
    const { workerId, startTime, endTime, notes } = req.body;
    if (!workerId || !startTime || !endTime) {
      return res.status(400).json({ success: false, error: 'Worker ID, start time, and end time are required.' });
    }
    const shift = store.logManualShift({ workerId, startTime, endTime, notes });
    res.status(201).json({ success: true, shift });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.get('/shifts/:id/payslip', (req, res) => {
  const shift = store.shifts.find(s => s.id === req.params.id);
  if (!shift) {
    return res.status(404).json({ success: false, error: 'Shift record not found.' });
  }

  if (shift.status === 'active') {
    return res.status(400).json({ success: false, error: 'Cannot issue payslip for an ongoing active shift.' });
  }

  const worker = store.getWorkerById(shift.workerId);
  const sectorConfig = store.sectors[shift.sectorId];

  if (!worker || !sectorConfig) {
    return res.status(500).json({ success: false, error: 'Worker or Sector data missing.' });
  }

  const payslip = generatePayslip(worker, shift, sectorConfig);
  res.json({ success: true, payslip });
});

// 4. Hazards
apiRouter.get('/hazards', (req, res) => {
  const { sectorId } = req.query;
  const hazards = store.getHazards(sectorId);
  res.json({ success: true, hazards });
});

apiRouter.post('/hazards', (req, res) => {
  try {
    const hazard = store.createHazard(req.body);
    res.status(201).json({ success: true, hazard });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

apiRouter.patch('/hazards/:id', (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const updated = store.updateHazardStatus(req.params.id, { status, adminNotes });
    res.json({ success: true, hazard: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 5. Admin Dashboard Metrics
apiRouter.get('/dashboard', (req, res) => {
  const { sectorId } = req.query;
  const metrics = store.getDashboardMetrics(sectorId);
  res.json({ success: true, metrics });
});

// 6. Reset Demo State
apiRouter.post('/reset', (req, res) => {
  store.reset();
  res.json({ success: true, message: 'In-memory state re-seeded to factory demo defaults.' });
});
