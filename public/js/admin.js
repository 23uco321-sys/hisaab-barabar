// Employer Dashboard Front-end Logic for Hisaab Barabar
// Vanilla JavaScript — Zero external libraries

let currentSectorFilter = 'all';
let currentStatusFilter = '';

document.addEventListener('DOMContentLoaded', async () => {
  setupMastheadTime();
  setupEventListeners();
  await refreshDashboard();
});

function setupMastheadTime() {
  const clockEl = document.getElementById('masthead-time');
  function updateTime() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { hour12: false });
  }
  updateTime();
  setInterval(updateTime, 1000);
}

function setupEventListeners() {
  // Sector filter pills
  document.querySelectorAll('.sector-pill').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      document.querySelectorAll('.sector-pill').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentSectorFilter = e.target.dataset.sector;
      await refreshDashboard();
    });
  });

  // Shift status filter
  document.getElementById('shift-status-filter').addEventListener('change', async (e) => {
    currentStatusFilter = e.target.value;
    await loadShiftsTable();
  });

  // Re-seed button
  document.getElementById('btn-admin-reseed').addEventListener('click', async () => {
    if (confirm('Re-seed all shifts, hazards, and rates to factory demo defaults?')) {
      const res = await fetch('/api/reset', { method: 'POST' });
      if (res.ok) {
        alert('Data re-seeded successfully.');
        await refreshDashboard();
      }
    }
  });

  // Close payslip modal
  document.getElementById('btn-close-modal').addEventListener('click', () => {
    document.getElementById('payslip-modal').classList.add('hidden');
  });

  document.getElementById('payslip-modal').addEventListener('click', (e) => {
    if (e.target.id === 'payslip-modal') {
      document.getElementById('payslip-modal').classList.add('hidden');
    }
  });
}

// Master Refresh
async function refreshDashboard() {
  await Promise.all([
    loadMetrics(),
    loadShiftsTable(),
    loadHazardsQueue(),
    loadSectorConfigs()
  ]);
}

