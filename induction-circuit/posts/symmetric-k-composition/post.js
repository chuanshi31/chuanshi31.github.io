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
async function initializeTokenCurves() {
  const left = document.getElementById('left-layer'), right = document.getElementById('right-layer');
  const svg = document.getElementById('token-curve'), status = document.getElementById('curve-status');
  const data = await fetch('./data/token-curve-explorer.json').then(r => { if (!r.ok) throw new Error('Data unavailable'); return r.json(); });
  const ns = 'http://www.w3.org/2000/svg';
  function element(tag, attrs, label) {
    const e = document.createElementNS(ns, tag);
    for (const [key,value] of Object.entries(attrs)) e.setAttribute(key,String(value));
    if (label !== undefined) e.textContent=label;
    svg.append(e); return e;
  }
  function update() {
    const l=Number(left.value), m=Number(right.value);
    const same=data.same.map(row=>row[l][m]), different=data.different.map(row=>row[l][m]);
    const lower=Math.min(0,...same,...different), upper=Math.max(0,...same,...different);
    const pad=Math.max((upper-lower)*.08,1), lo=lower-pad, hi=upper+pad;
    const X=d=>70+d/2047*665, Y=v=>270-(v-lo)/(hi-lo)*230;
    svg.replaceChildren();
    for(let i=0;i<=4;i++) {
      const v=lo+(hi-lo)*i/4, y=Y(v);
      element('line',{x1:70,x2:735,y1:y,y2:y,stroke:'#e0e5e7'});
      element('text',{x:60,y:y+4,'text-anchor':'end',fill:'#52616a','font-size':12},v.toFixed(0));
    }
    for(const d of [0,512,1024,1536,2047]) element('text',{x:X(d),y:292,'text-anchor':'middle',fill:'#52616a','font-size':12},d);
    element('text',{x:400,y:320,'text-anchor':'middle',fill:'#52616a','font-size':13},'Matrix relative distance D');
    for(const [values,color,label,y] of [[same,'#397b83','Same token: distinct contexts',16],[different,'#bb6e56','Different token: all contexts',32]]) {
      const points=values.map((v,i)=>`${X(data.distances[i])},${Y(v)}`).join(' ');
      element('polyline',{points,fill:'none',stroke:color,'stroke-width':2});
      element('line',{x1:80,x2:100,y1:y,y2:y,stroke:color,'stroke-width':2});
      element('text',{x:108,y:y+4,fill:color,'font-size':12},label);
    }
    svg.setAttribute('aria-label',`Hplus scores for layers ${l} and ${m}, comparing the same token across distinct contexts with a different token across all contexts.`);
    status.textContent=`All-distance mean H⁺ score: same token ${data.full_distance_means.same[l][m].toFixed(2)}; different token ${data.full_distance_means.different[l][m].toFixed(2)}. Same token: 128 × 127 pairs. Different token: 128 × 128 pairs.`;
  }
  left.addEventListener('change',update); right.addEventListener('change',update);update();
}
initializeEnergy().catch(() => { document.getElementById('energy-threshold').disabled = true; });
initializeTokenCurves().catch(() => { document.getElementById('left-layer').disabled=true;document.getElementById('right-layer').disabled=true;document.getElementById('curve-status').textContent='Interactive data could not load. The static curves and complete downloaded arrays remain available.'; });
