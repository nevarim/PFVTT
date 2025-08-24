// Campaign management TypeScript functionality using backend APIs

import { Campaign, CampaignsResponse, GameSystemsResponse, ApiResponse, ImageUploadResponse } from '../types/shared.js';

// Additional interfaces specific to campaigns
interface CreateCampaignResponse extends ApiResponse {
  campaign?: Campaign;
}

interface UserIdResponse extends ApiResponse {
  user_id?: number;
}

interface ErrorResponse extends ApiResponse {
  message?: string;
}

interface Rule {
  id?: number;
  system: string;
}

interface ImportData {
  [key: string]: any;
}

// Campaign management functions
async function loadCampaigns(): Promise<void> {
  const user: string | null = localStorage.getItem('pfvtt_user') || sessionStorage.getItem('pfvtt_user');
  const campaignsGrid = document.getElementById('campaigns-grid') as HTMLElement;
  
  if (!user) {
    campaignsGrid.innerHTML = '<div class="empty-state"><h3>Please log in to view campaigns</h3></div>';
    return;
  }
  
  try {
    const response: Response = await fetch(`/api/campaigns?username=${encodeURIComponent(user)}`);
    const data: CampaignsResponse = await response.json();
    campaignsGrid.innerHTML = '';
    
    if (data.success && data.campaigns && data.campaigns.length > 0) {
      data.campaigns.forEach((campaign: Campaign) => {
        const card: HTMLDivElement = document.createElement('div');
        card.className = 'campaign-card';
        card.setAttribute('data-campaign-id', campaign.id.toString());
        
        const imageSection: string = campaign.image_url ? 
          `<div class="campaign-image"><img src="${campaign.image_url}" alt="${campaign.name}"></div>` :
          `<div class="campaign-image"></div>`;
        
        card.innerHTML = `
          ${imageSection}
          <div class="campaign-content">
            <h3 class="campaign-title">${campaign.name}</h3>
            <div class="campaign-system">${campaign.system || 'No System'}</div>
            <p class="campaign-description">${campaign.description || 'No description available'}</p>
            <div class="campaign-actions">
              <button class='campaign-btn btn-enter enter-campaign-btn' data-id='${campaign.id}'>Enter</button>
              <button class='campaign-btn btn-actors actors-btn' data-id='${campaign.id}'>Actors</button>
              <button class='campaign-btn btn-scenes scenes-btn' data-id='${campaign.id}'>Scenes</button>
              <button class='campaign-btn btn-journals journals-btn' data-id='${campaign.id}'>Journals</button>
              <button class='campaign-btn btn-permissions permissions-btn' data-id='${campaign.id}'>Permissions</button>
              <button class='campaign-btn btn-edit edit-campaign-btn' data-id='${campaign.id}'>Edit</button>
              <button class='campaign-btn btn-delete delete-campaign-btn' data-id='${campaign.id}'>Delete</button>
            </div>
          </div>
        `;
        campaignsGrid.appendChild(card);
      });
      
      // Add event listeners for delete and edit buttons after campaigns are loaded
      document.querySelectorAll('.delete-campaign-btn').forEach((btn: Element) => {
        btn.addEventListener('click', async function(this: HTMLElement) {
          const campaignId: string | null = this.getAttribute('data-id');
          if (!campaignId || !confirm('Are you sure you want to delete this campaign?')) return;
          
          try {
            const response: Response = await fetch('/campaigns/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ campaign_id: campaignId, username: user })
            });
            const result: ApiResponse = await response.json();
            if (result.success) {
              loadCampaigns();
            } else {
              alert(result.error || 'Failed to delete campaign.');
            }
          } catch (err) {
            alert('Error deleting campaign.');
          }
        });
      });
      
      document.querySelectorAll('.enter-campaign-btn').forEach((btn: Element) => {
        btn.addEventListener('click', function(this: HTMLElement) {
          const campaignId: string | null = this.getAttribute('data-id');
          if (!campaignId) return;
          
          // Save campaign ID in session storage for map page
          sessionStorage.setItem('current_campaign_id', campaignId);
          
          // Simplified debug log for navigation (only in development)
          if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('CAMPAIGNS.TS: Navigating to map with campaign ID:', campaignId);
            console.log('CAMPAIGNS.TS: Current user in storage:', localStorage.getItem('pfvtt_user') || sessionStorage.getItem('pfvtt_user'));
          }
          
          window.location.href = '/map';
        });
      });
      
      document.querySelectorAll('.actors-btn').forEach((btn: Element) => {
        btn.addEventListener('click', function(this: HTMLElement) {
          const campaignId: string | null = this.getAttribute('data-id');
          if (!campaignId) return;
          sessionStorage.setItem('current_campaign_id', campaignId);
          window.location.href = '/actors';
        });
      });
      
      document.querySelectorAll('.scenes-btn').forEach((btn: Element) => {
        btn.addEventListener('click', function(this: HTMLElement) {
          const campaignId: string | null = this.getAttribute('data-id');
          if (!campaignId) return;
          sessionStorage.setItem('current_campaign_id', campaignId);
          window.location.href = '/scenes';
        });
      });
      
      document.querySelectorAll('.journals-btn').forEach((btn: Element) => {
        btn.addEventListener('click', function(this: HTMLElement) {
          const campaignId: string | null = this.getAttribute('data-id');
          if (!campaignId) return;
          sessionStorage.setItem('current_campaign_id', campaignId);
          window.location.href = '/journals';
        });
      });
      
      document.querySelectorAll('.permissions-btn').forEach((btn: Element) => {
        btn.addEventListener('click', function(this: HTMLElement) {
          const campaignId: string | null = this.getAttribute('data-id');
          if (!campaignId) return;
          sessionStorage.setItem('current_campaign_id', campaignId);
          window.location.href = '/permissions';
        });
      });
      
      document.querySelectorAll('.edit-campaign-btn').forEach((btn: Element) => {
        btn.addEventListener('click', function(this: HTMLElement) {
          const campaignId: string | null = this.getAttribute('data-id');
          if (!campaignId) return;
          
          // Set current campaign in session storage
          sessionStorage.setItem('current_campaign_id', campaignId);
          const campaign: Campaign | undefined = data.campaigns?.find(c => c.id == parseInt(campaignId));
          if (!campaign) return;
          
          // Populate modal fields
          (document.getElementById('edit-campaign-id') as HTMLInputElement).value = campaign.id.toString();
          (document.getElementById('edit-campaign-name') as HTMLInputElement).value = campaign.name;
          (document.getElementById('edit-campaign-description') as HTMLTextAreaElement).value = campaign.description || '';
          (document.getElementById('edit-campaign-image-url') as HTMLInputElement).value = campaign.image_url || '';
          
          // Show current image if exists
          const imagePreview = document.getElementById('edit-campaign-image-preview') as HTMLImageElement;
          const imagePreviewContainer = document.getElementById('edit-campaign-image-preview-container') as HTMLElement;
          if (campaign.image_url && campaign.image_url.trim() !== '') {
            imagePreview.src = campaign.image_url;
            imagePreviewContainer.style.display = 'block';
          } else {
            imagePreviewContainer.style.display = 'none';
          }
          
          // Populate system select
          const systemSelect = document.getElementById('edit-campaign-system') as HTMLSelectElement;
          systemSelect.innerHTML = '';
          fetch('/api/rules').then(r => r.json()).then((rules: Rule[]) => {
            rules.forEach((rule: Rule) => {
              const opt: HTMLOptionElement = document.createElement('option');
              opt.value = rule.id !== undefined ? rule.id.toString() : rule.system;
              opt.textContent = rule.system;
              if (campaign.game_rules_id == (rule.id || rule.system) || campaign.system == opt.textContent) {
                opt.selected = true;
              }
              systemSelect.appendChild(opt);
            });
          });
          
          (document.getElementById('edit-campaign-modal') as HTMLElement).style.display = 'block';
        });
      });
    } else {
      campaignsGrid.innerHTML = '<div class="empty-state"><h3>No campaigns found</h3><p>Create your first campaign to get started!</p></div>';
    }
  } catch (err) {
    campaignsGrid.innerHTML = '<div class="empty-state"><h3>Error loading campaigns</h3><p>Please try refreshing the page.</p></div>';
  }
}

