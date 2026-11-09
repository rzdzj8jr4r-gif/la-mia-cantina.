const DB_NAME='la-mia-cantina-db', STORE_NAME='wines'; 
let db=null, currentView='cellar', photoData='';
const $=id=>document.getElementById(id);

function initDB(){
  return new Promise((resolve,reject)=>{
    if(db) return resolve(db);
    const req=indexedDB.open(DB_NAME,1);
    req.onupgradeneeded=e=>{let d=e.target.result;if(!d.objectStoreNames.contains(STORE_NAME))d.createObjectStore(STORE_NAME,{keyPath:'id'});};
    req.onsuccess=e=>{db=e.target.result;resolve(db);};
    req.onerror=e=>reject(e.target.error);
  });
}

async function getAllWines(){
  try{
    await initDB();
    return new Promise((resolve)=>{
      const tx=db.transaction(STORE_NAME,'readonly');
      const store=tx.objectStore(STORE_NAME);
      const req=store.getAll();
      req.onsuccess=()=>resolve(req.result||[]);
      req.onerror=()=>resolve([]);
    });
  }catch(err){return [];}
}

async function persistWine(w){
  await initDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE_NAME,'readwrite');
    tx.objectStore(STORE_NAME).put(w);
    tx.oncomplete=resolve;
    tx.onerror=()=>reject(tx.error);
  });
}

async function removeWineDb(id){
  await initDB();
  return new Promise((resolve)=>{
    const tx=db.transaction(STORE_NAME,'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete=resolve;
  });
}

function generateId(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8);}
function escapeHtml(s=''){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]))}
function getAvailable(w){return Math.max(0,Number(w.quantity)||0)}
function getTotalConsumed(w){return (w.tastings||[]).length}

async function updateStats(){
  const wines=await getAllWines();
  if($('statAvailable')) $('statAvailable').textContent = wines.reduce((a,w)=>a+getAvailable(w),0);
  if($('statConsumed')) $('statConsumed').textContent = wines.reduce((a,w)=>a+getTotalConsumed(w),0);
  if($('statWines')) $('statWines').textContent = wines.length;
}

function switchView(v){
  currentView=v;
  const tabs=document.querySelectorAll('.tab');
  tabs.forEach((b, idx)=>{
    const views=['cellar','history','favorites','backup'];
    b.classList.toggle('active', views[idx]===v);
  });
  if($('listView')) $('listView').classList.toggle('hidden', v==='backup');
  if($('backupView')) $('backupView').classList.toggle('hidden', v!=='backup');
  if($('addBtn')) $('addBtn').classList.toggle('hidden', v==='backup');
  render();
}

async function render(){
  await updateStats();
  if(currentView==='backup') return;
  const wines=await getAllWines();
  const q=($('search')?.value||'').toLowerCase();
  const type=$('filterType')?.value||'';
  
  let filtered=wines.filter(w=>(!type||w.type===type)&&(!q||[w.name,w.producer,w.region,w.area,w.grape,w.vintage].join(' ').toLowerCase().includes(q)));
  
  if(currentView==='history'){
    filtered=filtered.filter(w=>getTotalConsumed(w)>0).sort((a,b)=>getLatestDate(b)-getLatestDate(a));
  }else if(currentView==='favorites'){
    filtered=filtered.filter(w=>(w.tastings||[]).some(t=>Number(t.rating)>=8)).sort((a,b)=>getAvgRating(b)-getAvgRating(a));
  }else{
    filtered=filtered.filter(w=>getAvailable(w)>0);
  }
  
  const container=$('cards');
  if(!container) return;
  
  if(filtered.length===0){
    let title='La vostra cantina è pronta per essere riempita';
    let sub='Aggiungete il primo vino con il pulsante qui sotto.';
    if(currentView==='history'){title='Ancora nessuna degustazione';sub='Quando registrerete un vino bevuto o un voto, lo vedrete qui.';}
    else if(currentView==='favorites'){title='Nessun preferito per ora';sub='Assegnate un voto di almeno 8/10 a una degustazione per vederla qui.';}
    container.innerHTML=`<div class="empty"><strong>${title}</strong>${sub}</div>`;
    return;
  }
  
  container.innerHTML=filtered.map(w=>renderCard(w)).join('');
}

