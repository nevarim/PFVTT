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
        // Set background image if available
        if (campaign.image_url) {
          li.style.backgroundImage = `url('${campaign.image_url}')`;
          li.style.backgroundSize = 'cover';
          li.style.backgroundPosition = 'center';
          li.style.backgroundRepeat = 'no-repeat';
          li.classList.add('campaign-with-background');
        }
        li.innerHTML = `<div class="campaign-content"><strong>${campaign.name}</strong><br><em>${campaign.system || ''}</em><br>${campaign.description || ''}<br><button class='enter-campaign-btn' data-id='${campaign.id}'>Enter Campaign</button> <button class='actors-btn' data-id='${campaign.id}'>Actors</button> <button class='scenes-btn' data-id='${campaign.id}'>Scenes</button> <button class='journals-btn' data-id='${campaign.id}'>Journals</button> <button class='permissions-btn' data-id='${campaign.id}'>Permissions</button> <button class='edit-campaign-btn' data-id='${campaign.id}'>Edit</button> <button class='delete-campaign-btn' data-id='${campaign.id}'>Delete</button></div>`;
        list.appendChild(li);
      });
      // Add event listeners for delete and edit buttons after campaigns are loaded
      document.querySelectorAll('.delete-campaign-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
          const campaignId = this.getAttribute('data-id');
          if (!confirm('Are you sure you want to delete this campaign?')) return;
          try {
            const response = await fetch('/campaigns/delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ campaign_id: campaignId, username: user })
            });
            const result = await response.json();
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
      document.querySelectorAll('.enter-campaign-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const campaignId = this.getAttribute('data-id');
          // Save campaign ID in session storage for map page
          sessionStorage.setItem('current_campaign_id', campaignId);
          window.location.href = '/map';
        });
      });
      document.querySelectorAll('.actors-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const campaignId = this.getAttribute('data-id');
          sessionStorage.setItem('current_campaign_id', campaignId);
          window.location.href = '/actors';
        });
      });
      document.querySelectorAll('.scenes-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const campaignId = this.getAttribute('data-id');
          sessionStorage.setItem('current_campaign_id', campaignId);
          window.location.href = '/scenes';
        });
      });
      document.querySelectorAll('.journals-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const campaignId = this.getAttribute('data-id');
          sessionStorage.setItem('current_campaign_id', campaignId);
          window.location.href = '/journals';
        });
      });
      document.querySelectorAll('.permissions-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const campaignId = this.getAttribute('data-id');
          sessionStorage.setItem('current_campaign_id', campaignId);
          window.location.href = '/permissions';
        });
      });
      document.querySelectorAll('.edit-campaign-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const campaignId = this.getAttribute('data-id');
          // Set current campaign in session storage
          sessionStorage.setItem('current_campaign_id', campaignId);
          const campaign = data.campaigns.find(c => c.id == campaignId);
          if (!campaign) return;
          // Populate modal fields
          document.getElementById('edit-campaign-id').value = campaign.id;
          document.getElementById('edit-campaign-name').value = campaign.name;
          document.getElementById('edit-campaign-description').value = campaign.description || '';
          document.getElementById('edit-campaign-image-url').value = campaign.image_url || '';
          // Populate system select
          const systemSelect = document.getElementById('edit-campaign-system');
          systemSelect.innerHTML = '';
          fetch('/api/rules').then(r=>r.json()).then(rules=>{
            rules.forEach(rule => {
              const opt = document.createElement('option');
              opt.value = rule.id !== undefined ? rule.id : rule.system;
              opt.textContent = rule.system;
              if (campaign.game_rules_id == opt.value || campaign.system == opt.textContent) opt.selected = true;
              systemSelect.appendChild(opt);
            });
          });
          document.getElementById('edit-campaign-modal').style.display = 'block';
        });
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

  // Edit campaign modal logic
  document.getElementById('close-edit-modal').onclick = function() {
    document.getElementById('edit-campaign-modal').style.display = 'none';
  };
  // Image upload and crop logic for edit campaign
  const editImageUpload = document.getElementById('edit-campaign-image-upload');
  const cropContainer = document.getElementById('edit-campaign-image-crop-container');
  const cropPreview = document.getElementById('edit-campaign-crop-preview');
  let cropData = null;
  if (editImageUpload) {
    editImageUpload.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        // Validate PNG file type
        if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
          alert('Only PNG files are allowed.');
          e.target.value = ''; // Clear the input
          return;
        }
        const reader = new FileReader();
        reader.onload = function(evt) {
          cropPreview.src = evt.target.result;
          cropContainer.style.display = 'block';
          // TODO: Integrate a cropping library here (e.g., Cropper.js) and set cropData
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  // Background image upload and crop logic
  const backgroundImageUpload = document.getElementById('edit-campaign-background-upload');
  const backgroundCropContainer = document.getElementById('edit-campaign-background-crop-container');
  const backgroundCropPreview = document.getElementById('edit-campaign-background-crop-preview');
  const cropBackgroundBtn = document.getElementById('crop-background-btn');
  let backgroundCropData = null;
  let backgroundImageFile = null;
  
  if (backgroundImageUpload) {
    backgroundImageUpload.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        // Validate PNG file type
        if (file.type !== 'image/png' && !file.name.toLowerCase().endsWith('.png')) {
          alert('Only PNG files are allowed.');
          e.target.value = ''; // Clear the input
          return;
        }
        backgroundImageFile = file;
        const reader = new FileReader();
        reader.onload = function(evt) {
          backgroundCropPreview.src = evt.target.result;
          backgroundCropContainer.style.display = 'block';
          // Simple crop simulation - in a real implementation, use a proper cropping library
          backgroundCropData = { x: 0, y: 0, width: 100, height: 100 };
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  if (cropBackgroundBtn) {
    cropBackgroundBtn.addEventListener('click', function() {
      if (backgroundImageFile && backgroundCropData) {
        alert('Background crop area selected. This will be applied when saving the campaign.');
      }
    });
  }
  // Utility to fetch user_id from username
  async function getUserId(username) {
    const resp = await fetch(`/api/user_id?username=${encodeURIComponent(username)}`);
    const data = await resp.json();
    if (data.success && data.user_id) return data.user_id;
    return null;
  }
  document.getElementById('edit-campaign-form').onsubmit = async function(e) {
    e.preventDefault();
    const id = document.getElementById('edit-campaign-id').value;
    const name = document.getElementById('edit-campaign-name').value.trim();
    const description = document.getElementById('edit-campaign-description').value.trim();
    const system = document.getElementById('edit-campaign-system').value.trim();
    const image_url = document.getElementById('edit-campaign-image-url').value.trim();
    const userId = localStorage.getItem('pfvtt_user_id') || sessionStorage.getItem('pfvtt_user_id');
    if (!userId) { alert('User ID not found. Please login again.'); return; }
    // Handle image upload
    const fileInput = document.getElementById('edit-campaign-image-upload');
    const file = fileInput && fileInput.files[0];
    let uploadedImageUrl = image_url;
    if (file) {
      const formData = new FormData();
      formData.append('image', file);
      if (cropData) formData.append('crop', JSON.stringify(cropData));
      formData.append('user_id', userId); // Now numeric user_id
      formData.append('campaign_id', id);
      const uploadResp = await fetch('/api/campaign-background-upload', { method: 'POST', body: formData });
      const uploadResult = await uploadResp.json();
      if (uploadResult.success && uploadResult.url) {
        uploadedImageUrl = uploadResult.url;
      } else {
        alert('Image upload failed.');
        return;
      }
    }
    
    // Handle background image upload
    let uploadedBackgroundUrl = '';
    if (backgroundImageFile) {
      const formData = new FormData();
      formData.append('image', backgroundImageFile);
      if (backgroundCropData) formData.append('crop', JSON.stringify(backgroundCropData));
      formData.append('user_id', userId);
      formData.append('campaign_id', id);
      formData.append('type', 'background'); // Distinguish from regular campaign image
      const uploadResp = await fetch('/api/campaign-background-upload', { method: 'POST', body: formData });
      const uploadResult = await uploadResp.json();
      if (uploadResult.success && uploadResult.url) {
        uploadedBackgroundUrl = uploadResult.url;
      } else {
        alert('Background image upload failed.');
        return;
      }
    }
    if (!name) { alert('Please enter a campaign name.'); return; }
    try {
      const response = await fetch('/api/campaigns/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: id, name, description, game_rules_id: system, image_url: uploadedImageUrl, background_image_url: uploadedBackgroundUrl, username: user })
      });
      const result = await response.json();
      if (result.success) {
        document.getElementById('edit-campaign-modal').style.display = 'none';
        loadCampaigns();
        // Update current campaign data in session if this is the current campaign
        const currentCampaignId = sessionStorage.getItem('current_campaign_id');
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
  let selectedCampaignId = null;
  
  // Add click handlers for campaign selection
  document.addEventListener('click', function(e) {
    if (e.target.closest('li') && e.target.closest('#campaign-list')) {
      // Remove previous selection
      document.querySelectorAll('#campaign-list li').forEach(li => li.classList.remove('selected'));
      // Add selection to clicked campaign
      const li = e.target.closest('li');
      li.classList.add('selected');
      // Get campaign ID from edit button
      const editBtn = li.querySelector('.edit-campaign-btn');
      selectedCampaignId = editBtn ? editBtn.getAttribute('data-id') : null;
      // Enable export button
      document.getElementById('export-btn').disabled = !selectedCampaignId;
    }
  });
  
  // Import button handler
  document.getElementById('import-btn').addEventListener('click', function() {
    document.getElementById('import-file').click();
  });
  
  // File input handler
  document.getElementById('import-file').addEventListener('change', async function(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      const user = localStorage.getItem('pfvtt_user') || sessionStorage.getItem('pfvtt_user');
      
      if (!user) {
        alert('Please log in to import campaigns.');
        return;
      }
      
      const response = await fetch('/campaigns/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, data: importData })
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Campaign imported successfully!');
        loadCampaigns();
      } else {
        alert('Import failed: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error importing campaign: ' + err.message);
    }
    
    // Reset file input
    e.target.value = '';
  });
  
  // Export button handler
  document.getElementById('export-btn').addEventListener('click', async function() {
    if (!selectedCampaignId) {
      alert('Please select a campaign to export.');
      return;
    }
    
    try {
      const response = await fetch(`/campaigns/export?campaign_id=${selectedCampaignId}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `campaign_export_${selectedCampaignId}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        const error = await response.json();
        alert('Export failed: ' + (error.error || 'Unknown error'));
      }
    } catch (err) {
      alert('Error exporting campaign: ' + err.message);
    }
  });
}
);