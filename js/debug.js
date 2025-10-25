(function(){
  const box=document.createElement('div'); box.id='debugBox';
  box.innerHTML='<h4>DEBUG</h4><pre id="dbgpre">(sem erros)</pre>'; document.body.appendChild(box);
  const btn=document.createElement('button'); btn.id='debugToggle'; btn.innerText='Ver debug'; btn.onclick=()=>{box.style.display= box.style.display==='none' ? 'block' : 'none';};
  document.body.appendChild(btn);
  function show(msg){ const p=document.getElementById('dbgpre'); box.style.display='block'; p.textContent=String(msg); }
  window.debugLog = function(){ show([].slice.call(arguments).join(' ')); }
  window.addEventListener('error', e=>{ show('JS ERROR: '+(e.message||e)); });
  window.addEventListener('unhandledrejection', e=>{ show('PROMISE ERROR: '+(e.reason && (e.reason.stack||e.reason.message||e.reason)) ); });
})();