'use strict';
(async()=>{
 const model=document.getElementById('model-select'),checkpoint=document.getElementById('checkpoint-select'),head=document.getElementById('head-select'),body=document.querySelector('#margin-table tbody'),meta=document.getElementById('path-metadata'),svg=document.getElementById('trajectory');
 const data=await fetch('./data/full-operator-margins.json').then(r=>{if(!r.ok)throw Error('Could not load data');return r.json()});
 const models=['70M','160M','410M','1B'];const fields=['G','b','T','m'];const colors={G:'#287f86',b:'#a86735',T:'#7766aa',m:'#263d60'};const ns='http://www.w3.org/2000/svg';
 const option=(parent,value,text)=>{const e=document.createElement('option');e.value=value;e.textContent=text;parent.append(e)};
 models.forEach(m=>option(model,m,'Pythia-'+m));data.checkpoint_steps.forEach(s=>option(checkpoint,String(s),s.toLocaleString('en-US')));checkpoint.value='143000';
 const format=v=>v===0?'0':Math.abs(v)<0.0001?v.toExponential(5):Number(v.toPrecision(7)).toString();
 function rebuild(){const old=head.value;head.replaceChildren();option(head,'mean','Model average ('+data.coverage.reported_paths[model.value]+' paths)');data.heads.filter(h=>h.model===model.value).forEach(h=>option(head,h.reader,h.reader+' → '+h.writer));if([...head.options].some(o=>o.value===old))head.value=old;draw()}
 function datum(step){return head.value==='mean'?data.summary.find(r=>r.model===model.value&&r.step===step):data.rows.find(r=>r.model===model.value&&r.step===step&&r.reader===head.value)}
 function el(tag,attrs,text){const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(text!==undefined)e.textContent=text;svg.append(e);return e}
 function draw(){const r=datum(Number(checkpoint.value));body.replaceChildren();
  for(const [key,title] of [['Hplus','Complete H⁺'],['C','Complete C']]){const tr=document.createElement('tr'),th=document.createElement('th');th.scope='row';th.textContent=title;tr.append(th);for(const f of fields){const td=document.createElement('td');td.textContent=r?.[key]?format(r[key][f]):'—';tr.append(td)}body.append(tr)}
  if(head.value==='mean')meta.textContent='Equal average of '+data.coverage.reported_paths[model.value]+' fixed paths. No score normalization; complete positive spectrum and native eigenvalue weights retained.';
  else{const h=data.heads.find(h=>h.model===model.value&&h.reader===head.value);meta.textContent=h.reader+' with Writer '+h.writer+' · endpoint confirmation probe score '+h.probe_score.toFixed(4)+' · complete H⁺ and complete C, without spectral truncation.'}
  svg.replaceChildren();const W=900,H=310,left=66,right=20,top=37,bottom=55,steps=data.checkpoint_steps,series=steps.map(datum),vals=[];
  for(const r of series)for(const op of ['Hplus','C'])if(r?.[op])for(const f of fields)vals.push(f==='b'?-r[op][f]:r[op][f]);let lo=Math.min(0,...vals),hi=Math.max(0,...vals);if(hi===lo)hi=lo+1;const pad=(hi-lo)*.08;lo-=pad;hi+=pad;const x=i=>left+i*(W-left-right)/(steps.length-1),y=v=>top+(hi-v)*(H-top-bottom)/(hi-lo);
  for(let i=0;i<=4;i++){const v=lo+i*(hi-lo)/4;el('line',{x1:left,x2:W-right,y1:y(v),y2:y(v),stroke:'#e0e7ea'});el('text',{x:left-8,y:y(v)+4,'text-anchor':'end',fill:'#52616a','font-size':12},Number(v.toPrecision(3)).toString())}
  el('line',{x1:left,x2:W-right,y1:y(0),y2:y(0),stroke:'#94a4ac'});
  steps.forEach((s,i)=>{if(i%2===0||i===steps.length-1)el('text',{x:x(i),y:H-bottom+22,'text-anchor':'middle',fill:'#52616a','font-size':12},s<1000?s:String(s/1000)+'k')});
  const selected=steps.indexOf(Number(checkpoint.value));el('line',{x1:x(selected),x2:x(selected),y1:top,y2:H-bottom,stroke:'#607682','stroke-dasharray':'3 4'});
  for(const op of ['Hplus','C'])for(const f of fields){let path='',open=false;series.forEach((r,i)=>{if(!r?.[op]){open=false;return}const v=f==='b'?-r[op][f]:r[op][f];path+=(open?' L':' M')+x(i).toFixed(2)+' '+y(v).toFixed(2);open=true});el('path',{d:path,fill:'none',stroke:colors[f],'stroke-width':f==='m'?2.6:1.6,'stroke-dasharray':op==='Hplus'?'6 4':'none'})}
  fields.forEach((f,i)=>{const xx=left+i*116;el('line',{x1:xx,x2:xx+22,y1:15,y2:15,stroke:colors[f],'stroke-width':2.5});el('text',{x:xx+28,y:19,fill:'#263d49','font-size':13},f==='b'?'−b':f)});el('text',{x:W/2,y:H-7,'text-anchor':'middle',fill:'#52616a','font-size':12},'Checkpoint (equally spaced sampled steps)');
 }
 model.addEventListener('change',rebuild);checkpoint.addEventListener('change',draw);head.addEventListener('change',draw);rebuild();
})().catch(e=>{const p=document.getElementById('path-metadata');p.textContent='Data could not be loaded. Please reload this page.';console.error(e)});
