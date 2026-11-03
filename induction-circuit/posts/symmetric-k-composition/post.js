'use strict';
(async () => {
  const data = await fetch('./data/position-margin-trajectories.json').then(r => {
    if (!r.ok) throw new Error('Could not load position-wise margin data');
    return r.json();
  });
  const fit = await fetch('./data/margin-reader-fit70m.json').then(r => r.json());
  const head = document.getElementById('head-select');
  const checkpoint = document.getElementById('checkpoint-select');
  const operator = document.getElementById('operator-select');
  const body = document.querySelector('#margin-table tbody');
  const svg = document.getElementById('trajectory');
  const meta = document.getElementById('path-metadata');
  const caption = document.getElementById('trajectory-caption');
  const colors = {G:'#10849b',b:'#de7c32',T:'#8058b1',R:'#47975d',m:'#233d50'};
  const labels = {G:'G',b:'−b',T:'T',R:'R',m:'m'};
  const terms = ['G','b','T','R','m'];
  let mode = 'standardized';
  const format = v => !Number.isFinite(v) ? '—' : Math.abs(v) < 1e-4 && v !== 0 ? v.toExponential(3) : v.toFixed(4);
  const option = (parent,value,label) => {
    const e = document.createElement('option'); e.value=value; e.textContent=label; parent.append(e);
  };
  data.heads.forEach(h => option(head,h,h+' ← L2H7'));
  data.steps.forEach(s => option(checkpoint,String(s),s.toLocaleString('en-US')));
  checkpoint.value='143000';
  const datum = step => data.rows.find(r => r.reader===head.value && r.step===step && r.operator===operator.value);
  const el = (tag,attributes,text) => {
    const e=document.createElementNS('http://www.w3.org/2000/svg',tag);
    Object.entries(attributes).forEach(([k,v])=>e.setAttribute(k,String(v)));
    if(text!==undefined)e.textContent=text;
    svg.append(e); return e;
  };
  function draw() {
    const selected=Number(checkpoint.value), row=datum(selected);
    body.replaceChildren();
    for(const term of terms) {
      const tr=document.createElement('tr'), th=document.createElement('th'); th.scope='row'; th.textContent=term; tr.append(th);
      [row.mean[term],row.std[term],row.mean_over_std[term],row.query_equal_mean[term]].forEach(value=>{
        const td=document.createElement('td');td.textContent=format(value);tr.append(td);
      });body.append(tr);
    }
    const outcome=fit.rows.find(r=>r.reader===head.value&&r.step===selected);
    meta.textContent=head.value+' with Writer L2H7 · step '+selected.toLocaleString('en-US')+' · native route-removal Reader score '+(outcome?outcome.drop_pp.toFixed(3):'—')+' pp · '+(operator.value==='C'?'complete C':'complete H⁺')+'.';
    svg.replaceChildren();
    const W=900,H=350,left=66,right=23,top=43,bottom=68;
    const series=data.steps.map(datum);
    const value=(r,k)=>(mode==='standardized'?r.mean_over_std[k]:r.mean[k])*(k==='b'?-1:1);
    const values=series.flatMap(r=>terms.map(k=>value(r,k)));
    let lo=Math.min(0,...values),hi=Math.max(0,...values); if(lo===hi)hi=lo+1;
    const pad=(hi-lo)*.1;lo-=pad;hi+=pad;
    const x=i=>left+i*(W-left-right)/(data.steps.length-1);
    const y=v=>top+(hi-v)*(H-top-bottom)/(hi-lo);
    for(let i=0;i<=4;i++) {
      const v=lo+(hi-lo)*i/4;
      el('line',{x1:left,x2:W-right,y1:y(v),y2:y(v),stroke:'#e0e7ea'});
      el('text',{x:left-10,y:y(v)+4,'text-anchor':'end',fill:'#526770','font-size':12},Number(v.toPrecision(3)).toString());
    }
    el('line',{x1:left,x2:W-right,y1:y(0),y2:y(0),stroke:'#a4b8bf'});
    terms.forEach((k,i)=>{
      const path=series.map((r,j)=>(j?'L':'M')+x(j).toFixed(2)+' '+y(value(r,k)).toFixed(2)).join(' ');
      el('path',{d:path,fill:'none',stroke:colors[k],'stroke-width':k==='m'?2.7:1.8,'stroke-dasharray':k==='m'?'6 4':'none'});
      el('line',{x1:left+i*100,x2:left+i*100+22,y1:17,y2:17,stroke:colors[k],'stroke-width':2.5});
      el('text',{x:left+i*100+28,y:21,fill:'#263d49','font-size':13},labels[k]);
    });
    data.steps.forEach((step,i)=>{
      const xx=x(i);el('text',{x:xx,y:H-bottom+21,transform:'rotate(45 '+xx+' '+(H-bottom+21)+')','text-anchor':'start',fill:'#526770','font-size':10},step<1000?String(step):String(step/1000)+'k');
    });
    const pos=data.steps.indexOf(selected);
    el('line',{x1:x(pos),x2:x(pos),y1:top,y2:H-bottom,stroke:'#617b87','stroke-dasharray':'3 4'});
    el('text',{x:W-20,y:21,'text-anchor':'end',fill:'#526770','font-size':12},mode==='standardized'?'Mean / own standard deviation':'Original score units');
    caption.textContent=mode==='standardized'?'Each term uses its own standard deviation at each checkpoint. These standardized curves are not additive.':'Raw comparison-weighted means. The exact signed identity is μ(m) = μ(G) − μ(b) + μ(T) + μ(R).';
  }
  function setMode(next) {
    mode=next;
    document.querySelectorAll('[data-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.mode===mode)));
    document.querySelectorAll('.trajectory-figure img').forEach(img=>{img.src=img.dataset[mode];});
    draw();
  }
  document.querySelectorAll('[data-mode]').forEach(button=>button.addEventListener('click',()=>setMode(button.dataset.mode)));
  [head,checkpoint,operator].forEach(select=>select.addEventListener('change',draw));
  draw();
})().catch(error=>{
  const p=document.getElementById('path-metadata');if(p)p.textContent='The local data could not be loaded. Please reload the page.';
  console.error(error);
});
