const SKEY='carcost_pro_debug_state';
const state = JSON.parse(localStorage.getItem(SKEY) || '{}');
const $=id=>document.getElementById(id);
function save(){ localStorage.setItem(SKEY, JSON.stringify(state)); renderAll(); }

function init(){
  try{
    state.cfg=state.cfg||{moeda:'EUR',tema:'dark',lang:(navigator.language||'pt').slice(0,2)};
    if(!['pt','en','fr','es'].includes(state.cfg.lang)) state.cfg.lang='pt';
    state.fixos=state.fixos||{seguro:900,iuc:180,leasing:250,parque:50,inspec:120,outros:20};
    state.daily=state.daily||[];
    state.fuels=state.fuels||[];
    state.kmManual=state.kmManual||{week:null,month:null,year:null};
  }catch(e){ debugLog('init', e); }
}
init();

function fmt(n){ if(Number.isNaN(n)||!isFinite(n)) return '—';
  try{ return new Intl.NumberFormat(undefined,{style:'currency',currency:state.cfg.moeda}).format(n); }
  catch(e){ return (n||0).toFixed(2)+' '+state.cfg.moeda; }}

function fixosMensal(){ const f=state.fixos||{};
  return (f.seguro||0)/12 + (f.iuc||0)/12 + (f.leasing||0) + (f.parque||0) + (f.inspec||0)/12 + (f.outros||0); }

function periodDates(p){ const now=new Date();
  if(p==='week'){const end=new Date(now); const start=new Date(now); start.setDate(end.getDate()-6); return {start,end};}
  if(p==='year'){ return {start:new Date(now.getFullYear(),0,1), end:new Date(now.getFullYear(),11,31)}; }
  return {start:new Date(now.getFullYear(),now.getMonth(),1), end:new Date(now.getFullYear(),now.getMonth()+1,0)}; }

function inRange(d,s,e){ const x=new Date(d); x.setHours(0,0,0,0); return x>=s && x<=e; }

function sumDaily(p){ const {start,end}=periodDates(p);
  return state.daily.filter(e=>inRange(e.date,start,end)).reduce((s,e)=>s+(+e.tolls||0)+(+e.parking||0)+(+e.other||0),0); }

function sumFuels(p){ const {start,end}=periodDates(p);
  return state.fuels.filter(e=>inRange(e.date,start,end)).reduce((s,e)=>s+(+e.amount||0)+(+e.extras||0),0); }

function kmFromFuels(p){ const {start,end}=periodDates(p);
  const arr=state.fuels.filter(e=>inRange(e.date,start,end)).map(e=>+e.odo).filter(Boolean).sort((a,b)=>a-b);
  if(arr.length>=2) return arr[arr.length-1]-arr[0]; return null; }

function periodTotals(p){
  const daily=sumDaily(p), fuels=sumFuels(p), fm=fixosMensal();
  const fixo=(p==='week')?fm/4.33:(p==='year'?fm*12:fm);
  const total=daily+fuels+fixo;
  let km=kmFromFuels(p);
  if(!km && state.kmManual && state.kmManual[p]) km=+state.kmManual[p];
  const costKm = km? total/km : NaN;
  return {total,daily,fuels,fixo,km,costKm};
}

function fuelCostKmLast(){
  if(state.fuels.length<2) return NaN;
  const a=[...state.fuels].sort((A,B)=>new Date(A.date)-new Date(B.date));
  const last=a[a.length-1], prev=a[a.length-2];
  const km=(+last.odo||0)-(+prev.odo||0);
  const spent=(+last.amount||0)+(+last.extras||0);
  if(km<=0) return NaN; return spent/km;
}

function fuelCostKmAvg(){
  const a=[...state.fuels].sort((A,B)=>new Date(A.date)-new Date(B.date));
  if(a.length<2) return NaN; let tk=0, ts=0;
  for(let i=1;i<a.length;i++){ const km=(+a[i].odo||0)-(+a[i-1].odo||0);
    const spent=(+a[i].amount||0)+(+a[i].extras||0);
    if(km>0){ tk+=km; ts+=spent; } }
  return tk>0? ts/tk : NaN;
}

function renderDashboard(){
  try{
    const p=document.querySelector('input[name="period"]:checked')?.value||'month';
    const X=periodTotals(p);
    document.getElementById('kpiMensal').textContent=fmt(periodTotals('month').total);
    document.getElementById('kpiAnual').textContent=fmt(periodTotals('year').total);
    document.getElementById('kpiCustoKm').textContent=isNaN(X.costKm)?'—':(fmt(X.costKm)+' / km');
    document.getElementById('kpiFuelLast').textContent=isNaN(fuelCostKmLast())?'—':(fmt(fuelCostKmLast())+' / km');
    const canvas=document.getElementById('pieCanvas');
    drawPie(canvas,[X.fixo,X.fuels,X.daily],['Fixos','Combustível','Dia-a-dia']);
    const ul=document.getElementById('resumoLista'); ul.innerHTML='';
    [['Fixos',X.fixo],['Combustível',X.fuels],['Dia-a-dia',X.daily],['Total',X.total],['Km período',X.km||0]].forEach(([k,v])=>{
      const li=document.createElement('li'); li.innerHTML=`<span class="small">${k}:</span> <strong>${k==='Km período'? v : fmt(v)}</strong>`; ul.appendChild(li);
    });
  }catch(e){ debugLog('renderDashboard', e.message); }
}

