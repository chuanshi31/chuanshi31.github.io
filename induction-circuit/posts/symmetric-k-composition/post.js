'use strict';
async function initializeEnergy() {
  const select = document.getElementById('energy-threshold');
  const data = await fetch('./data/all-distance-energy.json').then(r => { if (!r.ok) throw new Error('Data unavailable'); return r.json(); });
  function update() {
    const threshold = select.value, suffix = threshold === '0.3' ? '03' : '05';
    document.getElementById('energy-figure').src = `./assets/all-distance-energy-${suffix}.png`;
    document.getElementById('energy-svg').href = `./assets/all-distance-energy-${suffix}.svg`;
    const body = document.getElementById('energy-table-body');
    body.replaceChildren();
    for (const row of data.rows.filter(r => String(r.threshold) === threshold)) {
      const tr = document.createElement('tr');
      for (const value of [row.scale, ...['Hplus', 'Hminus', 'A'].map(k => row[k] === null ? 'NA' : (row[k] * 100).toFixed(2))]) {
        const td = document.createElement('td'); td.textContent = value; tr.append(td);
      }
      body.append(tr);
    }
  }
  select.addEventListener('change', update); update();
}
async function initializeDistance() {
  const slider = document.getElementById('distance-slider');
  const d = await fetch('./data/distance-explorer.json').then(r => { if (!r.ok) throw new Error('Data unavailable'); return r.json(); });
  function update() {
    const i = Number(slider.value);
    document.getElementById('distance-value').value = String(d.distances[i]);
    document.getElementById('distance-capture').textContent = (d.energy_capture[i] * 100).toFixed(2) + '%';
    document.getElementById('distance-overlap').textContent = (d.subspace_overlap[i] * 100).toFixed(2) + '%';
    document.getElementById('distance-change').textContent = (d.matrix_change[i] * 100).toFixed(2) + '%';
    document.getElementById('distance-score').textContent = d.fixed_same_score[i].toFixed(2) + ' / ' + d.fixed_different_score[i].toFixed(2);
  }
  slider.addEventListener('input', update); update();
  document.getElementById('explorer-status').textContent = 'All 2,048 integer distances are available. Energy capture and subspace overlap measure different properties.';
}
initializeEnergy().catch(() => { document.getElementById('energy-threshold').disabled = true; });
initializeDistance().catch(() => { document.getElementById('distance-slider').disabled = true; document.getElementById('distance-score').textContent = 'See CSV'; document.getElementById('explorer-status').textContent = 'Interactive data could not load. The static figure and downloadable CSV remain available.'; });
