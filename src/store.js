// In-memory data store with seeded demo datasets for Hisaab Barabar
import { DEFAULT_CONFIG } from './config.js';
import { calculateShiftDurationHours, calculateShiftPay, evaluateFatigue } from './calculations.js';

class DataStore {
  constructor() {
    this.reset();
  }

  reset() {
    // Deep clone sectors from default config
    this.sectors = JSON.parse(JSON.stringify(DEFAULT_CONFIG.sectors));

    // Seeded Workers
    this.workers = [
      {
        id: 'W-CONST-01',
        name: 'Ramesh Kumar',
        phone: '+91 98765 43210',
        role: 'Master Mason',
        sectorId: 'construction',
        joinedDate: '2025-08-10',
        badgeNumber: 'CN-8841',
        emergencyContact: 'Sunita Kumar (Wife): +91 98765 43211'
      },
      {
        id: 'W-CONST-02',
        name: 'Sunita Devi',
        phone: '+91 98111 22334',
        role: 'Rebar & Steel Fixer',
        sectorId: 'construction',
        joinedDate: '2025-09-01',
        badgeNumber: 'CN-9012',
        emergencyContact: 'Manoj Devi (Brother): +91 98111 22335'
      },
      {
        id: 'W-CONST-03',
        name: 'Vikram Singh',
        phone: '+91 98222 33445',
        role: 'Scaffold Erector',
        sectorId: 'construction',
        joinedDate: '2025-11-15',
        badgeNumber: 'CN-7430',
        emergencyContact: 'Rajesh Singh (Father): +91 98222 33446'
      },
      {
        id: 'W-COLL-01',
        name: 'Tariq Ansari',
        phone: '+91 97333 44556',
        role: 'Campus Facility Electrician',
        sectorId: 'college',
        joinedDate: '2025-06-20',
        badgeNumber: 'CL-3104',
        emergencyContact: 'Zainab Ansari (Sister): +91 97333 44557'
      },
      {
        id: 'W-COLL-02',
        name: 'Priya Sharma',
        phone: '+91 97444 55667',
        role: 'Science Lab Sanitation Specialist',
        sectorId: 'college',
        joinedDate: '2025-07-12',
        badgeNumber: 'CL-2490',
        emergencyContact: 'Anil Sharma (Husband): +91 97444 55668'
      },
      {
        id: 'W-COLL-03',
        name: 'Arjun Das',
        phone: '+91 97555 66778',
        role: 'Night Campus Security & Watchman',
        sectorId: 'college',
        joinedDate: '2025-10-05',
        badgeNumber: 'CL-5120',
        emergencyContact: 'Deepak Das (Brother): +91 97555 66779'
      }
    ];

    // Seeded Shifts: historical completed shifts + 1 currently ongoing shift
    const today = new Date();
    const dateStr = (offsetDays = 0) => {
      const d = new Date(today);
      d.setDate(d.getDate() - offsetDays);
      return d.toISOString().split('T')[0];
    };

    const makeTimestamp = (dateString, timeString) => {
      return `${dateString}T${timeString}:00+05:30`;
    };

    this.shifts = [
      // Ramesh: 10.5 hours shift (Fatigue flag: overtime + exceeded 10h threshold)
      {
        id: 'SH-1001',
        workerId: 'W-CONST-01',
        sectorId: 'construction',
        date: dateStr(1),
        startTime: makeTimestamp(dateStr(1), '08:00'),
        endTime: makeTimestamp(dateStr(1), '18:30'),
        status: 'completed',
        totalHours: 10.5,
        regularHours: 8.0,
        overtimeHours: 2.5,
        grossPay: 1410.0,
        netPay: 1323.6,
        fatigueWarning: true,
        fatigueSeverity: 'high',
        fatigueNotes: ['Shift duration (10.5 hrs) exceeds safety limit of 10 hrs.'],
        notes: 'Poured concrete slab section B-4; emergency overtime requested by contractor.'
      },
      // Sunita: standard 8h shift
      {
        id: 'SH-1002',
        workerId: 'W-CONST-02',
        sectorId: 'construction',
        date: dateStr(1),
        startTime: makeTimestamp(dateStr(1), '08:00'),
        endTime: makeTimestamp(dateStr(1), '16:00'),
        status: 'completed',
        totalHours: 8.0,
        regularHours: 8.0,
        overtimeHours: 0.0,
        grossPay: 960.0,
        netPay: 891.6,
        fatigueWarning: false,
        fatigueSeverity: 'none',
        fatigueNotes: [],
        notes: 'Tied rebar mesh for pier foundation 19.'
      },
      // Vikram: 12h heavy shift (Critical fatigue flag!)
      {
        id: 'SH-1003',
        workerId: 'W-CONST-03',
        sectorId: 'construction',
        date: dateStr(2),
        startTime: makeTimestamp(dateStr(2), '07:30'),
        endTime: makeTimestamp(dateStr(2), '19:30'),
        status: 'completed',
        totalHours: 12.0,
        regularHours: 8.0,
        overtimeHours: 4.0,
        grossPay: 1680.0,
        netPay: 1582.8,
        fatigueWarning: true,
        fatigueSeverity: 'critical',
        fatigueNotes: ['Shift duration (12 hrs) exceeds safety limit of 10 hrs.'],
        notes: 'Double shift erection of perimeter tower scaffolding.'
      },
      // Tariq (College): standard 7h shift
      {
        id: 'SH-1004',
        workerId: 'W-COLL-01',
        sectorId: 'college',
        date: dateStr(1),
        startTime: makeTimestamp(dateStr(1), '09:00'),
        endTime: makeTimestamp(dateStr(1), '16:00'),
        status: 'completed',
        totalHours: 7.0,
        regularHours: 7.0,
        overtimeHours: 0.0,
        grossPay: 1050.0,
        netPay: 977.5,
        fatigueWarning: false,
        fatigueSeverity: 'none',
        fatigueNotes: [],
        notes: 'Rewired electrical trunk in Ramanujan Science Block.'
      },
      // Priya (College): 9.5 hours (Fatigue flag: standard is 7h, exceeded 9h threshold)
      {
        id: 'SH-1005',
        workerId: 'W-COLL-02',
        sectorId: 'college',
        date: dateStr(1),
        startTime: makeTimestamp(dateStr(1), '08:30'),
        endTime: makeTimestamp(dateStr(1), '18:00'),
        status: 'completed',
        totalHours: 9.5,
        regularHours: 7.0,
        overtimeHours: 2.5,
        grossPay: 1612.5,
        netPay: 1511.88,
        fatigueWarning: true,
        fatigueSeverity: 'high',
        fatigueNotes: ['Shift duration (9.5 hrs) exceeds safety limit of 9 hrs.'],
        notes: 'Deep chemical wash and decontamination of Bio-Chemistry Lab 3.'
      },
      // Arjun (College): active shift currently running
      {
        id: 'SH-1006',
        workerId: 'W-COLL-03',
        sectorId: 'college',
        date: dateStr(0),
        startTime: new Date(Date.now() - 4.5 * 60 * 60 * 1000).toISOString(),
        endTime: null,
        status: 'active',
        totalHours: null,
        notes: 'Campus perimeter evening patrol and gate security.'
      }
    ];

    // Seeded Hazard Reports
    this.hazards = [
      {
        id: 'HAZ-201',
        workerId: 'W-CONST-03',
        workerName: 'Vikram Singh',
        sectorId: 'construction',
        category: 'Scaffolding & Fall Risk',
        severity: 'critical',
        location: 'Pier 17 - East Scaffolding (Level 4)',
        description: 'Missing toe-boards and unanchored safety netting on eastern facade. Wind gusts cause planks to slip.',
        status: 'investigating',
        createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        adminNotes: 'Safety officer halted work on Level 4 scaffold. Replacement guardrails ordered from depot.'
      },
      {
        id: 'HAZ-202',
        workerId: 'W-COLL-02',
        workerName: 'Priya Sharma',
        sectorId: 'college',
        category: 'Chemical Vapor & Lab Exhaust Failure',
        severity: 'high',
        location: 'Chemistry Complex - Lab Room 204',
        description: 'Fume hood motor failed during organic synthesis disposal. Heavy noxious vapor smell in corridor.',
        status: 'reported',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        adminNotes: ''
      },
      {
        id: 'HAZ-203',
        workerId: 'W-CONST-01',
        workerName: 'Ramesh Kumar',
        sectorId: 'construction',
        category: 'Exposed Electrical Wiring',
        severity: 'medium',
        location: 'Concrete Mixer Yard, Gate 2',
        description: 'Industrial 3-phase power cable has insulation tears where construction vehicles traverse.',
        status: 'mitigated',
        createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        adminNotes: 'Cable replaced with heavy armored conduit and elevated via cable suspension bridge.'
      },
      {
        id: 'HAZ-204',
        workerId: 'anonymous',
        workerName: 'Anonymous Staff',
        sectorId: 'college',
        category: 'Inadequate Night Lighting / Perimeter',
        severity: 'medium',
        location: 'Hostel Block C - Rear Pathway',
        description: 'Four streetlamps are burned out. Female cleaning staff feel unsafe when leaving after 8 PM.',
        status: 'reported',
        createdAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
        adminNotes: ''
      }
    ];

    this.auditLogs = [
      {
        id: 'LOG-001',
        timestamp: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
        action: 'SYSTEM_INIT',
        details: 'Initial system boot and sector policy initialization.'
      }
    ];
  }

