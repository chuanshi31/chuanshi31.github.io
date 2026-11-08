'use strict';
(async () => {
  const model = document.getElementById('RMS-model');
  if (!model) return;
  const operator = document.getElementById('RMS-operator');
  const checkpoint = document.getElementById('RMS-checkpoint');
  const response = await fetch('./data/RMS-training-trajectories.json?v=20261108-v1');
  if (!response.ok) throw new Error('RMS trajectory data could not be loaded');
  const data = await response.json();
  const option = (parent, value, label) => {
    const item = document.createElement('option');
    item.value = String(value); item.textContent = label; parent.append(item);
  };
  data.models.forEach(m => option(model, m.id, m.label));
  const steps = data.models[0].steps;
  steps.forEach(step => option(checkpoint, step, step.toLocaleString('en-US')));
  checkpoint.value = '143000'; model.disabled = false; checkpoint.disabled = false;
  const number = value => value.toFixed(5);
  function draw() {
    const config = data.models.find(m => m.id === model.value);
    const step = Number(checkpoint.value), op = operator.value;
    const label = op === 'C' ? 'Complete C' : 'H⁺';
    const summary = data.summary.find(r => r.model === model.value && r.operator === op && r.step === step);
    const rows = data.rows.filter(r => r.model === model.value && r.operator === op && r.step === step);
    document.getElementById('RMS-metadata').textContent = `${config.label} · ${label} · step ${step.toLocaleString('en-US')} · ${rows.length} fixed routes · all 20,849,616 comparisons per route.`;
    document.getElementById('RMS-R-value').textContent = number(summary.RMS_R_median);
    document.getElementById('RMS-m-value').textContent = number(summary.RMS_m_median);
    document.getElementById('RMS-ratio-value').textContent = (100 * summary.ratio_median).toFixed(2) + '%';
    const body = document.getElementById('RMS-route-values'); body.replaceChildren();
    rows.forEach(row => {
      const tr = document.createElement('tr');
      [`${row.reader} ← ${row.writer}`, number(row.RMS_R), number(row.RMS_m), (100 * row.ratio).toFixed(2) + '%'].forEach((text, i) => {
        const cell = document.createElement(i === 0 ? 'th' : 'td');
        if (i === 0) cell.scope = 'row'; cell.textContent = text; tr.append(cell);
      });
      body.append(tr);
    });
    const chart = document.getElementById('RMS-training-chart');
    const source = 'assets/' + config.assets[op];
    if (chart.getAttribute('src') !== source) chart.src = source;
    chart.alt = `${config.label}, ${label}: median and interquartile range across routes for RMS(R), RMS(m), and their per-route ratio at all 19 checkpoints`;
  }
  [model, operator, checkpoint].forEach(control => control.addEventListener('change', draw));
  draw();
})().catch(error => {
  const message = document.getElementById('RMS-metadata');
  if (message) message.textContent = 'RMS statistics could not be loaded; all values remain available in the JSON and CSV downloads below.';
  console.error(error);
});