function getLatestDate(w){return Math.max(0,...(w.tastings||[]).map(t=>new Date(t.date||0).getTime()))}
function getAvgRating(w){let a=(w.tastings||[]).filter(t=>t.rating).map(t=>+t.rating);return a.length?a.reduce((x,y)=>x+y,0)/a.length:0}

function renderCard(w){
  const n=getAvailable(w), t=getTotalConsumed(w);
  const image=w.photo?`<img class="thumb" src="${w.photo}">`:`<div class="thumb" style="display:grid;place-items:center;font-size:30px">🍷</div>`;
  const isHistory=(currentView==='history');
  const avg=getAvgRating(w);
  
  return `<article class="card">
    <div class="row">
      ${image}
      <div style="min-width:0;flex:1">
        <div class="wine-name">${escapeHtml(w.name)}</div>
        <div class="meta">${escapeHtml([w.producer,w.vintage,w.region,w.area].filter(Boolean).join(' · '))}</div>
        <div class="meta">${escapeHtml([w.type,w.style,w.grape].filter(Boolean).join(' / '))}</div>
        <span class="badge ${n===0?'drunk':''}">${n>0?n+' disponibili':'Nessuna disponibile'} · ${t} bevute</span>
        ${t?`<div class="meta">Voto medio: ${avg.toFixed(1)}/10</div>`:''}
      </div>
    </div>
    <div class="card-actions">
      <button class="secondary" onclick="openDetail('${w.id}')">Scheda e storico</button>
      ${n>0?`<button class="secondary" onclick="openConsume('${w.id}')">🍷 Segna come bevuta</button>`:''}
      ${isHistory&&t>0?`<button class="secondary danger" onclick="quickUndoDrink('${w.id}')">↩ Annulla bevuta</button>`:''}
      <button class="secondary" onclick="openFormEdit('${w.id}')">Modifica</button>
    </div>
  </article>`;
}

function showModal(id){const m=$(id);if(m)m.classList.add('show');}
function closeModal(id){const m=$(id);if(m)m.classList.remove('show');}

function openForm(){
  if($('wineForm')) $('wineForm').reset();
  if($('wineId')) $('wineId').value='';
  if($('formTitle')) $('formTitle').textContent='Aggiungi un vino';
  photoData='';
  const prev=$('preview');
  if(prev){prev.src='';prev.classList.add('hidden');}
  const fields=['name','producer','vintage','type','style','grape','region','area','quantity','price','servingTemp','decanter','servingAdvice','notes'];
  fields.forEach(k=>{if($(k))$(k).value=(k==='quantity'?1:'');});
  showModal('wineModal');
}

async function openFormEdit(id){
  const wines=await getAllWines();
  const w=wines.find(x=>x.id===id);
  if(!w) return;
  if($('wineForm')) $('wineForm').reset();
  if($('wineId')) $('wineId').value=w.id;
  if($('formTitle')) $('formTitle').textContent='Modifica vino';
  photoData=w.photo||'';
  const prev=$('preview');
  if(prev){
    if(photoData){prev.src=photoData;prev.classList.remove('hidden');}
    else{prev.src='';prev.classList.add('hidden');}
  }
  const fields=['name','producer','vintage','type','style','grape','region','area','quantity','price','servingTemp','decanter','servingAdvice','notes'];
  fields.forEach(k=>{if($(k))$(k).value=w[k]??'';});
  showModal('wineModal');
}

function handlePhoto(input){
  const f=input.files[0];
  if(!f) return;
  const reader=new FileReader();
  reader.onload=e=>{
    photoData=e.target.result;
    const prev=$('preview');
    if(prev){prev.src=photoData;prev.classList.remove('hidden');}
  };
  reader.readAsDataURL(f);
}

