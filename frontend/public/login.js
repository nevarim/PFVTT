document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('auth-form');
  if (!form) return;
  form.addEventListener('submit', function(e) {
    const username = form.username.value.trim();
    const password = form.password.value.trim();
    let errorMsg = '';
    if (!username) {
      errorMsg = 'Username is required.';
    } else if (!password) {
      errorMsg = 'Password is required.';
    }
    if (errorMsg) {
      e.preventDefault();
      showError(errorMsg);
      return;
    }
    // Store username in both localStorage and sessionStorage
    localStorage.setItem('pfvtt_user', username);
    sessionStorage.setItem('pfvtt_user', username);
  });

  function showError(msg) {
    let errorElem = document.querySelector('p[style*="color:red"]');
    if (!errorElem) {
      errorElem = document.createElement('p');
      errorElem.style.color = 'red';
      form.parentNode.insertBefore(errorElem, form);
    }
    errorElem.textContent = msg;
  }
});