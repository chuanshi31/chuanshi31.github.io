'use strict';
(async () => {
  const model = document.getElementById('fit-model');
  if (!model) return;
  const checkpoint = document.getElementById('fit-checkpoint');
  const operator = document.getElementById('fit-operator');
  const predictor = document.getElementById('fit-predictor');
  const svg = document.getElementById('checkpoint-fit-plot');
  const description = document.getElementById('fit-description');
  const metrics = document.getElementById('fit-metrics');
  const equation = document.getElementById('fit-equation');
  const body = document.querySelector('#fit-points tbody');
  const response = await fetch('./data/checkpoint-margin-fits.json');
  if (!response.ok) throw new Error('Checkpoint fits could not be loaded');
  const data = await response.json();
  const option = (parent, value, label) => {
    const e = document.createElement('option');
    e.value = value; e.textContent = label; parent.append(e);
  };
  const number = value => !Number.isFinite(value) ? '—' :
    value !== 0 && (Math.abs(value) < .001 || Math.abs(value) >= 10000) ? value.toExponential(3) : value.toFixed(3);
  data.models.forEach(m => option(model, m.id, m.label));
  Object.entries(data.metrics).forEach(([id,m]) => option(predictor, id, m.label));
  model.disabled = false; predictor.disabled = false; predictor.value = 'mean_m';
  function element(tag, attributes, text) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([k,v]) => e.setAttribute(k, String(v)));
    if (text !== undefined) e.textContent = text;
    svg.append(e); return e;
  }
  function draw() {
    const selected = data.cases.find(c => c.scale === model.value && c.step === Number(checkpoint.value) && c.operator === operator.value);
    if (!selected) throw new Error('No matching checkpoint fit');
    const key = predictor.value, fit = selected.fits[key], points = selected.points;
    const name = data.models.find(m => m.id === model.value).label;
    const op = operator.value === 'C' ? 'complete C' : 'H⁺';
    const xLabel = data.metrics[key].label;
    description.textContent = name+' · step '+selected.step.toLocaleString('en-US')+' · '+op+' · '+selected.n_routes+' routes into '+selected.n_readers+' Readers. '+data.metrics[key].definition+'.';
    metrics.replaceChildren();
    [['Pearson r',fit.pearson_r],['Spearman ρ',fit.spearman_rho],['OLS R²',fit.R_squared]].forEach(([label,value]) => {
      const tile = document.createElement('div'), title = document.createElement('span'), output = document.createElement('strong');
      title.textContent = label; output.textContent = number(value); tile.append(title,output); metrics.append(tile);
    });
    body.replaceChildren();
    points.forEach(p => {
      const row = document.createElement('tr');
      [p.reader+' ← '+p.writer,number(p.x[key]),number(p.drop_pp)].forEach((value,i) => {
        const cell = document.createElement(i === 0 ? 'th' : 'td');
        if (i === 0) cell.scope = 'row';
        cell.textContent = value; row.append(cell);
      });
      body.append(row);
    });
    svg.replaceChildren();
    svg.setAttribute('aria-label', name+', step '+selected.step+', '+op+', '+xLabel+' versus native route-removal attention decrease');
    element('title',{},name+' · step '+selected.step.toLocaleString('en-US')+' · '+op);
    const W = 960, H = 470, left = 92, right = 34, top = 58, bottom = 84;
    let xmin = Math.min(...points.map(p=>p.x[key])), xmax = Math.max(...points.map(p=>p.x[key]));
    if (xmin === xmax) { xmin -= 1; xmax += 1; }
    const dx = (xmax-xmin)*.08; xmin -= dx; xmax += dx;
    const line = fit.status === 'PASS' ? [fit.intercept+fit.slope*xmin,fit.intercept+fit.slope*xmax] : [];
    let ymin = Math.min(0,...points.map(p=>p.drop_pp),...line), ymax = Math.max(0,...points.map(p=>p.drop_pp),...line);
    if (ymin === ymax) ymax = ymin+1;
    const dy = (ymax-ymin)*.08; ymin -= dy; ymax += dy;
    const x = value => left+(value-xmin)/(xmax-xmin)*(W-left-right);
    const y = value => top+(ymax-value)/(ymax-ymin)*(H-top-bottom);
    element('text',{x:left,y:26,fill:'#233d50','font-size':16,'font-weight':600},name+' · step '+selected.step.toLocaleString('en-US')+' · '+op);
    for (let i=0;i<=4;i++) {
      const xv = xmin+(xmax-xmin)*i/4, yv = ymin+(ymax-ymin)*i/4;
      element('line',{x1:left,x2:W-right,y1:y(yv),y2:y(yv),stroke:'#e0e7ea'});
      element('text',{x:left-12,y:y(yv)+4,'text-anchor':'end',fill:'#526770','font-size':12},number(yv));
      element('text',{x:x(xv),y:H-bottom+24,'text-anchor':'middle',fill:'#526770','font-size':12},number(xv));
    }
    element('line',{x1:left,x2:W-right,y1:y(0),y2:y(0),stroke:'#a4b8bf'});
    if (line.length) element('line',{'data-fit-line':'ols',x1:x(xmin),x2:x(xmax),y1:y(line[0]),y2:y(line[1]),stroke:'#233d50','stroke-width':2});
    points.forEach(p => {
      const dot = element('circle',{'data-route':p.reader+'←'+p.writer,cx:x(p.x[key]),cy:y(p.drop_pp),r:5.5,
        fill:p.reader.startsWith('L3H')?'#10849b':'#aa6347',stroke:'#fff','stroke-width':1,tabindex:0});
      const title = document.createElementNS('http://www.w3.org/2000/svg','title');
      title.textContent = p.reader+' ← '+p.writer+'; '+xLabel+' = '+number(p.x[key])+'; attention decrease = '+number(p.drop_pp)+' pp';dot.append(title);
    });
    element('text',{x:(left+W-right)/2,y:H-22,'text-anchor':'middle',fill:'#526770','font-size':14},xLabel);
    element('text',{x:20,y:(top+H-bottom)/2,transform:'rotate(-90 20 '+((top+H-bottom)/2)+')','text-anchor':'middle',fill:'#526770','font-size':13},'Native route-removal attention decrease (pp)');
    equation.textContent = fit.status === 'PASS' ?
      'OLS: attention decrease (pp) = '+number(fit.intercept)+' '+(fit.slope<0?'−':'+')+' '+number(Math.abs(fit.slope))+' × predictor. One selected checkpoint only; no pooled fit.' :
      'A constant variable prevents a defined correlation or regression for this selection.';
    svg.dataset.model = selected.scale; svg.dataset.step = String(selected.step);
    svg.dataset.operator = selected.operator; svg.dataset.predictor = key;
  }
  function selectModel() {
    const previous = checkpoint.value, config = data.models.find(m => m.id === model.value);
    checkpoint.replaceChildren();
    config.steps.forEach(s => option(checkpoint,String(s),s.toLocaleString('en-US')));
    checkpoint.value = config.steps.some(s=>String(s)===previous) ? previous : String(config.steps[config.steps.length-1]);
    checkpoint.disabled = false; draw();
  }
  model.addEventListener('change',selectModel);
  [checkpoint,operator,predictor].forEach(e => e.addEventListener('change',draw));
  selectModel();
})().catch(error => {
  const p = document.getElementById('fit-description');
  if (p) p.textContent = 'Checkpoint-specific fits could not be loaded. Reload the page or use the downloadable data.';
  console.error(error);
});