function copyAiHelper(){
  const name=$('name')?.value.trim()||'';
  const prod=$('producer')?.value.trim()||'';
  const vint=$('vintage')?.value.trim()||'';
  if(!name && !prod){alert('Inserisci almeno il nome o la cantina del vino.');return;}
  const text=`Dammi le specifiche tecniche per questo vino: ${prod} ${name} ${vint?'('+vint+')':''}. Includi temperatura di servizio ideale, se serve il decanter, un consiglio sul momento ideale e note di degustazione.`;
  navigator.clipboard.writeText(text).then(()=>{
    alert('Testo copiato negli appunti! Incollalo in chat per ricevere subito i dati.');
  }).catch(()=>{prompt('Copia questo testo:',text);});
}

async function handleWineSubmit(e){
  e.preventDefault();
  const id=$('wineId')?.value||generateId();
  const wines=await getAllWines();
  const old=wines.find(x=>x.id===id);
  const w={
    id,
    created:old?.created||Date.now(),
    tastings:old?.tastings||[],
    photo:photoData
  };
  const fields=['name','producer','vintage','type','style','grape','region','area','quantity','price','servingTemp','decanter','servingAdvice','notes'];
  fields.forEach(k=>{const el=$(k);if(el)w[k]=el.value.trim();});
  w.quantity=Math.max(0,Number(w.quantity)||0);
  await persistWine(w);
  closeModal('wineModal');
  const photoInput=$('photo');if(photoInput)photoInput.value='';
  render();
}

async function openConsume(id){
  if($('consumeWineId')) $('consumeWineId').value=id;
  if($('drinkDate')) $('drinkDate').value=new Date().toISOString().slice(0,10);
  ['rating','occasion','drinkNotes'].forEach(k=>{if($(k))$(k).value='';});
  showModal('consumeModal');
}

async function handleConsumeSubmit(e){
  e.preventDefault();
  const id=$('consumeWineId')?.value;
  const wines=await getAllWines();
  const w=wines.find(x=>x.id===id);
  if(!w || getAvailable(w)<1){alert('Non risultano bottiglie disponibili.');return;}
  w.quantity=getAvailable(w)-1;
  w.tastings=w.tastings||[];
  w.tastings.push({
    id:generateId(),
    date:$('drinkDate')?.value||'',
    rating:$('rating')?.value||'',
    occasion:$('occasion')?.value||'',
    notes:$('drinkNotes')?.value||''
  });
  await persistWine(w);
  closeModal('consumeModal');
  switchView('history');
}

async function openDetail(id){
  const wines=await getAllWines();
  const w=wines.find(x=>x.id===id);
  if(!w) return;
  const tast=(w.tastings||[]).slice().sort((a,b)=>b.date.localeCompare(a.date));
  const service=[w.servingTemp?`<b>Temp:</b> ${escapeHtml(w.servingTemp)}`:'', w.decanter?`<b>Decanter:</b> ${escapeHtml(w.decanter)}`:'', w.servingAdvice?`<b>Consigli:</b> ${escapeHtml(w.servingAdvice)}`:''].filter(Boolean).join(' · ');
  
  const content=$('detailContent');
  if(!content) return;
  
  content.innerHTML=`
    <div class="wine-name">${escapeHtml(w.name)}</div>
    <p class="meta">${escapeHtml([w.producer,w.vintage,w.type,w.style,w.grape,w.region,w.area].filter(Boolean).join(' · '))}</p>
    <p><b>${getAvailable(w)}</b> bottiglie disponibili · <b>${tast.length}</b> degustazioni · ${getAvgRating(w)?'Voto medio '+getAvgRating(w).toFixed(1)+'/10':''}</p>
    ${w.photo?`<img src="${w.photo}" style="width:110px;max-height:150px;object-fit:cover;border-radius:10px">`:''}
    ${service?`<div class="history-item" style="border-left-color:var(--wine)">${service}</div>`:''}
    <p class="meta">${escapeHtml(w.notes||'Nessuna nota generale.')}</p>
    <h3 style="color:var(--wine)">Storico degustazioni</h3>
    ${tast.length?tast.map((t,idx)=>`<div class="history-item"><b>${escapeHtml(t.date||'Data non indicata')}</b>${t.rating?' · ⭐ '+escapeHtml(t.rating)+'/10':''}<br>${escapeHtml([t.occasion,t.notes].filter(Boolean).join(' — ')||'Nessuna nota')}${idx===0?`<br><button class="secondary danger" style="margin-top:6px;font-size:11px;padding:4px 8px" onclick="removeLastTasting('${w.id}')">↩ Annulla bevuta</button>`:''}</div>`).join(''):'<p class="meta">Non avete ancora registrato degustazioni.</p>'}
    <div class="card-actions" style="margin-top:16px">
      <button class="secondary" onclick="editFromDetail('${w.id}')">Modifica vino</button>
      <button class="secondary danger" onclick="deleteWineCard('${w.id}')">Elimina scheda</button>
    </div>
    <p class="hint">Elimina scheda rimuove definitivamente vino e storico.</p>
  `;
  showModal('detailModal');
}

