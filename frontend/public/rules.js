document.addEventListener('DOMContentLoaded', () => {
  const rulesTable = document.getElementById('rules-table').querySelector('tbody');
  const ruleForm = document.getElementById('rule-form');
  const ruleIdInput = document.getElementById('rule-id');
  const ruleSystemInput = document.getElementById('rule-system');
  const ruleDescInput = document.getElementById('rule-description');
  const cancelEditBtn = document.getElementById('cancel-edit');

  function loadRules() {
    fetch('/api/rules')
      .then(res => res.json())
      .then(rules => {
        rulesTable.innerHTML = '';
        rules.forEach(rule => {
          let desc = '';
          try {
            const json = JSON.parse(rule.rules_json);
            desc = json.description || '';
          } catch { desc = rule.rules_json; }
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${rule.id}</td><td>${rule.system}</td><td>${desc}</td>
            <td>
              <button class="edit-btn">Edit</button>
              <button class="delete-btn">Delete</button>
            </td>`;
          tr.querySelector('.edit-btn').onclick = () => startEdit(rule);
          tr.querySelector('.delete-btn').onclick = () => deleteRule(rule.id);
          rulesTable.appendChild(tr);
        });
      });
  }

  function startEdit(rule) {
    ruleIdInput.value = rule.id;
    ruleSystemInput.value = rule.system;
    try {
      const json = JSON.parse(rule.rules_json);
      ruleDescInput.value = json.description || '';
    } catch { ruleDescInput.value = rule.rules_json; }
    cancelEditBtn.style.display = '';
  }

  function clearForm() {
    ruleIdInput.value = '';
    ruleSystemInput.value = '';
    ruleDescInput.value = '';
    cancelEditBtn.style.display = 'none';
  }

  ruleForm.onsubmit = e => {
    e.preventDefault();
    const id = ruleIdInput.value;
    const system = ruleSystemInput.value;
    const description = ruleDescInput.value;
    const rules_json = JSON.stringify({ description });
    if (id) {
      fetch('/api/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, system, rules_json })
      }).then(() => { loadRules(); clearForm(); });
    } else {
      fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system, rules_json })
      }).then(() => { loadRules(); clearForm(); });
    }
  };

  cancelEditBtn.onclick = clearForm;

  function deleteRule(id) {
    if (!confirm('Delete this rule?')) return;
    fetch('/api/rules', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id })
    }).then(() => loadRules());
  }

  loadRules();
});