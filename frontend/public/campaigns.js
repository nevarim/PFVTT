// Campaign management JS functionality using backend APIs
async function loadCampaigns() {
  const user = localStorage.getItem('pfvtt_user') || sessionStorage.getItem('pfvtt_user');
  if (!user) {
    document.getElementById('campaign-list').innerHTML = '<li>Please log in to view campaigns.</li>';
    return;
  }
  try {
    const response = await fetch(`/api/campaigns?username=${encodeURIComponent(user)}`);
    const data = await response.json();
    const list = document.getElementById('campaign-list');
    list.innerHTML = '';
    if (data.success && data.campaigns && data.campaigns.length > 0) {
      data.campaigns.forEach(campaign => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${campaign.name}</strong><br><em>${campaign.system || ''}</em><br>${campaign.description || ''}<br><img src='${campaign.image_url || ''}' alt='' style='max-width:100px;max-height:100px;'/>`;
        list.appendChild(li);
      });
    } else {
      list.innerHTML = '<li>No campaigns found.</li>';
    }
  } catch (err) {
    document.getElementById('campaign-list').innerHTML = '<li>Error loading campaigns.</li>';
  }
}

// In futuro questa funzione potrà caricare dinamicamente i sistemi di gioco dal backend
async function populateGameSystems() {
  const systemSelect = document.getElementById('campaign-system');
  systemSelect.innerHTML = '';
  try {
    const response = await fetch('/api/rules');
    const rules = await response.json();
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select system';
    systemSelect.appendChild(defaultOption);
    rules.forEach(rule => {
      const opt = document.createElement('option');
      opt.value = rule.id !== undefined ? rule.id : rule.system;
      opt.textContent = rule.system;
      systemSelect.appendChild(opt);
    });
  } catch (err) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Error loading systems';
    systemSelect.appendChild(opt);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  loadCampaigns();
  populateGameSystems();
  // Get the logged-in user from localStorage or sessionStorage
  const user = localStorage.getItem('pfvtt_user') || sessionStorage.getItem('pfvtt_user');
  // Update the form submission to include the username in the API call
  const form = document.getElementById('create-campaign-form');
  form.addEventListener('submit', async function(event) {
    event.preventDefault();
    const nameInput = document.getElementById('campaign-name');
    const descInput = document.getElementById('campaign-description');
    const systemInput = document.getElementById('campaign-system');
    const imageInput = document.getElementById('campaign-image-url');
    const name = nameInput.value.trim();
    const description = descInput ? descInput.value.trim() : '';
    const system = systemInput ? systemInput.value.trim() : '';
    const image_url = imageInput ? imageInput.value.trim() : '';
    if (!name) {
      alert('Please enter a campaign name.');
      return;
    }
    if (!user) {
      alert('User not logged in.');
      window.location.href = '/login';
      return;
    }
    try {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, description, game_rules_id: system, image_url, username: user })
      });
      if (response.ok) {
        nameInput.value = '';
        if (descInput) descInput.value = '';
        if (systemInput) systemInput.value = '';
        if (imageInput) imageInput.value = '';
        loadCampaigns();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to create campaign.');
      }
    } catch (err) {
      alert('Error creating campaign.');
    }
  });
});
// Per attori, scene, diari e permessi: aggiungere funzioni simili per gestire le rispettive API e aggiornare la UI dinamicamente.