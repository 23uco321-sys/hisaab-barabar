// Deterministic labor accounting, overtime calculations, payslip breakdowns, and fatigue analysis

/**
 * Rounds a number to exactly two decimal places.
 * Uses Number.EPSILON to avoid floating point precision quirks.
 */
export function round2(num) {
  return Math.round((Number(num) + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates shift duration in hours between two ISO timestamps or Dates.
 */
export function calculateShiftDurationHours(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new Error('Invalid start or end timestamp provided.');
  }

  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) {
    throw new Error('End time must be strictly after start time.');
  }

  const hours = diffMs / (1000 * 60 * 60);
  return round2(hours);
}

/**
 * Computes deterministic pay breakdown for a given shift duration and sector rules.
 */
export function calculateShiftPay(totalHours, sectorConfig) {
  const hours = round2(totalHours);
  const stdHours = sectorConfig.standardShiftHours;
  const baseRate = sectorConfig.hourlyBaseRate;
  const otMultiplier = sectorConfig.overtimeMultiplier;

  let regularHours = 0;
  let overtimeHours = 0;

  if (hours <= stdHours) {
    regularHours = hours;
    overtimeHours = 0;
  } else {
    regularHours = stdHours;
    overtimeHours = round2(hours - stdHours);
  }

  const overtimeRate = round2(baseRate * otMultiplier);
  const regularPay = round2(regularHours * baseRate);
  const overtimePay = round2(overtimeHours * overtimeRate);
  const grossPay = round2(regularPay + overtimePay);

  // Deductions
  const pfRate = sectorConfig.deductions?.pfRate || 0;
  const pfDeduction = round2(grossPay * pfRate);

  // Canteen/meal deduction applies only for full/substantial shifts (>= 4 hours)
  const mealDeduction = hours >= 4.0 ? (sectorConfig.deductions?.canteenFixed || 0) : 0;
  const totalDeductions = round2(pfDeduction + mealDeduction);

  const netPay = round2(grossPay - totalDeductions);

  return {
    totalHours: hours,
    standardShiftHours: stdHours,
    regularHours,
    overtimeHours,
    hourlyBaseRate: baseRate,
    overtimeMultiplier: otMultiplier,
    overtimeRate,
    regularPay,
    overtimePay,
    grossPay,
    deductions: {
      pfRate,
      pfDeduction,
      mealDeduction,
      totalDeductions
    },
    netPay
  };
}

/**
 * Evaluates fatigue risks based on single shift duration and previous shifts.
 */
export function evaluateFatigue(shiftHours, sectorConfig, recentShifts = []) {
  const threshold = sectorConfig.fatigueThresholdHours || 10.0;
  const maxWeekly = sectorConfig.maxWeeklyHours || 48.0;
  const flags = [];
  let severity = 'none';

  if (shiftHours >= threshold) {
    flags.push(`Shift duration (${shiftHours} hrs) exceeds safety limit of ${threshold} hrs.`);
    severity = shiftHours >= threshold + 2 ? 'critical' : 'high';
  } else if (shiftHours >= threshold - 1) {
    flags.push(`Shift duration (${shiftHours} hrs) is nearing maximum allowable safe limit.`);
    severity = 'medium';
  }

  // Calculate trailing weekly hours
  const pastHours = recentShifts.reduce((acc, s) => acc + (s.totalHours || 0), 0);
  const projectedWeekly = round2(pastHours + shiftHours);

  if (projectedWeekly > maxWeekly) {
    flags.push(`Weekly cumulative hours (${projectedWeekly} hrs) exceed legal cap of ${maxWeekly} hrs.`);
    if (severity !== 'critical') {
      severity = 'high';
    }
  }

  return {
    isFatigued: flags.length > 0,
    severity,
    flags,
    projectedWeeklyHours: projectedWeekly,
    maxWeeklyHours: maxWeekly
  };
}

/**
 * Builds an official, transparent payslip audit record.
 */
export function generatePayslip(worker, shift, sectorConfig) {
  const pay = calculateShiftPay(shift.totalHours, sectorConfig);
  const fatigue = evaluateFatigue(shift.totalHours, sectorConfig);

  return {
    payslipId: `PS-${shift.id || Date.now().toString(36).toUpperCase()}`,
    issuedAt: new Date().toISOString(),
    worker: {
      id: worker.id,
      name: worker.name,
      role: worker.role,
      sectorId: worker.sectorId,
      sectorName: sectorConfig.name
    },
    shift: {
      shiftId: shift.id,
      date: shift.date || new Date(shift.startTime).toISOString().split('T')[0],
      startTime: shift.startTime,
      endTime: shift.endTime,
      siteName: sectorConfig.siteName
    },
    accounting: pay,
    compliance: {
      sdgTarget: 'UN SDG 8.5 & 8.8 (Decent Work & Fair Compensation)',
      auditTrailStatus: 'Verified Deterministic Math',
      fatigueFlag: fatigue.isFatigued ? fatigue.severity.toUpperCase() : 'CLEAR',
      fatigueNotes: fatigue.flags
    }
  };
}