// 1. Metrics
async function loadMetrics() {
  try {
    const query = currentSectorFilter === 'all' ? '' : `?sectorId=${currentSectorFilter}`;
    const res = await fetch(`/api/dashboard${query}`);
    const data = await res.json();
    if (data.success && data.metrics) {
      const m = data.metrics;
      document.getElementById('stat-active').textContent = m.activeShiftsCount;
      document.getElementById('stat-hours').textContent = `${m.totalHoursWorked.toFixed(1)} hrs`;
      document.getElementById('stat-ot-sub').textContent = `Incl. ${m.totalOvertimeHours.toFixed(1)} hrs overtime (1.5×)`;
      document.getElementById('stat-net-pay').textContent = `₹${m.totalNetPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      document.getElementById('stat-gross-sub').textContent = `Gross Liability: ₹${m.totalGrossPay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
      document.getElementById('stat-open-hazards').textContent = m.openHazards;
      document.getElementById('stat-critical-sub').textContent = `${m.criticalHazards} critical / stop-work`;
      document.getElementById('stat-fatigue-alerts').textContent = m.fatigueAlertCount;
    }
  } catch (err) {
    console.error('Failed to load metrics:', err);
  }
}

// 2. Shifts Table
async function loadShiftsTable() {
  const tbody = document.getElementById('shifts-tbody');
  try {
    const params = new URLSearchParams();
    if (currentSectorFilter !== 'all') params.append('sectorId', currentSectorFilter);
    if (currentStatusFilter) params.append('status', currentStatusFilter);

    const res = await fetch(`/api/shifts?${params.toString()}`);
    const data = await res.json();
    const shifts = data.shifts || [];

    if (shifts.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 2rem;">No shift records matching current filters.</td></tr>`;
      return;
    }

    let html = '';
    shifts.forEach(s => {
      const isCompleted = s.status === 'completed';
      const secBadge = s.sectorId === 'construction'
        ? `<span class="badge badge-amber">Construction</span>`
        : `<span class="badge badge-olive">College</span>`;

      let fatigueCell = '';
      if (!isCompleted) {
        fatigueCell = `<span class="badge badge-neutral">In Progress</span>`;
      } else if (s.fatigueWarning) {
        const titleNote = escapeHtml(s.fatigueNotes?.join(' ') || 'Excessive shift hours');
        fatigueCell = `<span class="badge badge-danger" title="${titleNote}">FATIGUE BREACH: ${escapeHtml(s.fatigueSeverity?.toUpperCase())}</span>`;
      } else {
        fatigueCell = `<span class="badge badge-olive">COMPLIANT</span>`;
      }

      html += `
        <tr>
          <td><code>${escapeHtml(s.id)}</code></td>
          <td>${escapeHtml(s.date || '')}</td>
          <td>
            <strong>${escapeHtml(s.workerName)}</strong><br>
            <span style="font-size: 0.78rem; color: var(--text-muted);">${escapeHtml(s.workerRole || '')}</span>
          </td>
          <td>${secBadge}</td>
          <td class="text-right tabular-numbers">${isCompleted ? `${s.totalHours}h` : '—'}</td>
          <td class="text-right tabular-numbers">${isCompleted ? `${s.regularHours}h` : '—'}</td>
          <td class="text-right tabular-numbers" style="${isCompleted && s.overtimeHours > 0 ? 'font-weight: 700; color: var(--orange-red);' : ''}">
            ${isCompleted ? `${s.overtimeHours}h` : '—'}
          </td>
          <td class="text-right tabular-numbers" style="font-weight: 700;">
            ${isCompleted ? `₹${s.netPay.toFixed(2)}` : 'Pending'}
          </td>
          <td>${fatigueCell}</td>
          <td class="text-right">
            ${isCompleted ? `
              <button class="btn btn-sm btn-view-slip" data-id="${s.id}">
                Payslip
              </button>
            ` : '<span style="font-size: 0.78rem; color: var(--olive-green);">Clock Active</span>'}
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;

    // Attach click listeners
    tbody.querySelectorAll('.btn-view-slip').forEach(b => {
      b.addEventListener('click', (e) => viewPayslip(e.target.dataset.id));
    });

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; color: var(--orange-red); padding: 2rem;">Failed to load shift records.</td></tr>`;
  }
}

// 3. Hazards Queue
async function loadHazardsQueue() {
  const container = document.getElementById('hazards-list-container');
  try {
    const query = currentSectorFilter === 'all' ? '' : `?sectorId=${currentSectorFilter}`;
    const res = await fetch(`/api/hazards${query}`);
    const data = await res.json();
    const hazards = data.hazards || [];

    if (hazards.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.88rem;">No safety hazards reported for this sector selection.</p>`;
      return;
    }

    let html = '';
    hazards.forEach(h => {
      const sevClass = h.severity === 'critical' ? 'badge-danger' :
                       h.severity === 'high' ? 'badge-danger' :
                       h.severity === 'medium' ? 'badge-amber' : 'badge-neutral';

      const secName = h.sectorId === 'construction' ? 'Construction Sector' : 'College & Campus';
      const createdDate = new Date(h.createdAt).toLocaleString();

      html += `
        <div class="editorial-panel" style="background-color: var(--bg-paper); margin-bottom: 0; padding: 1.25rem;">
          <div style="display: flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.5rem;">
            <div>
              <span class="badge ${sevClass}" style="margin-right: 0.5rem;">${escapeHtml(h.severity.toUpperCase())}</span>
              <strong style="font-size: 1.05rem;">${escapeHtml(h.category)}</strong>
            </div>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${createdDate}</span>
          </div>

          <div style="font-size: 0.85rem; line-height: 1.6; margin-bottom: 0.75rem;">
            <p><strong>Location:</strong> ${escapeHtml(h.location)} (${secName})</p>
            <p><strong>Reported By:</strong> ${escapeHtml(h.workerName)} (<code>${escapeHtml(h.workerId)}</code>)</p>
            <p style="margin-top: 0.4rem; padding: 0.6rem; background: #FFFDF7; border-left: 2px solid var(--rule-solid); font-style: italic;">
              "${escapeHtml(h.description)}"
            </p>
          </div>

          <!-- Triage Actions -->
          <div style="border-top: 1px dashed var(--rule-subtle); padding-top: 0.75rem; display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: flex-end;">
            <div style="flex: 1 1 180px; min-width: 0; width: 100%;">
              <label class="form-label" style="font-size: 0.68rem;">Action Status</label>
              <select class="form-control hazard-status-select" data-id="${h.id}" style="min-height: 38px; padding: 0.4rem 0.75rem; font-size: 0.82rem;">
                <option value="reported" ${h.status === 'reported' ? 'selected' : ''}>Reported (Awaiting Inspection)</option>
                <option value="investigating" ${h.status === 'investigating' ? 'selected' : ''}>Investigating (Work Halted / Crew Dispatched)</option>
                <option value="mitigated" ${h.status === 'mitigated' ? 'selected' : ''}>Mitigated (Resolved / Safe for Work)</option>
                <option value="dismissed" ${h.status === 'dismissed' ? 'selected' : ''}>Dismissed</option>
              </select>
            </div>

            <div style="flex: 2 1 180px; min-width: 0; width: 100%;">
              <label class="form-label" style="font-size: 0.68rem;">Mitigation Note / Corrective Action</label>
              <input type="text" class="form-control hazard-notes-input" data-id="${h.id}" 
                     placeholder="Document corrective actions taken..." 
                     value="${escapeHtml(h.adminNotes || '')}"
                     style="min-height: 38px; padding: 0.4rem 0.75rem; font-size: 0.82rem;">
            </div>

            <button class="btn btn-primary btn-sm btn-save-hazard" data-id="${h.id}">
              Update Hazard
            </button>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;

    // Attach listeners for hazard update
    container.querySelectorAll('.btn-save-hazard').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        const status = container.querySelector(`.hazard-status-select[data-id="${id}"]`).value;
        const adminNotes = container.querySelector(`.hazard-notes-input[data-id="${id}"]`).value;

        try {
          const res = await fetch(`/api/hazards/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status, adminNotes })
          });
          const data = await res.json();
          if (data.success) {
            alert(`Hazard ${id} status updated to: ${status}`);
            await loadHazardsQueue();
            await loadMetrics();
          } else {
            alert(data.error);
          }
        } catch (err) {
          alert('Failed to update hazard: ' + err.message);
        }
      });
    });

  } catch (err) {
    container.innerHTML = `<p style="color: var(--orange-red);">Failed to load hazards queue.</p>`;
  }
}