async function editFromDetail(id){
  closeModal('detailModal');
  openFormEdit(id);
}

async function deleteWineCard(id){
  if(confirm('Eliminare definitivamente questa scheda e tutte le degustazioni?')){
    await removeWineDb(id);
    closeModal('detailModal');
    render();
  }
}

async function removeLastTasting(id){
  if(!confirm('Vuoi annullare l’ultima degustazione registrata? La bottiglia tornerà disponibile.')) return;
  const wines=await getAllWines();
  const w=wines.find(x=>x.id===id);
  if(!w || !w.tastings || w.tastings.length===0) return;
  w.tastings.sort((a,b)=>b.date.localeCompare(a.date));
  w.tastings.shift();
  w.quantity=getAvailable(w)+1;
  await persistWine(w);
  closeModal('detailModal');
  render();
  alert('Degustazione annullata. La bottiglia è tornata disponibile.');
}

async function quickUndoDrink(id){
  if(!confirm('Vuoi annullare l’ultima degustazione e rimettere la bottiglia in cantina?')) return;
  const wines=await getAllWines();
  const w=wines.find(x=>x.id===id);
  if(!w || !w.tastings || w.tastings.length===0) return;
  w.tastings.sort((a,b)=>b.date.localeCompare(a.date));
  w.tastings.shift();
  w.quantity=getAvailable(w)+1;
  await persistWine(w);
  render();
  alert('Degustazione annullata. La bottiglia è tornata disponibile.');
}

async function exportBackup(){
  const wines=await getAllWines();
  const data={app:'La Cantina di Ale & Giada', version:1, exportedAt:new Date().toISOString(), wines};
  const blob=new Blob([JSON.stringify(data)], {type:'application/json'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download='cantina-ale-giada-backup-'+new Date().toISOString().slice(0,10)+'.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importBackup(){
  const input=$('importFile');
  const f=input?.files?.[0];
  if(!f){alert('Seleziona prima un file di backup.');return;}
  if(!confirm('Il ripristino sostituirà tutti i dati presenti su questo dispositivo. Continuare?')) return;
  try{
    const text=await f.text();
    const data=JSON.parse(text);
    if(!Array.isArray(data.wines)) throw new Error('Formato non valido');
    await initDB();
    const tx=db.transaction(STORE_NAME, 'readwrite');
    const store=tx.objectStore(STORE_NAME);
    store.clear();
    data.wines.forEach(w=>store.put(w));
    tx.oncomplete=()=>{
      alert('Backup ripristinato con successo.');
      render();
    };
  }catch(err){
    alert('File di backup non valido o illeggibile.');
  }
}

// Avvio immediato e sicuro
window.addEventListener('DOMContentLoaded', async ()=>{
  try{
    await initDB();
    render();
  }catch(e){console.error(e);}
});

if('serviceWorker' in navigator && location.protocol.startsWith('http')){
  navigator.serviceWorker.register('./sw.js').catch(()=>{});
}
