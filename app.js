(() => {
  'use strict';

  const STORAGE_KEY = 'wardflow-care-demo-v1';
  const BED_CAPACITY = 74;
  const OTHER_ACTIVE_PATIENTS = 66;
  const root = document.getElementById('viewRoot');
  let state = loadState();
  let role = 'Nurse';
  let view = 'overview';
  let selectedPatientId = null;
  let patientFilter = 'all';
  let patientSearch = '';
  let modalPatientId = null;
  let emergencyReview = false;
  let toastTimer = null;

  function localDate(offset = 0) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function dateTime(date, time) { return `${date}T${time}`; }

  function sampleReading(offset, temperature, fever, time = '08:10', note = '') {
    return { date: localDate(offset), time, temperature, fever, note, by: 'Nurse Anaya', recheckReason: '' };
  }

  function sampleVisit(offset, plan, note = '', time = '10:30', recommendDischarge = false) {
    return { date: localDate(offset), time, plan, note, by: 'Dr. Iyer', emergency: false, emergencyReason: '', recommendDischarge };
  }

  function seedState() {
    const today = localDate(0);
    return {
      occupancyBaseline: OTHER_ACTIVE_PATIENTS,
      nextId: 9,
      patients: [
        { id: 'P-001', name: 'Tara Nair', room: 'R-01', admitted: localDate(-6), status: 'active', readings: [sampleReading(-2, 38.4, true), sampleReading(-1, 37.3, false)], visits: [sampleVisit(-1, 'Continue observation and fluids.')], recommendation: null },
        { id: 'P-002', name: 'Leena Rao', room: 'R-02', admitted: localDate(-7), status: 'active', readings: [sampleReading(-3, 36.8, false), sampleReading(-2, 36.7, false), sampleReading(-1, 36.9, false), sampleReading(0, 36.8, false, '08:05')], visits: [sampleVisit(0, 'Continue current plan; no new concerns.', 'Three completed fever-free days documented.', '10:15', true)], recommendation: { date: today, time: '10:15', by: 'Dr. Iyer' } },
        { id: 'P-003', name: 'Imran Shah', room: 'R-03', admitted: localDate(-4), status: 'active', readings: [sampleReading(-1, 38.1, true), sampleReading(0, 38.6, true, '08:22')], visits: [sampleVisit(-1, 'Continue monitoring; review again today.')], recommendation: null },
        { id: 'P-004', name: 'Kavya Das', room: 'R-04', admitted: localDate(-5), status: 'active', readings: [sampleReading(-2, 37.0, false), sampleReading(-1, 36.9, false), sampleReading(0, 36.8, false, '08:40')], visits: [sampleVisit(-1, 'Continue observation.')], recommendation: null },
        { id: 'P-005', name: 'Nikhil Roy', room: 'R-05', admitted: localDate(-3), status: 'active', readings: [sampleReading(-2, 38.0, true)], visits: [], recommendation: null },
        { id: 'P-006', name: 'Sana Ali', room: 'R-06', admitted: localDate(-8), status: 'active', readings: [sampleReading(-2, 37.2, false), sampleReading(-1, 36.9, false), sampleReading(0, 37.0, false, '07:55')], visits: [sampleVisit(-1, 'Continue current treatment.', '', '10:20'), sampleVisit(0, 'Continue current plan and observe.', '', '10:40')], recommendation: null },
        { id: 'P-007', name: 'Dev Menon', room: 'R-07', admitted: localDate(-2), status: 'active', readings: [sampleReading(-1, 37.8, false)], visits: [], recommendation: null },
        { id: 'P-008', name: 'Mira George', room: 'R-08', admitted: localDate(-5), status: 'active', readings: [sampleReading(-1, 38.2, true), sampleReading(0, 38.0, true, '09:05')], visits: [sampleVisit(-1, 'Continue observation and review today.')], recommendation: null }
      ],
      outcomes: { recovered: 17, deaths: 3 },
      activity: [
        { date: today, time: '10:15', text: 'Dr. Iyer recommended Leena Rao for discharge after three complete fever-free days.', patientId: 'P-002' },
        { date: today, time: '09:05', text: 'Nurse Anaya recorded a temperature for Mira George.', patientId: 'P-008' },
        { date: today, time: '08:40', text: 'Nurse Anaya recorded a temperature for Kavya Das.', patientId: 'P-004' }
      ]
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.patients) && parsed.outcomes) return parsed;
      }
    } catch (error) {
      // The demo can still run with fresh in-memory data if browser storage is unavailable.
    }
    return seedState();
  }

  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch (error) { showToast('Changes are only in memory because browser storage is unavailable.', true); }
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }

  function formatDate(value, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
    if (!value) return '—';
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat(undefined, options).format(new Date(year, month - 1, day, 12));
  }

  function currentTime() {
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(new Date());
  }

  function patientById(id) { return state.patients.find((patient) => patient.id === id); }
  function activePatients() { return state.patients.filter((patient) => patient.status === 'active'); }
  function readingsForDate(patient, date = localDate()) { return patient.readings.filter((reading) => reading.date === date); }
  function visitsForDate(patient, date = localDate()) { return patient.visits.filter((visit) => visit.date === date); }
  function hasReadingToday(patient) { return readingsForDate(patient).length > 0; }
  function hasVisitToday(patient) { return visitsForDate(patient).length > 0; }

  function feverFreeFullDays(patient) {
    let count = 0;
    for (let offset = 1; offset <= 30; offset += 1) {
      const date = localDate(-offset);
      const readings = readingsForDate(patient, date);
      if (readings.length === 0 || readings.some((reading) => reading.fever)) break;
      count += 1;
    }
    return count;
  }

  function isDischargeEligible(patient) {
    if (!patient || patient.status !== 'active' || feverFreeFullDays(patient) < 3) return false;
    return !readingsForDate(patient).some((reading) => reading.fever);
  }

  function bedCount() { return state.occupancyBaseline + activePatients().length; }
  function totalOutcomes() { return state.outcomes.recovered + state.outcomes.deaths; }
  function mortalityRate() { return totalOutcomes() ? state.outcomes.deaths / totalOutcomes() : null; }
  function successRate() { return totalOutcomes() ? state.outcomes.recovered / totalOutcomes() : null; }

  function logActivity(text, patientId = null) {
    state.activity.unshift({ date: localDate(), time: currentTime(), text, patientId });
    state.activity = state.activity.slice(0, 40);
  }

  function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.toggle('error', isError);
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function badge(label, type) { return `<span class="badge badge-${type}">${escapeHtml(label)}</span>`; }

  function taskStatus(patient) {
    if (!hasReadingToday(patient)) return badge('Temperature due', 'due');
    if (!hasVisitToday(patient)) return badge('Doctor review due', 'review');
    return badge('Up to date', 'done');
  }

  function readingStatus(patient) {
    const readings = readingsForDate(patient);
    if (!readings.length) return 'Not recorded';
    const latest = readings[readings.length - 1];
    return `${Number(latest.temperature).toFixed(1)}°C · ${latest.fever ? 'fever' : 'no fever'}`;
  }

  function latestReading(patient) {
    return [...patient.readings].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))[0] || null;
  }

  function queueAction(patient) {
    if (role === 'Nurse' && !hasReadingToday(patient)) return `<button class="button button-secondary button-small" data-action="record-temp" data-patient="${escapeHtml(patient.id)}">Record temp</button>`;
    if (role === 'Doctor' && hasReadingToday(patient) && !hasVisitToday(patient)) return `<button class="button button-secondary button-small" data-action="doctor-review" data-patient="${escapeHtml(patient.id)}">Review</button>`;
    return `<button class="button button-quiet button-small" data-action="open-patient" data-patient="${escapeHtml(patient.id)}">Open chart</button>`;
  }

  function renderOverview() {
    const patients = activePatients();
    const tempDone = patients.filter(hasReadingToday).length;
    const visitsDone = patients.filter(hasVisitToday).length;
    const outcomes = totalOutcomes();
    const mortality = mortalityRate();
    const success = successRate();
    const pending = patients.filter((patient) => !hasReadingToday(patient) || !hasVisitToday(patient));
    const candidates = patients.filter((patient) => isDischargeEligible(patient));
    const capacityPct = Math.min(100, (bedCount() / BED_CAPACITY) * 100);
    const mortalityAlert = mortality !== null && mortality > 0.15;

    root.innerHTML = `
      <div class="page-heading"><div><span class="eyebrow">CARE UNIT OVERVIEW</span><h1>Good day, ${escapeHtml(role.toLowerCase())}</h1><p class="page-lede">A shared view of today's temperature checks, doctor rounds, and discharge handoffs.</p></div></div>
      <section class="grid metric-grid" aria-label="Daily care metrics">
        <article class="metric-card"><div class="metric-top"><span>OCCUPANCY</span><span class="metric-icon amber">⌂</span></div><div class="metric-value">${bedCount()}<span style="color:#9ba8a4;font-size:14px"> / ${BED_CAPACITY}</span></div><div class="metric-sub">${bedCount() >= BED_CAPACITY ? 'No beds currently available' : `${BED_CAPACITY - bedCount()} bed${BED_CAPACITY - bedCount() === 1 ? '' : 's'} available`}</div></article>
        <article class="metric-card"><div class="metric-top"><span>TEMPERATURES TODAY</span><span class="metric-icon">＋</span></div><div class="metric-value">${tempDone}<span style="color:#9ba8a4;font-size:14px"> / ${patients.length}</span></div><div class="metric-sub">${patients.length - tempDone} listed patient${patients.length - tempDone === 1 ? '' : 's'} still due</div></article>
        <article class="metric-card"><div class="metric-top"><span>DOCTOR REVIEWS</span><span class="metric-icon blue">✓</span></div><div class="metric-value">${visitsDone}<span style="color:#9ba8a4;font-size:14px"> / ${patients.length}</span></div><div class="metric-sub">Today's rounds · listed demo records</div></article>
        <article class="metric-card"><div class="metric-top"><span>DISCHARGE QUEUE</span><span class="metric-icon">↗</span></div><div class="metric-value">${candidates.length}</div><div class="metric-sub">Three full fever-free days documented</div></article>
      </section>

      <div class="dashboard-grid">
        <section class="panel">
          <div class="panel-header"><div><h2>Today's care queue</h2><p class="panel-subtitle">Resolve pending checks and reviews for the listed demo records.</p></div><button class="link-button" data-view="patients" type="button">All patients →</button></div>
          ${pending.length ? `<div class="task-list">${pending.slice(0, 7).map((patient) => `<div class="task-row"><div><div class="person-name">${escapeHtml(patient.name)}</div><div class="person-meta">${escapeHtml(patient.id)} · Room ${escapeHtml(patient.room)}</div></div><div class="task-cell-temp"><div class="task-cell-label">TEMPERATURE</div><div class="task-cell-value">${escapeHtml(readingStatus(patient))}</div></div><div class="task-cell-visit"><div class="task-cell-label">TODAY'S STATUS</div>${taskStatus(patient)}</div>${queueAction(patient)}</div>`).join('')}</div>` : `<div class="empty-state"><span class="empty-icon">✓</span>All listed demo patients are up to date for today.</div>`}
          ${state.occupancyBaseline > 0 ? `<p class="small-note">This prototype displays ${patients.length} individual demo charts plus the remaining occupied beds as an aggregate count, to reflect the assessment's 74-bed full-occupancy scenario.</p>` : ''}
        </section>
        <div>
          <section class="panel quality-card">
            <div class="panel-header"><div><h2>Outcome quality</h2><p class="panel-subtitle">Completed demo cases only</p></div><button class="link-button" data-view="outcomes" type="button">Details →</button></div>
            ${mortalityAlert ? `<div class="quality-warning">Mortality is above the 15% reference. Review the case count and completed outcomes.</div>` : `<div class="quality-good">Mortality is at or below the 15% reference for completed cases.</div>`}
            <div class="quality-rate"><strong>${success === null ? '—' : `${(success * 100).toFixed(1)}%`}</strong><span>success · ${state.outcomes.recovered} recovered</span></div>
            <div class="mini-bar" aria-label="${state.outcomes.recovered} recovered and ${state.outcomes.deaths} deaths"><span class="success-fill" style="width:${success === null ? 0 : success * 100}%"></span><span class="death-fill" style="width:${mortality === null ? 0 : mortality * 100}%"></span></div>
            <div class="bar-legend"><span>${state.outcomes.deaths} deaths / ${outcomes} outcomes</span><strong>${mortality === null ? 'No outcomes yet' : `${(mortality * 100).toFixed(1)}% mortality`}</strong></div>
            <p class="small-note">Active patients are excluded. The assessment's 85% success and 15% mortality figures are shown as reference benchmarks.</p>
          </section>
          <section class="panel">
            <div class="panel-header"><div><h2>Bed capacity</h2><p class="panel-subtitle">Current occupancy across the 74-bed unit</p></div><span class="metric-icon amber">⌂</span></div>
            <div class="capacity-line"><span>Occupied</span><strong>${bedCount()} / ${BED_CAPACITY}</strong></div>
            <div class="capacity-track"><div class="capacity-fill" style="width:${capacityPct}%"></div></div>
            <p class="small-note">${bedCount() >= BED_CAPACITY ? 'Admission is paused until an occupied bed is released after discharge.' : 'A bed is available for a new admission.'}</p>
          </section>
        </div>
      </div>`;
  }

  function patientMatchesFilter(patient) {
    if (patientFilter === 'closed') return patient.status !== 'active';
    if (patient.status !== 'active') return false;
    if (patientFilter === 'temp') return !hasReadingToday(patient);
    if (patientFilter === 'review') return !hasVisitToday(patient);
    if (patientFilter === 'discharge') return isDischargeEligible(patient);
    return true;
  }

  function renderPatientList() {
    if (role === 'Nurse' && patientFilter === 'closed') {
      // Nurses can still read closed charts in this demo, matching the shared care-record workflow.
    }
    const query = patientSearch.trim().toLowerCase();
    const patients = state.patients.filter(patientMatchesFilter).filter((patient) => !query || `${patient.name} ${patient.id} ${patient.room}`.toLowerCase().includes(query));
    const filters = [['all', 'All active'], ['temp', 'Temperature due'], ['review', 'Review due'], ['discharge', 'Discharge ready'], ['closed', 'Closed charts']];
    root.innerHTML = `
      <div class="page-heading"><div><span class="eyebrow">PATIENT MANAGEMENT</span><h1>Patient roster</h1><p class="page-lede">Daily tasks and fever-free history for the charts shown in this demo.</p></div><div class="page-actions">${role === 'Admin' ? `<button class="button button-primary" data-action="new-admission" type="button" ${bedCount() >= BED_CAPACITY ? 'disabled title="All beds are occupied"' : ''}>+ New admission</button>` : ''}</div></div>
      <div class="filters">${filters.map(([key, label]) => `<button class="filter-chip ${patientFilter === key ? 'active' : ''}" data-filter="${key}" type="button">${label}</button>`).join('')}<input id="patientSearch" class="search-input" type="search" value="${escapeHtml(patientSearch)}" placeholder="Search name, ID, or room" aria-label="Search patients"></div>
      <div class="patient-table">${patients.length ? patients.map((patient) => {
        const last = latestReading(patient);
        const closedLabel = patient.status === 'active' ? taskStatus(patient) : badge(patient.status === 'deceased' ? 'Deceased' : 'Discharged', patient.status === 'deceased' ? 'danger' : 'neutral');
        return `<article class="patient-row"><div><div class="person-name">${escapeHtml(patient.name)}</div><div class="person-meta">${escapeHtml(patient.id)} · Room ${escapeHtml(patient.room)}</div></div><div><div class="row-label">TODAY'S TEMPERATURE</div><div class="row-value">${escapeHtml(readingStatus(patient))}</div></div><div class="hide-mobile"><div class="row-label">FEVER-FREE STREAK</div><div class="row-value">${patient.status === 'active' ? `${feverFreeFullDays(patient)} full day${feverFreeFullDays(patient) === 1 ? '' : 's'}` : 'Closed'}</div></div><div class="hide-tablet"><div class="row-label">STATUS</div>${closedLabel}</div><button class="button button-quiet button-small" data-action="open-patient" data-patient="${escapeHtml(patient.id)}">Open chart</button></article>`;
      }).join('') : `<div class="panel empty-state"><span class="empty-icon">⌕</span>No charts match this view.</div>`}</div>
      <p class="small-note">Use the role selector to demonstrate nurse, doctor, and admin actions. The selector is only a prototype simulation, not sign-in security.</p>`;
  }

  function renderPatientDetail(patient) {
    const todayReadings = readingsForDate(patient);
    const todayVisits = visitsForDate(patient);
    const streak = feverFreeFullDays(patient);
    const eligible = isDischargeEligible(patient);
    const recommended = Boolean(patient.recommendation);
    const readingRecords = [...patient.readings].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    const visitRecords = [...patient.visits].sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));
    const currentReading = todayReadings.length ? `${todayReadings.length} reading${todayReadings.length === 1 ? '' : 's'} recorded today` : 'No temperature has been recorded today';
    let eligibilityText = eligible ? `Three or more completed fever-free days are on record${todayReadings.length ? '; no fever is recorded today.' : '.'}` : `${streak} completed fever-free day${streak === 1 ? '' : 's'} on record. Three full days are required before discharge can be recommended.`;
    if (todayReadings.some((reading) => reading.fever)) eligibilityText = 'A fever is recorded today. The fever-free streak has reset; discharge is not available.';

    let actions = `<button class="button button-quiet" data-action="back" type="button">Back to roster</button>`;
    if (patient.status === 'active' && role === 'Nurse') actions += `<button class="button button-primary" data-action="record-temp" data-patient="${escapeHtml(patient.id)}" type="button">${todayReadings.length ? 'Add recheck' : 'Record temperature'}</button>`;
    if (patient.status === 'active' && role === 'Doctor' && !hasVisitToday(patient)) {
      actions += hasReadingToday(patient)
        ? `<button class="button button-primary" data-action="doctor-review" data-patient="${escapeHtml(patient.id)}" type="button">Complete today's review</button>`
        : `<button class="button button-quiet" type="button" disabled title="Routine review waits for today's temperature">Routine review needs today's temperature</button><button class="button button-danger" data-action="emergency-review" data-patient="${escapeHtml(patient.id)}" type="button">Urgent review override</button>`;
    }
    if (patient.status === 'active' && role === 'Doctor' && hasVisitToday(patient) && eligible && !recommended) actions += `<button class="button button-secondary" data-action="recommend-discharge" data-patient="${escapeHtml(patient.id)}" type="button">Recommend discharge</button>`;
    if (patient.status === 'active' && role === 'Admin' && eligible && recommended) actions += `<button class="button button-primary" data-action="discharge" data-patient="${escapeHtml(patient.id)}" type="button">Confirm discharge</button>`;
    if (patient.status === 'active' && role === 'Doctor') actions += `<button class="button button-quiet" data-action="record-death" data-patient="${escapeHtml(patient.id)}" type="button">Record death outcome</button>`;

    root.innerHTML = `
      <button class="detail-back" data-action="back" type="button">← Patient roster</button>
      <div class="detail-header"><div><span class="eyebrow">${patient.status === 'active' ? 'ACTIVE PATIENT' : 'CLOSED PATIENT RECORD'}</span><h1>${escapeHtml(patient.name)}</h1><div class="detail-id">${escapeHtml(patient.id)} · Room ${escapeHtml(patient.room)} · Admitted ${formatDate(patient.admitted)}</div></div><div class="detail-actions">${actions}</div></div>
      <div class="detail-grid">
        <div>
          <section class="panel" style="margin-bottom:14px">
            <div class="panel-header"><div><h2>Today's care status</h2><p class="panel-subtitle">${escapeHtml(currentReading)}</p></div>${patient.status === 'active' ? taskStatus(patient) : badge(patient.status === 'deceased' ? 'Deceased' : 'Discharged', patient.status === 'deceased' ? 'danger' : 'neutral')}</div>
            <div class="info-strip"><div class="info-tile"><span>TEMPERATURE</span><strong>${escapeHtml(readingStatus(patient))}</strong></div><div class="info-tile"><span>DOCTOR REVIEW</span><strong>${hasVisitToday(patient) ? 'Complete' : 'Pending'}</strong></div><div class="info-tile"><span>FEVER-FREE DAYS</span><strong>${streak} full day${streak === 1 ? '' : 's'}</strong></div></div>
            <div class="eligibility ${eligible ? '' : 'pending'}">${escapeHtml(eligibilityText)} ${recommended ? '<br><strong>Doctor has recommended discharge.</strong>' : ''}</div>
            <p class="small-note">Fever status in this demo is selected using facility assessment. A production system needs a clinician-approved threshold and an auditable configuration.</p>
          </section>
          <section class="panel">
            <div class="panel-header"><div><h2>Temperature history</h2><p class="panel-subtitle">A reading is never overwritten when a recheck is added.</p></div></div>
            <div class="record-list">${readingRecords.length ? readingRecords.map((reading) => `<div class="record-item"><div class="record-date">${formatDate(reading.date, { day: 'numeric', month: 'short' })}<br>${escapeHtml(reading.time)}</div><div class="record-content"><strong><span class="record-dot ${reading.fever ? 'fever' : ''}"></span>${Number(reading.temperature).toFixed(1)}°C · ${reading.fever ? 'Fever present' : 'No fever'}</strong>${reading.note ? `${escapeHtml(reading.note)}<br>` : ''}Recorded by ${escapeHtml(reading.by || 'Care team')}${reading.recheckReason ? ` · Recheck: ${escapeHtml(reading.recheckReason)}` : ''}</div></div>`).join('') : `<div class="empty-state">No temperature readings have been saved.</div>`}</div>
          </section>
          <section class="panel" style="margin-top:14px">
            <div class="panel-header"><div><h2>Doctor reviews</h2><p class="panel-subtitle">Treatment decisions and any urgent exception are retained in the chart.</p></div></div>
            <div class="record-list">${visitRecords.length ? visitRecords.map((visit) => `<div class="record-item"><div class="record-date">${formatDate(visit.date, { day: 'numeric', month: 'short' })}<br>${escapeHtml(visit.time)}</div><div class="record-content"><strong>${visit.emergency ? 'Urgent review · override logged' : 'Daily doctor review'}</strong>${escapeHtml(visit.plan)}${visit.note ? `<br>${escapeHtml(visit.note)}` : ''}${visit.emergencyReason ? `<br>Override reason: ${escapeHtml(visit.emergencyReason)}` : ''}<br>Reviewed by ${escapeHtml(visit.by || 'Doctor')}${visit.recommendDischarge ? '<br><span style="color:#16806f;font-weight:700">Discharge recommended</span>' : ''}</div></div>`).join('') : `<div class="empty-state">No doctor reviews are recorded.</div>`}</div>
          </section>
        </div>
        <aside>
          <section class="panel"><div class="panel-header"><div><h2>Recent activity</h2><p class="panel-subtitle">Saved actions for this patient</p></div></div><div class="activity-list">${state.activity.filter((item) => item.patientId === patient.id).slice(0, 8).map((item) => `<div class="activity-item"><span class="activity-dot"></span><div>${escapeHtml(item.text)}<span class="activity-time">${formatDate(item.date, { day: 'numeric', month: 'short' })} · ${escapeHtml(item.time)}</span></div></div>`).join('') || '<div class="empty-state">No recent activity.</div>'}</div></section>
          ${patient.status === 'active' && role === 'Admin' && recommended && eligible ? `<section class="panel" style="margin-top:14px"><div class="panel-header"><div><h2>Discharge handoff</h2><p class="panel-subtitle">The doctor has notified admin for this eligible patient.</p></div></div><p class="small-note">Confirming discharge releases the bed and closes this active case. The chart remains available.</p><button class="button button-primary" style="margin-top:13px" data-action="discharge" data-patient="${escapeHtml(patient.id)}" type="button">Confirm discharge</button></section>` : ''}
        </aside>
      </div>`;
  }

  function renderOutcomes() {
    if (role === 'Nurse') {
      root.innerHTML = `<section class="panel"><span class="eyebrow">OUTCOME QUALITY</span><h1>Restricted view</h1><p class="page-lede">Outcome reporting is available to doctors and admins in this prototype.</p></section>`;
      return;
    }
    const recovered = state.outcomes.recovered;
    const deaths = state.outcomes.deaths;
    const count = totalOutcomes();
    const success = successRate();
    const mortality = mortalityRate();
    const above = mortality !== null && mortality > 0.15;
    root.innerHTML = `
      <div class="page-heading"><div><span class="eyebrow">FACILITY QUALITY</span><h1>Outcome quality</h1><p class="page-lede">Rates use completed outcomes only. Active patients are excluded from both calculations.</p></div></div>
      ${above ? `<div class="quality-warning">Mortality is above the 15% reference: ${deaths} deaths among ${count} completed outcomes. Review the cases and reporting period with the clinical lead.</div>` : `<div class="quality-good">Mortality is at or below the 15% reference: ${deaths} deaths among ${count} completed outcomes.</div>`}
      <div class="outcomes-grid">
        <article class="report-card"><div class="metric-top"><span>SUCCESS RATE · REFERENCE 85%</span><span class="metric-icon">✓</span></div><div class="report-number">${success === null ? '—' : `${(success * 100).toFixed(1)}%`}</div><div class="report-description">${recovered} recovered patients out of ${count} completed cases.</div></article>
        <article class="report-card"><div class="metric-top"><span>MORTALITY · REFERENCE 15%</span><span class="metric-icon ${above ? 'amber' : ''}">!</span></div><div class="report-number">${mortality === null ? '—' : `${(mortality * 100).toFixed(1)}%`}</div><div class="report-description">${deaths} deaths among ${count} completed cases.${above ? ' This is above the reference.' : ' This is at or below the reference.'}</div></article>
      </div>
      <section class="panel"><div class="panel-header"><div><h2>Completed outcomes</h2><p class="panel-subtitle">All-time synthetic prototype totals · ${count} cases</p></div></div><div class="outcome-visual" aria-label="Outcome ratio"><span class="recovered-segment" style="width:${success ? success * 100 : 0}%"></span><span class="death-segment" style="width:${mortality ? mortality * 100 : 0}%"></span></div><div class="legend"><span>${recovered} recovered</span><span class="death-legend">${deaths} deaths</span></div><p class="small-note">For a real dashboard, the reporting window, case inclusion rules, transfer outcomes, and denominator must be agreed with the clinical team. Do not interpret small counts without their numerator and denominator.</p></section>`;
  }

  function render() {
    const todayLabel = document.getElementById('todayLabel');
    todayLabel.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    document.querySelectorAll('.nav-item').forEach((button) => button.classList.toggle('is-active', button.dataset.view === (view === 'detail' ? 'patients' : view)));
    const admissionButton = document.getElementById('newAdmissionButton');
    admissionButton.classList.toggle('hidden', role !== 'Admin');
    admissionButton.disabled = role !== 'Admin' || bedCount() >= BED_CAPACITY;
    admissionButton.title = role === 'Admin' && bedCount() >= BED_CAPACITY ? 'All beds are occupied' : '';
    if (view === 'overview') renderOverview();
    else if (view === 'patients') renderPatientList();
    else if (view === 'detail') {
      const patient = patientById(selectedPatientId);
      if (patient) renderPatientDetail(patient);
      else { view = 'patients'; renderPatientList(); }
    } else if (view === 'outcomes') renderOutcomes();
  }

  function openTemperature(patientId) {
    if (role !== 'Nurse') return showToast('Only the nurse role can record a temperature in this demo.', true);
    const patient = patientById(patientId);
    if (!patient || patient.status !== 'active') return showToast('This patient is not active.', true);
    modalPatientId = patientId;
    document.getElementById('temperaturePatientLabel').textContent = `${patient.name} · ${patient.id} · Room ${patient.room}`;
    document.getElementById('recheckReasonGroup').classList.toggle('hidden', readingsForDate(patient).length === 0);
    document.getElementById('recheckReason').required = readingsForDate(patient).length > 0;
    document.getElementById('temperatureForm').reset();
    document.getElementById('temperatureDialog').showModal();
    document.getElementById('temperatureValue').focus();
  }

  function openDoctorReview(patientId, isEmergency = false) {
    if (role !== 'Doctor') return showToast('Only the doctor role can complete a doctor review in this demo.', true);
    const patient = patientById(patientId);
    if (!patient || patient.status !== 'active') return showToast('This patient is not active.', true);
    if (hasVisitToday(patient)) return showToast('A doctor review is already recorded for today.', true);
    if (!hasReadingToday(patient) && !isEmergency) return showToast('Record today\'s temperature before a routine doctor review.', true);
    emergencyReview = isEmergency;
    modalPatientId = patientId;
    document.getElementById('visitPatientLabel').textContent = `${patient.name} · ${patient.id} · Room ${patient.room}`;
    document.getElementById('emergencyNotice').classList.toggle('hidden', !isEmergency);
    document.getElementById('emergencyReasonGroup').classList.toggle('hidden', !isEmergency);
    document.getElementById('emergencyReason').required = isEmergency;
    document.getElementById('visitForm').reset();
    document.getElementById('visitDialog').showModal();
    document.getElementById('treatmentPlan').focus();
  }

  function openAdmission() {
    if (role !== 'Admin') return showToast('Only the admin role can admit a patient.', true);
    if (bedCount() >= BED_CAPACITY) return showToast('All 74 beds are occupied. Complete a discharge first.', true);
    document.getElementById('admissionCapacityNote').textContent = `${BED_CAPACITY - bedCount()} bed${BED_CAPACITY - bedCount() === 1 ? '' : 's'} available in the demo unit.`;
    document.getElementById('admissionForm').reset();
    document.getElementById('admissionDialog').showModal();
  }

  function openDeathOutcome(patientId) {
    if (role !== 'Doctor') return showToast('Only the doctor role can record a death outcome in this demo.', true);
    const patient = patientById(patientId);
    if (!patient || patient.status !== 'active') return showToast('This patient is not active.', true);
    modalPatientId = patientId;
    document.getElementById('deathPatientLabel').textContent = `${patient.name} · ${patient.id} · Room ${patient.room}`;
    document.getElementById('deathForm').reset();
    document.getElementById('deathDialog').showModal();
    document.getElementById('deathNote').focus();
  }

  function recommendDischarge(patientId) {
    const patient = patientById(patientId);
    if (role !== 'Doctor' || !patient || patient.status !== 'active') return showToast('This action is available to the doctor for active patients.', true);
    if (!isDischargeEligible(patient)) return showToast('Three complete fever-free days are required before recommending discharge.', true);
    if (!hasReadingToday(patient) || !hasVisitToday(patient)) return showToast('Complete today\'s temperature and doctor review before sending the discharge handoff.', true);
    patient.recommendation = { date: localDate(), time: currentTime(), by: 'Dr. Iyer' };
    logActivity(`Doctor recommended ${patient.name} for discharge after the fever-free criterion was met.`, patient.id);
    saveState();
    render();
    showToast('Discharge recommendation sent to admin.');
  }

  function dischargePatient(patientId) {
    const patient = patientById(patientId);
    if (role !== 'Admin' || !patient || patient.status !== 'active') return showToast('This action is available to admin for active patients.', true);
    if (!isDischargeEligible(patient) || !patient.recommendation) return showToast('A valid doctor recommendation and three full fever-free days are required.', true);
    if (!window.confirm(`Confirm discharge for ${patient.name}? This releases the bed and closes the active case.`)) return;
    patient.status = 'discharged';
    patient.closedAt = localDate();
    patient.closedTime = currentTime();
    state.outcomes.recovered += 1;
    logActivity(`Admin confirmed ${patient.name}'s discharge and released room ${patient.room}.`, patient.id);
    saveState();
    view = 'detail';
    selectedPatientId = patient.id;
    render();
    showToast('Patient discharged. The chart remains in closed charts.');
  }

  function setActiveView(newView) {
    view = newView;
    selectedPatientId = null;
    render();
  }

  document.addEventListener('click', (event) => {
    const closeButton = event.target.closest('[data-close]');
    if (closeButton) {
      document.getElementById(closeButton.dataset.close).close();
      return;
    }
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) {
      setActiveView(viewButton.dataset.view);
      return;
    }
    const filterButton = event.target.closest('[data-filter]');
    if (filterButton) {
      patientFilter = filterButton.dataset.filter;
      view = 'patients';
      render();
      return;
    }
    const actionButton = event.target.closest('[data-action]');
    if (!actionButton) return;
    const patientId = actionButton.dataset.patient;
    switch (actionButton.dataset.action) {
      case 'open-patient': selectedPatientId = patientId; view = 'detail'; render(); break;
      case 'back': view = 'patients'; selectedPatientId = null; render(); break;
      case 'record-temp': openTemperature(patientId); break;
      case 'doctor-review': openDoctorReview(patientId, false); break;
      case 'emergency-review': openDoctorReview(patientId, true); break;
      case 'new-admission': openAdmission(); break;
      case 'record-death': openDeathOutcome(patientId); break;
      case 'recommend-discharge': recommendDischarge(patientId); break;
      case 'discharge': dischargePatient(patientId); break;
      default: break;
    }
  });

  document.getElementById('roleSelect').addEventListener('change', (event) => {
    role = event.target.value;
    render();
    showToast(`Demo view changed to ${role}.`);
  });

  document.addEventListener('input', (event) => {
    if (event.target.id !== 'patientSearch') return;
    patientSearch = event.target.value;
    const cursor = event.target.selectionStart ?? patientSearch.length;
    renderPatientList();
    const replacement = document.getElementById('patientSearch');
    replacement.focus();
    replacement.setSelectionRange(cursor, cursor);
  });

  document.getElementById('newAdmissionButton').addEventListener('click', openAdmission);

  document.getElementById('temperatureForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const patient = patientById(modalPatientId);
    const rawTemperature = document.getElementById('temperatureValue').value;
    const temperature = Number(rawTemperature);
    const feverValue = document.getElementById('feverStatus').value;
    const note = document.getElementById('temperatureNote').value.trim();
    const reason = document.getElementById('recheckReason').value.trim();
    if (!patient || patient.status !== 'active') return showToast('This patient is no longer active.', true);
    if (!Number.isFinite(temperature) || temperature < 30 || temperature > 45) return showToast('Enter a temperature from 30°C to 45°C.', true);
    if (feverValue !== 'yes' && feverValue !== 'no') return showToast('Choose the facility fever assessment.', true);
    if (readingsForDate(patient).length && !reason) return showToast('A reason is required for a second reading on the same day.', true);
    patient.readings.push({ date: localDate(), time: currentTime(), temperature: Math.round(temperature * 10) / 10, fever: feverValue === 'yes', note, by: 'Nurse', recheckReason: reason });
    logActivity(`Nurse recorded a ${temperature.toFixed(1)}°C temperature for ${patient.name}${reason ? ' as a recheck' : ''}.`, patient.id);
    saveState();
    document.getElementById('temperatureDialog').close();
    render();
    showToast('Temperature saved to the patient chart.');
  });

  document.getElementById('visitForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const patient = patientById(modalPatientId);
    const plan = document.getElementById('treatmentPlan').value.trim();
    const note = document.getElementById('doctorNote').value.trim();
    const reason = document.getElementById('emergencyReason').value.trim();
    if (!patient || patient.status !== 'active') return showToast('This patient is no longer active.', true);
    if (hasVisitToday(patient)) return showToast('A doctor review is already recorded for today.', true);
    if (!hasReadingToday(patient) && !emergencyReview) return showToast('Record today\'s temperature before a routine review.', true);
    if (emergencyReview && !reason) return showToast('Enter a reason for the urgent override.', true);
    patient.visits.push({ date: localDate(), time: currentTime(), plan, note, by: 'Doctor', emergency: emergencyReview, emergencyReason: reason, recommendDischarge: false });
    logActivity(`Doctor completed ${emergencyReview ? 'an urgent review override' : 'the daily review'} for ${patient.name}.`, patient.id);
    saveState();
    document.getElementById('visitDialog').close();
    emergencyReview = false;
    render();
    showToast('Doctor review saved to the patient chart.');
  });

  document.getElementById('admissionForm').addEventListener('submit', (event) => {
    event.preventDefault();
    if (role !== 'Admin' || bedCount() >= BED_CAPACITY) return showToast('No bed is available for a new admission.', true);
    const name = document.getElementById('newPatientName').value.trim();
    const roomInput = document.getElementById('newRoom').value.trim();
    const activeRooms = new Set(activePatients().map((patient) => patient.room.toLowerCase()));
    let room = roomInput;
    if (!room) {
      for (let bed = 1; bed <= BED_CAPACITY; bed += 1) {
        const candidate = `R-${String(bed).padStart(2, '0')}`;
        if (!activeRooms.has(candidate.toLowerCase())) { room = candidate; break; }
      }
    }
    if (activeRooms.has(room.toLowerCase())) return showToast('That room is already assigned to an active patient.', true);
    const id = `P-${String(state.nextId++).padStart(3, '0')}`;
    state.patients.unshift({ id, name, room, admitted: localDate(), status: 'active', readings: [], visits: [], recommendation: null });
    logActivity(`Admin admitted ${name} to room ${room}.`, id);
    saveState();
    document.getElementById('admissionDialog').close();
    view = 'detail';
    selectedPatientId = id;
    render();
    showToast('Admission recorded. The patient appears in today\'s care queue.');
  });

  document.getElementById('deathForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const patient = patientById(modalPatientId);
    const note = document.getElementById('deathNote').value.trim();
    if (role !== 'Doctor' || !patient || patient.status !== 'active') return showToast('This patient is not active.', true);
    if (!window.confirm(`Record a death outcome for ${patient.name}? This closes the active case and changes the mortality rate.`)) return;
    patient.status = 'deceased';
    patient.closedAt = localDate();
    patient.closedTime = currentTime();
    patient.outcomeNote = note;
    state.outcomes.deaths += 1;
    logActivity(`Doctor recorded a death outcome for ${patient.name}.`, patient.id);
    saveState();
    document.getElementById('deathDialog').close();
    view = 'detail';
    selectedPatientId = patient.id;
    render();
    const mortality = mortalityRate();
    showToast(mortality > 0.15 ? 'Outcome saved. Mortality is now above the 15% reference.' : 'Death outcome saved to the demo quality totals.', mortality > 0.15);
  });

  document.getElementById('resetDemoButton').addEventListener('click', () => {
    if (!window.confirm('Reset all prototype changes and restore the original synthetic demo data?')) return;
    state = seedState();
    role = 'Nurse';
    document.getElementById('roleSelect').value = role;
    view = 'overview';
    selectedPatientId = null;
    patientFilter = 'all';
    patientSearch = '';
    saveState();
    render();
    showToast('Synthetic demo data restored.');
  });

  render();
})();
