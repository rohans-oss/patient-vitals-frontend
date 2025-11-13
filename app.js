/* Simple SPA logic + demo data */
(function(){
  const API_BASE_URL = 'http://localhost:4000/api';
  const $ = (q, root=document) => root.querySelector(q);
  const $$ = (q, root=document) => Array.from(root.querySelectorAll(q));

  // Splash is a persistent hero at the top; no auto-hide

// Basic state
  const state = {
    user: JSON.parse(localStorage.getItem('doctorUser')) || null,
    token: localStorage.getItem('doctorToken') || null,
    patients: [], // Will be loaded from API
    firstLoad: true,
  };

  const roleView = $('#role-view');
  const loginView = $('#login-view');
  const patientAuthView = $('#patient-auth-view');
  const dashView = $('#dashboard-view');
  const patientView = $('#patient-view');
  const profileView = $('#profile-view');
  const aboutView = $('#about-view');

  // Login handling (real auth)
  async function handleLogin(e){
    if(e) e.preventDefault();
    const email = $('#email').value.trim();
    const password = $('#password').value;
    if(!email || !password){ return false; }
    const btn = $('#loginBtn');
    if(!btn) return false;
    
    btn.classList.add('loading');
    const prev = btn.textContent; btn.textContent = 'Signing in…';
    btn.disabled = true;
    
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
  
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
  
      // Assuming backend sends { token, user: { name, email, ... } }
      state.user = data.user;
      state.token = data.token;
      localStorage.setItem('doctorUser', JSON.stringify(data.user));
      localStorage.setItem('doctorToken', data.token);
  
      updateHeader();
      window.location.hash = '#/dashboard';
    } catch (err) {
      console.error(err);
      alert(err.message); // Simple error feedback
    } finally {
      btn.disabled = false; btn.classList.remove('loading'); btn.textContent = prev;
    }
    return false;
  }
  
  async function fetchPatients() {
    if (!state.token) {
      return showView('login'); // Redirect to login if no token
    }
    try {
      const res = await fetch(`${API_BASE_URL}/patients`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });

      if (res.status === 401) {
         $('#logoutBtn').click(); // Token expired or invalid
         return;
      }
      if (!res.ok) {
         throw new Error('Failed to fetch patients');
      }
      
      state.patients = await res.json(); // Expects an array of patients
      renderDashboard(); // Now render with the fetched data
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }

  const lf = $('#loginForm');
  if(lf){ lf.addEventListener('submit', handleLogin); }
  const lb = $('#loginBtn');
  if(lb){ lb.addEventListener('click', handleLogin); }

  $('#logoutBtn').addEventListener('click', ()=>{
    state.user = null;
    state.token = null;
    localStorage.removeItem('doctorUser');
    localStorage.removeItem('doctorToken');
    updateHeader();
    window.location.hash = '#/login';
  });

  function updateHeader(){
    $('#doctorName').textContent = state.user ? state.user.name : '';
    $('#profileName').textContent = state.user ? state.user.name : '—';
    $('#profileEmail').textContent = state.user ? state.user.email : '—';
  }

  // Router (hash)
  window.addEventListener('hashchange', route);
  function route(){
    const hash = window.location.hash || '';
    const [_, page, id] = hash.split('/');
    showView(page, id);
    setActiveTab(page);
    if (state.user) {
      updateHeader();
    }
    state.firstLoad = false;
  }

  function showView(page, id){
    const authed = !!state.token;
    // Hide all views first
    roleView && roleView.classList.add('hidden');
    loginView && loginView.classList.add('hidden');
    patientAuthView && patientAuthView.classList.add('hidden');
    aboutView && aboutView.classList.add('hidden');
    dashView.classList.add('hidden');
    patientView.classList.add('hidden');
    profileView.classList.add('hidden');

    if(!authed){
      // Landing mode: show Role chooser first; reveal others only when requested
      roleView && roleView.classList.remove('hidden');
      if(page === 'login'){ loginView.classList.remove('hidden'); initLoginBot(); }
      if(page === 'patient-auth'){ patientAuthView.classList.remove('hidden'); }
      if(page === 'about'){ aboutView.classList.remove('hidden'); }
      return;
    }

    // Authenticated: hide landing sections
    aboutView && aboutView.classList.add('hidden');
    loginView && loginView.classList.add('hidden');

    switch(page){
      case 'dashboard':
        dashView.classList.remove('hidden');
        fetchPatients();
        break;
      case 'patient':
        patientView.classList.remove('hidden');
        renderPatient(id);
        break;
      case 'profile':
        profileView.classList.remove('hidden');
        break;
      default:
        dashView.classList.remove('hidden');
        renderDashboard();
        window.location.hash = '#/dashboard';
    }
  }

  // Initial route
  route();

  // Smooth scroll from hero to role chooser
  document.getElementById('scrollNext')?.addEventListener('click', ()=>{
    const el = document.getElementById('role-view');
    el?.scrollIntoView({behavior:'smooth', block:'start'});
  });

  // Role buttons
  document.getElementById('chooseDoctor')?.addEventListener('click', ()=>{
    window.location.hash = '#/login';
    setTimeout(()=> document.getElementById('login-view')?.scrollIntoView({behavior:'smooth'}), 0);
  });
  document.getElementById('choosePatient')?.addEventListener('click', ()=>{
    window.location.hash = '#/patient-auth';
    setTimeout(()=> document.getElementById('patient-auth-view')?.scrollIntoView({behavior:'smooth'}), 0);
  });


  // Dashboard rendering
  $('#search').addEventListener('input', renderDashboard);
  function renderDashboard(){
    const query = $('#search').value?.toLowerCase() || '';
    const grid = $('#patientsGrid');
    grid.innerHTML = '';

    state.patients
      .filter(p => p.name.toLowerCase().includes(query) || (p._id && p._id.toLowerCase().includes(query)))
      .forEach(p => grid.appendChild(patientCard(p)));
  }

  function patientCard(p){
    const el = document.createElement('div');
    el.className = 'card pcard';
    
    // Backend patient schema has name, dob, gender, contact
    const dob = p.dob ? new Date(p.dob).toLocaleDateString() : 'N/A';
    
    el.innerHTML = `
      <div class="row">
        <div>
          <div style="font-weight:700">${p.name}</div>
          <div class="small">MRN: ${p._id}</div>
        </div>
        </div>
      <div class="metric-grid" style="min-height: 80px; align-content: center; padding: 1.25rem 0;">
        <div class="metric">
          <div class="label">Gender</div>
          <div class="value" style="font-size: 1.1rem;">${p.gender || 'N/A'}</div>
        </div>
        <div class="metric">
          <div class="label">DOB</div>
          <div class="value" style="font-size: 1.1rem;">${dob}</div>
        </div>
      </div>
      <div class="card-foot">Contact: ${p.contact || 'N/A'}</div>
    `;
    el.style.cursor = 'pointer';
    el.addEventListener('click', ()=>{
      window.location.hash = `#/patient/${p._id}`;
    });
    return el;
  }

  // Patient view
  let charts = {};
  async function renderPatient(id){
    if (!state.token) {
      return showView('login');
    }
  
    // Clear previous patient's charts
    charts.bp && charts.bp.destroy();
    charts.sugar && charts.sugar.destroy();
    charts.pulse && charts.pulse.destroy();
    $('#alerts').innerHTML = '';
    $('#currentReadings').innerHTML = '';

    try {
      // 1. Fetch patient details
      const patientRes = await fetch(`${API_BASE_URL}/patients/${id}`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (patientRes.status === 401) return $('#logoutBtn').click();
      if (!patientRes.ok) throw new Error('Failed to load patient details.');
      const p = await patientRes.json();
  
      // 2. Fetch patient vitals
      const vitalsRes = await fetch(`${API_BASE_URL}/vitals/patient/${id}`, {
        headers: { 'Authorization': `Bearer ${state.token}` }
      });
      if (vitalsRes.status === 401) return $('#logoutBtn').click();
      if (!vitalsRes.ok) throw new Error('Failed to load patient vitals.');
      const backendVitals = await vitalsRes.json();
  
      // 3. Map backend vitals to frontend history format
      // Backend: { timestamp, bloodPressure: { systolic, diastolic }, sugarMgDl, pulse }
      // Frontend: { time, bp: { sys, dia }, sugar, pulse }
      const history = backendVitals.map(v => ({
        time: v.timestamp,
        bp: { 
          sys: v.bloodPressure?.systolic, 
          dia: v.bloodPressure?.diastolic 
        },
        sugar: v.sugarMgDl,
        pulse: v.pulse,
        notes: v.notes
      })).sort((a, b) => new Date(a.time) - new Date(b.time)); // Ensure sorted
  
      // 4. Start rendering
      $('#patientHeader').innerHTML = `<h2>${p.name}</h2><div class="small">ID: ${p._id}</div>`;

      if (!history.length) {
         $('#alerts').appendChild(alert('No vitals recorded for this patient yet.', 'warn'));
         return;
      }
  
      // 5. Continue with existing render logic, using fetched data
      const latest = history[history.length-1];
      $('#currentReadings').innerHTML = `
        ${stat('Blood Pressure', `${latest.bp.sys || 'N/A'}/${latest.bp.dia || 'N/A'} mmHg`)}
        ${stat('Sugar', `${latest.sugar || 'N/A'} mg/dL`)}
        ${stat('Pulse', `${latest.pulse || 'N/A'} bpm`)}
      `;
  
      // Alerts
      const msgs = detectAlerts(history);
      const alerts = $('#alerts');
      if(msgs.length === 0){
        alerts.appendChild(alert('All vitals in acceptable range.', 'ok'));
      } else {
        msgs.forEach(m => alerts.appendChild(alert(m.message, m.level)));
      }
  
      // Charts
      const labels = history.map(h=> new Date(h.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
      const bpSys = history.map(h=>h.bp.sys);
      const bpDia = history.map(h=>h.bp.dia);
      const sugar = history.map(h=>h.sugar);
      const pulse = history.map(h=>h.pulse);
  
      const gridColor = '#e5e7eb';
  
      charts.bp = new Chart($('#bpChart'), {
        type: 'line',
        data: { labels, datasets:[
          {label: 'Systolic', data: bpSys, borderColor:'#2563eb', tension:.35},
          {label: 'Diastolic', data: bpDia, borderColor:'#10b981', tension:.35}
        ]},
        options: baseChartOptions(gridColor, [120, 80])
      });
  
      charts.sugar = new Chart($('#sugarChart'), {
        type: 'line',
        data: { labels, datasets:[
          {label: 'Glucose (mg/dL)', data: sugar, borderColor:'#f59e0b', tension:.35}
        ]},
        options: baseChartOptions(gridColor, [200, 70])
      });
  
      charts.pulse = new Chart($('#pulseChart'), {
        type: 'line',
        data: { labels, datasets:[
          {label: 'Pulse (bpm)', data: pulse, borderColor:'#ef4444', tension:.35}
        ]},
        options: baseChartOptions(gridColor, [120, 50])
      });
  
    } catch (err) {
       console.error(err);
       alert(err.message);
    }
  }

  function setActiveTab(page){
    $$('.tabs a').forEach(a=>{
      if(a.dataset.tab === page) a.classList.add('active');
      else a.classList.remove('active');
    });
  }

  function initLoginBot(){
    if(state._loginBotInited) return; state._loginBotInited = true;
    const bot = document.getElementById('loginBot');
    const emailInput = document.getElementById('email');
    const pwdInput = document.getElementById('password');
    const btn = document.getElementById('loginBtn');
    if(!bot || !emailInput || !pwdInput || !btn) return;
    emailInput.addEventListener('focus', ()=> bot.classList.add('wave'));
    emailInput.addEventListener('blur', ()=> bot.classList.remove('wave'));
    pwdInput.addEventListener('focus', ()=> bot.classList.add('cover-eyes'));
    pwdInput.addEventListener('blur', ()=> bot.classList.remove('cover-eyes'));
    btn.addEventListener('click', ()=>{
      bot.classList.add('thumbs-up');
      setTimeout(()=> bot.classList.remove('thumbs-up'), 1200);
    });
  }

  function baseChartOptions(gridColor, refLines){
    return {
      responsive: true,
      scales: {
        x: { grid: { color: gridColor } },
        y: { grid: { color: gridColor } }
      },
      plugins: {
        legend: { display: true, labels: { boxWidth: 10 } },
        annotation: refLines ? {
          annotations: {}
        } : undefined
      }
    };
  }

  function stat(label, value){
    return `<div class="stat"><div class="small">${label}</div><div style="font-weight:600">${value}</div></div>`;
  }

  function alert(text, level){
    const el = document.createElement('div');
    el.className = `alert ${level}`;
    el.textContent = text;
    return el;
  }

  function levelLabel(l){
    return l === 'ok' ? 'Normal' : l === 'warn' ? 'Warning' : 'Critical';
  }

  function alertLevel(read){
    let score = 0;
    if(read.bp.sys >= 140 || read.bp.dia >= 90) score += 2;
    else if(read.bp.sys >= 130 || read.bp.dia >= 85) score += 1;

    if(read.sugar >= 200 || read.sugar <= 60) score += 2;
    else if(read.sugar >= 160 || read.sugar <= 70) score += 1;

    if(read.pulse >= 120 || read.pulse <= 45) score += 2;
    else if(read.pulse >= 100 || read.pulse <= 55) score += 1;

    return score >= 3 ? 'crit' : score >= 1 ? 'warn' : 'ok';
  }

  function detectAlerts(history){
    const last = history[history.length-1];
    const alerts = [];
    const level = alertLevel(last);
    if(level === 'crit') alerts.push({ level, message: 'Critical readings detected. Immediate attention recommended.'});
    if(level === 'warn') alerts.push({ level, message: 'Some readings outside ideal range. Monitor closely.'});

    // Simple trend detection: last 5 points rising for sugar or pulse
    const win = history.slice(-5);
    if(win.length >= 4){
      const rising = (arr) => arr.every((v,i,src)=> i===0 || v >= src[i-1]);
      const sugarRise = rising(win.map(h=>h.sugar));
      const pulseRise = rising(win.map(h=>h.pulse));
      if(sugarRise) alerts.push({ level:'warn', message:'Upward trend in glucose over recent checks.'});
      if(pulseRise) alerts.push({ level:'warn', message:'Gradual increase in pulse detected.'});
    }
    return alerts;
  }
  
})();
