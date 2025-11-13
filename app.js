/* Simple SPA logic + demo data */
(function(){
  const $ = (q, root=document) => root.querySelector(q);
  const $$ = (q, root=document) => Array.from(root.querySelectorAll(q));

  // Splash is a persistent hero at the top; no auto-hide

  // Basic state
  const state = {
    user: null,
    patients: generatePatients(),
    firstLoad: true,
  };

  const roleView = $('#role-view');
  const loginView = $('#login-view');
  const patientAuthView = $('#patient-auth-view');
  const dashView = $('#dashboard-view');
  const patientView = $('#patient-view');
  const profileView = $('#profile-view');
  const aboutView = $('#about-view');

  // Login handling (mock auth)
  function handleLogin(e){
    if(e) e.preventDefault();
    const email = $('#email').value.trim();
    const password = $('#password').value;
    if(!email || !password){ return false; }
    const btn = $('#loginBtn');
    if(!btn) return false;
    btn.classList.add('loading');
    const prev = btn.textContent; btn.textContent = 'Signing in…';
    btn.disabled = true;
    setTimeout(()=>{
      state.user = { name: 'Dr. Ada Lovelace', email };
      updateHeader();
      window.location.hash = '#/dashboard';
      btn.disabled = false; btn.classList.remove('loading'); btn.textContent = prev;
    }, 300);
    return false;
  }
  const lf = $('#loginForm');
  if(lf){ lf.addEventListener('submit', handleLogin); }
  const lb = $('#loginBtn');
  if(lb){ lb.addEventListener('click', handleLogin); }

  $('#logoutBtn').addEventListener('click', ()=>{
    state.user = null;
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
    state.firstLoad = false;
  }

  function showView(page, id){
    const authed = !!state.user;
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
        renderDashboard();
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
      .filter(p => p.name.toLowerCase().includes(query) || p.id.toLowerCase().includes(query))
      .forEach(p => grid.appendChild(patientCard(p)));
  }

  function patientCard(p){
    const latest = p.history[p.history.length-1];
    const level = alertLevel(latest);
    const el = document.createElement('div');
    el.className = 'card pcard';
    const ago = timeAgo(p.history[p.history.length-1].time);
    el.innerHTML = `
      <div class="row">
        <div>
          <div style="font-weight:700">${p.name}</div>
          <div class="small">MRN: ${p.id}</div>
        </div>
        <span class="pill ${level}">${levelLabel(level)}</span>
      </div>
      <div class="metric-grid">
        <div class="metric">
          <div class="label">BP</div>
          <div class="value">${latest.bp.sys}/${latest.bp.dia}</div>
          <div class="unit">mmHg</div>
        </div>
        <div class="metric">
          <div class="label">Sugar</div>
          <div class="value">${latest.sugar}</div>
          <div class="unit">mg/dL</div>
        </div>
        <div class="metric">
          <div class="label">Pulse</div>
          <div class="value">${latest.pulse}</div>
          <div class="unit">bpm</div>
        </div>
      </div>
      <div class="card-foot">Updated ${ago}</div>
    `;
    el.style.cursor = 'pointer';
    el.addEventListener('click', ()=>{
      window.location.hash = `#/patient/${p.id}`;
    });
    return el;
  }

  // Patient view
  let charts = {};
  function renderPatient(id){
    const p = state.patients.find(x=>x.id===id);
    if(!p){ return; }
    $('#patientHeader').innerHTML = `<h2>${p.name}</h2><div class="small">ID: ${p.id}</div>`;

    const latest = p.history[p.history.length-1];
    $('#currentReadings').innerHTML = `
      ${stat('Blood Pressure', `${latest.bp.sys}/${latest.bp.dia} mmHg`)}
      ${stat('Sugar', `${latest.sugar} mg/dL`)}
      ${stat('Pulse', `${latest.pulse} bpm`)}
    `;

    // Alerts
    const msgs = detectAlerts(p.history);
    const alerts = $('#alerts');
    alerts.innerHTML = '';
    if(msgs.length === 0){
      alerts.appendChild(alert('All vitals in acceptable range.', 'ok'));
    } else {
      msgs.forEach(m => alerts.appendChild(alert(m.message, m.level)));
    }

    // Charts
    const labels = p.history.map(h=> new Date(h.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
    const bpSys = p.history.map(h=>h.bp.sys);
    const bpDia = p.history.map(h=>h.bp.dia);
    const sugar = p.history.map(h=>h.sugar);
    const pulse = p.history.map(h=>h.pulse);

    charts.bp && charts.bp.destroy();
    charts.sugar && charts.sugar.destroy();
    charts.pulse && charts.pulse.destroy();

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

  function generatePatients(){
    const now = Date.now();
    const mkHist = (n, seed) => Array.from({length:n}, (_,i)=>{
      const t = now - (n-i)*60*60*1000; // hourly
      return {
        time: t,
        bp: { sys: clamp(108 + jitter(seed, i, 18), 95, 170), dia: clamp(70 + jitter(seed*1.3, i, 12), 55, 110) },
        sugar: clamp(92 + jitter(seed*2.1, i, 60), 55, 260),
        pulse: clamp(74 + jitter(seed*3.1, i, 40), 40, 140)
      };
    });

    return [
      { id:'P-1001', name:'John Carter', history: mkHist(24, 1.2) },
      { id:'P-1002', name:'Mary Johnson', history: mkHist(24, 2.8) },
      { id:'P-1003', name:'Rahul Singh', history: mkHist(24, 3.3) },
      { id:'P-1004', name:'Chen Wei', history: mkHist(24, 4.7) },
      { id:'P-1005', name:'Ana Souza', history: mkHist(24, 5.5) },
    ];
  }

  function jitter(seed, i, amp){
    // pseudo-random deterministic oscillation
    const x = Math.sin(seed*10 + i*0.9) + Math.cos(seed*3 + i*0.45);
    return Math.round(x * amp);
  }
  function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
  function timeAgo(ts){
    const mins = Math.max(1, Math.round((Date.now()-ts)/60000));
    if(mins < 60) return `${mins} minute${mins>1?'s':''} ago`;
    const hrs = Math.round(mins/60);
    return `${hrs} hour${hrs>1?'s':''} ago`;
  }
})();
