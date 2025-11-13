const API_BASE_URL = 'http://localhost:4000/api';

// UI Toggles
const container = document.querySelector('.container');
const LoginLink = document.querySelector('.SignInLink');
const RegisterLink = document.querySelector('.SignUpLink');

RegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    container.classList.add('active');
});

LoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    container.classList.remove('active');
});

// Auth Logic
const registerForm = document.querySelector('.form-box.register form');
const loginForm = document.querySelector('.form-box.login form');

// Helper to show messages (assumes you add a <div id="authMessage"></div> to your HTML)
const showMessage = (msg, isError = false) => {
  let messageEl = document.getElementById('authMessage');
  if (!messageEl) {
    messageEl = document.createElement('div');
    messageEl.id = 'authMessage';
    // Insert it somewhere logical, e.g., before the forms
    container.prepend(messageEl);
  }
  messageEl.textContent = msg;
  messageEl.style.color = isError ? '#d9534f' : '#5cb85c';
  messageEl.style.padding = '10px';
  messageEl.style.textAlign = 'center';
};

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMessage('Registering...', false);

  const name = registerForm.querySelector('input[placeholder="Name"]').value;
  const email = registerForm.querySelector('input[placeholder="Email"]').value;
  const password = registerForm.querySelector('input[placeholder="Password"]').value;
  
  // Basic validation
  if (!name || !email || !password) {
    return showMessage('All fields are required.', true);
  }
  if (password.length < 6) {
    return showMessage('Password must be at least 6 characters.', true);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role: 'patient' })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');

    showMessage('Registration successful! Please sign in.', false);
    LoginLink.click(); // Switch to login form
    loginForm.querySelector('input[placeholder="Email"]').value = email; // Pre-fill email
  } catch (err) {
    showMessage(err.message, true);
  }
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  showMessage('Logging in...', false);
  
  const email = loginForm.querySelector('input[placeholder="Email"]').value;
  const password = loginForm.querySelector('input[placeholder="Password"]').value;

  if (!email || !password) {
    return showMessage('Email and password are required.', true);
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    
    // Login successful
    localStorage.setItem('patientToken', data.token);
    localStorage.setItem('patientUser', JSON.stringify(data.user));
    
    showMessage('Login successful! Redirecting...', false);
    
    // NOTE: No patient dashboard was provided in the files.
    // Redirecting to a hypothetical page.
    setTimeout(() => {
       // You should create this page
       window.location.href = '/patient-dashboard.html';
    }, 1000);

  } catch (err) {
    showMessage(err.message, true);
  }
});