// 4. Sector Configs Editor
async function loadSectorConfigs() {
  const container = document.getElementById('sector-configs-container');
  try {
    const res = await fetch('/api/sectors');
    const data = await res.json();
    const sectors = data.sectors || {};

    let html = '';
    Object.keys(sectors).forEach(key => {
      const s = sectors[key];
      html += `
        <div class="editorial-panel" style="background-color: var(--bg-paper); margin-bottom: 0;">
          <div class="panel-header">
            <div>
              <p class="overline">SECTOR ID: ${escapeHtml(s.id.toUpperCase())}</p>
              <h3 class="headline-serif" style="font-size: 1.4rem;">${escapeHtml(s.name)}</h3>
            </div>
          </div>

          <form class="sector-edit-form" data-id="${s.id}">
            <div class="editorial-grid-2">
              <div class="form-group">
                <label class="form-label">Base Hourly Rate (₹)</label>
                <input type="number" step="0.5" class="form-control" name="hourlyBaseRate" value="${s.hourlyBaseRate}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Standard Shift (Hours)</label>
                <input type="number" step="0.5" min="1" max="24" class="form-control" name="standardShiftHours" value="${s.standardShiftHours}" required>
              </div>
            </div>

            <div class="editorial-grid-2">
              <div class="form-group">
                <label class="form-label">Overtime Multiplier</label>
                <input type="number" step="0.05" min="1.0" class="form-control" name="overtimeMultiplier" value="${s.overtimeMultiplier}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Fatigue Hazard Limit (Hours)</label>
                <input type="number" step="0.5" min="4" max="24" class="form-control" name="fatigueThresholdHours" value="${s.fatigueThresholdHours}" required>
              </div>
            </div>

            <div class="editorial-grid-2">
              <div class="form-group">
                <label class="form-label">Welfare / PF Cess Rate (%)</label>
                <input type="number" step="0.01" min="0" max="0.5" class="form-control" name="pfRate" value="${s.deductions.pfRate}" required>
              </div>
              <div class="form-group">
                <label class="form-label">Meal Deduction Copay (₹)</label>
                <input type="number" step="1" min="0" class="form-control" name="canteenFixed" value="${s.deductions.canteenFixed}" required>
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-sm" style="margin-top: 0.5rem;">
              Update ${escapeHtml(s.name)} Parameters
            </button>
          </form>
        </div>
      `;
    });

    container.innerHTML = html;

    // Attach form submit listeners
    container.querySelectorAll('.sector-edit-form').forEach(form => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const sectorId = e.target.dataset.id;
        const formData = new FormData(e.target);

        const payload = {
          hourlyBaseRate: parseFloat(formData.get('hourlyBaseRate')),
          standardShiftHours: parseFloat(formData.get('standardShiftHours')),
          overtimeMultiplier: parseFloat(formData.get('overtimeMultiplier')),
          fatigueThresholdHours: parseFloat(formData.get('fatigueThresholdHours')),
          deductions: {
            pfRate: parseFloat(formData.get('pfRate')),
            canteenFixed: parseFloat(formData.get('canteenFixed'))
          }
        };

        try {
          const uRes = await fetch(`/api/sectors/${sectorId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const uData = await uRes.json();
          if (uData.success) {
            alert(`Economic policy parameters updated for ${uData.sector.name}.`);
            await refreshDashboard();
          } else {
            alert(uData.error);
          }
        } catch (err) {
          alert('Failed to update sector: ' + err.message);
        }
      });
    });

  } catch (err) {
    container.innerHTML = `<p style="color: var(--orange-red);">Failed to load sector configurations.</p>`;
  }
}

// 5. Payslip Receipt View Modal
async function viewPayslip(shiftId) {
  try {
    const res = await fetch(`/api/shifts/${shiftId}/payslip`);
    const data = await res.json();
    if (!data.success) {
      alert(data.error);
      return;
    }

    const ps = data.payslip;
    const a = ps.accounting;

    const receiptHtml = `
      <div class="receipt-slip">
        <div class="receipt-slip-header">
          <p class="overline">PROMPT WARS 2026 • OFFICIAL AUDIT LEDGER</p>
          <h2 class="receipt-slip-title">HISAAB BARABAR</h2>
          <p style="font-size: 0.78rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-muted); margin-top: 0.25rem;">
            SDG 8.5 & 8.8 Verified Fair Pay Record
          </p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.84rem; margin-bottom: 1.25rem;">
          <div>
            <span class="overline">Worker</span>
            <strong>${escapeHtml(ps.worker.name)}</strong><br>
            <span style="color: var(--text-muted);">${escapeHtml(ps.worker.role)}</span>
          </div>
          <div>
            <span class="overline">Worker ID</span>
            <code>${escapeHtml(ps.worker.id)}</code><br>
            <span style="color: var(--text-muted);">${escapeHtml(ps.worker.sectorName)}</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; font-size: 0.84rem; margin-bottom: 1.25rem; border-top: 1px dashed var(--rule-subtle); padding-top: 0.75rem;">
          <div>
            <span class="overline">Shift Date</span>
            <strong>${escapeHtml(ps.shift.date)}</strong>
          </div>
          <div>
            <span class="overline">Voucher Reference</span>
            <strong>${escapeHtml(ps.payslipId)}</strong>
          </div>
        </div>

        <hr class="editorial-rule-subtle">

        <p class="overline" style="margin-bottom: 0.6rem;">Itemized Shift Calculations</p>
        
        <div class="receipt-row">
          <span>Standard Hours (${a.regularHours} hrs @ ₹${a.hourlyBaseRate.toFixed(2)}/hr)</span>
          <span class="tabular-numbers">₹${a.regularPay.toFixed(2)}</span>
        </div>

        <div class="receipt-row">
          <span>Overtime Hours (${a.overtimeHours} hrs @ ${a.overtimeMultiplier}× = ₹${a.overtimeRate.toFixed(2)}/hr)</span>
          <span class="tabular-numbers">₹${a.overtimePay.toFixed(2)}</span>
        </div>

        <div class="receipt-row" style="font-weight: 600; border-top: 1px solid var(--rule-subtle); margin-top: 0.25rem; padding-top: 0.4rem;">
          <span>Gross Earnings (${a.totalHours} Total Hours)</span>
          <span class="tabular-numbers">₹${a.grossPay.toFixed(2)}</span>
        </div>

        <div style="margin-top: 1rem; border-top: 1px dashed var(--rule-subtle); padding-top: 0.75rem;">
          <p class="overline" style="margin-bottom: 0.4rem;">Statutory Deductions & Allowances</p>
          <div class="receipt-row" style="font-size: 0.85rem; color: var(--text-muted);">
            <span>Welfare & PF Cess (${(a.deductions.pfRate * 100).toFixed(0)}%)</span>
            <span class="tabular-numbers">- ₹${a.deductions.pfDeduction.toFixed(2)}</span>
          </div>
          <div class="receipt-row" style="font-size: 0.85rem; color: var(--text-muted);">
            <span>Meal Subsidy Copay</span>
            <span class="tabular-numbers">- ₹${a.deductions.mealDeduction.toFixed(2)}</span>
          </div>
          <div class="receipt-row" style="font-weight: 600; font-size: 0.88rem; margin-top: 0.25rem;">
            <span>Total Deductions</span>
            <span class="tabular-numbers">- ₹${a.deductions.totalDeductions.toFixed(2)}</span>
          </div>
        </div>

        <div class="receipt-row total-row">
          <span style="font-family: var(--font-serif); font-size: 1.35rem;">NET PAY DUE</span>
          <span class="tabular-numbers" style="font-size: 1.45rem; font-family: var(--font-serif);">₹${a.netPay.toFixed(2)}</span>
        </div>

        <div style="margin-top: 1.25rem; background-color: var(--bg-paper); padding: 0.85rem; font-size: 0.8rem; line-height: 1.5;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem;">
            <strong>Fatigue Safety Status:</strong>
            ${ps.compliance.fatigueFlag === 'CLEAR' 
              ? '<span class="badge badge-olive">CLEAR</span>' 
              : `<span class="badge badge-danger">${escapeHtml(ps.compliance.fatigueFlag)}</span>`}
          </div>
          ${ps.compliance.fatigueNotes && ps.compliance.fatigueNotes.length > 0 
            ? `<p style="color: var(--orange-red); margin-top: 0.25rem;">${escapeHtml(ps.compliance.fatigueNotes.join(' '))}</p>` 
            : '<p style="color: var(--olive-green);">Hours within legal fatigue safety guidelines.</p>'}
        </div>

        <div style="text-align: center; margin-top: 1.5rem; font-size: 0.72rem; color: var(--text-faint); letter-spacing: 0.1em; text-transform: uppercase;">
          Deterministic Math Audit • Unalterable Digital Record • UN SDG 8
        </div>
      </div>
    `;

    document.getElementById('receipt-print-area').innerHTML = receiptHtml;
    document.getElementById('payslip-modal').classList.remove('hidden');
  } catch (err) {
    alert('Failed to display payslip: ' + err.message);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
