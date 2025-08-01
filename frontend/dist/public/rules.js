document.addEventListener('DOMContentLoaded', () => {
    const rulesTable = document.getElementById('rules-table')?.querySelector('tbody');
    const ruleForm = document.getElementById('rule-form');
    const ruleIdInput = document.getElementById('rule-id');
    const ruleSystemInput = document.getElementById('rule-system');
    const ruleFolderSelect = document.getElementById('rule-folder');
    const ruleDescInput = document.getElementById('rule-description');
    const cancelEditBtn = document.getElementById('cancel-edit');
    const gameSystemsList = document.getElementById('game-systems-list');
    function loadRules() {
        fetch('/api/rules')
            .then(res => res.json())
            .then((rules) => {
            if (!rulesTable)
                return;
            rulesTable.innerHTML = '';
            rules.forEach(rule => {
                let desc = '';
                try {
                    const json = JSON.parse(rule.rules_json);
                    desc = json.description || '';
                }
                catch (e) {
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
                const editBtn = tr.querySelector('.edit-btn');
                const deleteBtn = tr.querySelector('.delete-btn');
                if (editBtn)
                    editBtn.onclick = () => startEdit(rule);
                if (deleteBtn)
                    deleteBtn.onclick = () => deleteRule(rule.id);
                rulesTable.appendChild(tr);
            });
        })
            .catch(err => console.error('Error loading rules:', err));
    }
    function loadGameSystems() {
        fetch('/api/game-systems')
            .then(res => res.json())
            .then((data) => {
            if (!gameSystemsList)
                return;
            if (data.success) {
                gameSystemsList.innerHTML = '';
                data.game_systems.forEach(system => {
                    const div = document.createElement('div');
                    div.className = 'game-system-item';
                    let description = 'No description';
                    try {
                        const json = JSON.parse(system.rules_json);
                        description = json.description || 'No description';
                    }
                    catch (e) {
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
    window.viewSystemData = function (folderName) {
        fetch(`/api/game-systems/${folderName}?type=character_sheet`)
            .then(res => res.json())
            .then((data) => {
            if (data.success) {
                alert('Character Sheet Template:\n' + JSON.stringify(data.data, null, 2));
            }
            else {
                alert('Error: ' + data.error);
            }
        })
            .catch(err => console.error('Error loading system data:', err));
    };
    function startEdit(rule) {
        if (!ruleIdInput || !ruleSystemInput || !ruleFolderSelect || !ruleDescInput || !cancelEditBtn)
            return;
        ruleIdInput.value = rule.id.toString();
        ruleSystemInput.value = rule.system;
        ruleFolderSelect.value = rule.folder_name || '';
        try {
            const json = JSON.parse(rule.rules_json);
            ruleDescInput.value = json.description || '';
        }
        catch (e) {
            ruleDescInput.value = rule.rules_json;
        }
        cancelEditBtn.style.display = '';
    }
    function clearForm() {
        if (!ruleIdInput || !ruleSystemInput || !ruleFolderSelect || !ruleDescInput || !cancelEditBtn)
            return;
        ruleIdInput.value = '';
        ruleSystemInput.value = '';
        ruleFolderSelect.value = '';
        ruleDescInput.value = '';
        cancelEditBtn.style.display = 'none';
    }
    if (ruleForm) {
        ruleForm.onsubmit = (e) => {
            e.preventDefault();
            if (!ruleIdInput || !ruleSystemInput || !ruleFolderSelect || !ruleDescInput)
                return;
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
            }
            else {
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
    function deleteRule(id) {
        if (!confirm('Delete this rule?'))
            return;
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
export {};
//# sourceMappingURL=rules.js.map