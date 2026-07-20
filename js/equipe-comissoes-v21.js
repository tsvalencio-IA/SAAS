/** OFICIN-IA V22 — proteção da visão do mecânico por serviço e rateio interno. */
(function(){
  'use strict';
  function role(){return String(window.J?.role||'').toLowerCase();}
  function gestor(){return ['gerente','gestor','admin','superadmin','dono'].includes(role());}
  function rateios(s){return Array.isArray(s?.rateiosComissao)?s.rateiosComissao:[];}
  function serviceOwn(s,id,os){
    const r=rateios(s);
    if(r.length)return r.some(x=>String(x?.mecId||x?.id||'')===String(id||''));
    const sid=String(s?.mecId||s?.mecanicoId||s?.responsavelId||'');
    if(sid)return sid===String(id||'');
    return String(os?.mecId||'')===String(id||'');
  }
  function own(os){
    if(gestor())return true;
    const id=String(window.J?.fid||'');if(!id)return false;
    const servs=Array.isArray(os?.servicos)?os.servicos:[];
    const temAtribuicao=servs.some(s=>rateios(s).length||s?.mecId||s?.mecanicoId||s?.responsavelId);
    if(temAtribuicao)return servs.some(s=>serviceOwn(s,id,os));
    if(String(os?.mecId||'')===id)return true;
    return (os?.mecIds||[]).some(x=>String(x)===id)||(os?.mecanicos||[]).some(x=>String(x?.id||x?.mecId||'')===id);
  }
  window.equipeServicoPertenceAoUsuarioV22=function(s,os){return gestor()||serviceOwn(s,String(window.J?.fid||''),os||{});};
  window.equipePodeConsultarOSV21=own;
  function boot(){const label=document.querySelector('#kpiComissao .mec-kpi-label');if(label)label.textContent='COMISSÕES RECEBIDAS';}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
