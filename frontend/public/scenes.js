let currentCampaignId = null;
let selectedSceneId = null;
let activeSceneId = null;
let scenes = [];

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
  loadScenes();
  
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
        document.getElementById('campaign-title').textContent = `${campaign.name} - Scenes`;
      }
    }
  } catch (error) {
    console.error('Error loading campaign info:', error);
  }
}

// Load scenes for the current campaign
async function loadScenes() {
  try {
    const response = await fetch(`/api/scenes?campaign_id=${currentCampaignId}`);
    const data = await response.json();
    if (data.success) {
      scenes = data.scenes;
      renderSceneList();
    } else {
      console.error('Failed to load scenes:', data.error);
    }
  } catch (error) {
    console.error('Error loading scenes:', error);
  }
}

// Render the scene list in the sidebar
function renderSceneList() {
  const sceneList = document.getElementById('scene-list');
  sceneList.innerHTML = '';
  
  scenes.forEach(scene => {
    const li = document.createElement('li');
    li.className = 'scene-item';
    if (scene.id == activeSceneId) {
      li.classList.add('active');
    }
    li.onclick = () => selectScene(scene.id);
    
    const sceneData = scene.data ? JSON.parse(scene.data) : {};
    const dimensions = `${sceneData.width || 20} × ${sceneData.height || 15}`;
    
    li.innerHTML = `
      <div class="scene-name">${scene.name}</div>
      <div class="scene-description">${sceneData.description || 'No description'}</div>
      <div class="scene-dimensions">${dimensions} grid units</div>
    `;
    
    sceneList.appendChild(li);
  });
}

// Select a scene and show its details
function selectScene(sceneId) {
  selectedSceneId = sceneId;
  
  // Update visual selection
  document.querySelectorAll('.scene-item').forEach(item => {
    item.classList.remove('selected');
  });
  
  const selectedItem = document.querySelector(`[onclick="selectScene(${sceneId})"]`);
  if (selectedItem) {
    selectedItem.classList.add('selected');
  }
  
  // Show scene details
  const scene = scenes.find(s => s.id == sceneId);
  if (scene) {
    showSceneSheet(scene);
  }
}

// Show scene sheet with details
function showSceneSheet(scene) {
  const container = document.getElementById('scene-sheet-container');
  const sceneData = scene.data ? JSON.parse(scene.data) : {};
  
  const isActive = scene.id == activeSceneId;
  const statusText = isActive ? 'Active Scene' : 'Inactive';
  const statusColor = isActive ? '#28a745' : '#6c757d';
  
  container.innerHTML = `
    <div class="scene-sheet">
      <div class="scene-header">
        <div class="scene-thumbnail"></div>
        <div class="scene-info">
          <h2>${scene.name}</h2>
          <div class="scene-status" style="color: ${statusColor}">${statusText}</div>
          <div style="color: #aaa; font-size: 14px;">${sceneData.description || 'No description available'}</div>
        </div>
      </div>
      
      <div class="scene-properties">
        <div class="property-block">
          <div class="property-label">Dimensions</div>
          <div class="property-value">${sceneData.width || 20} × ${sceneData.height || 15}</div>
        </div>
        <div class="property-block">
          <div class="property-label">Grid Size</div>
          <div class="property-value">${sceneData.gridSize || 50}px</div>
        </div>
        <div class="property-block">
          <div class="property-label">Background</div>
          <div class="property-value">
            <div style="display: inline-block; width: 20px; height: 20px; background: ${sceneData.backgroundColor || '#2c2c2c'}; border: 1px solid #666; border-radius: 3px; vertical-align: middle; margin-right: 8px;"></div>
            ${sceneData.backgroundColor || '#2c2c2c'}
          </div>
        </div>
        <div class="property-block">
          <div class="property-label">Total Grid Cells</div>
          <div class="property-value">${(sceneData.width || 20) * (sceneData.height || 15)}</div>
        </div>
      </div>
      
      <div class="scene-actions">
        ${!isActive ? `<button class="btn btn-success" onclick="activateScene(${scene.id})">Activate Scene</button>` : ''}
        <button class="btn btn-primary" onclick="editScene(${scene.id})">Edit Scene</button>
        <button class="btn btn-primary" onclick="openSceneMap(${scene.id})">Open Map</button>
        <button class="btn btn-danger" onclick="deleteScene(${scene.id})">Delete Scene</button>
      </div>
      
      <div style="margin-top: 20px; padding: 15px; background: #1a1a1a; border-radius: 5px;">
        <h4>Scene Notes</h4>
        <p style="color: #aaa; margin: 10px 0;">${sceneData.notes || 'No notes available for this scene.'}</p>
      </div>
      
      <div style="margin-top: 15px; color: #666; font-size: 12px;">
        Created: ${new Date(scene.created_at).toLocaleDateString()}
      </div>
    </div>
  `;
}

// Open create scene modal
function openCreateSceneModal() {
  document.getElementById('create-scene-modal').style.display = 'block';
}

// Close create scene modal
function closeCreateSceneModal() {
  document.getElementById('create-scene-modal').style.display = 'none';
  document.getElementById('create-scene-form').reset();
}

// Handle create scene form submission
document.getElementById('create-scene-form').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const name = document.getElementById('scene-name').value;
  const description = document.getElementById('scene-description').value;
  const width = parseInt(document.getElementById('scene-width').value);
  const height = parseInt(document.getElementById('scene-height').value);
  const gridSize = parseInt(document.getElementById('scene-grid-size').value);
  const backgroundColor = document.getElementById('scene-background-color').value;
  
  const sceneData = {
    description: description,
    width: width,
    height: height,
    gridSize: gridSize,
    backgroundColor: backgroundColor,
    notes: '',
    backgroundImage: null,
    tokens: [],
    walls: [],
    lights: []
  };
  
  try {
    const response = await fetch('/api/scenes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        campaign_id: currentCampaignId,
        name: name,
        data: sceneData
      })
    });
    
    const result = await response.json();
    if (result.success) {
      closeCreateSceneModal();
      loadScenes(); // Reload the scene list
    } else {
      alert('Failed to create scene: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error creating scene:', error);
    alert('Error creating scene');
  }
});

// Activate scene
function activateScene(sceneId) {
  activeSceneId = sceneId;
  renderSceneList(); // Re-render to show active state
  selectScene(sceneId); // Refresh the scene sheet
  // In a real implementation, this would also notify other players
  alert('Scene activated! (In a real game, this would be visible to all players)');
}

// Edit scene (placeholder for future implementation)
function editScene(sceneId) {
  alert('Edit scene functionality will be implemented in a future update.');
}

// Open scene map (placeholder for future implementation)
function openSceneMap(sceneId) {
  alert('Map view functionality will be implemented in a future update.');
}

// Delete scene (placeholder for future implementation)
function deleteScene(sceneId) {
  if (confirm('Are you sure you want to delete this scene?')) {
    alert('Delete functionality will be implemented in a future update.');
  }
}

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('create-scene-modal');
  if (event.target === modal) {
    closeCreateSceneModal();
  }
}