/* Accepted model/control views; show one comparison at a time. */
(() => {
  const model = document.getElementById('waterfall-model');
  const control = document.getElementById('waterfall-control');
  if (!model || !control) return;
  const panels = [...document.querySelectorAll('[data-waterfall-model][data-waterfall-view]')];
  const note = document.getElementById('waterfall-model-note');
  const show = () => {
    const selected = panels.find(p => p.dataset.waterfallModel === model.value && p.dataset.waterfallView === control.value);
    if (!selected) return;
    panels.forEach(p => { p.hidden = p !== selected; });
    if (note) note.textContent = selected.dataset.description;
  };
  model.addEventListener('change', show);
  control.addEventListener('change', show);
  show();
})();
