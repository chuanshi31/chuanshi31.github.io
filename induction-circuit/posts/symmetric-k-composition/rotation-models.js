'use strict';
(async () => {
  const model = document.getElementById('rotation-model');
  if (!model) return;
  const route = document.getElementById('rotation-route');
  const meta = document.getElementById('rotation-metadata');
  const link = document.getElementById('rotation-model-data');
  const cards = [...document.querySelectorAll('[data-rotation-model]')];
  const response = await fetch('./data/rotation-models.json?v=20261110-family-frequency');
  if (!response.ok) throw new Error('Rotation model data could not be loaded');
  const data = await response.json();
  const option = (parent,value,label,disabled=false) => {
    const e = document.createElement('option');e.value=value;e.textContent=label;e.disabled=disabled;parent.append(e);
  };
  data.models.forEach(m=>option(model,m.id,m.label+(m.data?'':' — not yet included'),!m.data));
  model.disabled=false;
  function draw() {
    const config = data.models.find(m=>m.id===model.value);
    const selected = config.routes.find(r=>r.id===route.value);
    if (!selected) return;
    cards.forEach(card=>{card.hidden=card.id!==selected.id;card.open=card.id===selected.id;});
    const card=document.getElementById(selected.id);
    meta.textContent=config.label+' · '+(config.checkpoint_label||('step '+config.step.toLocaleString('en-US')))+' · '+selected.reader+' ← '+selected.writer+' · '+card.querySelector('summary span').textContent+' · '+(config.evaluation_label||'2,084 sequences / 150,000 queries.');
    link.href='./data/'+config.data;
  }
  function chooseModel(preferred) {
    const config=data.models.find(m=>m.id===model.value),previous=preferred||route.value;
    route.replaceChildren();config.routes.forEach(r=>option(route,r.id,r.reader+' ← '+r.writer));
    if(config.routes.some(r=>r.id===previous))route.value=previous;
    route.disabled=false;draw();
  }
  function selectHash() {
    const id=decodeURIComponent(location.hash.slice(1));
    const config=data.models.find(m=>m.routes.some(r=>r.id===id));
    if(config){model.value=config.id;chooseModel(id);return true;}
    return false;
  }
  model.addEventListener('change',()=>chooseModel());
  route.addEventListener('change',draw);
  window.addEventListener('hashchange',selectHash);
  if(!selectHash())chooseModel();
})().catch(error=>{
  const p=document.getElementById('rotation-metadata');if(p)p.textContent='The rotation selector could not be loaded; the static route panels remain available below.';
  console.error(error);
});