// Load game systems for campaign creation
async function populateGameSystems(): Promise<void> {
  const systemSelect = document.getElementById('campaign-system') as HTMLSelectElement;
  systemSelect.innerHTML = '';
  
  try {
    const response: Response = await fetch('/api/rules');
    const rules: Rule[] = await response.json();
    
    const defaultOption: HTMLOptionElement = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select system';
    systemSelect.appendChild(defaultOption);
    
    rules.forEach((rule: Rule) => {
      const opt: HTMLOptionElement = document.createElement('option');
      opt.value = rule.id !== undefined ? rule.id.toString() : rule.system;
      opt.textContent = rule.system;
      systemSelect.appendChild(opt);
    });
  } catch (err) {
    const opt: HTMLOptionElement = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Error loading systems';
    systemSelect.appendChild(opt);
  }
}

// Utility to fetch user_id from username
async function getUserId(username: string): Promise<number | null> {
  const resp: Response = await fetch(`/api/user_id?username=${encodeURIComponent(username)}`);
  const data: UserIdResponse = await resp.json();
  if (data.success && data.user_id) return data.user_id;
  return null;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  loadCampaigns();
  populateGameSystems();
  
  // Get the logged-in user from localStorage or sessionStorage
  const user: string | null = localStorage.getItem('pfvtt_user') || sessionStorage.getItem('pfvtt_user');
  
  // Update the form submission to include the username in the API call
  const form = document.getElementById('create-campaign-form') as HTMLFormElement;
  form.addEventListener('submit', async function(event: Event) {
    event.preventDefault();
    
    const nameInput = document.getElementById('campaign-name') as HTMLInputElement;
    const descInput = document.getElementById('campaign-description') as HTMLTextAreaElement;
    const systemInput = document.getElementById('campaign-system') as HTMLSelectElement;
    const imageInput = document.getElementById('campaign-image-url') as HTMLInputElement;
    
    const name: string = nameInput.value.trim();
    const description: string = descInput ? descInput.value.trim() : '';
    const system: string = systemInput ? systemInput.value.trim() : '';
    const image_url: string = imageInput ? imageInput.value.trim() : '';
    
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
      const response: Response = await fetch('/api/campaigns', {
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
        const error: ApiResponse = await response.json();
        const errorData = error as ErrorResponse;
        alert(errorData.message || 'Failed to create campaign.');
      }
    } catch (err: any) {
      const errorData = err as ErrorResponse;
      alert(errorData.message || 'Error creating campaign.');
    }
  });

  // Edit campaign modal logic
  const closeEditModal = document.getElementById('close-edit-modal') as HTMLElement;
  closeEditModal.onclick = function() {
    (document.getElementById('edit-campaign-modal') as HTMLElement).style.display = 'none';
  };
  
  // Handle image URL input changes in edit modal
  const editImageUrlInput = document.getElementById('edit-campaign-image-url') as HTMLInputElement;
  editImageUrlInput.addEventListener('input', function(this: HTMLInputElement) {
    const imageUrl: string = this.value;
    const imagePreview = document.getElementById('edit-campaign-image-preview') as HTMLImageElement;
    const imagePreviewContainer = document.getElementById('edit-campaign-image-preview-container') as HTMLElement;
    
    if (imageUrl && imageUrl.trim() !== '') {
      imagePreview.src = imageUrl;
      imagePreviewContainer.style.display = 'block';
    } else {
      imagePreviewContainer.style.display = 'none';
    }
  });

  // Image upload functionality for edit campaign
  const editImageUpload = document.getElementById('edit-campaign-image-upload') as HTMLInputElement;
  if (editImageUpload) {
    editImageUpload.addEventListener('change', async function(this: HTMLInputElement, e: Event) {
      const target = e.target as HTMLInputElement;
      const file: File | undefined = target.files?.[0];
      
      if (file) {
        // Validate PNG file type
        if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
          alert('Only PNG files are allowed.');
          target.value = ''; // Clear the input
          return;
        }
        
        if (!user) {
          alert('User not logged in.');
          return;
        }
        
        // Get the numeric user ID
        const userId: number | null = await getUserId(user);
        if (!userId) {
          alert('Failed to get user ID. Please login again.');
          return;
        }
        
        // Upload the image
        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', userId.toString());
        formData.append('campaign_id', (document.getElementById('edit-campaign-id') as HTMLInputElement).value);
        formData.append('upload_type', 'campaign');
        
        fetch('/api/upload', {
          method: 'POST',
          body: formData
        })
        .then((response: Response) => response.json())
        .then((data: ImageUploadResponse) => {
          if (data.success && data.url) {
            // Update the image URL field and preview
            (document.getElementById('edit-campaign-image-url') as HTMLInputElement).value = data.url;
            const imagePreview = document.getElementById('edit-campaign-image-preview') as HTMLImageElement;
            const imagePreviewContainer = document.getElementById('edit-campaign-image-preview-container') as HTMLElement;
            imagePreview.src = data.url;
            imagePreviewContainer.style.display = 'block';
            alert('Image uploaded successfully!');
          } else {
            alert('Failed to upload image: ' + (data.error || 'Unknown error'));
          }
        })
        .catch((error: Error) => {
          console.error('Error uploading image:', error);
          alert('Error uploading image');
        });
      }
    });
  }
  
  // Edit campaign form submission
  const editForm = document.getElementById('edit-campaign-form') as HTMLFormElement;
  editForm.onsubmit = async function(e: Event) {
    e.preventDefault();
    
    const id: string = (document.getElementById('edit-campaign-id') as HTMLInputElement).value;
    const name: string = (document.getElementById('edit-campaign-name') as HTMLInputElement).value.trim();
    const description: string = (document.getElementById('edit-campaign-description') as HTMLTextAreaElement).value.trim();
    const system: string = (document.getElementById('edit-campaign-system') as HTMLSelectElement).value.trim();
    const image_url: string = (document.getElementById('edit-campaign-image-url') as HTMLInputElement).value.trim();
    
    const userId: string | null = localStorage.getItem('pfvtt_user_id') || sessionStorage.getItem('pfvtt_user_id');
    if (!userId) { 
      alert('User ID not found. Please login again.'); 
      return; 
    }
    
    if (!name) { 
      alert('Please enter a campaign name.'); 
      return; 
    }
    
    // Get the image URL from the input field (either manually entered or from upload)
    const imageUrl: string = (document.getElementById('edit-campaign-image-url') as HTMLInputElement).value;
    
    try {
      const response: Response = await fetch('/api/campaigns/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: id, name, description, game_rules_id: system, image_url: imageUrl, username: user })
      });
      
      const result: ApiResponse = await response.json();
      if (result.success) {
        (document.getElementById('edit-campaign-modal') as HTMLElement).style.display = 'none';
        loadCampaigns();
        
        // Update current campaign data in session if this is the current campaign
        const currentCampaignId: string | null = sessionStorage.getItem('current_campaign_id');
        if (currentCampaignId == id) {
          // Trigger a refresh of campaign data for other pages
          sessionStorage.setItem('campaign_data_updated', Date.now().toString());
        }
      } else {
        alert(result.error || 'Failed to edit campaign.');
      }
    } catch (err) {
      alert('Error editing campaign.');
    }
  };

  // Import/Export functionality
  let selectedCampaignId: string | null = null;
  
  // Add click handlers for campaign selection
  document.addEventListener('click', function(e: Event) {
    const target = e.target as HTMLElement;
    if (target.closest('.campaign-card') && target.closest('#campaigns-grid')) {
      // Don't select if clicking on a button
      if (target.classList.contains('campaign-btn')) {
        return;
      }
      
      // Remove previous selection
      document.querySelectorAll('.campaign-card').forEach((card: Element) => card.classList.remove('selected'));
      
      // Add selection to clicked campaign
      const card = target.closest('.campaign-card') as HTMLElement;
      card.classList.add('selected');
      
      // Get campaign ID from card data attribute
      selectedCampaignId = card.getAttribute('data-campaign-id');
      
      // Enable export button
      (document.getElementById('export-btn') as HTMLButtonElement).disabled = !selectedCampaignId;
    }
  });
  
  // Import button handler
  const importBtn = document.getElementById('import-btn') as HTMLButtonElement;
  importBtn.addEventListener('click', function() {
    (document.getElementById('import-file') as HTMLInputElement).click();
  });
  
  // File input handler
  const importFile = document.getElementById('import-file') as HTMLInputElement;
  importFile.addEventListener('change', async function(e: Event) {
    const target = e.target as HTMLInputElement;
    const file: File | undefined = target.files?.[0];
    if (!file) return;
    
    try {
      const text: string = await file.text();
      const importData: ImportData = JSON.parse(text);
      const user: string | null = localStorage.getItem('pfvtt_user') || sessionStorage.getItem('pfvtt_user');
      
      if (!user) {
        alert('Please log in to import campaigns.');
        return;
      }
      
      const response: Response = await fetch('/campaigns/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, data: importData })
      });
      
      const result: ApiResponse = await response.json();
      if (result.success) {
        alert('Campaign imported successfully!');
        loadCampaigns();
      } else {
        alert('Import failed: ' + (result.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error importing campaign: ' + err.message);
    }
    
    // Reset file input
    target.value = '';
  });
  
  // Export button handler
  const exportBtn = document.getElementById('export-btn') as HTMLButtonElement;
  exportBtn.addEventListener('click', async function() {
    if (!selectedCampaignId) {
      alert('Please select a campaign to export.');
      return;
    }
    
    try {
      const response: Response = await fetch(`/campaigns/export?campaign_id=${selectedCampaignId}`);
      
      if (response.ok) {
        const blob: Blob = await response.blob();
        const url: string = window.URL.createObjectURL(blob);
        const a: HTMLAnchorElement = document.createElement('a');
        a.href = url;
        a.download = `campaign_export_${selectedCampaignId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const error: ApiResponse = await response.json();
        alert('Export failed: ' + (error.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Error exporting campaign: ' + err.message);
    }
  });
});