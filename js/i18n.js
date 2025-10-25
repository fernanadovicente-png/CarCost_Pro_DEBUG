const I18N={current:'pt',dict:{}};
async function loadLang(code){const sup=['pt','en','fr','es']; if(!sup.includes(code)) code='en'; const r=await fetch(`assets/lang/${code}.json`); I18N.dict=await r.json(); I18N.current=code; applyT();}
function t(k){return I18N.dict[k]||k}
function applyT(){document.querySelectorAll('[data-i18n]').forEach(el=>{const k=el.getAttribute('data-i18n'); el.textContent=t(k);});}
