import test from 'node:test';
import assert from 'node:assert/strict';
import {
  round2,
  calculateShiftDurationHours,
  calculateShiftPay,
  evaluateFatigue,
  generatePayslip
} from '../src/calculations.js';
import { DEFAULT_CONFIG } from '../src/config.js';

const constructionConfig = DEFAULT_CONFIG.sectors.construction;
const collegeConfig = DEFAULT_CONFIG.sectors.college;

test('round2 precision handles floating point math cleanly', () => {
  assert.equal(round2(0.1 + 0.2), 0.3);
  assert.equal(round2(1410.004), 1410.0);
  assert.equal(round2(1410.005), 1410.01);
});

test('calculateShiftDurationHours correctly computes decimal hours', () => {
  const start = '2026-10-27T08:00:00Z';
  const end = '2026-10-27T16:30:00Z';
  const duration = calculateShiftDurationHours(start, end);
  assert.equal(duration, 8.5);
});

test('calculateShiftDurationHours throws error for invalid sequence or bad input', () => {
  assert.throws(() => {
    calculateShiftDurationHours('2026-10-27T16:00:00Z', '2026-10-27T08:00:00Z');
  }, /End time must be strictly after start time/);

  assert.throws(() => {
    calculateShiftDurationHours('invalid-date', '2026-10-27T08:00:00Z');
  }, /Invalid start or end timestamp provided/);
});

test('calculateShiftPay for standard Construction shift (8h @ ₹120/hr)', () => {
  const pay = calculateShiftPay(8.0, constructionConfig);
  assert.equal(pay.totalHours, 8.0);
  assert.equal(pay.regularHours, 8.0);
  assert.equal(pay.overtimeHours, 0.0);
  assert.equal(pay.regularPay, 960.0);
  assert.equal(pay.overtimePay, 0.0);
  assert.equal(pay.grossPay, 960.0);

  // 4% PF = 38.40, Meal = 30.00 -> Total Deductions = 68.40
  assert.equal(pay.deductions.pfDeduction, 38.4);
  assert.equal(pay.deductions.mealDeduction, 30.0);
  assert.equal(pay.deductions.totalDeductions, 68.4);
  // Net Pay = 960 - 68.40 = 891.60
  assert.equal(pay.netPay, 891.6);
});

test('calculateShiftPay for Overtime Construction shift (10.5h @ ₹120/hr with 1.5x OT)', () => {
  const pay = calculateShiftPay(10.5, constructionConfig);
  assert.equal(pay.totalHours, 10.5);
  assert.equal(pay.regularHours, 8.0);
  assert.equal(pay.overtimeHours, 2.5);
  assert.equal(pay.overtimeRate, 180.0); // 120 * 1.5
  assert.equal(pay.regularPay, 960.0); // 8 * 120
  assert.equal(pay.overtimePay, 450.0); // 2.5 * 180
  assert.equal(pay.grossPay, 1410.0);

  // 4% PF on 1410 = 56.40, Meal = 30.00 -> Deductions = 86.40
  assert.equal(pay.deductions.pfDeduction, 56.4);
  assert.equal(pay.deductions.mealDeduction, 30.0);
  assert.equal(pay.deductions.totalDeductions, 86.4);
  // Net = 1410 - 86.40 = 1323.60
  assert.equal(pay.netPay, 1323.6);
});

test('calculateShiftPay for College Sector (7h standard @ ₹150/hr)', () => {
  const pay = calculateShiftPay(7.0, collegeConfig);
  assert.equal(pay.totalHours, 7.0);
  assert.equal(pay.regularHours, 7.0);
  assert.equal(pay.overtimeHours, 0.0);
  assert.equal(pay.regularPay, 1050.0);
  assert.equal(pay.grossPay, 1050.0);

  // 5% PF on 1050 = 52.50, Meal = 20.00 -> Deductions = 72.50
  assert.equal(pay.deductions.pfDeduction, 52.5);
  assert.equal(pay.deductions.mealDeduction, 20.0);
  assert.equal(pay.deductions.totalDeductions, 72.5);
  // Net = 1050 - 72.5 = 977.50
  assert.equal(pay.netPay, 977.5);
});

test('calculateShiftPay exempts short shifts (< 4h) from meal deduction', () => {
  const pay = calculateShiftPay(3.5, constructionConfig);
  assert.equal(pay.totalHours, 3.5);
  assert.equal(pay.grossPay, 420.0);
  assert.equal(pay.deductions.mealDeduction, 0); // No meal deduction for partial shift
  assert.equal(pay.deductions.pfDeduction, 16.8);
  assert.equal(pay.netPay, 403.2);
});

test('evaluateFatigue triggers warning when shift exceeds sector threshold', () => {
  // Standard 8h -> Clear
  const safe = evaluateFatigue(8.0, constructionConfig);
  assert.equal(safe.isFatigued, false);
  assert.equal(safe.severity, 'none');

  // 10.5h (threshold is 10.0) -> High warning
  const warning = evaluateFatigue(10.5, constructionConfig);
  assert.equal(warning.isFatigued, true);
  assert.equal(warning.severity, 'high');
  assert.match(warning.flags[0], /exceeds safety limit/);

  // 12.0h -> Critical warning
  const critical = evaluateFatigue(12.0, constructionConfig);
  assert.equal(critical.isFatigued, true);
  assert.equal(critical.severity, 'critical');
});

test('evaluateFatigue catches cumulative weekly overtime violations', () => {
  const recentShifts = [
    { totalHours: 10.0 },
    { totalHours: 10.0 },
    { totalHours: 10.0 },
    { totalHours: 10.0 }
  ];
  // 40 + 9 = 49 > 48 max weekly
  const result = evaluateFatigue(9.0, constructionConfig, recentShifts);
  assert.equal(result.isFatigued, true);
  assert.equal(result.projectedWeeklyHours, 49.0);
  assert.ok(result.flags.some(f => f.includes('Weekly cumulative hours')));
});

test('generatePayslip creates verified deterministic payslip extract', () => {
  const worker = {
    id: 'W-CONST-01',
    name: 'Ramesh Kumar',
    role: 'Master Mason',
    sectorId: 'construction'
  };
  const shift = {
    id: 'SH-TEST-1',
    date: '2026-10-27',
    startTime: '2026-10-27T08:00:00Z',
    endTime: '2026-10-27T18:30:00Z',
    totalHours: 10.5
  };

  const slip = generatePayslip(worker, shift, constructionConfig);
  assert.equal(slip.worker.name, 'Ramesh Kumar');
  assert.equal(slip.shift.date, '2026-10-27');
  assert.equal(slip.accounting.netPay, 1323.6);
  assert.equal(slip.compliance.sdgTarget, 'UN SDG 8.5 & 8.8 (Decent Work & Fair Compensation)');
  assert.equal(slip.compliance.fatigueFlag, 'HIGH');
});
