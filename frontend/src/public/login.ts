// Login/Register/Reset password TypeScript functionality

import { LoginResponse, RegisterResponse, DebugResponse } from '../types/shared.js';

interface AuthResponse {
  success: boolean;
  error?: string;
  message?: string;
  user_id?: number;
}

interface DebugLogData {
  message: string;
  data: any;
}

document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('auth-form') as HTMLFormElement;
  const registerForm = document.getElementById('register-form') as HTMLFormElement;
  const resetForm = document.getElementById('reset-form') as HTMLFormElement;
  const formTitle = document.getElementById('form-title') as HTMLElement;
  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
  const errorMsg = document.getElementById('error-msg') as HTMLElement;
  const toRegister = document.getElementById('to-register') as HTMLElement;
  const toLogin = document.getElementById('to-login') as HTMLElement;
  const forgotPass = document.getElementById('forgot-pass') as HTMLElement;
  const backLogin = document.getElementById('back-login') as HTMLElement;
  const registerLink = document.getElementById('register-link') as HTMLElement;
  const loginLink = document.getElementById('login-link') as HTMLElement;
  const forgotPasswordLink = document.getElementById('forgot-password-link') as HTMLElement;
  const backLoginLink = document.getElementById('back-login-link') as HTMLElement;

  function showError(msg: string): void {
    if (errorMsg) {
      errorMsg.textContent = msg;
      errorMsg.style.display = 'block';
    }
  }
  
  function clearError(): void {
    if (errorMsg) {
      errorMsg.textContent = '';
      errorMsg.style.display = 'none';
    }
  }

  // Toggle forms
  if (registerLink) {
    registerLink.addEventListener('click', function(e: Event) {
      e.preventDefault();
      if (loginForm) loginForm.style.display = 'none';
      if (registerForm) registerForm.style.display = 'block';
      if (resetForm) resetForm.style.display = 'none';
      if (formTitle) formTitle.textContent = 'Register for PFVTT';
      if (toRegister) toRegister.style.display = 'none';
      if (toLogin) toLogin.style.display = 'inline';
      if (forgotPass) forgotPass.style.display = 'none';
      if (backLogin) backLogin.style.display = 'inline';
      clearError();
    });
  }
  
  if (loginLink) {
    loginLink.addEventListener('click', function(e: Event) {
      e.preventDefault();
      if (loginForm) loginForm.style.display = 'block';
      if (registerForm) registerForm.style.display = 'none';
      if (resetForm) resetForm.style.display = 'none';
      if (formTitle) formTitle.textContent = 'Login to PFVTT';
      if (toRegister) toRegister.style.display = 'inline';
      if (toLogin) toLogin.style.display = 'none';
      if (forgotPass) forgotPass.style.display = 'inline';
      if (backLogin) backLogin.style.display = 'none';
      clearError();
    });
  }
  
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', function(e: Event) {
      e.preventDefault();
      if (loginForm) loginForm.style.display = 'none';
      if (registerForm) registerForm.style.display = 'none';
      if (resetForm) resetForm.style.display = 'block';
      if (formTitle) formTitle.textContent = 'Reset Password';
      if (toRegister) toRegister.style.display = 'none';
      if (toLogin) toLogin.style.display = 'none';
      if (forgotPass) forgotPass.style.display = 'none';
      if (backLogin) backLogin.style.display = 'inline';
      clearError();
    });
  }
  
  if (backLoginLink) {
    backLoginLink.addEventListener('click', function(e: Event) {
      e.preventDefault();
      if (loginForm) loginForm.style.display = 'block';
      if (registerForm) registerForm.style.display = 'none';
      if (resetForm) resetForm.style.display = 'none';
      if (formTitle) formTitle.textContent = 'Login to PFVTT';
      if (toRegister) toRegister.style.display = 'inline';
      if (toLogin) toLogin.style.display = 'none';
      if (forgotPass) forgotPass.style.display = 'inline';
      if (backLogin) backLogin.style.display = 'none';
      clearError();
    });
  }

  // Login submit
  if (loginForm) {
    loginForm.addEventListener('submit', async function(e: Event) {
      e.preventDefault();
      clearError();
      
      const usernameInput = loginForm.elements.namedItem('username') as HTMLInputElement;
      const passwordInput = loginForm.elements.namedItem('password') as HTMLInputElement;
      
      const username: string = usernameInput.value.trim();
      const password: string = passwordInput.value.trim();
      
      if (!username) return showError('Username is required.');
      if (!password) return showError('Password is required.');
      
      try {
        const res: Response = await fetch('/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data: AuthResponse = await res.json();
        
        if (data.success) {
          localStorage.setItem('pfvtt_user', username);
          sessionStorage.setItem('pfvtt_user', username);
          
          // Simplified debug log for login success (only in development)
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('LOGIN SUCCESS - User stored:', {
              username: username,
              localStorage: localStorage.getItem('pfvtt_user'),
              sessionStorage: sessionStorage.getItem('pfvtt_user')
            });
          }
          
          // Get and store user_id
          try {
            const userIdRes: Response = await fetch(`/api/user_id?username=${encodeURIComponent(username)}`);
            const userIdData: AuthResponse = await userIdRes.json();
            if (userIdData.success && userIdData.user_id) {
              sessionStorage.setItem('pfvtt_user_id', userIdData.user_id.toString());
              localStorage.setItem('pfvtt_user_id', userIdData.user_id.toString());
              
              // Simplified debug log for user_id storage (only in development)
              if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('LOGIN - User ID stored:', {
                  user_id: userIdData.user_id,
                  localStorage_user_id: localStorage.getItem('pfvtt_user_id'),
                  sessionStorage_user_id: sessionStorage.getItem('pfvtt_user_id')
                });
              }
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
    registerForm.addEventListener('submit', async function(e: Event) {
      e.preventDefault();
      clearError();
      
      const usernameInput = registerForm.elements.namedItem('reg_username') as HTMLInputElement;
      const passwordInput = registerForm.elements.namedItem('reg_password') as HTMLInputElement;
      
      const username: string = usernameInput.value.trim();
      const password: string = passwordInput.value.trim();
      
      if (!username) return showError('Username is required.');
      if (!password) return showError('Password is required.');
      
      try {
        const res: Response = await fetch('/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        const data: AuthResponse = await res.json();
        
        if (data.success) {
          localStorage.setItem('pfvtt_user', username);
          sessionStorage.setItem('pfvtt_user', username);
          
          // Get and store user_id
          try {
            const userIdRes: Response = await fetch(`/api/user_id?username=${encodeURIComponent(username)}`);
            const userIdData: AuthResponse = await userIdRes.json();
            if (userIdData.success && userIdData.user_id) {
              sessionStorage.setItem('pfvtt_user_id', userIdData.user_id.toString());
              localStorage.setItem('pfvtt_user_id', userIdData.user_id.toString());
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
    resetForm.addEventListener('submit', async function(e: Event) {
      e.preventDefault();
      clearError();
      
      const userInput = resetForm.elements.namedItem('reset_user') as HTMLInputElement;
      const user: string = userInput.value.trim();
      
      if (!user) return showError('Username or email is required.');
      
      try {
        const res: Response = await fetch('/api/reset_password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user })
        });
        const data: AuthResponse = await res.json();
        
        if (data.success) {
          alert(data.message || 'Password reset request sent.');
          resetForm.reset();
          if (backLoginLink) {
            backLoginLink.click();
          }
        } else {
          showError(data.message || 'Reset failed.');
        }
      } catch (err) {
        showError('Reset error.');
      }
    });
  }
});