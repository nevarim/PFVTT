// Scene management TypeScript functionality

import { Scene, ScenesResponse, Campaign, CampaignsResponse, ApiResponse } from '../types/shared.js';

// Additional interfaces specific to scenes
interface CreateSceneResponse extends ApiResponse {
  scene?: Scene;
}

interface ActivateSceneResponse extends ApiResponse {}

interface SceneData {
  description?: string;
  width?: number;
  height?: number;
  gridSize?: number;
  backgroundColor?: string;
  notes?: string;
  backgroundImage?: string | null;
  tokens?: any[];
  walls?: any[];
  lights?: any[];
}

let currentCampaignIdScenes: string | null = null;
let selectedSceneId: number | null = null;
let activeSceneId: number | null = null;
let scenes: Scene[] = [];
let campaignInfoScenes: Campaign | null = null;

// Get campaign ID from session storage
function getCampaignIdFromSessionScenes(): string | null {
  return sessionStorage.getItem('current_campaign_id');
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  currentCampaignIdScenes = getCampaignIdFromSessionScenes();
  if (!currentCampaignIdScenes) {
    alert('No campaign selected');
    window.location.href = '/campaigns';
    return;
  }
  
  loadCampaignInfo();
  loadScenes();
  
  // Listen for campaign data updates
  let lastUpdateCheck: string | null = sessionStorage.getItem('campaign_data_updated');
  setInterval(() => {
    const currentUpdate: string | null = sessionStorage.getItem('campaign_data_updated');
    if (currentUpdate && currentUpdate !== lastUpdateCheck) {
      lastUpdateCheck = currentUpdate;
      loadCampaignInfo(); // Reload campaign info when data is updated
    }
  }, 1000);
});

// Load campaign information
async function loadCampaignInfo(): Promise<void> {
  try {
    const user: string | null = localStorage.getItem('pfvtt_user') || sessionStorage.getItem('pfvtt_user');
    const response: Response = await fetch(`/api/campaigns?username=${encodeURIComponent(user || '')}`);
    const data: CampaignsResponse = await response.json();
    if (data.success && data.campaigns) {
      const campaign = data.campaigns.find(c => c.id == parseInt(currentCampaignIdScenes || '0'));
      if (campaign) {
        const titleElement = document.getElementById('campaign-title') as HTMLElement;
        if (titleElement) {
          titleElement.textContent = `${campaign.name} - Scenes`;
        }
      }
    }
  } catch (error) {
    console.error('Error loading campaign info:', error);
  }
}

