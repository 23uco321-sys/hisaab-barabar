// Worker Portal Front-end Logic for Hisaab Barabar
// Vanilla JavaScript — Zero external libraries

let currentWorker = null;
let currentSector = null;
let activeShift = null;
let timerInterval = null;
let speechRecognizer = null;
let isRecording = false;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  setupClockTicker();
  setupSpeechRecognition();
  setupEventListeners();
  await loadSectorsAndWorkers();
});

// Setup Live Clock in masthead
function setupClockTicker() {
  const clockEl = document.getElementById('masthead-time');
  function updateTime() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString([], { hour12: false });
  }
  updateTime();
  setInterval(updateTime, 1000);
}

// Setup Event Listeners
function setupEventListeners() {
  // Worker select change
  document.getElementById('worker-select').addEventListener('change', async (e) => {
    await selectWorker(e.target.value);
  });

  // Toggle New Worker Form
  document.getElementById('btn-toggle-new-worker').addEventListener('click', () => {
    const form = document.getElementById('new-worker-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  });

  document.getElementById('btn-cancel-nw').addEventListener('click', () => {
    document.getElementById('new-worker-form').style.display = 'none';
  });

  // Submit New Worker Form
  document.getElementById('new-worker-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('nw-name').value;
    const role = document.getElementById('nw-role').value;
    const sectorId = document.getElementById('nw-sector').value;
    const phone = document.getElementById('nw-phone').value;

    try {
      const res = await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, role, sectorId, phone })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('new-worker-form').reset();
        document.getElementById('new-worker-form').style.display = 'none';
        await loadSectorsAndWorkers(data.worker.id);
      } else {
        alert('Failed to register worker: ' + data.error);
      }
    } catch (err) {
      alert('Error registering worker: ' + err.message);
    }
  });

  // Check In Button
  document.getElementById('btn-checkin').addEventListener('click', async () => {
    if (!currentWorker) return;
    try {
      const res = await fetch('/api/shifts/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: currentWorker.id })
      });
      const data = await res.json();
      if (data.success) {
        await refreshActiveShift();
        await loadWorkerShiftHistory();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Check-in error: ' + err.message);
    }
  });

  // Check Out Button
  document.getElementById('btn-checkout').addEventListener('click', async () => {
    if (!currentWorker) return;
    if (!confirm('Confirm check-out and generate deterministic payslip for this shift?')) return;

    try {
      const res = await fetch('/api/shifts/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workerId: currentWorker.id })
      });
      const data = await res.json();
      if (data.success) {
        await refreshActiveShift();
        await loadWorkerShiftHistory();
        // Automatically open payslip view
        await viewPayslip(data.shift.id);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Check-out error: ' + err.message);
    }
  });

  // Shift Simulator Buttons
  document.querySelectorAll('.btn-simulate').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      if (!currentWorker) return;
      const hours = parseFloat(e.target.dataset.hours);
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

      try {
        const res = await fetch('/api/shifts/manual', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workerId: currentWorker.id,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            notes: `Simulated ${hours}h evaluation shift`
          })
        });
        const data = await res.json();
        if (data.success) {
          await loadWorkerShiftHistory();
          await viewPayslip(data.shift.id);
        } else {
          alert(data.error);
        }
      } catch (err) {
        alert('Simulation error: ' + err.message);
      }
    });
  });

  // Hazard Report Form
  document.getElementById('hazard-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentWorker) return;

    const category = document.getElementById('hz-category').value;
    const severity = document.getElementById('hz-severity').value;
    const location = document.getElementById('hz-location').value;
    const description = document.getElementById('hz-description').value;
    const anonymous = document.getElementById('hz-anonymous').checked;

    const payload = {
      sectorId: currentWorker.sectorId,
      category,
      severity,
      location,
      description,
      workerId: anonymous ? 'anonymous' : currentWorker.id,
      workerName: anonymous ? 'Anonymous Worker' : currentWorker.name
    };

    try {
      const res = await fetch('/api/hazards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        alert(`Safety Hazard reported successfully! Reference ID: ${data.hazard.id}. Safety team has been alerted.`);
        document.getElementById('hazard-form').reset();
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert('Hazard report error: ' + err.message);
    }
  });

  // Close Payslip Modal
  document.getElementById('btn-close-modal').addEventListener('click', () => {
    document.getElementById('payslip-modal').classList.add('hidden');
  });

  // Close modal when clicking on backdrop
  document.getElementById('payslip-modal').addEventListener('click', (e) => {
    if (e.target.id === 'payslip-modal') {
      document.getElementById('payslip-modal').classList.add('hidden');
    }
  });
}

