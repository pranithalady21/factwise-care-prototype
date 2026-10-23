(() => {
  'use strict';
  const STORE_KEY = 'wardflow-demo-v1';
  const CAPACITY = 74;
  const FEVER_C = 38.0; // Demonstration default. The facility's clinical lead must configure its actual threshold.
  const roleList = ['Nurse', 'Doctor', 'Admin'];
  const canViewOutcomes = () => state.role === 'Doctor' || state.role === 'Admin';
  let view = 'overview';
  let activeFilter = 'all';
  let toastTimer;

  function dateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  function dayOffset(days) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + days);
    return dateKey(date);
  }
  function timeNow() {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date());
  }
  function readableDate() {
    return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(new Date());
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  }
  function samplePatient(index) {
    const names = [
      ['Amina Rao', 32], ['Arjun Das', 46], ['Meera Shah', 28], ['Kabir Sen', 61],
      ['Nisha Iyer', 37], ['Rohan Malik', 54], ['Farah Ali', 41], ['Dev Patel', 23],
      ['Leela Nair', 67], ['Omar Khan', 35], ['Tara Bose', 49], ['Vikram Roy', 58]
    ];
    const [name, age] = names[index] || [`Patient ${String(index + 1).padStart(2, '0')}`, 25 + (index * 7) % 48];
    return { id: `P-${101 + index}`, name, age, bed: `B-${String(index + 1).padStart(2, '0')}`, status: 'active', admissionDate: dayOffset(-((index % 9) + 2)), logs: [], visits: [], treatmentNotes: [] };
  }
  function makeDemoState() {
    const patients = Array.from({ length: CAPACITY }, (_, i) => samplePatient(i));
    const addTemps = (patientIndex, values) => {
      patients[patientIndex].logs = values.map(([offset, temp, nurse]) => ({ date: dayOffset(offset), temperature: temp, nurse: nurse || 'Nurse Demo', time: offset === 0 ? '9:15 AM' : '8:40 AM' }));
    };
    addTemps(0, [[-3, 37.1], [-2, 36.9], [-1, 37.0]]);
    addTemps(1, [[-3, 37.2], [-2, 37.0], [-1, 36.8], [0, 37.1]]);
    addTemps(2, [[-3, 37.0], [-2, 37.1], [-1, 36.9], [0, 38.4]]);
    addTemps(3, [[-2, 36.8], [-1, 37.0]]);
    addTemps(4, [[0, 37.4]]);
    addTemps(5, [[-3, 37.0], [-2, 36.7], [-1, 37.1], [0, 36.8]]);
    addTemps(6, [[0, 37.6]]);
    addTemps(7, [[-3, 37.0], [-2, 38.2], [-1, 37.2]]);
    addTemps(8, [[0, 37.0]]);
    addTemps(9, [[-3, 36.9], [-2, 37.1], [-1, 36.8], [0, 37.2]]);
    addTemps(10, [[0, 38.0]]);
    addTemps(11, [[-3, 37.2], [-2, 37.0], [-1, 36.9], [0, 37.3]]);
    patients[1].dischargeRecommendation = { date: dateKey(), doctor: 'Doctor Demo' };
    [1, 5, 9, 11].forEach((idx, n) => patients[idx].visits.push({ date: dateKey(), time: ['10:05 AM', '10:22 AM', '11:10 AM', '11:35 AM'][n], doctor: 'Doctor Demo', note: 'Daily review completed.' }));
    return { role: 'Nurse', patients, outcomes: { recovered: 17, deceased: 3 }, events: [{ time: new Date().toISOString(), text: 'Demo ward opened with 74 occupied beds.' }] };
  }
  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE_KEY));
      if (saved && Array.isArray(saved.patients) && saved.patients.length) {
        saved.outcomes ||= { recovered: 17, deceased: 3 };
        saved.events ||= [];
        return saved;
      }
    } catch (_) { /* Start with the bundled demo records. */ }
    return makeDemoState();
  }
  let state = loadState();
  if (!roleList.includes(state.role)) state.role = 'Nurse';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const activePatients = () => state.patients.filter(p => p.status === 'active');
  const todayLog = patient => patient.logs.find(item => item.date === dateKey());
  const todayVisit = patient => patient.visits.find(item => item.date === dateKey());
  const dischargeRecommended = patient => !!patient.dischargeRecommendation && patient.dischargeRecommendation.date === dateKey() && dischargeEligible(patient);
  const findPatient = id => state.patients.find(patient => patient.id === id);
  function feverFreeDays(patient) {
    for (let offset = 1; offset <= 3; offset += 1) {
      const log = patient.logs.find(item => item.date === dayOffset(-offset));
      if (!log || Number(log.temperature) >= FEVER_C) return false;
    }
    const current = todayLog(patient);
    return !current || Number(current.temperature) < FEVER_C;
  }
  const dischargeEligible = patient => patient.status === 'active' && feverFreeDays(patient);
  function countToday(selector) { return activePatients().filter(selector).length; }
  function saveState() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
    catch (_) { showToast('This browser could not save the demo changes.'); }
  }
  function addEvent(text) {
    state.events.unshift({ time: new Date().toISOString(), text });
    state.events = state.events.slice(0, 30);
  }
  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
  }
  function pill(label, kind = 'muted') { return `<span class="status-pill pill-${kind}">${escapeHtml(label)}</span>`; }
  function readingDisplay(patient) {
    const log = todayLog(patient);
    if (!log) return '<span class="muted">Not recorded</span>';
    return `<b>${Number(log.temperature).toFixed(1)}°C</b> ${Number(log.temperature) >= FEVER_C ? pill('Fever', 'red') : ''}`;
  }
  function patientState(patient) {
    if (patient.status !== 'active') return pill(patient.status === 'deceased' ? 'Deceased' : 'Discharged', 'muted');
    if (todayLog(patient) && Number(todayLog(patient).temperature) >= FEVER_C) return pill('Fever today', 'red');
    if (dischargeRecommended(patient)) return pill('Doctor recommended', 'green');
    if (dischargeEligible(patient)) return pill('Eligibility met', 'green');
    if (todayLog(patient)) return pill('Checked today', 'green');
    return pill('Check due', 'amber');
  }
  function metricCard(label, value, note, icon, noteKind = '') {
    return `<article class="metric-card"><div class="metric-top"><span class="metric-label">${label}</span><span class="metric-icon">${icon}</span></div><div class="metric-value">${value}</div><div class="metric-note ${noteKind}">${note}</div></article>`;
  }
  function todayMetrics() {
    const occupied = activePatients().length;
    const checked = countToday(p => !!todayLog(p));
    const visited = countToday(p => !!todayVisit(p));
    const eligible = activePatients().filter(dischargeEligible).length;
    return { occupied, checked, visited, eligible };
  }
  function actionCell(patient) {
    if (state.role === 'Nurse') {
      const logged = todayLog(patient);
      return `<button class="action-btn" data-action="${logged ? 'patient' : 'record-temp'}" data-id="${patient.id}" ${logged ? 'disabled' : ''}>${logged ? 'Recorded' : 'Add temperature'}</button>`;
    }
    if (state.role === 'Doctor') {
      if (view === 'discharges') {
        if (dischargeRecommended(patient)) return pill('Recommended', 'green');
        if (dischargeEligible(patient)) return `<button class="action-btn" data-action="recommend-discharge" data-id="${patient.id}">Recommend to Admin</button>`;
        return '<span class="muted">Not eligible</span>';
      }
      if (todayVisit(patient)) return '<span class="muted">Done</span>';
      return `<button class="action-btn" data-action="${todayLog(patient) ? 'record-visit' : 'patient'}" data-id="${patient.id}" ${todayLog(patient) ? '' : 'disabled title="Record today\'s temperature first"'}>${todayLog(patient) ? 'Record visit' : 'Awaiting temp'}</button>`;
    }
    return `<button class="action-btn" data-action="${dischargeRecommended(patient) ? 'discharge' : 'patient'}" data-id="${patient.id}" ${dischargeRecommended(patient) ? '' : 'disabled'}>${dischargeRecommended(patient) ? 'Discharge' : dischargeEligible(patient) ? 'Awaiting doctor' : 'Not eligible'}</button>`;
  }
  function patientRows(list) {
    if (!list.length) return '<tr><td colspan="6"><div class="empty-state"><strong>Nothing to show</strong>There are no patients in this view.</div></td></tr>';
    return list.map(patient => {
      const visit = todayVisit(patient);
      return `<tr>
        <td><button class="patient-link patient-name" data-action="patient" data-id="${patient.id}"><span class="patient-initial">${escapeHtml(patient.name.split(' ').map(p => p[0]).slice(0, 2).join(''))}</span><span><b>${escapeHtml(patient.name)}</b><small>${patient.id} · ${patient.age} years</small></span></button></td>
        <td>${patient.bed}</td><td>${readingDisplay(patient)}</td>
        <td>${todayLog(patient) ? pill('Complete', 'green') : pill('Due', 'amber')}</td>
        <td>${visit ? pill('Complete', 'green') : pill(todayLog(patient) ? 'Due' : 'Blocked', todayLog(patient) ? 'amber' : 'muted')}</td>
        <td>${actionCell(patient)}</td>
      </tr>`;
    }).join('');
  }
  function patientTable(list, tableId = '') {
    return `<div class="table-wrap" ${tableId ? `id="${tableId}"` : ''}><table class="patient-table"><thead><tr><th>PATIENT</th><th>BED</th><th>TODAY'S TEMP</th><th>NURSE CHECK</th><th>DOCTOR VISIT</th><th>ACTION</th></tr></thead><tbody>${patientRows(list)}</tbody></table></div>`;
  }
  function roleSummary() {
    if (state.role === 'Nurse') return ['Temperature rounds', `${todayMetrics().occupied - todayMetrics().checked} patients still need today\'s reading. Each active patient should have one check per day.`, 'Record a temperature', 'record-temp'];
    if (state.role === 'Doctor') return ['Doctor rounds', `${todayMetrics().visited} of ${todayMetrics().occupied} active patients have a visit logged today. A same-day nurse reading is needed before a visit can be recorded.`, 'Review patients', 'patients'];
    return ['Discharge coordination', `${todayMetrics().eligible} patients meet the three-day fever-free rule. Confirm the patient record before completing a discharge.`, 'Open discharge queue', 'discharges'];
  }
  function overviewPage() {
    const m = todayMetrics();
    const checkedPct = m.occupied ? Math.round(m.checked / m.occupied * 100) : 0;
    const visitedPct = m.occupied ? Math.round(m.visited / m.occupied * 100) : 0;
    const [summaryTitle, summaryText, buttonText, buttonAction] = roleSummary();
    let list;
    if (state.role === 'Nurse') list = activePatients().filter(p => !todayLog(p)).slice(0, 8);
    else if (state.role === 'Doctor') list = activePatients().filter(p => todayLog(p) && !todayVisit(p)).slice(0, 8);
    else list = activePatients().filter(dischargeEligible).slice(0, 8);
    const tableTitle = state.role === 'Nurse' ? 'Temperature checks to complete' : state.role === 'Doctor' ? 'Patients ready for a doctor visit' : 'Patients ready for discharge';
    const tableSub = state.role === 'Doctor' ? 'Patients without a temperature reading remain blocked from a visit.' : 'Open a patient record to see their daily history and next action.';
    return `<div class="page-heading"><div><p class="eyebrow">TODAY · ${escapeHtml(readableDate())} · North Wing</p><h1>Good day, ${state.role === 'Nurse' ? 'care team' : state.role === 'Doctor' ? 'doctor' : 'administrator'}</h1><p>One shared view of daily checks, rounds, and discharge readiness.</p></div><button class="btn btn-primary" data-action="${buttonAction === 'record-temp' ? 'choose-patient-temp' : 'navigate'}" ${buttonAction !== 'record-temp' ? `data-view="${buttonAction}"` : ''}>＋ ${buttonText}</button></div>
      <section class="summary-grid">
        ${metricCard('OCCUPIED BEDS', `${m.occupied}<span class="muted" style="font-size:13px"> / ${CAPACITY}</span>`, m.occupied >= CAPACITY ? 'At facility capacity' : `${CAPACITY - m.occupied} beds available`, '⌂', m.occupied >= CAPACITY ? 'warn' : '')}
        ${metricCard("TODAY'S TEMPERATURES", `${m.checked}<span class="muted" style="font-size:13px"> / ${m.occupied}</span>`, `${checkedPct}% of active patients checked`, '◉', checkedPct === 100 ? 'good' : 'warn')}
        ${metricCard("TODAY'S DOCTOR VISITS", `${m.visited}<span class="muted" style="font-size:13px"> / ${m.occupied}</span>`, `${visitedPct}% of active patients visited`, '＋', visitedPct === 100 ? 'good' : '')}
        ${metricCard('DISCHARGE ELIGIBLE', m.eligible, 'Three full fever-free days recorded', '↗', m.eligible ? 'good' : '')}
      </section>
      <div class="content-grid"><section class="panel table-panel"><div class="panel-header"><div><h2>${tableTitle}</h2><p>${tableSub}</p></div><button class="text-link" data-action="navigate" data-view="${state.role === 'Admin' ? 'discharges' : 'patients'}">View all →</button></div>${patientTable(list)}</section>
        <div class="side-stack"><section class="panel"><div class="panel-header"><div><h2>${summaryTitle}</h2><p>Role-specific next steps</p></div></div><div class="panel-body"><div class="callout ${state.role === 'Admin' ? 'green' : 'teal'}"><span class="callout-icon">${state.role === 'Admin' ? '✓' : 'i'}</span><span>${escapeHtml(summaryText)}</span></div><div style="margin-top:12px"><button class="btn btn-secondary" data-action="${buttonAction === 'record-temp' ? 'choose-patient-temp' : 'navigate'}" ${buttonAction !== 'record-temp' ? `data-view="${buttonAction}"` : ''}>${buttonText}</button></div></div></section>
          <section class="panel"><div class="panel-header"><div><h2>Daily completion</h2><p>Today's service coverage</p></div></div><div class="panel-body"><div class="progress-row"><div class="progress-meta"><span>Temperature checks</span><b>${m.checked}/${m.occupied}</b></div><div class="progress-track"><div class="progress-fill" style="width:${checkedPct}%"></div></div><div class="progress-foot">One nurse reading per active patient each day</div></div><div class="progress-row" style="margin-bottom:0"><div class="progress-meta"><span>Doctor visits</span><b>${m.visited}/${m.occupied}</b></div><div class="progress-track"><div class="progress-fill amber" style="width:${visitedPct}%"></div></div><div class="progress-foot">Visit logging unlocks after today's temperature</div></div></div></section>
          ${canViewOutcomes() ? `<section class="panel"><div class="panel-header"><div><h2>Outcome benchmark</h2><p>Closed cases in demo cohort</p></div><button class="text-link" data-action="navigate" data-view="outcomes">Details →</button></div><div class="panel-body"><div class="mini-stat"><span>Success target</span><b>85% <span class="muted">· ${state.outcomes.recovered} recovered</span></b></div><div class="mini-stat"><span>Mortality limit</span><b>15% <span class="muted">· ${state.outcomes.deceased} deaths</span></b></div></div></section>` : ''}
        </div>
      </div>`;
  }
  function patientsPage() {
    const people = activePatients();
    return `<div class="page-heading"><div><p class="eyebrow">CARE TEAM WORKSPACE</p><h1>Patients</h1><p>Track today's nurse checks and doctor visits for every occupied bed.</p></div>${state.role === 'Admin' ? `<button class="btn btn-primary" data-action="admit">＋ Admit patient</button>` : ''}</div>
      <section class="summary-grid">${metricCard('ACTIVE PATIENTS', `${people.length} / ${CAPACITY}`, people.length >= CAPACITY ? 'No beds currently available' : `${CAPACITY - people.length} beds available`, '⌂', people.length >= CAPACITY ? 'warn' : '')}${metricCard('CHECKS DUE', countToday(p => !todayLog(p)), 'No temperature logged today', '◉', 'warn')}${metricCard('VISITS DUE', countToday(p => !!todayLog(p) && !todayVisit(p)), 'Temperature is recorded for these patients', '＋')}${metricCard('VISITS BLOCKED', countToday(p => !todayLog(p)), 'Waiting for the nurse check', '!', 'warn')}</section>
      <section class="panel"><div class="panel-header"><div><h2>Inpatient list</h2><p>Today · ${people.length} active records</p></div><div class="toolbar"><label class="search-box"><span>⌕</span><input id="patientSearch" type="search" placeholder="Search name or bed" aria-label="Search patients"></label><select class="filter-select" id="patientFilter" aria-label="Filter patient records"><option value="all">All patients</option><option value="temp-due">Temperature due</option><option value="visit-due">Doctor visit due</option><option value="eligible">Discharge eligible</option></select></div></div><div id="patientTableContainer">${patientTable(people, 'patient-table-wrap')}</div></section>`;
  }
  function dischargePage() {
    const eligible = activePatients().filter(dischargeEligible);
    return `<div class="page-heading"><div><p class="eyebrow">CARE TEAM WORKSPACE</p><h1>Discharge queue</h1><p>Review three-day eligibility, record the doctor's handoff, and complete discharge.</p></div>${state.role === 'Admin' ? `<button class="btn btn-primary" data-action="admit" ${activePatients().length >= CAPACITY ? 'disabled title="Facility is full"' : ''}>＋ Admit patient</button>` : ''}</div>
      ${state.role === 'Doctor' ? `<div class="callout teal" style="margin-bottom:15px"><span class="callout-icon">i</span><span>Review the three-day record and recommend eligible patients to Admin. This recommendation records the handoff; it does not change the discharge rule.</span></div>` : state.role === 'Nurse' ? `<div class="callout amber" style="margin-bottom:15px"><span class="callout-icon">i</span><span>Eligibility is visible for coordination. Doctor recommendation and Admin discharge actions are role-restricted.</span></div>` : ''}
      <section class="summary-grid">${metricCard('READY FOR DISCHARGE', eligible.length, 'Three full days without fever', '✓', eligible.length ? 'good' : '')}${metricCard('AWAITING TODAY CHECK', countToday(p => !todayLog(p)), 'Daily monitoring remains visible', '◉', 'warn')}${metricCard('OCCUPANCY', `${activePatients().length} / ${CAPACITY}`, `${CAPACITY - activePatients().length} beds available`, '⌂', activePatients().length >= CAPACITY ? 'warn' : '')}${metricCard('RECOVERED TO DATE', state.outcomes.recovered, `Of ${state.outcomes.recovered + state.outcomes.deceased} closed cases`, '↗', 'good')}</section>
      <section class="panel table-panel"><div class="panel-header"><div><h2>Eligibility queue</h2><p>Three consecutive prior calendar days have a recorded temperature below ${FEVER_C.toFixed(1)}°C.</p></div><span class="status-pill pill-green">${eligible.length} eligible</span></div>${eligible.length ? patientTable(eligible) : '<div class="empty-state"><strong>No patients are eligible today</strong>Eligibility is calculated from three complete, fever-free days.</div>'}</section>`;
  }
  function outcomesPage() {
    const total = state.outcomes.recovered + state.outcomes.deceased;
    const success = total ? Math.round(state.outcomes.recovered / total * 100) : 0;
    const mortality = total ? Math.round(state.outcomes.deceased / total * 100) : 0;
    const successReached = success >= 85;
    const mortalityWithin = mortality <= 15;
    return `<div class="page-heading"><div><p class="eyebrow">QUALITY MEASURES</p><h1>Outcomes</h1><p>Compare completed patient outcomes with the facility's 85% success and 15% mortality benchmarks.</p></div>${state.role === 'Doctor' ? `<button class="btn btn-danger" data-action="choose-patient-death">＋ Record a death</button>` : ''}</div>
      <div class="callout teal" style="margin-bottom:15px"><span class="callout-icon">i</span><span>Rates use closed cases only. Active inpatients are excluded. The demo cohort starts at 17 recovered and 3 deaths; new demo outcomes update these totals.</span></div>
      <section class="summary-grid">${metricCard('CLOSED CASES', total, `${state.outcomes.recovered} recovered · ${state.outcomes.deceased} deaths`, '▤')}${metricCard('SUCCESS RATE', `${success}%`, `Benchmark: 85% · ${successReached ? 'at or above target' : 'below target'}`, '↗', successReached ? 'good' : 'warn')}${metricCard('MORTALITY RATE', `${mortality}%`, `Benchmark: no more than 15% · ${mortalityWithin ? 'within limit' : 'above limit'}`, '!', mortalityWithin ? 'good' : 'warn')}${metricCard('ACTIVE PATIENTS', activePatients().length, `Capacity ${CAPACITY} beds`, '⌂')}</section>
      <div class="content-grid"><section class="panel"><div class="panel-header"><div><h2>Benchmark comparison</h2><p>Current demo cohort · ${total} closed cases</p></div></div><div class="panel-body"><div class="outcome-card"><div class="progress-meta"><h3>Successful recovery</h3><span class="benchmark-tag">Target 85%</span></div><div class="outcome-number"><span class="metric-large">${success}%</span><small>${state.outcomes.recovered} of ${total} closed cases</small></div><div class="progress-track"><div class="progress-fill" style="width:${Math.min(success,100)}%"></div></div></div><div class="outcome-card" style="margin-top:12px"><div class="progress-meta"><h3>Mortality</h3><span class="benchmark-tag">Limit 15%</span></div><div class="outcome-number"><span class="metric-large">${mortality}%</span><small>${state.outcomes.deceased} of ${total} closed cases</small></div><div class="progress-track"><div class="progress-fill ${mortalityWithin ? '' : 'amber'}" style="width:${Math.min(mortality,100)}%"></div></div></div></div></section>
        <section class="panel"><div class="panel-header"><div><h2>How the measure works</h2><p>Definitions used in this prototype</p></div></div><div class="panel-body checklist"><div class="check-row"><span class="check-box">✓</span><span>Success rate = recovered outcomes ÷ all closed outcomes.</span></div><div class="check-row"><span class="check-box">✓</span><span>Mortality rate = death outcomes ÷ all closed outcomes.</span></div><div class="check-row"><span class="check-box pending">!</span><span>Active patients do not enter either denominator until their outcome is closed.</span></div><div class="check-row"><span class="check-box pending">!</span><span>Escalate for review when mortality exceeds 15% or success falls below 85%.</span></div><div class="divider"></div><p class="muted" style="font-size:9px;line-height:1.6;margin:0">These small demo counts are not a quality conclusion. Production reporting should allow a date range, show numerator and denominator, and flag low sample sizes.</p></div></section></div>`;
  }
  function setPageTitle() {
    const titles = { overview: 'Overview', patients: 'Patients', discharges: 'Discharge queue', outcomes: 'Outcomes' };
    $('#pageCrumb').textContent = titles[view] || 'Overview';
    $$('.nav-item').forEach(btn => btn.classList.toggle('active', btn.dataset.view === view));
  }
  function render() {
    $('#todayLabel').textContent = readableDate();
    $('#roleSwitcher').value = state.role;
    $('#profileRole').textContent = state.role;
    $('#patientNavCount').textContent = activePatients().length;
    $('#dischargeNavCount').textContent = activePatients().filter(dischargeEligible).length;
    const outcomesNav = $('.nav-item[data-view="outcomes"]');
    if (outcomesNav) outcomesNav.hidden = !canViewOutcomes();
    if (!canViewOutcomes() && view === 'outcomes') view = 'overview';
    setPageTitle();
    const content = $('#appContent');
    content.innerHTML = view === 'patients' ? patientsPage() : view === 'discharges' ? dischargePage() : view === 'outcomes' ? outcomesPage() : overviewPage();
  }
  function navigate(nextView) {
    if (!['overview', 'patients', 'discharges', 'outcomes'].includes(nextView)) return;
    if (nextView === 'outcomes' && !canViewOutcomes()) {
      view = 'overview';
      render();
      showToast('Outcomes are available to Doctor and Admin roles only.');
      return;
    }
    view = nextView;
    $('#sidebar').classList.remove('open');
    render();
  }
  function openModal(title, subtitle, body, footer = '', wide = false) {
    $('#modalRoot').innerHTML = `<div class="modal-backdrop" data-action="backdrop-close"><section class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><header class="modal-header"><div><h2 id="modalTitle">${title}</h2><p>${subtitle || ''}</p></div><button class="modal-close" type="button" data-action="close-modal" aria-label="Close dialog">×</button></header><div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ''}</section></div>`;
    const focusable = $('input,textarea,select,button', $('#modalRoot'));
    if (focusable) focusable.focus();
  }
  function closeModal() { $('#modalRoot').innerHTML = ''; }
  function patientDetails(patient) {
    if (!patient) return;
    const logs = [...patient.logs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
    const eligibility = dischargeEligible(patient);
    let actionButtons = '';
    if (patient.status === 'active' && state.role === 'Nurse' && !todayLog(patient)) actionButtons += `<button class="btn btn-primary" data-action="record-temp" data-id="${patient.id}">＋ Record temperature</button>`;
    if (patient.status === 'active' && state.role === 'Doctor' && todayLog(patient) && !todayVisit(patient)) actionButtons += `<button class="btn btn-primary" data-action="record-visit" data-id="${patient.id}">＋ Record doctor visit</button>`;
    if (patient.status === 'active' && state.role === 'Doctor' && eligibility && !dischargeRecommended(patient)) actionButtons += `<button class="btn btn-secondary" data-action="recommend-discharge" data-id="${patient.id}">Recommend discharge</button>`;
    if (patient.status === 'active' && state.role === 'Admin' && dischargeRecommended(patient)) actionButtons += `<button class="btn btn-primary" data-action="discharge" data-id="${patient.id}">Complete discharge</button>`;
    const eligibilityLine = patient.status === 'active' ? (eligibility ? `<div class="callout ${dischargeRecommended(patient) ? 'green' : 'amber'}"><span class="callout-icon">${dischargeRecommended(patient) ? '✓' : 'i'}</span><span><b>${dischargeRecommended(patient) ? 'Doctor recommended discharge' : 'Three-day eligibility met'}</b>${dischargeRecommended(patient) ? `Recommendation recorded by ${escapeHtml(patient.dischargeRecommendation.doctor)}.` : 'Three complete prior days have a temperature below the fever threshold. Doctor can record the handoff to Admin.'}</span></div>` : '<div class="callout amber"><span class="callout-icon">i</span><span><b>Not yet eligible</b>Three complete consecutive prior days below the fever threshold are required.</span></div>') : `<div class="callout teal"><span class="callout-icon">i</span><span>Record status: ${escapeHtml(patient.status)}${patient.closedAt ? ` on ${escapeHtml(patient.closedAt)}` : ''}.</span></div>`;
    const history = logs.length ? logs.map(log => `<div class="history-item"><span><b>${new Date(`${log.date}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</b><small> · ${escapeHtml(log.nurse || 'Nurse')}</small></span><span>${Number(log.temperature).toFixed(1)}°C</span></div>`).join('') : '<div class="empty-state">No temperature entries yet.</div>';
    const visit = todayVisit(patient);
    const visitLine = visit ? `<div class="callout green" style="margin-top:10px"><span class="callout-icon">✓</span><span><b>Doctor visit complete today</b>${escapeHtml(visit.time)} · ${escapeHtml(visit.doctor)}${visit.note ? `<br>${escapeHtml(visit.note)}` : ''}</span></div>` : patient.status === 'active' ? `<div class="callout ${todayLog(patient) ? 'amber' : 'teal'}" style="margin-top:10px"><span class="callout-icon">${todayLog(patient) ? '!' : 'i'}</span><span><b>${todayLog(patient) ? 'Doctor visit due' : 'Doctor visit blocked'}</b>${todayLog(patient) ? 'A doctor can now record today\'s visit.' : 'A same-day nurse temperature must be recorded first.'}</span></div>` : '';
    openModal(escapeHtml(patient.name), `${patient.id} · Bed ${patient.bed} · ${patient.age} years`, `<div class="detail-grid"><div class="detail-tile"><small>Admission date</small><b>${new Date(`${patient.admissionDate}T12:00:00`).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</b></div><div class="detail-tile"><small>Today's reading</small><b>${todayLog(patient) ? `${Number(todayLog(patient).temperature).toFixed(1)}°C at ${escapeHtml(todayLog(patient).time)}` : 'Not recorded'}</b></div><div class="detail-tile"><small>Patient status</small><b>${escapeHtml(patient.status)}</b></div><div class="detail-tile"><small>Fever threshold</small><b>${FEVER_C.toFixed(1)}°C demo setting</b></div></div>${eligibilityLine}${visitLine}<div class="divider"></div><h3 style="font:700 11px Manrope;margin:0 0 4px">Temperature history</h3><div class="history-list">${history}</div>${actionButtons ? `<div class="modal-actions">${actionButtons}</div>` : ''}`, `<button class="btn btn-outline" data-action="close-modal">Close</button>`, true);
  }
  function openTemperatureForm(patient) {
    if (state.role !== 'Nurse') return showToast('Only the Nurse role can record temperatures.');
    if (!patient || patient.status !== 'active') return;
    if (todayLog(patient)) return showToast('One temperature is already recorded for this patient today.');
    openModal('Record temperature', `${escapeHtml(patient.name)} · ${patient.bed} · ${readableDate()}`, `<form id="temperatureForm" data-patient-id="${patient.id}"><div class="form-field"><label for="temperature">Temperature in °C</label><input id="temperature" name="temperature" type="number" min="30" max="45" step="0.1" inputmode="decimal" placeholder="36.8" required><span class="form-help">Use the calibrated device reading. The demo fever alert begins at ${FEVER_C.toFixed(1)}°C.</span></div><div class="callout teal"><span class="callout-icon">i</span><span>This entry will be attached to ${patient.id} for today's date and will unlock the doctor's visit action.</span></div></form>`, `<button class="btn btn-outline" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit" form="temperatureForm">Save reading</button>`);
    $('#temperature').focus();
  }
  function openVisitForm(patient) {
    if (state.role !== 'Doctor') return showToast('Only the Doctor role can record visits.');
    if (!patient || patient.status !== 'active') return;
    if (!todayLog(patient)) return showToast('Record today\'s temperature before logging the doctor visit.');
    if (todayVisit(patient)) return showToast('A doctor visit is already logged for this patient today.');
    openModal('Record doctor visit', `${escapeHtml(patient.name)} · ${patient.bed} · Temperature ${Number(todayLog(patient).temperature).toFixed(1)}°C`, `<form id="visitForm" data-patient-id="${patient.id}"><div class="form-field"><label for="visitNote">Visit note <span class="muted">(optional)</span></label><textarea id="visitNote" name="note" maxlength="500" placeholder="Brief handoff or treatment note"></textarea><span class="form-help">Do not enter unnecessary personal details in this demo.</span></div><div class="callout green"><span class="callout-icon">✓</span><span>Today's nurse temperature is recorded. Saving will mark the daily doctor visit complete.</span></div></form>`, `<button class="btn btn-outline" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit" form="visitForm">Save visit</button>`);
  }
  function openAdmissionForm() {
    if (state.role !== 'Admin') return showToast('Only the Admin role can admit patients.');
    if (activePatients().length >= CAPACITY) return showToast('Facility is full. Complete a discharge before admission.');
    openModal('Admit patient', `${CAPACITY - activePatients().length} bed${CAPACITY - activePatients().length === 1 ? '' : 's'} available`, `<form id="admitForm"><div class="form-field"><label for="newName">Patient name</label><input id="newName" name="name" maxlength="60" required placeholder="Full name"></div><div class="form-field"><label for="newAge">Age</label><input id="newAge" name="age" type="number" min="0" max="120" required placeholder="Age in years"></div><div class="form-field"><label for="admissionNote">Admission note <span class="muted">(optional)</span></label><textarea id="admissionNote" name="note" maxlength="300" placeholder="Short administrative handoff"></textarea></div><div class="callout teal"><span class="callout-icon">i</span><span>Admission is permitted only when an open bed is available. The app will assign the next free bed.</span></div></form>`, `<button class="btn btn-outline" data-action="close-modal">Cancel</button><button class="btn btn-primary" type="submit" form="admitForm">Admit patient</button>`);
  }
  function confirmDischarge(patient) {
    if (state.role !== 'Admin') return showToast('Only the Admin role can complete a discharge.');
    if (!patient || !dischargeRecommended(patient)) return showToast('A current doctor recommendation is required after the three-day fever-free rule is met.');
    openModal('Confirm discharge', `${escapeHtml(patient.name)} · ${patient.id} · Bed ${patient.bed}`, `<div class="callout green"><span class="callout-icon">✓</span><span><b>Eligibility confirmed</b>Three complete prior days have a recorded temperature below ${FEVER_C.toFixed(1)}°C, with no fever recorded today.</span></div><p style="font-size:11px;line-height:1.6;color:#617778;margin:14px 0 0">Completing this action closes the active stay, records a recovered outcome, and makes the bed available for admission.</p>`, `<button class="btn btn-outline" data-action="close-modal">Cancel</button><button class="btn btn-primary" data-action="confirm-discharge" data-id="${patient.id}">Complete discharge</button>`);
  }
  function confirmDeath(patient) {
    if (state.role !== 'Doctor') return showToast('Only the Doctor role can record a clinical outcome.');
    if (!patient || patient.status !== 'active') return;
    openModal('Record a death outcome', `${escapeHtml(patient.name)} · ${patient.id} · Bed ${patient.bed}`, `<div class="callout amber"><span class="callout-icon">!</span><span>This closes the active stay and updates the mortality rate. Use only for a confirmed outcome.</span></div><form id="deathForm" data-patient-id="${patient.id}" style="margin-top:14px"><div class="form-field"><label for="deathNote">Outcome note <span class="muted">(optional)</span></label><textarea id="deathNote" name="note" maxlength="300" placeholder="Brief record note"></textarea></div></form>`, `<button class="btn btn-outline" data-action="close-modal">Cancel</button><button class="btn btn-danger" type="submit" form="deathForm">Confirm death outcome</button>`);
  }
  function admit(form) {
    if (state.role !== 'Admin') return;
    if (activePatients().length >= CAPACITY) return showToast('Facility is full. Complete a discharge first.');
    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const age = Number(data.get('age'));
    if (!name || !Number.isInteger(age) || age < 0 || age > 120) return showToast('Enter a patient name and valid age.');
    const usedBeds = new Set(activePatients().map(patient => patient.bed));
    let bedNo = 1;
    while (usedBeds.has(`B-${String(bedNo).padStart(2, '0')}`)) bedNo += 1;
    const serial = Math.max(100, ...state.patients.map(p => Number(String(p.id).replace(/\D/g, '')) || 0)) + 1;
    const patient = { id: `P-${serial}`, name, age, bed: `B-${String(bedNo).padStart(2, '0')}`, status: 'active', admissionDate: dateKey(), logs: [], visits: [], treatmentNotes: [] };
    state.patients.push(patient);
    addEvent(`Patient ${patient.id} admitted to ${patient.bed}.`);
    saveState(); closeModal(); render(); showToast(`${name} admitted to ${patient.bed}.`);
  }
  function recordTemperature(form) {
    const data = new FormData(form);
    const temp = Number(data.get('temperature'));
    const patientId = form.dataset.patientId;
    const patient = findPatient(patientId);
    if (state.role !== 'Nurse') return showToast('Only the Nurse role can record temperatures.');
    if (!patient || patient.status !== 'active' || todayLog(patient)) return showToast('A reading cannot be added for this patient today.');
    if (!Number.isFinite(temp) || temp < 30 || temp > 45) return showToast('Enter a temperature between 30.0°C and 45.0°C.');
    patient.logs.push({ date: dateKey(), temperature: Math.round(temp * 10) / 10, nurse: 'Nurse Demo', time: timeNow() });
    addEvent(`Temperature recorded for ${patient.id}.`);
    saveState(); closeModal(); render(); showToast(temp >= FEVER_C ? 'Fever alert recorded. Doctor review is available.' : 'Temperature saved. Doctor visit is now available.');
  }
  function recordVisit(form) {
    const patient = findPatient(form.dataset.patientId);
    if (state.role !== 'Doctor') return showToast('Only the Doctor role can record visits.');
    if (!patient || patient.status !== 'active' || !todayLog(patient) || todayVisit(patient)) return showToast('The visit cannot be recorded until today\'s temperature is available.');
    const note = String(new FormData(form).get('note') || '').trim();
    patient.visits.push({ date: dateKey(), time: timeNow(), doctor: 'Doctor Demo', note });
    addEvent(`Doctor visit recorded for ${patient.id}.`);
    saveState(); closeModal(); render(); showToast('Doctor visit saved.');
  }
  function dischargePatient(patient) {
    if (state.role !== 'Admin') return showToast('Only the Admin role can complete a discharge.');
    if (!patient || !dischargeRecommended(patient)) return showToast('The discharge rule or doctor recommendation is no longer current. Refresh the patient record.');
    patient.status = 'discharged';
    patient.closedAt = `${readableDate()} ${timeNow()}`;
    patient.outcome = 'recovered';
    state.outcomes.recovered += 1;
    addEvent(`Patient ${patient.id} discharged as recovered from ${patient.bed}.`);
    saveState(); closeModal(); render(); showToast(`${patient.name} discharged; ${patient.bed} is available.`);
  }
  function recommendDischarge(patient) {
    if (state.role !== 'Doctor') return showToast('Only the Doctor role can recommend a discharge.');
    if (!patient || !dischargeEligible(patient)) return showToast('The patient does not meet the three-day fever-free rule.');
    patient.dischargeRecommendation = { date: dateKey(), doctor: 'Doctor Demo' };
    addEvent(`Doctor recommended discharge for ${patient.id}.`);
    saveState(); closeModal(); render(); showToast('Recommendation sent to the Admin discharge queue.');
  }
  function recordDeath(form) {
    if (state.role !== 'Doctor') return showToast('Only the Doctor role can record a clinical outcome.');
    const patient = findPatient(form.dataset.patientId);
    if (!patient || patient.status !== 'active') return showToast('This patient is no longer active.');
    const note = String(new FormData(form).get('note') || '').trim();
    patient.status = 'deceased';
    patient.closedAt = `${readableDate()} ${timeNow()}`;
    patient.outcome = 'deceased';
    patient.outcomeNote = note;
    state.outcomes.deceased += 1;
    addEvent(`A confirmed death outcome was recorded for ${patient.id}.`);
    saveState(); closeModal(); navigate('outcomes'); showToast('Outcome recorded and mortality rate updated.');
  }
  function openPatientPicker(action) {
    const eligible = action === 'choose-patient-death' ? activePatients() : activePatients().filter(patient => !todayLog(patient));
    const title = action === 'choose-patient-death' ? 'Choose patient outcome' : 'Choose patient for temperature';
    const options = eligible.slice(0, 60).map(patient => `<button class="history-item patient-link" style="width:100%;text-align:left" data-action="${action === 'choose-patient-death' ? 'record-death' : 'record-temp'}" data-id="${patient.id}"><span><b>${escapeHtml(patient.name)}</b><small> · ${patient.id} · ${patient.bed}</small></span><span>${action === 'choose-patient-death' ? 'Record →' : 'Add reading →'}</span></button>`).join('');
    openModal(title, action === 'choose-patient-death' ? 'Only confirmed outcomes should be recorded.' : 'Only patients without a temperature entry today are shown.', options || '<div class="empty-state"><strong>No patients to select</strong>All active patients already have a reading today.</div>', `<button class="btn btn-outline" data-action="close-modal">Close</button>`, true);
  }
  function resetDemo() {
    openModal('Reset demo data', 'Restore the original sample patients and outcome counts.', '<div class="callout amber"><span class="callout-icon">!</span><span>This clears changes saved by this prototype in the current browser, including admissions, readings, visits, and discharges.</span></div>', `<button class="btn btn-outline" data-action="close-modal">Cancel</button><button class="btn btn-danger" data-action="confirm-reset">Reset demo</button>`);
  }

  document.addEventListener('click', event => {
    const navButton = event.target.closest('[data-view]');
    if (navButton && navButton.dataset.view) { navigate(navButton.dataset.view); return; }
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const patient = button.dataset.id ? findPatient(button.dataset.id) : null;
    if (action === 'close-modal') closeModal();
    else if (action === 'backdrop-close' && event.target === button) closeModal();
    else if (action === 'patient') patientDetails(patient);
    else if (action === 'record-temp') openTemperatureForm(patient);
    else if (action === 'record-visit') openVisitForm(patient);
    else if (action === 'admit') openAdmissionForm();
    else if (action === 'discharge') confirmDischarge(patient);
    else if (action === 'confirm-discharge') dischargePatient(patient);
    else if (action === 'recommend-discharge') recommendDischarge(patient);
    else if (action === 'choose-patient-temp') openPatientPicker(action);
    else if (action === 'choose-patient-death') openPatientPicker(action);
    else if (action === 'record-death') confirmDeath(patient);
    else if (action === 'reset-demo') resetDemo();
    else if (action === 'confirm-reset') { localStorage.removeItem(STORE_KEY); state = makeDemoState(); view = 'overview'; saveState(); closeModal(); render(); showToast('Demo data restored.'); }
  });
  document.addEventListener('submit', event => {
    if (event.target.id === 'temperatureForm') { event.preventDefault(); recordTemperature(event.target); }
    else if (event.target.id === 'visitForm') { event.preventDefault(); recordVisit(event.target); }
    else if (event.target.id === 'admitForm') { event.preventDefault(); admit(event.target); }
    else if (event.target.id === 'deathForm') { event.preventDefault(); recordDeath(event.target); }
  });
  document.addEventListener('input', event => {
    if (event.target.id === 'patientSearch' || event.target.id === 'patientFilter') filterPatients();
  });
  function filterPatients() {
    const search = ($('#patientSearch')?.value || '').trim().toLowerCase();
    const filter = $('#patientFilter')?.value || activeFilter;
    activeFilter = filter;
    let list = activePatients();
    if (filter === 'temp-due') list = list.filter(p => !todayLog(p));
    else if (filter === 'visit-due') list = list.filter(p => !!todayLog(p) && !todayVisit(p));
    else if (filter === 'eligible') list = list.filter(dischargeEligible);
    if (search) list = list.filter(p => p.name.toLowerCase().includes(search) || p.bed.toLowerCase().includes(search) || p.id.toLowerCase().includes(search));
    const container = $('#patientTableContainer');
    if (container) container.innerHTML = patientTable(list);
  }
  $('#roleSwitcher').addEventListener('change', event => {
    if (!roleList.includes(event.target.value)) return;
    state.role = event.target.value;
    if (!canViewOutcomes() && view === 'outcomes') view = 'overview';
    saveState();
    render();
  });
  $('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
  render();
})();
