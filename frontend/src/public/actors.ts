// Actor management TypeScript functionality

import { Actor, ActorsResponse, Campaign, CampaignsResponse, ApiResponse } from '../types/shared.js';

// Additional interfaces specific to actors
interface ActorData {
  class?: string;
  level?: number;
  hp?: number;
  ac?: number;
  notes?: string;
}

interface CreateActorResponse extends ApiResponse {
  actor?: Actor;
}

// Global variables for actors page
let currentCampaignId: string | null = null;
let selectedActorId: number | null = null;
let actors: Actor[] = [];
let campaignInfo: Campaign | null = null;

// Get campaign ID from session storage
function getCampaignIdFromSessionActors(): string | null {
  return sessionStorage.getItem('current_campaign_id');
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  currentCampaignId = getCampaignIdFromSessionActors();
  if (!currentCampaignId) {
    alert('No campaign selected');
    window.location.href = '/campaigns';
    return;
  }
  
  loadCampaignInfo();
  loadActors();
  
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
      const campaign = data.campaigns.find(c => c.id == parseInt(currentCampaignId || '0'));
      if (campaign) {
        const titleElement = document.getElementById('campaign-title') as HTMLElement;
        if (titleElement) {
          titleElement.textContent = `${campaign.name} - Actors`;
        }
      }
    }
  } catch (error) {
    console.error('Error loading campaign info:', error);
  }
}

// Load actors for the current campaign
async function loadActors(): Promise<void> {
  try {
    const response: Response = await fetch(`/api/actors?campaign_id=${currentCampaignId}`);
    const data: ActorsResponse = await response.json();
    if (data.success && data.actors) {
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
function renderActorList(): void {
  const actorList = document.getElementById('actor-list') as HTMLElement;
  if (!actorList) return;
  
  actorList.innerHTML = '';
  
  actors.forEach(actor => {
    const li: HTMLLIElement = document.createElement('li');
    li.className = 'actor-item';
    li.onclick = () => selectActor(actor.id);
    
    const actorData: ActorData = actor.data ? JSON.parse(actor.data) : {};
    
    li.innerHTML = `
      <div class="actor-name">${actor.name}</div>
      <div class="actor-type">${actor.type || 'Unknown'}</div>
    `;
    
    actorList.appendChild(li);
  });
}

// Select an actor and show its details
function selectActor(actorId: number): void {
  selectedActorId = actorId;
  
  // Update visual selection
  document.querySelectorAll('.actor-item').forEach((item: Element) => {
    item.classList.remove('selected');
  });
  
  const selectedItem = document.querySelector(`[onclick="selectActor(${actorId})"]`) as HTMLElement;
  if (selectedItem) {
    selectedItem.classList.add('selected');
  }
  
  // Show actor details
  const actor: Actor | undefined = actors.find(a => a.id == actorId);
  if (actor) {
    showActorSheet(actor);
  }
}

// Show actor sheet with details
function showActorSheet(actor: Actor): void {
  const container = document.getElementById('actor-sheet-container') as HTMLElement;
  if (!container) return;
  
  const actorData: ActorData = actor.data ? JSON.parse(actor.data) : {};
  
  const initials: string = actor.name.split(' ').map(n => n[0]).join('').toUpperCase();
  
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
function openCreateActorModal(): void {
  const modal = document.getElementById('create-actor-modal') as HTMLElement;
  if (modal) {
    modal.style.display = 'block';
  }
}

// Close create actor modal
function closeCreateActorModal(): void {
  const modal = document.getElementById('create-actor-modal') as HTMLElement;
  if (modal) {
    modal.style.display = 'none';
  }
  
  const form = document.getElementById('create-actor-form') as HTMLFormElement;
  if (form) {
    form.reset();
  }
}

// Handle create actor form submission
const createActorForm = document.getElementById('create-actor-form') as HTMLFormElement;
if (createActorForm) {
  createActorForm.addEventListener('submit', async function(e: Event) {
    e.preventDefault();
    
    const nameInput = document.getElementById('actor-name') as HTMLInputElement;
    const typeInput = document.getElementById('actor-type') as HTMLInputElement;
    const classInput = document.getElementById('actor-class') as HTMLInputElement;
    const levelInput = document.getElementById('actor-level') as HTMLInputElement;
    const hpInput = document.getElementById('actor-hp') as HTMLInputElement;
    const acInput = document.getElementById('actor-ac') as HTMLInputElement;
    
    const name: string = nameInput.value;
    const type: string = typeInput.value;
    const actorClass: string = classInput.value;
    const level: number = parseInt(levelInput.value);
    const hp: number = parseInt(hpInput.value);
    const ac: number = parseInt(acInput.value);
    
    const actorData: ActorData = {
      class: actorClass,
      level: level,
      hp: hp,
      ac: ac,
      notes: ''
    };
    
    try {
      const response: Response = await fetch('/register', {
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
      
      const result: ApiResponse = await response.json();
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
}

// Edit actor (placeholder for future implementation)
function editActor(actorId: number): void {
  alert('Edit functionality will be implemented in a future update.');
}

// Delete actor (placeholder for future implementation)
function deleteActor(actorId: number): void {
  if (confirm('Are you sure you want to delete this actor?')) {
    alert('Delete functionality will be implemented in a future update.');
  }
}

// Close modal when clicking outside
window.onclick = function(event: Event) {
  const modal = document.getElementById('create-actor-modal') as HTMLElement;
  if (event.target === modal) {
    closeCreateActorModal();
  }
};

// Make functions globally available
(window as any).openCreateActorModal = openCreateActorModal;
(window as any).closeCreateActorModal = closeCreateActorModal;
(window as any).selectActor = selectActor;
(window as any).editActor = editActor;
(window as any).deleteActor = deleteActor;