// Load Sectors and Workers
async function loadSectorsAndWorkers(selectWorkerId = null) {
  try {
    const [secRes, wRes] = await Promise.all([
      fetch('/api/sectors'),
      fetch('/api/workers')
    ]);

    const secData = await secRes.json();
    const wData = await wRes.json();

    window.allSectors = secData.sectors;
    window.allWorkers = wData.workers;

    const selectEl = document.getElementById('worker-select');
    selectEl.innerHTML = '';

    window.allWorkers.forEach(w => {
      const opt = document.createElement('option');
      opt.value = w.id;
      const secName = window.allSectors[w.sectorId] ? window.allSectors[w.sectorId].name : w.sectorId;
      opt.textContent = `${w.name} (${w.role}) — ${secName}`;
      selectEl.appendChild(opt);
    });

    const targetId = selectWorkerId || (window.allWorkers.length > 0 ? window.allWorkers[0].id : null);
    if (targetId) {
      selectEl.value = targetId;
      await selectWorker(targetId);
    }
  } catch (err) {
    console.error('Failed to load initial data:', err);
  }
}

// Select Worker
async function selectWorker(workerId) {
  const w = window.allWorkers.find(x => x.id === workerId);
  if (!w) return;

  currentWorker = w;
  currentSector = window.allSectors[w.sectorId];

  // Update Worker Card
  document.getElementById('wcard-name').textContent = w.name;
  document.getElementById('wcard-role').textContent = `${w.role} • Badge: ${w.badgeNumber}`;
  document.getElementById('wcard-details').textContent = `Sector: ${currentSector.name} • Contact: ${w.phone || 'N/A'}`;

  // Update Masthead and Policy Box
  document.getElementById('masthead-sector-label').textContent = currentSector.name.toUpperCase();
  document.getElementById('side-sector-name').textContent = currentSector.name;
  document.getElementById('side-std-hours').textContent = currentSector.standardShiftHours.toFixed(1);
  document.getElementById('side-base-rate').textContent = currentSector.hourlyBaseRate.toFixed(2);
  document.getElementById('side-ot-multiplier').textContent = currentSector.overtimeMultiplier.toFixed(2);
  const otRate = currentSector.hourlyBaseRate * currentSector.overtimeMultiplier;
  document.getElementById('side-ot-rate').textContent = otRate.toFixed(2);
  document.getElementById('side-fatigue-limit').textContent = currentSector.fatigueThresholdHours.toFixed(1);
  document.getElementById('side-pf-rate').textContent = `${(currentSector.deductions.pfRate * 100).toFixed(0)}%`;
  document.getElementById('side-meal-deduction').textContent = currentSector.deductions.canteenFixed.toFixed(2);

  // Update Hazard Categories for this sector
  const catSelect = document.getElementById('hz-category');
  catSelect.innerHTML = '';
  currentSector.hazardCategories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    catSelect.appendChild(opt);
  });

  await refreshActiveShift();
  await loadWorkerShiftHistory();
}

