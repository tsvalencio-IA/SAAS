/**
 * OFICIN-IA V21 — Comissões rastreáveis por O.S. e serviço.
 * Mantém o financeiro legado e acrescenta pagamentos parciais, múltiplos
 * mecânicos por serviço e histórico de recebido/pendente.
 * Powered by thIAguinho Soluções Digitais
 */
(function(){
  'use strict';
  const $id = id => document.getElementById(id);
  const n = v => {
    if (window.JOS?.parseNumberBR) return window.JOS.parseNumberBR(v);
    if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
    let s=String(v??'').trim().replace(/\s|R\$/gi,'');
    if(s.includes(',')&&s.includes('.')) s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
    else if(s.includes(',')) s=s.replace(',','.');
    const x=parseFloat(s); return Number.isFinite(x)?x:0;
  };
  const money=v=>(typeof window.moeda==='function'?window.moeda(n(v)):'R$ '+n(v).toFixed(2).replace('.',','));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const isPaid=f=>['pago','liquidado','baixado','parcial'].includes(norm(f?.status))||!!f?.pagoEm||!!f?.dataPgto;
  const isCanceled=f=>['cancelado','cancelada','compensado'].includes(norm(f?.status))||f?.canceladoPorReemissaoOS===true;
  const finalStatus=o=>/pronto|entregue|concluido|faturado|finalizado/i.test(String(o?.status||''));
  const selectedFunc=()=> (window.J?.equipe||[]).find(f=>String(f.id)===String($id('rhPgtoFunc')?.value||''));
  const vehicleFor=os=>(window.J?.veiculos||[]).find(v=>String(v.id)===String(os?.veiculoId||''))||os?.veiculoSnapshot||{};
  const clientFor=os=>(window.J?.clientes||[]).find(c=>String(c.id)===String(os?.clienteId||''))||{};

  function paymentAllocations(fin){
    if(Array.isArray(fin?.alocacoesComissao)) return fin.alocacoesComissao;
    if(Array.isArray(fin?.itensComissaoPagos)) return fin.itensComissaoPagos;
    return [];
  }

  function paidMapFor(mecId){
    const map=new Map();
    (window.J?.financeiro||[]).filter(f=>f?.isComissao===true&&String(f.mecId||'')===String(mecId||'')&&!isCanceled(f)&&isPaid(f)).forEach(fin=>{
      const allocs=paymentAllocations(fin);
      if(allocs.length){
        allocs.forEach(a=>{
          const key=`${a.osId||fin.osId||''}|${a.servicoKey||a.key||''}`;
          map.set(key,(map.get(key)||0)+n(a.valorPago??a.valor??0));
        });
        return;
      }
      // Compatibilidade: pagamentos antigos com lista de serviços, mas sem rateio explícito.
      const servs=Array.isArray(fin.servicosComissao)?fin.servicosComissao:[];
      let restante=n(fin.valor||0);
      servs.forEach((s,idx)=>{
        if(restante<=0)return;
        const previsto=n(s.valorComissao??s.comissao??0);
        const parcela=previsto>0?Math.min(restante,previsto):0;
        if(parcela>0){
          const key=`${fin.osId||''}|${s.key||`servico-${idx}`}`;
          map.set(key,(map.get(key)||0)+parcela);
          restante-=parcela;
        }
      });
      if(restante>0 && fin.osId){
        const key=`${fin.osId}|pecas`;
        map.set(key,(map.get(key)||0)+restante);
      }
    });
    return map;
  }

  function rowsFor(mec){
    if(!mec)return[];
    const pct=n(mec.comissaoServico??mec.comissao??0);
    const pagos=paidMapFor(mec.id);
    const rows=[];
    (window.J?.os||[]).filter(o=>!/^cancel/i.test(String(o?.status||''))).forEach(os=>{
      const cli=clientFor(os), vei=vehicleFor(os);
      const itens=window.JOS?.buildBudgetItems?window.JOS.buildBudgetItems(os,cli):[];
      const aprovacaoAtiva=window.JOS?.hasApproval?.(os);
      const aprovados=window.JOS?.getApprovedKeys?.(os)||new Set();
      const exec=os.execucaoItens||{};
      const temExecServico=Object.entries(exec).some(([key,val])=>String(key).startsWith('servico-')&&String(val?.status||'').trim());
      const statusExecutado=st=>/^(executado|executado_obs|concluido|finalizado|feito|realizado|trocada)$/i.test(String(st||'').trim());
      itens.filter(it=>it.tipo==='servico').forEach(it=>{
        if(aprovacaoAtiva&&!aprovados.has(it.key))return;
        const reg=exec[it.key]||{};
        if(temExecServico&&!statusExecutado(reg.status))return;
        if(!temExecServico&&!finalStatus(os))return;
        const responsavelId=reg.mecId||reg.responsavelId||it.mecId||it.responsavelId||os.mecId||'';
        const atribuido=String(responsavelId)===String(mec.id)||(os.mecIds||[]).some(id=>String(id)===String(mec.id));
        const previsto=+(n(it.valorFinal||0)*(pct/100)).toFixed(2);
        if(previsto<=0)return;
        const key=`${os.id}|${it.key}`;
        const pago=+(pagos.get(key)||0).toFixed(2);
        const falta=Math.max(0,+(previsto-pago).toFixed(2));
        const responsavel=(window.J?.equipe||[]).find(f=>String(f.id)===String(responsavelId));
        rows.push({
          osId:os.id, servicoKey:it.key, servico:it.desc||'Serviço', placa:vei.placa||os.placa||'',
          veiculo:vei.modelo||vei.veiculo||os.veiculoSnapshot?.modelo||os.veiculo||'', cliente:cli.nome||os.clienteNome||os.cliente||'',
          status:os.status||'', data:os.data||os.createdAt||'', base:n(it.valorFinal||0), percentual:pct,
          previsto,pago,falta,responsavelId,responsavelNome:responsavel?.nome||it.mecNome||'', finalizada:finalStatus(os), atribuido
        });
      });
      const pctPeca=n(mec.comissaoPeca||0);
      const basePecas=itens.filter(it=>it.tipo==='peca'&&(!aprovacaoAtiva||aprovados.has(it.key))).reduce((sum,it)=>sum+n(it.valorFinal||0),0);
      if(basePecas>0&&pctPeca>0&&finalStatus(os)){
        const responsavelId=os.mecId||os.mecIds?.[0]||'';
        const atribuido=String(responsavelId)===String(mec.id)||(os.mecIds||[]).some(id=>String(id)===String(mec.id));
        const previsto=+(basePecas*(pctPeca/100)).toFixed(2), key=`${os.id}|pecas`, pago=+(pagos.get(key)||0).toFixed(2);
        rows.push({osId:os.id,servicoKey:'pecas',servico:'COMISSÃO SOBRE PEÇAS DA O.S.',placa:vei.placa||os.placa||'',veiculo:vei.modelo||os.veiculoSnapshot?.modelo||'',cliente:cli.nome||os.cliente||'',status:os.status||'',data:os.data||os.createdAt||'',base:basePecas,percentual:pctPeca,previsto,pago,falta:Math.max(0,+(previsto-pago).toFixed(2)),responsavelId,responsavelNome:'',finalizada:true,atribuido});
      }
    });
    return rows.sort((a,b)=>String(b.data).localeCompare(String(a.data))||a.placa.localeCompare(b.placa));
  }

  function ensureUI(){
    const modal=$id('modalPgtoRH'); if(!modal)return;
    if($id('boxComissaoDetalhadaV21'))return;
    const body=modal.querySelector('.modal-body'); if(!body)return;
    const box=document.createElement('div');
    box.id='boxComissaoDetalhadaV21'; box.style.display='none';
    box.innerHTML=`
      <div style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px;">
        <div style="font-family:var(--fd);font-weight:800;color:var(--cyan);letter-spacing:1px;margin-bottom:6px;">COMISSÃO POR O.S. E SERVIÇO</div>
        <div style="font-family:var(--fm);font-size:.61rem;color:var(--muted);line-height:1.45;margin-bottom:8px;">Selecione os serviços e informe quanto será pago agora. É possível pagar parcialmente, em datas diferentes, ou pagar o mesmo serviço para outro mecânico.</div>
        <input id="comBuscaV21" class="j-input" type="search" placeholder="Pesquisar O.S., placa, veículo ou serviço..." autocomplete="off" style="margin-bottom:8px;">
        <div id="comResumoV21" style="font-family:var(--fm);font-size:.68rem;color:var(--warn);margin-bottom:8px;"></div>
        <div id="comListaV21" style="display:grid;gap:8px;max-height:48vh;overflow:auto;padding-right:3px;"></div>
      </div>`;
    body.appendChild(box);
    $id('rhPgtoTipo')?.addEventListener('change',toggle);
    $id('rhPgtoFunc')?.addEventListener('change',render);
    $id('comBuscaV21')?.addEventListener('input',render);
    modal.addEventListener('input',e=>{if(e.target?.classList?.contains('com-valor-v21'))updateSummary();});
    modal.addEventListener('change',e=>{if(e.target?.classList?.contains('com-check-v21')){const row=e.target.closest('[data-com-row]');const inp=row?.querySelector('.com-valor-v21');if(inp)inp.disabled=!e.target.checked;updateSummary();}});
  }

  function toggle(){
    ensureUI();
    const show=$id('rhPgtoTipo')?.value==='Pagamento Comissão';
    const box=$id('boxComissaoDetalhadaV21'); if(box)box.style.display=show?'block':'none';
    const val=$id('rhPgtoValor'); if(val){val.readOnly=show;val.title=show?'Valor calculado pelos serviços selecionados.':'';}
    if(show)render();
  }

  function render(){
    ensureUI(); if($id('rhPgtoTipo')?.value!=='Pagamento Comissão')return;
    const mec=selectedFunc(), list=$id('comListaV21'); if(!list)return;
    if(!mec){list.innerHTML='<div style="padding:14px;color:var(--muted);">Selecione o colaborador.</div>';updateSummary();return;}
    const q=norm($id('comBuscaV21')?.value||'');
    const rows=rowsFor(mec).filter(r=>!q||norm([r.osId,r.placa,r.veiculo,r.cliente,r.servico,r.status].join(' ')).includes(q));
    const groups=new Map(); rows.forEach(r=>{if(!groups.has(r.osId))groups.set(r.osId,[]);groups.get(r.osId).push(r);});
    list.innerHTML=Array.from(groups.values()).map(group=>{
      const h=group[0];
      return `<div style="border:1px solid rgba(0,212,255,.20);border-radius:5px;background:rgba(0,212,255,.035);overflow:hidden;">
        <div style="padding:8px 10px;background:rgba(0,0,0,.18);font-family:var(--fm);font-size:.66rem;color:var(--cyan);"><b>O.S. #${esc(String(h.osId).slice(-6).toUpperCase())}</b> · ${esc(h.placa||'SEM PLACA')} · ${esc(h.veiculo||'VEÍCULO')}<br><span style="color:var(--muted)">${esc(h.cliente)} · ${esc(h.status)}</span></div>
        <div style="display:grid;gap:5px;padding:8px;">${group.map(r=>{
          const id=`${r.osId}|${r.servicoKey}`.replace(/[^a-zA-Z0-9_-]/g,'_');
          const disabled=r.falta<=0;
          return `<div data-com-row data-os-id="${esc(r.osId)}" data-key="${esc(r.servicoKey)}" data-servico="${esc(r.servico)}" data-placa="${esc(r.placa)}" data-veiculo="${esc(r.veiculo)}" data-base="${r.base}" data-pct="${r.percentual}" data-previsto="${r.previsto}" data-pago="${r.pago}" style="display:grid;grid-template-columns:24px minmax(210px,1fr) 112px;gap:7px;align-items:center;border:1px solid rgba(255,255,255,.08);border-radius:4px;padding:7px;${disabled?'opacity:.55;':''}">
            <input id="${id}" class="com-check-v21" type="checkbox" ${disabled?'disabled':''} style="width:auto;min-height:0;">
            <label for="${id}" style="font-size:.75rem;line-height:1.35;cursor:pointer;"><b>${esc(r.servico)}</b><br><small style="color:var(--muted)">Comissão prevista ${money(r.previsto)} · já paga ${money(r.pago)} · falta ${money(r.falta)}${r.responsavelNome?` · responsável O.S.: ${esc(r.responsavelNome)}`:''}${!r.atribuido?' · PAGAMENTO EXTRA/DIVIDIDO':''}</small></label>
            <input class="j-input com-valor-v21" type="text" inputmode="decimal" value="${r.falta.toFixed(2).replace('.',',')}" ${disabled?'disabled':''} style="text-align:right;" title="Valor da comissão a pagar agora neste serviço">
          </div>`;
        }).join('')}</div></div>`;
    }).join('')||'<div style="padding:14px;color:var(--muted);text-align:center;">Nenhum serviço localizado para este colaborador.</div>';
    updateSummary();
  }

  function selectedAllocations(){
    return Array.from(document.querySelectorAll('#comListaV21 [data-com-row]')).filter(row=>row.querySelector('.com-check-v21')?.checked).map(row=>({
      osId:row.dataset.osId||'', servicoKey:row.dataset.key||'', servico:row.dataset.servico||'', placa:row.dataset.placa||'', veiculo:row.dataset.veiculo||'',
      baseServico:n(row.dataset.base), percentual:n(row.dataset.pct), valorComissaoPrevista:n(row.dataset.previsto), valorJaPagoAntes:n(row.dataset.pago), valorPago:n(row.querySelector('.com-valor-v21')?.value||0)
    })).filter(a=>a.valorPago>0);
  }

  function updateSummary(){
    const allocs=selectedAllocations(), total=allocs.reduce((s,a)=>s+a.valorPago,0);
    if($id('rhPgtoValor'))$id('rhPgtoValor').value=total?total.toFixed(2):'';
    if($id('comResumoV21'))$id('comResumoV21').textContent=allocs.length?`${allocs.length} serviço(s) selecionado(s) · pagamento agora ${money(total)}`:'Selecione os serviços que serão pagos agora.';
  }

  async function consumePending(batch,mecId,osId,valor,agora,paymentId){
    let restante=valor;
    const pend=(window.J?.financeiro||[]).filter(f=>f?.isComissao===true&&String(f.mecId||'')===String(mecId)&&String(f.osId||'')===String(osId)&&!isCanceled(f)&&!isPaid(f)).sort((a,b)=>String(a.venc||a.createdAt||'').localeCompare(String(b.venc||b.createdAt||'')));
    for(const fin of pend){
      if(restante<=0.001)break;
      const atual=n(fin.valor||0), usar=Math.min(atual,restante), novo=+(atual-usar).toFixed(2);
      const ref=window.db.collection('financeiro').doc(fin.id);
      if(novo<=0.001) batch.update(ref,{status:'Cancelado',valor:0,compensadoPorPagamentoComissao:true,pagamentoComissaoId:paymentId,motivoCancelamento:'Saldo quitado por pagamento detalhado de comissão',updatedAt:agora});
      else batch.update(ref,{valor:novo,totalComissaoJaPago:+n(fin.totalComissaoJaPago||0)+usar,pagamentoComissaoId:paymentId,updatedAt:agora});
      restante-=usar;
    }
  }

  async function saveDetailed(){
    const mec=selectedFunc(); if(!mec){window.toast?.('Selecione o colaborador.','warn');return;}
    const allocs=selectedAllocations(); if(!allocs.length){window.toast?.('Selecione ao menos um serviço e informe o valor pago.','warn');return;}
    for(const a of allocs){
      const restante=Math.max(0,a.valorComissaoPrevista-a.valorJaPagoAntes);
      if(a.valorPago-restante>0.011){window.toast?.(`O valor de ${a.servico} supera o saldo restante (${money(restante)}).`,'warn');return;}
    }
    const agora=new Date().toISOString(), data=$id('rhPgtoData')?.value||agora.slice(0,10), forma=$id('rhPgtoForma')?.value||'PIX', obs=$id('rhPgtoObs')?.value||'';
    const paymentId=window.db.collection('financeiro').doc().id;
    const groups=new Map(); allocs.forEach(a=>{if(!groups.has(a.osId))groups.set(a.osId,[]);groups.get(a.osId).push(a);});
    const batch=window.db.batch(); let totalGeral=0;
    for(const [osId,itens] of groups){
      const total=+itens.reduce((s,a)=>s+a.valorPago,0).toFixed(2); totalGeral+=total;
      const ref=window.db.collection('financeiro').doc();
      const placa=itens[0]?.placa||'', veiculo=itens[0]?.veiculo||'';
      batch.set(ref,{tenantId:window.J.tid,tipo:'Saída',status:'Pago',isComissao:true,isComissaoPagamento:true,categoria:'pagamento_comissao_os_servico',origem:'pagamento_comissao_detalhado',mecId:mec.id,mecNome:mec.nome||'',vinculo:`E_${mec.id}`,osId,placa,veiculo,valor:total,pgto:forma,venc:data,dataPgto:data,pagoEm:agora,pagamentoComissaoId:paymentId,desc:`Pagamento comissão — ${mec.nome} — O.S. ${placa||String(osId).slice(-6)}`,nota:obs,alocacoesComissao:itens,itensComissaoPagos:itens,createdAt:agora,updatedAt:agora});
      const haviaPendente=(window.J?.financeiro||[]).some(f=>f?.isComissao===true&&String(f.mecId||'')===String(mec.id)&&String(f.osId||'')===String(osId)&&!isCanceled(f)&&!isPaid(f));
      await consumePending(batch,mec.id,osId,total,agora,paymentId);
      const residual=+itens.reduce((sum,a)=>sum+Math.max(0,n(a.valorComissaoPrevista)-n(a.valorJaPagoAntes)-n(a.valorPago)),0).toFixed(2);
      if(!haviaPendente&&residual>0.001){
        const pendRef=window.db.collection('financeiro').doc();
        batch.set(pendRef,{tenantId:window.J.tid,tipo:'Saída',status:'Pendente',isComissao:true,categoria:'comissao_os_servico_parcial',origem:'saldo_pagamento_comissao_detalhado',mecId:mec.id,mecNome:mec.nome||'',vinculo:`E_${mec.id}`,osId,placa,veiculo,valor:residual,pgto:'A Combinar',venc:data,desc:`Saldo de comissão — ${mec.nome} — O.S. ${placa||String(osId).slice(-6)}`,servicosComissao:itens.map(a=>({key:a.servicoKey,desc:a.servico,valorComissao:Math.max(0,n(a.valorComissaoPrevista)-n(a.valorJaPagoAntes)-n(a.valorPago))})),createdAt:agora,updatedAt:agora});
      }
    }
    await batch.commit();
    window.toast?.(`✓ Comissão registrada: ${money(totalGeral)} para ${mec.nome}`,'ok');
    if(typeof window.audit==='function')window.audit('RH/EQUIPE',`Pagamento detalhado de comissão ${money(totalGeral)} para ${mec.nome} em ${groups.size} O.S.`);
    window.fecharModal?.('modalPgtoRH');
    window.calcComissoes?.();
  }

  function summaryByFunc(id){
    const all=(window.J?.financeiro||[]).filter(f=>f?.isComissao===true&&String(f.mecId||'')===String(id||'')&&!isCanceled(f));
    return {pendente:all.filter(f=>!isPaid(f)).reduce((s,f)=>s+n(f.valor||0),0),pago:all.filter(isPaid).reduce((s,f)=>s+n(f.valor||0),0),qtdPago:all.filter(isPaid).length};
  }

  function calcCards(){
    const box=$id('boxComissoes'); if(!box)return;
    box.innerHTML=(window.J?.equipe||[]).map(f=>({f,s:summaryByFunc(f.id)})).filter(x=>x.s.pendente>0||x.s.pago>0).map(({f,s})=>`<div class="com-card" style="cursor:pointer;align-items:center;" onclick="window.abrirComissaoColaboradorV21('${esc(f.id)}')"><div><div class="com-nome">${esc(f.nome)}</div><div style="font-family:var(--fm);font-size:.6rem;color:var(--muted)">PAGO ${money(s.pago)} · FALTA ${money(s.pendente)}</div></div><div style="text-align:right"><div class="com-val">${money(s.pendente)}</div><div style="font-family:var(--fm);font-size:.56rem;color:var(--cyan);margin-top:3px;">DETALHAR / PAGAR</div></div></div>`).join('')||'<div style="text-align:center;color:var(--muted);padding:20px;">Sem comissões registradas</div>';
  }

  const oldPrep=window.prepPgtoRH;
  window.prepPgtoRH=function(){if(typeof oldPrep==='function')oldPrep.apply(this,arguments);ensureUI();toggle();};
  const oldSave=window.salvarPgtoRH;
  window.salvarPgtoRH=function(){return $id('rhPgtoTipo')?.value==='Pagamento Comissão'?saveDetailed():(typeof oldSave==='function'?oldSave.apply(this,arguments):undefined);};
  window.calcComissoes=calcCards;
  window.abrirComissaoColaboradorV21=function(id){window.abrirModal?.('modalPgtoRH');window.prepPgtoRH();if($id('rhPgtoFunc'))$id('rhPgtoFunc').value=id;if($id('rhPgtoTipo'))$id('rhPgtoTipo').value='Pagamento Comissão';toggle();render();};

  function boot(){ensureUI();calcCards();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  [500,1200,2500].forEach(ms=>setTimeout(boot,ms));
})();
