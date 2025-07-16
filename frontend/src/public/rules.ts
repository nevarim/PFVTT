import { Rule, GameSystem, GameSystemsResponse, ApiResponse } from '../types/shared.js';

// Additional interfaces specific to rules
interface SystemDataResponse extends ApiResponse {
  data: any;
}

interface RuleDescription {
  description?: string;
}

document.addEventListener('DOMContentLoaded', () => {
  const rulesTable = document.getElementById('rules-table')?.querySelector('tbody') as HTMLTableSectionElement;
  const ruleForm = document.getElementById('rule-form') as HTMLFormElement;
  const ruleIdInput = document.getElementById('rule-id') as HTMLInputElement;
  const ruleSystemInput = document.getElementById('rule-system') as HTMLInputElement;
  const ruleFolderSelect = document.getElementById('rule-folder') as HTMLSelectElement;
  const ruleDescInput = document.getElementById('rule-description') as HTMLTextAreaElement;
  const cancelEditBtn = document.getElementById('cancel-edit') as HTMLButtonElement;
  const gameSystemsList = document.getElementById('game-systems-list') as HTMLElement;

  function loadRules(): void {
    fetch('/api/rules')
      .then(res => res.json())
      .then((rules: Rule[]) => {
        if (!rulesTable) return;
        
        rulesTable.innerHTML = '';
        rules.forEach(rule => {
          let desc = '';
          try {
            const json: RuleDescription = JSON.parse(rule.rules_json);
            desc = json.description || '';
          } catch { 
            desc = rule.rules_json; 
          }
          
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${rule.id}</td>
            <td>${rule.system}</td>
            <td>${rule.folder_name || 'N/A'}</td>
            <td>${desc}</td>
            <td>
              <button class="edit-btn">Edit</button>
              <button class="delete-btn">Delete</button>
            </td>
          `;
          
          const editBtn = tr.querySelector('.edit-btn') as HTMLButtonElement;
          const deleteBtn = tr.querySelector('.delete-btn') as HTMLButtonElement;
          
          if (editBtn) editBtn.onclick = () => startEdit(rule);
          if (deleteBtn) deleteBtn.onclick = () => deleteRule(rule.id);
          
          rulesTable.appendChild(tr);
        });
      })
      .catch(err => console.error('Error loading rules:', err));
  }
  
  function loadGameSystems(): void {
    fetch('/api/game-systems')
      .then(res => res.json())
      .then((data: GameSystemsResponse) => {
        if (!gameSystemsList) return;
        
        if (data.success) {
          gameSystemsList.innerHTML = '';
          data.game_systems.forEach(system => {
            const div = document.createElement('div');
            div.className = 'game-system-item';
            
            let description = 'No description';
            try {
              const json: RuleDescription = JSON.parse(system.rules_json);
              description = json.description || 'No description';
            } catch {
              description = 'No description';
            }
            
            div.innerHTML = `
              <h3>${system.system}</h3>
              <p><strong>Folder:</strong> ${system.folder_name}</p>
              <p><strong>Description:</strong> ${description}</p>
              <button onclick="viewSystemData('${system.folder_name}')">View Character Sheet</button>
            `;
            gameSystemsList.appendChild(div);
          });
        }
      })
      .catch(err => console.error('Error loading game systems:', err));
  }
  
  // Make viewSystemData globally available
  (window as any).viewSystemData = function(folderName: string): void {
    fetch(`/api/game-systems/${folderName}?type=character_sheet`)
      .then(res => res.json())
      .then((data: SystemDataResponse) => {
        if (data.success) {
          alert('Character Sheet Template:\n' + JSON.stringify(data.data, null, 2));
        } else {
          alert('Error: ' + data.error);
        }
      })
      .catch(err => console.error('Error loading system data:', err));
  }

  function startEdit(rule: Rule): void {
    if (!ruleIdInput || !ruleSystemInput || !ruleFolderSelect || !ruleDescInput || !cancelEditBtn) return;
    
    ruleIdInput.value = rule.id.toString();
    ruleSystemInput.value = rule.system;
    ruleFolderSelect.value = rule.folder_name || '';
    
    try {
      const json: RuleDescription = JSON.parse(rule.rules_json);
      ruleDescInput.value = json.description || '';
    } catch { 
      ruleDescInput.value = rule.rules_json; 
    }
    
    cancelEditBtn.style.display = '';
  }

  function clearForm(): void {
    if (!ruleIdInput || !ruleSystemInput || !ruleFolderSelect || !ruleDescInput || !cancelEditBtn) return;
    
    ruleIdInput.value = '';
    ruleSystemInput.value = '';
    ruleFolderSelect.value = '';
    ruleDescInput.value = '';
    cancelEditBtn.style.display = 'none';
  }

  if (ruleForm) {
    ruleForm.onsubmit = (e: Event) => {
      e.preventDefault();
      
      if (!ruleIdInput || !ruleSystemInput || !ruleFolderSelect || !ruleDescInput) return;
      
      const id = ruleIdInput.value;
      const system = ruleSystemInput.value;
      const folder_name = ruleFolderSelect.value;
      const description = ruleDescInput.value;
      const rules_json = JSON.stringify({ description });
      
      if (id) {
        // Update existing rule
        fetch('/api/rules', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: parseInt(id), system, folder_name, rules_json })
        })
        .then(() => { 
          loadRules(); 
          clearForm(); 
        })
        .catch(err => console.error('Error updating rule:', err));
      } else {
        // Create new rule
        fetch('/api/rules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ system, folder_name, rules_json })
        })
        .then(() => { 
          loadRules(); 
          clearForm(); 
        })
        .catch(err => console.error('Error creating rule:', err));
      }
    };
  }

  if (cancelEditBtn) {
    cancelEditBtn.onclick = clearForm;
  }

  function deleteRule(id: number): void {
    if (!confirm('Delete this rule?')) return;
    
    fetch('/api/rules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    })
    .then(() => loadRules())
    .catch(err => console.error('Error deleting rule:', err));
  }

  loadRules();
  loadGameSystems();
});