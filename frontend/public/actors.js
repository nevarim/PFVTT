let currentCampaignId = null;
let selectedActorId = null;
let actors = [];

// Get campaign ID from session storage
function getCampaignIdFromSession() {
  return sessionStorage.getItem('current_campaign_id');
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  currentCampaignId = getCampaignIdFromSession();
  if (!currentCampaignId) {
    alert('No campaign selected');
    window.location.href = '/campaigns';
    return;
  }
  
  loadCampaignInfo();
  loadActors();
  
  // Listen for campaign data updates
  let lastUpdateCheck = sessionStorage.getItem('campaign_data_updated');
  setInterval(() => {
    const currentUpdate = sessionStorage.getItem('campaign_data_updated');
    if (currentUpdate && currentUpdate !== lastUpdateCheck) {
      lastUpdateCheck = currentUpdate;
      loadCampaignInfo(); // Reload campaign info when data is updated
    }
  }, 1000);
});

// Load campaign information
async function loadCampaignInfo() {
  try {
    const user = localStorage.getItem('pfvtt_user') || sessionStorage.getItem('pfvtt_user');
    const response = await fetch(`/api/campaigns?username=${encodeURIComponent(user)}`);
    const data = await response.json();
    if (data.success) {
      const campaign = data.campaigns.find(c => c.id == currentCampaignId);
      if (campaign) {
        document.getElementById('campaign-title').textContent = `${campaign.name} - Actors`;
      }
    }
  } catch (error) {
    console.error('Error loading campaign info:', error);
  }
}

// Load actors for the current campaign
async function loadActors() {
  try {
    const response = await fetch(`/api/actors?campaign_id=${currentCampaignId}`);
    const data = await response.json();
    if (data.success) {
      actors = data.actors;
      renderActorList();
    } else {
      console.error('Failed to load actors:', data.error);
    }
  } catch (error) {
    console.error('Error loading actors:', error);
  }
}

// Render the actor list in the sidebar
function renderActorList() {
  const actorList = document.getElementById('actor-list');
  actorList.innerHTML = '';
  
  actors.forEach(actor => {
    const li = document.createElement('li');
    li.className = 'actor-item';
    li.onclick = () => selectActor(actor.id);
    
    const actorData = actor.data ? JSON.parse(actor.data) : {};
    
    li.innerHTML = `
      <div class="actor-name">${actor.name}</div>
      <div class="actor-type">${actor.type || 'Unknown'}</div>
    `;
    
    actorList.appendChild(li);
  });
}

// Select an actor and show its details
function selectActor(actorId) {
  selectedActorId = actorId;
  
  // Update visual selection
  document.querySelectorAll('.actor-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  const selectedItem = document.querySelector(`[onclick="selectActor(${actorId})"]`);
  if (selectedItem) {
    selectedItem.classList.add('selected');
  }
  
  // Show actor details
  const actor = actors.find(a => a.id == actorId);
  if (actor) {
    showActorSheet(actor);
  }
}

// Show actor sheet with details
function showActorSheet(actor) {
  const container = document.getElementById('actor-sheet-container');
  const actorData = actor.data ? JSON.parse(actor.data) : {};
  
  const initials = actor.name.split(' ').map(n => n[0]).join('').toUpperCase();
  
  container.innerHTML = `
    <div class="actor-sheet">
      <div class="actor-header">
        <div class="actor-avatar">${initials}</div>
        <div class="actor-info">
          <h2>${actor.name}</h2>
          <div class="actor-class">${actorData.class || 'Unknown Class'} • Level ${actorData.level || 1}</div>
          <div class="actor-type">${actor.type || 'Unknown Type'}</div>
        </div>
      </div>
      
      <div class="stats-grid">
        <div class="stat-block">
          <div class="stat-label">Hit Points</div>
          <div class="stat-value">${actorData.hp || 10}</div>
        </div>
        <div class="stat-block">
          <div class="stat-label">Armor Class</div>
          <div class="stat-value">${actorData.ac || 10}</div>
        </div>
        <div class="stat-block">
          <div class="stat-label">Level</div>
          <div class="stat-value">${actorData.level || 1}</div>
        </div>
        <div class="stat-block">
          <div class="stat-label">Type</div>
          <div class="stat-value">${actor.type || 'Unknown'}</div>
        </div>
      </div>
      
      <div style="margin-top: 20px;">
        <button class="btn btn-primary" onclick="editActor(${actor.id})">Edit Actor</button>
        <button class="btn btn-danger" onclick="deleteActor(${actor.id})">Delete Actor</button>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background: #1a1a1a; border-radius: 5px;">
        <h4>Notes</h4>
        <p style="color: #aaa; margin: 10px 0;">${actorData.notes || 'No notes available.'}</p>
      </div>
      
      <div style="margin-top: 15px; color: #666; font-size: 12px;">
        Created: ${new Date(actor.created_at).toLocaleDateString()}
      </div>
    </div>
  `;
}

// Open create actor modal
function openCreateActorModal() {
  document.getElementById('create-actor-modal').style.display = 'block';
}

// Close create actor modal
function closeCreateActorModal() {
  document.getElementById('create-actor-modal').style.display = 'none';
  document.getElementById('create-actor-form').reset();
}

// Handle create actor form submission
document.getElementById('create-actor-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const name = document.getElementById('actor-name').value;
  const type = document.getElementById('actor-type').value;
  const actorClass = document.getElementById('actor-class').value;
  const level = parseInt(document.getElementById('actor-level').value);
  const hp = parseInt(document.getElementById('actor-hp').value);
  const ac = parseInt(document.getElementById('actor-ac').value);
  
  const actorData = {
    class: actorClass,
    level: level,
    hp: hp,
    ac: ac,
    notes: ''
  };
  
  try {
    const response = await fetch('/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        campaign_id: currentCampaignId,
        name: name,
        type: type,
        data: actorData
      })
    });
    
    const result = await response.json();
    if (result.success) {
      closeCreateActorModal();
      loadActors(); // Reload the actor list
    } else {
      alert('Failed to create actor: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error creating actor:', error);
    alert('Error creating actor');
  }
});

// Edit actor (placeholder for future implementation)
function editActor(actorId) {
  alert('Edit functionality will be implemented in a future update.');
}

// Delete actor (placeholder for future implementation)
function deleteActor(actorId) {
  if (confirm('Are you sure you want to delete this actor?')) {
    alert('Delete functionality will be implemented in a future update.');
  }
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('create-actor-modal');
  if (event.target === modal) {
    closeCreateActorModal();
  }
}