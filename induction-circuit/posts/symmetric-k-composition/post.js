'use strict';
(async () => {
  const model = document.getElementById('model-select');
  const head = document.getElementById('head-select');
  const checkpoint = document.getElementById('checkpoint-select');
  const operator = document.getElementById('operator-select');
  const body = document.querySelector('#margin-table tbody');
  const svg = document.getElementById('trajectory');
  const meta = document.getElementById('path-metadata');
  const caption = document.getElementById('trajectory-caption');
  const colors = {G:'#10849b',b:'#de7c32',T:'#8058b1',R:'#47975d',m:'#233d50'};
  const terms = ['G','b','T','R','m'];
  const modes = {standardized:'Mean / own std (μ/σ)',raw:'Raw mean (μ)'};
  const cache = new Map();
  let mode = 'standardized', data, fit, route, series = [], loadId = 0;
  const routeKey = r => JSON.stringify([r.reader,r.writer]);
  const format = v => !Number.isFinite(v) ? '—' : Math.abs(v) < 1e-4 && v !== 0 ? v.toExponential(3) : v.toFixed(4);
  const option = (parent,value,label,disabled=false) => {
    const e = document.createElement('option'); e.value=value; e.textContent=label; e.disabled=disabled; parent.append(e);
  };
  const readJSON = async path => {
    const response = await fetch('./data/'+path);
    if (!response.ok) throw new Error('Could not load '+path);
    return response.json();
  };
  const manifest = await readJSON('trajectory-models.json');
  manifest.models.forEach(m=>option(model,m.id,m.label+(m.data?'':' — not yet included'),!m.data));
  const available = manifest.models.filter(m=>m.data);
  if (!available.length) throw new Error('No trajectory data available');
  document.getElementById('model-availability').textContent='Available trajectory results: '+available.map(m=>m.label).join(', ')+'. Other sizes are marked as not yet included.';
  model.value=available[0].id;
  model.disabled=false;
  function ratio(row,term) {
    return row.std[term]>0 && Number.isFinite(row.mean_over_std[term]) ? row.mean_over_std[term] : NaN;
  }
  function value(row,term) {
    return (mode==='standardized'?ratio(row,term):row.mean[term])*(term==='b'?-1:1);
  }
  const el = (tag,attributes,text) => {
    const e=document.createElementNS('http://www.w3.org/2000/svg',tag);
    Object.entries(attributes).forEach(([k,v])=>e.setAttribute(k,String(v)));
    if(text!==undefined)e.textContent=text;
    svg.append(e); return e;
  };
  function draw() {
    const selected=Number(checkpoint.value), row=series.find(r=>r.step===selected);
    if (!row) return;
    body.replaceChildren();
    for(const term of terms) {
      const tr=document.createElement('tr'), th=document.createElement('th'); th.scope='row'; th.textContent=term; tr.append(th);
      [row.mean[term],row.std[term],ratio(row,term),row.query_equal_mean?.[term]].forEach(v=>{
        const td=document.createElement('td');td.textContent=format(v);tr.append(td);
      });body.append(tr);
    }
    const config=manifest.models.find(m=>m.id===model.value);
    const outcome=fit?.rows.find(r=>r.reader===route.reader&&(!r.writer||r.writer===route.writer)&&r.step===selected);
    const operatorName=operator.value==='C'?'complete C':'H⁺';
    meta.textContent=config.label+' · '+route.reader+' ← '+route.writer+' · step '+selected.toLocaleString('en-US')+(outcome?' · native route-removal attention decrease '+outcome.drop_pp.toFixed(3)+' pp':'')+'.';
    svg.replaceChildren();
    svg.setAttribute('aria-label',config.label+', '+route.reader+' with Writer '+route.writer+', '+operatorName+': '+modes[mode]+', G, minus b, T, R and m across checkpoints');
    el('title',{},config.label+' · '+route.reader+' ← '+route.writer+' · '+operatorName+' · '+modes[mode]);
    const W=960,H=440,left=76,right=25,top=91,bottom=78;
    const values=series.flatMap(r=>terms.map(k=>value(r,k))).filter(Number.isFinite);
    let lo=Math.min(0,...values),hi=Math.max(0,...values); if(lo===hi)hi=lo+1;
    const pad=(hi-lo)*.08;lo-=pad;hi+=pad;
    const x=i=>left+(series.length===1?.5:i/(series.length-1))*(W-left-right);
    const y=v=>top+(hi-v)*(H-top-bottom)/(hi-lo);
    el('text',{x:left,y:25,fill:'#233d50','font-size':16,'font-weight':600},config.label+' · '+route.reader+' ← '+route.writer+' · '+operatorName);
    el('text',{x:W-right,y:25,'text-anchor':'end',fill:'#526770','font-size':13},modes[mode]);
    for(let i=0;i<=4;i++) {
      const v=lo+(hi-lo)*i/4;
      el('line',{x1:left,x2:W-right,y1:y(v),y2:y(v),stroke:'#e0e7ea'});
      el('text',{x:left-10,y:y(v)+4,'text-anchor':'end',fill:'#526770','font-size':12},Number(v.toPrecision(3)).toString());
    }
    el('line',{x1:left,x2:W-right,y1:y(0),y2:y(0),stroke:'#a4b8bf'});
    terms.forEach((k,i)=>{
      let open=false;
      const path=series.map((r,j)=>{
        const v=value(r,k);if(!Number.isFinite(v)){open=false;return '';}
        const segment=(open?'L':'M')+x(j).toFixed(2)+' '+y(v).toFixed(2);open=true;return segment;
      }).join(' ');
      el('path',{'data-term':k,d:path,fill:'none',stroke:colors[k],'stroke-width':k==='m'?2.8:2,'stroke-dasharray':k==='m'?'6 4':'none'});
      el('line',{x1:left+i*112,x2:left+i*112+24,y1:58,y2:58,stroke:colors[k],'stroke-width':2.5,'stroke-dasharray':k==='m'?'6 4':'none'});
      const label=k==='b'?'−b':k;
      el('text',{x:left+i*112+31,y:62,fill:'#263d49','font-size':14},label);
    });
    series.forEach((r,i)=>{
      const xx=x(i),tickY=H-bottom+22;
      el('text',{x:xx,y:tickY,transform:'rotate(45 '+xx+' '+tickY+')','text-anchor':'start',fill:'#526770','font-size':11},r.step<1000?String(r.step):String(r.step/1000)+'k');
    });
    const pos=series.indexOf(row);
    el('line',{x1:x(pos),x2:x(pos),y1:top,y2:H-bottom,stroke:'#617b87','stroke-dasharray':'3 4'});
    terms.forEach(k=>{const v=value(row,k);if(Number.isFinite(v))el('circle',{cx:x(pos),cy:y(v),r:3.5,fill:colors[k]});});
    el('text',{x:(left+W-right)/2,y:H-8,'text-anchor':'middle',fill:'#526770','font-size':12},'Training checkpoint');
    caption.textContent=mode==='standardized'?'Each term uses its own standard deviation at each checkpoint. These standardized curves are not additive.':'Raw comparison-weighted means: μ(m) = μ(G) − μ(b) + μ(T) + μ(R).';
  }
  function selectSeries() {
    route=JSON.parse(head.value);
    route={reader:route[0],writer:route[1]};
    const previous=checkpoint.value;
    series=data.rows.filter(r=>routeKey(r)===head.value&&r.operator===operator.value).sort((a,b)=>a.step-b.step);
    checkpoint.replaceChildren();
    series.forEach(r=>option(checkpoint,String(r.step),r.step.toLocaleString('en-US')));
    checkpoint.value=series.some(r=>String(r.step)===previous)?previous:String(series[series.length-1]?.step);
    checkpoint.disabled=!series.length;
    if (!series.length) {svg.replaceChildren();body.replaceChildren();meta.textContent='No trajectory is available for this route and operator.';return;}
    draw();
  }
  async function loadModel() {
    const request=++loadId, config=manifest.models.find(m=>m.id===model.value);
    meta.textContent='Loading '+config.label+'…';head.disabled=true;checkpoint.disabled=true;
    try {
      if (!cache.has(config.id)) {
        const source=await readJSON(config.data);
        const outcomes=config.reader_scores?await readJSON(config.reader_scores).catch(()=>null):null;
        cache.set(config.id,{source,outcomes});
      }
      if(request!==loadId)return;
      ({source:data,outcomes:fit}=cache.get(config.id));
      const previous=head.value;
      const routes=[...new Map(data.rows.map(r=>[routeKey(r),r])).values()];
      if (!routes.length) throw new Error('Empty model data');
      head.replaceChildren();routes.forEach(r=>option(head,routeKey(r),r.reader+' ← '+r.writer));
      if(routes.some(r=>routeKey(r)===previous))head.value=previous;
      head.disabled=false;
      const ops=new Set(data.rows.map(r=>r.operator));
      Array.from(operator.options).forEach(o=>o.disabled=!ops.has(o.value));
      if(!ops.has(operator.value))operator.value=[...ops][0];
      document.getElementById('trajectory-data-link').href='./data/'+config.data;
      const csvLink=document.getElementById('trajectory-csv-link');
      csvLink.hidden=!config.csv;
      if(config.csv)csvLink.href='./data/'+config.csv;
      selectSeries();
    } catch(error) {
      if(request!==loadId)return;
      svg.replaceChildren();body.replaceChildren();meta.textContent='This model’s trajectory could not be loaded. Please select another model or reload the page.';console.error(error);
    }
  }
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>{
    mode=button.dataset.mode;
    document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    if(series.length&&!head.disabled)draw();
  }));
  model.addEventListener('change',loadModel);
  head.addEventListener('change',selectSeries);
  operator.addEventListener('change',()=>{if(!head.disabled)selectSeries();});
  checkpoint.addEventListener('change',draw);
  await loadModel();
})().catch(error=>{
  const p=document.getElementById('path-metadata');if(p)p.textContent='The trajectory data could not be loaded. Please reload the page.';
  console.error(error);
});
