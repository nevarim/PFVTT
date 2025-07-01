document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('auth-form');
  const registerForm = document.getElementById('register-form');
  const resetForm = document.getElementById('reset-form');
  const formTitle = document.getElementById('form-title');
  const submitBtn = document.getElementById('submit-btn');
  const errorMsg = document.getElementById('error-msg');
  const toRegister = document.getElementById('to-register');
  const toLogin = document.getElementById('to-login');
  const forgotPass = document.getElementById('forgot-pass');
  const backLogin = document.getElementById('back-login');
  const registerLink = document.getElementById('register-link');
  const loginLink = document.getElementById('login-link');
  const forgotPasswordLink = document.getElementById('forgot-password-link');
  const backLoginLink = document.getElementById('back-login-link');

  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.style.display = 'block';
  }
  function clearError() {
    errorMsg.textContent = '';
    errorMsg.style.display = 'none';
  }

  // Toggle forms
  if (registerLink) {
    registerLink.addEventListener('click', function(e) {
      e.preventDefault();
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
      resetForm.style.display = 'none';
      formTitle.textContent = 'Register for PFVTT';
      toRegister.style.display = 'none';
      toLogin.style.display = 'inline';
      forgotPass.style.display = 'none';
      backLogin.style.display = 'inline';
      clearError();
    });
  }
  if (loginLink) {
    loginLink.addEventListener('click', function(e) {
      e.preventDefault();
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
      resetForm.style.display = 'none';
      formTitle.textContent = 'Login to PFVTT';
      toRegister.style.display = 'inline';
      toLogin.style.display = 'none';
      forgotPass.style.display = 'inline';
      backLogin.style.display = 'none';
      clearError();
    });
  }
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', function(e) {
      e.preventDefault();
      loginForm.style.display = 'none';
      registerForm.style.display = 'none';
      resetForm.style.display = 'block';
      formTitle.textContent = 'Reset Password';
      toRegister.style.display = 'none';
      toLogin.style.display = 'none';
      forgotPass.style.display = 'none';
      backLogin.style.display = 'inline';
      clearError();
    });
  }
  if (backLoginLink) {
    backLoginLink.addEventListener('click', function(e) {
      e.preventDefault();
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
      resetForm.style.display = 'none';
      formTitle.textContent = 'Login to PFVTT';
      toRegister.style.display = 'inline';
      toLogin.style.display = 'none';
      forgotPass.style.display = 'inline';
      backLogin.style.display = 'none';
      clearError();
    });
  }

  // Login submit
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      clearError();
      const username = loginForm.username.value.trim();
      const password = loginForm.password.value.trim();
      if (!username) return showError('Username is required.');
      if (!password) return showError('Password is required.');
      try {
        const res = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('pfvtt_user', username);
          sessionStorage.setItem('pfvtt_user', username);
          // Get and store user_id
          try {
            const userIdRes = await fetch(`/api/user_id?username=${encodeURIComponent(username)}`);
            const userIdData = await userIdRes.json();
            if (userIdData.success && userIdData.user_id) {
              sessionStorage.setItem('pfvtt_user_id', userIdData.user_id);
              localStorage.setItem('pfvtt_user_id', userIdData.user_id);
            }
          } catch (err) {
            console.error('Failed to get user_id:', err);
          }
          window.location.href = '/campaigns';
        } else {
          showError(data.error || 'Login failed.');
        }
      } catch (err) {
        showError('Login error.');
      }
    });
  }

  // Register submit
  if (registerForm) {
    registerForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      clearError();
      const username = registerForm.reg_username.value.trim();
      const password = registerForm.reg_password.value.trim();
      if (!username) return showError('Username is required.');
      if (!password) return showError('Password is required.');
      try {
        const res = await fetch('/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
          localStorage.setItem('pfvtt_user', username);
          sessionStorage.setItem('pfvtt_user', username);
          // Get and store user_id
          try {
            const userIdRes = await fetch(`/api/user_id?username=${encodeURIComponent(username)}`);
            const userIdData = await userIdRes.json();
            if (userIdData.success && userIdData.user_id) {
              sessionStorage.setItem('pfvtt_user_id', userIdData.user_id);
              localStorage.setItem('pfvtt_user_id', userIdData.user_id);
            }
          } catch (err) {
            console.error('Failed to get user_id:', err);
          }
          window.location.href = '/campaigns';
        } else {
          showError(data.error || 'Registration failed.');
        }
      } catch (err) {
        showError('Registration error.');
      }
    });
  }

  // Password reset submit
  if (resetForm) {
    resetForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      clearError();
      const user = resetForm.reset_user.value.trim();
      if (!user) return showError('Username or email is required.');
      try {
        const res = await fetch('/api/reset_password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user })
        });
        const data = await res.json();
        if (data.success) {
          alert(data.message || 'Password reset request sent.');
          resetForm.reset();
          backLoginLink.click();
        } else {
          showError(data.message || 'Reset failed.');
        }
      } catch (err) {
        showError('Reset error.');
      }
    });
  }
});