function addDaily(){
  try{
    const e={date: $('dDate').value || new Date().toISOString().slice(0,10),
      tolls:+$('dTolls').value||0, parking:+$('dParking').value||0, other:+$('dOther').value||0, notes:$('dNotes').value||''};
    state.daily.push(e); save(); renderDailyList();
  }catch(e){ debugLog('addDaily', e.message); }
}

function renderDailyList(){
  try{
    const list=$('dailyList'); list.innerHTML='';
    const a=[...state.daily].sort((A,B)=>new Date(B.date)-new Date(A.date)).slice(0,50);
    a.forEach(e=>{
      const total=(+e.tolls)+(+e.parking)+(+e.other);
      const div=document.createElement('div'); div.className='card';
      div.innerHTML=`<div class="row" style="grid-template-columns:repeat(5,1fr)">
      <div><div class="label">Data</div><div class="value">${e.date}</div></div>
      <div><div class="label">Portagens</div><div class="value">${fmt(e.tolls)}</div></div>
      <div><div class="label">Parque</div><div class="value">${fmt(e.parking)}</div></div>
      <div><div class="label">Outros</div><div class="value">${fmt(e.other)}</div></div>
      <div><div class="label">Total</div><div class="value">${fmt(total)}</div></div></div>`;
      list.appendChild(div);
    });
  }catch(e){ debugLog('renderDailyList', e.message); }
}

function addFuel(){
  try{
    const e={date:$('fDate').value||new Date().toISOString().slice(0,10), odo:+$('fOdo').value||0,
      amount:+$('fAmount').value||0, liters:+$('fLiters').value||0, extras:+$('fExtras').value||0, notes:$('fNotes').value||''};
    state.fuels.push(e); save(); renderFuelList();
  }catch(e){ debugLog('addFuel', e.message); }
}

function renderFuelList(){
  try{
    const list=$('fuelList'); list.innerHTML='';
    const a=[...state.fuels].sort((A,B)=>new Date(B.date)-new Date(A.date)).slice(0,50);
    a.forEach(e=>{
      const div=document.createElement('div'); div.className='card';
      div.innerHTML=`<div class="row" style="grid-template-columns:repeat(6,1fr)">
      <div><div class="label">Data</div><div class="value">${e.date}</div></div>
      <div><div class="label">Odómetro</div><div class="value">${(e.odo||'—')}</div></div>
      <div><div class="label">€ abastecido</div><div class="value">${fmt(e.amount)}</div></div>
      <div><div class="label">Litros</div><div class="value">${(e.liters||'—')}</div></div>
      <div><div class="label">Extras</div><div class="value">${fmt(e.extras||0)}</div></div>
      <div><div class="label">Notas</div><div class="value">${e.notes||''}</div></div></div>`;
      list.appendChild(div);
    });
  }catch(e){ debugLog('renderFuelList', e.message); }
}

function renderFixos(){
  try{
    const f=state.fixos;
    $('fxSeguro').value=f.seguro; $('fxIuc').value=f.iuc; $('fxLeasing').value=f.leasing;
    $('fxParque').value=f.parque; $('fxInspec').value=f.inspec; $('fxOutros').value=f.outros;
  }catch(e){ debugLog('renderFixos', e.message); }
}

function saveFixos(){
  try{
    state.fixos={seguro:+$('fxSeguro').value||0,iuc:+$('fxIuc').value||0,leasing:+$('fxLeasing').value||0,parque:+$('fxParque').value||0,inspec:+$('fxInspec').value||0,outros:+$('fxOutros').value||0};
    save();
  }catch(e){ debugLog('saveFixos', e.message); }
}

async function applyConfig(){
  try{
    document.documentElement.classList.toggle('light', state.cfg.tema==='light');
    $('cfgMoeda').value=state.cfg.moeda; $('cfgTema').value=state.cfg.tema; $('cfgLang').value=state.cfg.lang;
    await loadLang(state.cfg.lang); applyT(); renderAll();
  }catch(e){ debugLog('applyConfig', e.message); }
}

function saveCfg(){ try{ state.cfg.moeda=$('cfgMoeda').value; state.cfg.tema=$('cfgTema').value; state.cfg.lang=$('cfgLang').value; save(); applyConfig(); } catch(e){ debugLog('saveCfg', e.message);} }

function switchTab(id){
  try{
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
    document.querySelector(`.tab[data-tab="${id}"]`).classList.add('active');
    document.querySelectorAll('section[data-tab]').forEach(s=>s.style.display='none');
    document.querySelector(`section[data-tab="${id}"]`).style.display='block';
    if(id==='dashboard') renderDashboard();
    if(id==='daily') renderDailyList();
    if(id==='fuels') renderFuelList();
    if(id==='fixos') renderFixos();
  }catch(e){ debugLog('switchTab', e.message); }
}

function renderAll(){ const tab=document.querySelector('.tab.active')?.dataset.tab; if(tab){ switchTab(tab); } }

document.addEventListener('DOMContentLoaded', async ()=>{
  try{
    await applyConfig(); switchTab('dashboard');
    document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>switchTab(btn.dataset.tab)));
    document.getElementsByName('period').forEach(r=>r.addEventListener('change',renderDashboard));
    $('addDaily').onclick=addDaily; $('addFuel').onclick=addFuel; $('saveFixos').onclick=saveFixos; $('saveCfg').onclick=saveCfg;
    $('resetBtn').onclick=()=>{ if(confirm('Apagar todos os dados guardados?')){ localStorage.removeItem(SKEY); location.reload(); } };
  }catch(e){ debugLog('DOMContentLoaded', e.message); }
});
