/** OFICIN-IA V21 — proteção complementar da visão do mecânico. */
(function(){
  'use strict';
  function role(){return String(window.J?.role||'').toLowerCase();}
  function gestor(){return ['gerente','gestor','admin','superadmin','dono'].includes(role());}
  function own(os){
    if(gestor()) return true;
    const id=String(window.J?.fid||''); if(!id)return false;
    if(String(os?.mecId||'')===id)return true;
    if((os?.mecIds||[]).some(x=>String(x)===id))return true;
    if((os?.mecanicos||[]).some(x=>String(x?.id||x?.mecId||'')===id))return true;
    return (os?.servicos||[]).some(s=>String(s?.mecId||s?.mecanicoId||s?.responsavelId||'')===id);
  }
  window.equipePodeConsultarOSV21=own;
  function boot(){
    const label=document.querySelector('#kpiComissao .mec-kpi-label');
    if(label)label.textContent='COMISSÕES RECEBIDAS';
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
