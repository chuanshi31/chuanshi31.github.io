/* One accepted endpoint comparison at a time; no inferred or pending results. */
(() => {
  const selector = document.getElementById('waterfall-model');
  if (!selector) return;
  const panels = [...document.querySelectorAll('[data-waterfall-model]')];
  const note = document.getElementById('waterfall-model-note');
  const show = () => {
    const selected = panels.find(panel => panel.dataset.waterfallModel === selector.value);
    if (!selected) return;
    for (const panel of panels) panel.hidden = panel !== selected;
    if (note) note.textContent = selected.dataset.description;
  };
  selector.addEventListener('change', show);
  show();
})();
