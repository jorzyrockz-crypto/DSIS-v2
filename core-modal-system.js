function showConfirm(title, msg, onConfirm, confirmLabel = 'Confirm'){
  const m = document.getElementById('modal');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMsg').textContent = msg;
  pendingConfirmAction = typeof onConfirm === 'function' ? onConfirm : null;
  const actions = m.querySelector('.modal-actions');
  actions.innerHTML = `
    <button class="btn btn-md btn-secondary modal-btn secondary" data-action="closeModal">Cancel</button>
    <button class="btn btn-md btn-primary modal-btn primary" data-action="runConfirmAction">${confirmLabel}</button>`;
  m.style.display = 'flex';
}

function showModal(title, msg){
  const m = document.getElementById('modal');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalMsg').textContent = msg;
  m.querySelector('.modal-actions').innerHTML = '<button class="btn btn-md btn-primary modal-btn primary" data-action="closeModal">OK</button>';
  m.style.display = 'flex';
}

function runConfirmAction(){
  const action = pendingConfirmAction;
  pendingConfirmAction = null;
  closeModal();
  if (typeof action === 'function') action();
}

function closeModal(){
  pendingConfirmAction = null;
  document.getElementById('modal').style.display = 'none';
}
