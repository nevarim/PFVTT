import { Permission, PermissionsResponse, Campaign, CampaignsResponse, User, UsersResponse, ApiResponse } from '../types/shared.js';

// Additional interfaces specific to permissions
interface AddUserResponse extends ApiResponse {
  permission?: Permission;
}

// Global variables for permissions page
let currentCampaignIdPermissions: string | null = null;
let permissions: Permission[] = [];
let users: User[] = [];
let campaignInfoPermissions: Campaign | null = null;

// Get campaign ID from session storage
function getCampaignIdFromSessionPermissions(): string | null {
  return sessionStorage.getItem('current_campaign_id');
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  currentCampaignIdPermissions = getCampaignIdFromSessionPermissions();
  if (!currentCampaignIdPermissions) {
    alert('No campaign selected');
    window.location.href = '/campaigns';
    return;
  }
  
  loadCampaignInfo();
  loadPermissions();
  
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
async function loadCampaignInfo(): Promise<void> {
  try {
    const user = localStorage.getItem('pfvtt_user') || sessionStorage.getItem('pfvtt_user');
    const response = await fetch(`/api/campaigns?username=${encodeURIComponent(user || '')}`);
    const data: CampaignsResponse = await response.json();
    if (data.success) {
      campaignInfoPermissions = data.campaigns.find(c => c.id == parseInt(currentCampaignIdPermissions || '0')) || null;
       if (campaignInfoPermissions) {
         renderCampaignInfo();
       }
    }
  } catch (error) {
    console.error('Error loading campaign info:', error);
  }
}

// Render campaign information
function renderCampaignInfo(): void {
  const container = document.getElementById('campaignInfo');
  if (!container || !campaignInfoPermissions) return;
  
  container.innerHTML = `
    <div class="campaign-name">${campaignInfoPermissions.name}</div>
    <div class="campaign-description">${campaignInfoPermissions.description || 'No description available'}</div>
    <div style="color: #aaa; font-size: 14px;">Campaign ID: ${campaignInfoPermissions.id}</div>
  `;
}

// Load permissions for the current campaign
async function loadPermissions(): Promise<void> {
  try {
    const response = await fetch(`/api/campaign_permissions?campaign_id=${currentCampaignIdPermissions}`);
    const data: PermissionsResponse = await response.json();
    if (data.success) {
      permissions = data.permissions;
      await loadUserDetails();
      renderPermissions();
    } else {
      console.error('Failed to load permissions:', data.error);
    }
  } catch (error) {
    console.error('Error loading permissions:', error);
  }
}

// Load user details for all users with permissions
async function loadUserDetails(): Promise<void> {
  try {
    const response = await fetch('/api/debug/users');
    const data: UsersResponse = await response.json();
    if (data.success) {
      // Map user IDs to usernames
      const userMap: { [key: number]: string } = {};
      data.users.forEach(user => {
        userMap[user.id] = user.username;
      });
      
      // Add username to permissions
      permissions.forEach(permission => {
        permission.username = userMap[permission.user_id] || `User ${permission.user_id}`;
      });
    }
  } catch (error) {
    console.error('Error loading user details:', error);
  }
}

// Render the permissions list
function renderPermissions(): void {
  const container = document.getElementById('permissionsList');
  if (!container) return;
  
  if (permissions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>👥 No Users Added</h3>
        <p>Add users to this campaign to manage their permissions.</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = '';
  
  permissions.forEach(permission => {
    const div = document.createElement('div');
    div.className = 'permission-item';
    
    // Get first letter of username for avatar
    const avatarLetter = (permission.username || 'U').charAt(0).toUpperCase();
    
    div.innerHTML = `
      <div class="user-info">
        <div class="user-avatar">${avatarLetter}</div>
        <div class="user-details">
          <h4>${permission.username || 'Unknown User'}</h4>
          <div class="user-id">ID: ${permission.user_id}</div>
        </div>
      </div>
      <div class="permission-actions">
        <span class="role-badge role-${permission.role}">${permission.role}</span>
        ${permission.role !== 'owner' ? `<button class="btn btn-danger" onclick="removeUser(${permission.user_id})">Remove</button>` : ''}
      </div>
    `;
    
    container.appendChild(div);
  });
}

// Open add user modal
function openAddUserModal(): void {
  const modal = document.getElementById('addUserModal') as HTMLElement;
  const userIdInput = document.getElementById('userId') as HTMLInputElement;
  const userRoleSelect = document.getElementById('userRole') as HTMLSelectElement;
  
  if (modal) modal.style.display = 'block';
  if (userIdInput) userIdInput.value = '';
  if (userRoleSelect) userRoleSelect.value = '';
}

// Close add user modal
function closeAddUserModal(): void {
  const modal = document.getElementById('addUserModal') as HTMLElement;
  if (modal) modal.style.display = 'none';
}

// Handle add user form submission
const addUserForm = document.getElementById('addUserForm');
if (addUserForm) {
  addUserForm.addEventListener('submit', async function(e: Event) {
    e.preventDefault();
    
    const userIdInput = document.getElementById('userId') as HTMLInputElement;
    const userRoleSelect = document.getElementById('userRole') as HTMLSelectElement;
    
    const userId = userIdInput?.value || '';
    const role = userRoleSelect?.value || '';
    
    if (!userId || !role) {
      alert('Please fill in all fields');
      return;
    }
    
    // Check if user already has permissions
    const existingPermission = permissions.find(p => p.user_id == parseInt(userId));
    if (existingPermission) {
      alert('This user already has permissions for this campaign');
      return;
    }
    
    try {
      const response = await fetch('/api/campaign_permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          campaign_id: currentCampaignIdPermissions,
          user_id: parseInt(userId),
          role: role
        })
      });
      
      const data: AddUserResponse = await response.json();
      if (data.success) {
        closeAddUserModal();
        loadPermissions(); // Reload the permissions list
      } else {
        alert('Failed to add user: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error adding user:', error);
      alert('Error adding user');
    }
  });
}

// Remove user from campaign
async function removeUser(userId: number): Promise<void> {
  if (!confirm('Are you sure you want to remove this user from the campaign?')) {
    return;
  }
  
  // Note: Delete API endpoint would need to be implemented in backend
  alert('Remove user functionality not yet implemented in backend API');
}

// Close modal when clicking outside of it
window.onclick = function(event: Event) {
  const modal = document.getElementById('addUserModal');
  if (event.target == modal) {
    closeAddUserModal();
  }
}

// Make functions available globally
declare global {
  interface Window {
    openAddUserModal: () => void;
  }
}

window.openAddUserModal = openAddUserModal;
(window as any).closeAddUserModal = closeAddUserModal;
(window as any).removeUser = removeUser;