// Load scenes for the current campaign
async function loadScenes(): Promise<void> {
  try {
    const response: Response = await fetch(`/api/scenes?campaign_id=${currentCampaignIdScenes}`);
    const data: ScenesResponse = await response.json();
    if (data.success && data.scenes) {
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
function renderSceneList(): void {
  const sceneList = document.getElementById('scene-list') as HTMLElement;
  if (!sceneList) return;
  
  sceneList.innerHTML = '';
  
  scenes.forEach(scene => {
    const li: HTMLLIElement = document.createElement('li');
    li.className = 'scene-item';
    if (scene.id == activeSceneId) {
      li.classList.add('active');
    }
    li.onclick = () => selectScene(scene.id);
    
    const sceneData: SceneData = scene.data ? JSON.parse(scene.data) : {};
    const dimensions: string = `${sceneData.width || 20} × ${sceneData.height || 15}`;
    
    li.innerHTML = `
      <div class="scene-name">${scene.name}</div>
      <div class="scene-description">${sceneData.description || 'No description'}</div>
      <div class="scene-dimensions">${dimensions} grid units</div>
    `;
    
    sceneList.appendChild(li);
  });
}

// Select a scene and show its details
function selectScene(sceneId: number): void {
  selectedSceneId = sceneId;
  
  // Update visual selection
  document.querySelectorAll('.scene-item').forEach((item: Element) => {
    item.classList.remove('selected');
  });
  
  const selectedItem = document.querySelector(`[onclick="selectScene(${sceneId})"]`) as HTMLElement;
  if (selectedItem) {
    selectedItem.classList.add('selected');
  }
  
  // Show scene details
  const scene: Scene | undefined = scenes.find(s => s.id == sceneId);
  if (scene) {
    showSceneSheet(scene);
  }
}

// Show scene sheet with details
function showSceneSheet(scene: Scene): void {
  const container = document.getElementById('scene-sheet-container') as HTMLElement;
  if (!container) return;
  
  const sceneData: SceneData = scene.data ? JSON.parse(scene.data) : {};
  
  const isActive: boolean = scene.id == activeSceneId;
  const statusText: string = isActive ? 'Active Scene' : 'Inactive';
  const statusColor: string = isActive ? '#28a745' : '#6c757d';
  
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
function openCreateSceneModal(): void {
  const modal = document.getElementById('create-scene-modal') as HTMLElement;
  if (modal) {
    modal.style.display = 'block';
  }
}

// Close create scene modal
function closeCreateSceneModal(): void {
  const modal = document.getElementById('create-scene-modal') as HTMLElement;
  if (modal) {
    modal.style.display = 'none';
  }
  
  const form = document.getElementById('create-scene-form') as HTMLFormElement;
  if (form) {
    form.reset();
  }
}

// Handle create scene form submission
const createSceneForm = document.getElementById('create-scene-form') as HTMLFormElement;
if (createSceneForm) {
  createSceneForm.addEventListener('submit', async function(e: Event) {
    e.preventDefault();
    
    const nameInput = document.getElementById('scene-name') as HTMLInputElement;
    const descriptionInput = document.getElementById('scene-description') as HTMLTextAreaElement;
    const widthInput = document.getElementById('scene-width') as HTMLInputElement;
    const heightInput = document.getElementById('scene-height') as HTMLInputElement;
    const gridSizeInput = document.getElementById('scene-grid-size') as HTMLInputElement;
    const backgroundColorInput = document.getElementById('scene-background-color') as HTMLInputElement;
    
    const name: string = nameInput.value;
    const description: string = descriptionInput.value;
    const width: number = parseInt(widthInput.value);
    const height: number = parseInt(heightInput.value);
    const gridSize: number = parseInt(gridSizeInput.value);
    const backgroundColor: string = backgroundColorInput.value;
    
    const sceneData: SceneData = {
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
      const response: Response = await fetch('/api/scenes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaign_id: currentCampaignIdScenes,
          name: name,
          data: sceneData
        })
      });
      
      const result: ApiResponse = await response.json();
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
}

// Activate scene
function activateScene(sceneId: number): void {
  activeSceneId = sceneId;
  renderSceneList(); // Re-render to show active state
  selectScene(sceneId); // Refresh the scene sheet
  // In a real implementation, this would also notify other players
  alert('Scene activated! (In a real game, this would be visible to all players)');
}

// Edit scene (placeholder for future implementation)
function editScene(sceneId: number): void {
  alert('Edit scene functionality will be implemented in a future update.');
}

// Open scene map (placeholder for future implementation)
function openSceneMap(sceneId: number): void {
  alert('Map view functionality will be implemented in a future update.');
}

// Delete scene (placeholder for future implementation)
function deleteScene(sceneId: number): void {
  if (confirm('Are you sure you want to delete this scene?')) {
    alert('Delete functionality will be implemented in a future update.');
  }
}

// Close modal when clicking outside
window.onclick = function(event: Event) {
  const modal = document.getElementById('create-scene-modal') as HTMLElement;
  if (event.target === modal) {
    closeCreateSceneModal();
  }
};

// Make functions globally available
(window as any).openCreateSceneModal = openCreateSceneModal;
(window as any).closeCreateSceneModal = closeCreateSceneModal;
(window as any).selectScene = selectScene;
(window as any).activateScene = activateScene;
(window as any).editScene = editScene;
(window as any).openSceneMap = openSceneMap;
(window as any).deleteScene = deleteScene;