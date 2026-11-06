'use strict';
const grid = document.querySelector('.preview-grid');
const before = document.getElementById('beforePreview');
const after = document.getElementById('afterPreview');
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  const mode = button.dataset.mode;
  grid.dataset.mode = mode;
  before.hidden = mode === 'after';
  after.hidden = mode === 'before';
  document.querySelectorAll('button[data-mode]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
}));
