// Global variables for journals page
let selectedJournalId = null;
let journals = [];
let currentCampaignIdJournals = null;
// Get campaign ID from session storage
function getCampaignIdFromSessionJournals() {
    return sessionStorage.getItem('current_campaign_id');
}
// Initialize the page
document.addEventListener('DOMContentLoaded', function () {
    currentCampaignIdJournals = getCampaignIdFromSessionJournals();
    if (!currentCampaignIdJournals) {
        alert('No campaign selected');
        window.location.href = '/campaigns';
        return;
    }
    loadJournals();
});
// Listen for campaign data updates
let lastUpdateCheck = sessionStorage.getItem('campaign_data_updated');
setInterval(() => {
    const currentUpdate = sessionStorage.getItem('campaign_data_updated');
    if (currentUpdate && currentUpdate !== lastUpdateCheck) {
        lastUpdateCheck = currentUpdate;
        loadJournals(); // Reload journals when data is updated
    }
}, 1000);
// Load journals for the current campaign
async function loadJournals() {
    try {
        const response = await fetch(`/api/journals?campaign_id=${currentCampaignIdJournals}`);
        const data = await response.json();
        if (data.success) {
            journals = data.journals;
            renderJournalList();
        }
        else {
            console.error('Failed to load journals:', data.error);
        }
    }
    catch (error) {
        console.error('Error loading journals:', error);
    }
}
// Render the journal list in the sidebar
function renderJournalList() {
    const journalList = document.getElementById('journalList');
    if (!journalList)
        return;
    journalList.innerHTML = '';
    if (journals.length === 0) {
        journalList.innerHTML = '<li style="color: #aaa; text-align: center; padding: 20px;">No journals yet</li>';
        return;
    }
    journals.forEach(journal => {
        const li = document.createElement('li');
        li.className = 'journal-item';
        li.onclick = () => selectJournal(journal.id);
        // Format date
        const date = new Date(journal.created_at);
        const formattedDate = date.toLocaleDateString();
        // Create preview of content (first 50 characters)
        const preview = journal.content ?
            (journal.content.length > 50 ? journal.content.substring(0, 50) + '...' : journal.content) :
            'No content';
        li.innerHTML = `
      <div class="journal-title">${journal.title}</div>
      <div class="journal-preview">${preview}</div>
      <div class="journal-date">${formattedDate}</div>
    `;
        journalList.appendChild(li);
    });
}
// Select a journal and show its details
function selectJournal(journalId) {
    selectedJournalId = journalId;
    // Update visual selection
    document.querySelectorAll('.journal-item').forEach(item => {
        item.classList.remove('selected');
    });
    const selectedItem = document.querySelector(`[onclick="selectJournal(${journalId})"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }
    // Show journal details
    const journal = journals.find(j => j.id == journalId);
    if (journal) {
        showJournalSheet(journal);
    }
}
// Show journal sheet with details
function showJournalSheet(journal) {
    const container = document.getElementById('journalsMain');
    if (!container)
        return;
    // Format date
    const date = new Date(journal.created_at);
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    container.innerHTML = `
    <div class="journal-sheet">
      <div class="journal-header">
        <div class="journal-icon">📖</div>
        <div class="journal-info">
          <h2>${journal.title}</h2>
          <div class="journal-meta">Created: ${formattedDate}</div>
        </div>
      </div>
      
      <div class="journal-content">${journal.content || 'This journal entry is empty.'}</div>
      
      <div class="journal-actions">
        <button class="btn btn-primary" onclick="editJournal(${journal.id})">Edit Journal</button>
        <button class="btn btn-danger" onclick="deleteJournal(${journal.id})">Delete Journal</button>
      </div>
    </div>
  `;
}
// Open create journal modal
function openCreateModal() {
    const modal = document.getElementById('createJournalModal');
    const titleInput = document.getElementById('journalTitle');
    const contentInput = document.getElementById('journalContent');
    if (modal)
        modal.style.display = 'block';
    if (titleInput)
        titleInput.value = '';
    if (contentInput)
        contentInput.value = '';
}
// Close create journal modal
function closeCreateModal() {
    const modal = document.getElementById('createJournalModal');
    if (modal)
        modal.style.display = 'none';
}
// Handle create journal form submission
const createJournalForm = document.getElementById('createJournalForm');
if (createJournalForm) {
    createJournalForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const titleInput = document.getElementById('journalTitle');
        const contentInput = document.getElementById('journalContent');
        const title = titleInput?.value || '';
        const content = contentInput?.value || '';
        if (!title.trim()) {
            alert('Please enter a title for the journal');
            return;
        }
        try {
            const response = await fetch('/api/journals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    campaign_id: currentCampaignIdJournals,
                    title: title,
                    content: content
                })
            });
            const data = await response.json();
            if (data.success) {
                closeCreateModal();
                loadJournals(); // Reload the journal list
            }
            else {
                alert('Failed to create journal: ' + (data.error || 'Unknown error'));
            }
        }
        catch (error) {
            console.error('Error creating journal:', error);
            alert('Error creating journal');
        }
    });
}
// Edit journal (placeholder - would need edit modal)
function editJournal(journalId) {
    alert('Edit functionality not yet implemented');
}
// Delete journal
async function deleteJournal(journalId) {
    if (!confirm('Are you sure you want to delete this journal? This action cannot be undone.')) {
        return;
    }
    // Note: Delete API endpoint would need to be implemented in backend
    alert('Delete functionality not yet implemented in backend API');
}
// Close modal when clicking outside of it
window.onclick = function (event) {
    const modal = document.getElementById('createJournalModal');
    if (event.target == modal) {
        closeCreateModal();
    }
};
window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.selectJournal = selectJournal;
window.editJournal = editJournal;
window.deleteJournal = deleteJournal;
export {};
//# sourceMappingURL=journals.js.map