// Refresh Active Shift status
async function refreshActiveShift() {
  if (!currentWorker) return;

  try {
    const res = await fetch(`/api/workers/${currentWorker.id}`);
    const data = await res.json();
    activeShift = data.activeShift;

    const statusBadge = document.getElementById('clock-status-badge');
    const statusLabel = document.getElementById('clock-status-label');
    const timerDisplay = document.getElementById('clock-timer-display');
    const metaText = document.getElementById('clock-meta-text');
    const btnCheckin = document.getElementById('btn-checkin');
    const btnCheckout = document.getElementById('btn-checkout');

    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    if (activeShift) {
      statusBadge.className = 'badge badge-olive';
      statusBadge.textContent = 'ON DUTY (ACTIVE)';
      statusLabel.textContent = 'SHIFT RECORD IN PROGRESS';
      btnCheckin.style.display = 'none';
      btnCheckout.style.display = 'block';

      const startTime = new Date(activeShift.startTime);
      metaText.textContent = `Clocked in at ${startTime.toLocaleTimeString()} (${startTime.toLocaleDateString()}). Shift ID: ${activeShift.id}`;

      function updateElapsed() {
        const diffMs = Math.max(0, Date.now() - startTime.getTime());
        const totalSec = Math.floor(diffMs / 1000);
        const hrs = Math.floor(totalSec / 3600);
        const mins = Math.floor((totalSec % 3600) / 60);
        const secs = totalSec % 60;
        timerDisplay.textContent = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
      updateElapsed();
      timerInterval = setInterval(updateElapsed, 1000);
    } else {
      statusBadge.className = 'badge badge-neutral';
      statusBadge.textContent = 'OFF DUTY';
      statusLabel.textContent = 'TIME CLOCK READY';
      timerDisplay.textContent = '00:00:00';
      metaText.textContent = 'Not currently clocked in. Tap "Check In For Shift" to begin shift logging.';
      btnCheckin.style.display = 'block';
      btnCheckout.style.display = 'none';
    }
  } catch (err) {
    console.error('Failed to check active shift:', err);
  }
}

// Load Worker's Shift History
async function loadWorkerShiftHistory() {
  if (!currentWorker) return;

  const container = document.getElementById('worker-shifts-list');
  const countBadge = document.getElementById('shift-history-count');

  try {
    const res = await fetch(`/api/shifts?workerId=${currentWorker.id}`);
    const data = await res.json();
    const shifts = data.shifts || [];

    countBadge.textContent = `${shifts.length} Recorded`;

    if (shifts.length === 0) {
      container.innerHTML = `<p style="font-size: 0.85rem; color: var(--text-muted); padding: 1rem 0;">No shifts logged for this worker yet.</p>`;
      return;
    }

    let html = `<div style="display: flex; flex-direction: column; gap: 0.75rem;">`;
    shifts.forEach(s => {
      const isCompleted = s.status === 'completed';
      const hoursText = isCompleted ? `${s.totalHours} hrs` : 'In Progress';
      const payText = isCompleted ? `₹${s.netPay.toFixed(2)}` : 'Pending';
      const otText = isCompleted && s.overtimeHours > 0 ? `(${s.overtimeHours}h OT)` : '';
      const fatigueBadge = s.fatigueWarning
        ? `<span class="badge badge-danger" title="${escapeHtml(s.fatigueNotes?.join(' ') || '')}">FATIGUE ALERT</span>`
        : `<span class="badge badge-olive">COMPLIANT</span>`;

      html += `
        <div style="border-bottom: 1px solid var(--rule-subtle); padding-bottom: 0.75rem;">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <strong style="font-size: 0.95rem;">${escapeHtml(s.date || '')}</strong>
            <span class="tabular-numbers" style="font-weight: 700;">${payText}</span>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.35rem; font-size: 0.82rem; color: var(--text-muted);">
            <span>${hoursText} ${otText}</span>
            <div>${fatigueBadge}</div>
          </div>
          ${isCompleted ? `
            <div style="margin-top: 0.5rem; text-align: right;">
              <button class="btn btn-sm btn-view-payslip" data-id="${s.id}">
                View Payslip Receipt
              </button>
            </div>
          ` : ''}
        </div>
      `;
    });
    html += `</div>`;

    container.innerHTML = html;

    // Attach click listeners to view payslip
    container.querySelectorAll('.btn-view-payslip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        viewPayslip(e.target.dataset.id);
      });
    });
  } catch (err) {
    container.innerHTML = `<p style="font-size: 0.85rem; color: var(--orange-red);">Failed to load shift records.</p>`;
  }
}

// Generate & View Payslip Receipt Modal
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

// Setup Voice Dictation Feature
function setupSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const toggleBtn = document.getElementById('btn-voice-toggle');
  const statusText = document.getElementById('voice-status-text');
  const descArea = document.getElementById('hz-description');

  if (!SpeechRecognition) {
    statusText.textContent = 'Voice dictation available in compatible browsers (Web Speech API)';
    toggleBtn.title = 'Speech API not supported in this browser';
    return;
  }

  speechRecognizer = new SpeechRecognition();
  speechRecognizer.continuous = true;
  speechRecognizer.interimResults = true;
  speechRecognizer.lang = 'en-US';

  speechRecognizer.onstart = () => {
    isRecording = true;
    toggleBtn.classList.add('recording');
    statusText.textContent = 'Listening... Speak details clearly now';
  };

  speechRecognizer.onresult = (event) => {
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + ' ';
      }
    }
    if (finalTranscript) {
      descArea.value = descArea.value ? `${descArea.value.trim()} ${finalTranscript.trim()}` : finalTranscript.trim();
    }
  };

  speechRecognizer.onerror = (event) => {
    console.warn('Speech recognition error:', event.error);
    isRecording = false;
    toggleBtn.classList.remove('recording');
    statusText.textContent = `Speech note paused (${event.error}). Tap to speak.`;
  };

  speechRecognizer.onend = () => {
    isRecording = false;
    toggleBtn.classList.remove('recording');
    statusText.textContent = 'Push to Speak (Voice Note)';
  };

  toggleBtn.addEventListener('click', () => {
    if (!speechRecognizer) return;
    if (isRecording) {
      speechRecognizer.stop();
    } else {
      try {
        speechRecognizer.start();
      } catch (err) {
        console.error(err);
      }
    }
  });
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