  // Workers
  getWorkers(sectorId = null) {
    if (sectorId) {
      return this.workers.filter(w => w.sectorId === sectorId);
    }
    return this.workers;
  }

  getWorkerById(workerId) {
    return this.workers.find(w => w.id === workerId);
  }

  addWorker({ name, phone, role, sectorId, badgeNumber, emergencyContact }) {
    const id = `W-${sectorId.substring(0, 4).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const newWorker = {
      id,
      name: name.trim(),
      phone: phone?.trim() || '',
      role: role.trim(),
      sectorId,
      joinedDate: new Date().toISOString().split('T')[0],
      badgeNumber: badgeNumber?.trim() || `ID-${Math.floor(1000 + Math.random() * 9000)}`,
      emergencyContact: emergencyContact?.trim() || 'Not specified'
    };
    this.workers.unshift(newWorker);
    return newWorker;
  }

  // Shifts
  getShifts({ sectorId = null, workerId = null, status = null } = {}) {
    return this.shifts.filter(s => {
      if (sectorId && s.sectorId !== sectorId) return false;
      if (workerId && s.workerId !== workerId) return false;
      if (status && s.status !== status) return false;
      return true;
    }).sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }

  getActiveShift(workerId) {
    return this.shifts.find(s => s.workerId === workerId && s.status === 'active');
  }

  checkIn(workerId, startTime = null, notes = '') {
    const worker = this.getWorkerById(workerId);
    if (!worker) {
      throw new Error(`Worker with ID "${workerId}" not found.`);
    }

    const existing = this.getActiveShift(workerId);
    if (existing) {
      throw new Error(`Worker is already checked in since ${new Date(existing.startTime).toLocaleTimeString()}.`);
    }

    const start = startTime ? new Date(startTime).toISOString() : new Date().toISOString();
    const newShift = {
      id: `SH-${Date.now().toString().slice(-6)}`,
      workerId,
      sectorId: worker.sectorId,
      date: start.split('T')[0],
      startTime: start,
      endTime: null,
      status: 'active',
      totalHours: null,
      notes: notes.trim()
    };

    this.shifts.unshift(newShift);
    this.logAction('WORKER_CHECK_IN', `Worker ${worker.name} (${worker.id}) checked in.`);
    return newShift;
  }

  checkOut(workerId, endTime = null, finalNotes = '') {
    const shift = this.getActiveShift(workerId);
    if (!shift) {
      throw new Error('No active shift found for this worker.');
    }

    const worker = this.getWorkerById(workerId);
    const sectorConfig = this.sectors[worker.sectorId];
    const end = endTime ? new Date(endTime).toISOString() : new Date().toISOString();

    const hours = calculateShiftDurationHours(shift.startTime, end);
    const pay = calculateShiftPay(hours, sectorConfig);
    const fatigue = evaluateFatigue(hours, sectorConfig);

    shift.endTime = end;
    shift.status = 'completed';
    shift.totalHours = pay.totalHours;
    shift.regularHours = pay.regularHours;
    shift.overtimeHours = pay.overtimeHours;
    shift.grossPay = pay.grossPay;
    shift.netPay = pay.netPay;
    shift.fatigueWarning = fatigue.isFatigued;
    shift.fatigueSeverity = fatigue.severity;
    shift.fatigueNotes = fatigue.flags;
    if (finalNotes.trim()) {
      shift.notes = shift.notes ? `${shift.notes} | ${finalNotes.trim()}` : finalNotes.trim();
    }

    this.logAction('WORKER_CHECK_OUT', `Worker ${worker.name} checked out. Hours: ${hours}, Net Pay: ₹${pay.netPay}`);
    return { shift, pay, fatigue };
  }

  logManualShift({ workerId, startTime, endTime, notes }) {
    const worker = this.getWorkerById(workerId);
    if (!worker) {
      throw new Error(`Worker with ID "${workerId}" not found.`);
    }

    const sectorConfig = this.sectors[worker.sectorId];
    const hours = calculateShiftDurationHours(startTime, endTime);
    const pay = calculateShiftPay(hours, sectorConfig);
    const fatigue = evaluateFatigue(hours, sectorConfig);

    const shift = {
      id: `SH-${Date.now().toString().slice(-6)}`,
      workerId,
      sectorId: worker.sectorId,
      date: new Date(startTime).toISOString().split('T')[0],
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      status: 'completed',
      totalHours: pay.totalHours,
      regularHours: pay.regularHours,
      overtimeHours: pay.overtimeHours,
      grossPay: pay.grossPay,
      netPay: pay.netPay,
      fatigueWarning: fatigue.isFatigued,
      fatigueSeverity: fatigue.severity,
      fatigueNotes: fatigue.flags,
      notes: notes?.trim() || 'Manual shift entry'
    };

    this.shifts.unshift(shift);
    this.logAction('MANUAL_SHIFT_ADDED', `Shift logged for ${worker.name}. Hours: ${hours}`);
    return shift;
  }

  // Hazards
  getHazards(sectorId = null) {
    if (sectorId) {
      return this.hazards.filter(h => h.sectorId === sectorId);
    }
    return this.hazards;
  }

  getHazardById(id) {
    return this.hazards.find(h => h.id === id);
  }

  createHazard({ workerId, workerName, sectorId, category, severity, location, description, audioTranscript = '' }) {
    if (!category || !location || !description) {
      throw new Error('Category, location, and description are mandatory for safety hazards.');
    }

    const validSeverities = ['low', 'medium', 'high', 'critical'];
    const safeSeverity = validSeverities.includes(severity) ? severity : 'medium';

    const id = `HAZ-${Date.now().toString().slice(-4)}`;
    const hazard = {
      id,
      workerId: workerId || 'anonymous',
      workerName: workerName || 'Anonymous Worker',
      sectorId: sectorId || 'construction',
      category: category.trim(),
      severity: safeSeverity,
      location: location.trim(),
      description: description.trim(),
      audioTranscript: audioTranscript?.trim() || null,
      status: 'reported',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      adminNotes: ''
    };

    this.hazards.unshift(hazard);
    this.logAction('HAZARD_REPORTED', `[${safeSeverity.toUpperCase()}] Hazard reported in ${location}: ${category}`);
    return hazard;
  }

  updateHazardStatus(hazardId, { status, adminNotes }) {
    const hazard = this.getHazardById(hazardId);
    if (!hazard) {
      throw new Error(`Hazard "${hazardId}" not found.`);
    }

    const validStatuses = ['reported', 'investigating', 'mitigated', 'dismissed'];
    if (status && !validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    if (status) hazard.status = status;
    if (adminNotes !== undefined) hazard.adminNotes = adminNotes.trim();
    hazard.updatedAt = new Date().toISOString();

    this.logAction('HAZARD_STATUS_UPDATED', `Hazard ${hazardId} updated to ${hazard.status}`);
    return hazard;
  }

  // Sector Settings
  updateSectorConfig(sectorId, updates) {
    const sector = this.sectors[sectorId];
    if (!sector) {
      throw new Error(`Sector "${sectorId}" not found.`);
    }

    if (updates.hourlyBaseRate !== undefined) {
      const rate = Number(updates.hourlyBaseRate);
      if (rate <= 0) throw new Error('Base rate must be positive.');
      sector.hourlyBaseRate = rate;
    }

    if (updates.standardShiftHours !== undefined) {
      const std = Number(updates.standardShiftHours);
      if (std <= 0 || std > 24) throw new Error('Standard shift hours must be between 1 and 24.');
      sector.standardShiftHours = std;
    }

    if (updates.overtimeMultiplier !== undefined) {
      const ot = Number(updates.overtimeMultiplier);
      if (ot < 1.0) throw new Error('Overtime multiplier must be at least 1.0.');
      sector.overtimeMultiplier = ot;
    }

    if (updates.fatigueThresholdHours !== undefined) {
      const ft = Number(updates.fatigueThresholdHours);
      if (ft <= 0) throw new Error('Fatigue threshold must be positive.');
      sector.fatigueThresholdHours = ft;
    }

    if (updates.deductions) {
      if (updates.deductions.pfRate !== undefined) {
        sector.deductions.pfRate = Number(updates.deductions.pfRate);
      }
      if (updates.deductions.canteenFixed !== undefined) {
        sector.deductions.canteenFixed = Number(updates.deductions.canteenFixed);
      }
    }

    this.logAction('SECTOR_CONFIG_UPDATED', `Rates and safety policies updated for sector "${sector.name}".`);
    return sector;
  }

  // Admin Dashboard Summary
  getDashboardMetrics(sectorId = null) {
    const shifts = this.getShifts({ sectorId });
    const hazards = this.getHazards(sectorId);
    const workers = this.getWorkers(sectorId);

    const activeShiftsCount = shifts.filter(s => s.status === 'active').length;
    const completedShifts = shifts.filter(s => s.status === 'completed');

    const totalHoursWorked = completedShifts.reduce((acc, s) => acc + (s.totalHours || 0), 0);
    const totalGrossPay = completedShifts.reduce((acc, s) => acc + (s.grossPay || 0), 0);
    const totalNetPay = completedShifts.reduce((acc, s) => acc + (s.netPay || 0), 0);
    const totalOvertimeHours = completedShifts.reduce((acc, s) => acc + (s.overtimeHours || 0), 0);

    const openHazards = hazards.filter(h => h.status === 'reported' || h.status === 'investigating').length;
    const criticalHazards = hazards.filter(h => h.severity === 'critical' && h.status !== 'mitigated').length;

    const fatigueAlertCount = completedShifts.filter(s => s.fatigueWarning).length;

    return {
      sectorId: sectorId || 'all',
      totalWorkers: workers.length,
      activeShiftsCount,
      completedShiftsCount: completedShifts.length,
      totalHoursWorked: Math.round(totalHoursWorked * 100) / 100,
      totalOvertimeHours: Math.round(totalOvertimeHours * 100) / 100,
      totalGrossPay: Math.round(totalGrossPay * 100) / 100,
      totalNetPay: Math.round(totalNetPay * 100) / 100,
      openHazards,
      criticalHazards,
      fatigueAlertCount
    };
  }

  logAction(action, details) {
    this.auditLogs.unshift({
      id: `LOG-${Date.now().toString().slice(-5)}`,
      timestamp: new Date().toISOString(),
      action,
      details
    });
    // Keep max 100 logs
    if (this.auditLogs.length > 100) {
      this.auditLogs.pop();
    }
  }
}

export const store = new DataStore();
