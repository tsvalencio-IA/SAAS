/**
 * thIAguinho SaaS V26.9 — responsividade mobile definitiva e Kardex de estoque.
 * Camada aditiva: preserva Firebase, estoque, notas fiscais, vínculos e regras de negócio.
 * Powered by thIAguinho Soluções Digitais.
 */
(function (W, D) {
  'use strict';
  if (W.__THIA_JARVIS_MOBILE_KARDEX_V269__) return;
  W.__THIA_JARVIS_MOBILE_KARDEX_V269__ = true;

  const VERSION = '26.9.0';
  const byId = id => D.getElementById(id);
  const num = value => {
    const n = Number(String(value == null ? 0 : value).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const esc = value => String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const norm = value => String(value || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const moeda = value => {
    try { return num(value).toLocaleString('pt-BR', { style:'currency', currency:'BRL' }); }
    catch (_) { return `R$ ${num(value).toFixed(2).replace('.', ',')}`; }
  };

  function installCSS() {
    if (byId('jarvisMobileKardexV269CSS')) return;
    const style = D.createElement('style');
    style.id = 'jarvisMobileKardexV269CSS';
    style.textContent = `
      *,*::before,*::after{box-sizing:border-box;}
      html,body{max-width:100%;overflow-x:hidden!important;}
      .content,.section,.j-card,.j-card-body,.j-card-header{min-width:0!important;max-width:100%!important;}
      .j-input,.j-select,input,select,textarea,button{max-width:100%;}

      /* Barra de filtros do inventário */
      #estoqueFiltrosV269{
        display:grid;
        grid-template-columns:minmax(220px,1fr) minmax(170px,230px);
        gap:10px;
        padding:12px;
        border-bottom:1px solid var(--border);
        background:rgba(0,212,255,.025);
      }
      #estoqueFiltrosV269 .ef-v269-field{min-width:0;}
      #estoqueFiltrosV269 label{
        display:block;margin-bottom:5px;font-family:var(--fm);font-size:.58rem;
        letter-spacing:1px;text-transform:uppercase;color:var(--muted);
      }
      #estoqueFiltrosV269 input,#estoqueFiltrosV269 select{
        width:100%!important;min-width:0!important;
      }
      #estoqueResumoV269{
        grid-column:1/-1;font-family:var(--fm);font-size:.64rem;color:var(--muted);
        line-height:1.45;overflow-wrap:anywhere;
      }
      #tbEstoqueBusca{display:none!important;}
      .btn-kardex-v269{border-color:rgba(0,212,255,.48)!important;color:var(--cyan)!important;}
      .kardex-highlight-v269{animation:kardexPulseV269 1.7s ease 2;}
      @keyframes kardexPulseV269{
        0%,100%{box-shadow:0 0 0 0 rgba(0,212,255,0);}
        50%{box-shadow:0 0 0 4px rgba(0,212,255,.25),0 0 28px rgba(0,212,255,.18);}
      }

      /* Novo inventário mobile; o renderer antigo fica preservado, mas oculto. */
      #estoqueMobileV269{display:none;}

      /* Desktop: ações da tabela sempre cabem */
      #tbEstoque td:last-child{white-space:normal!important;}
      #tbEstoque td:last-child .acoes-estoque-v269{
        display:grid;grid-template-columns:repeat(2,minmax(72px,1fr));gap:5px;min-width:150px;
      }
      #tbEstoque td:last-child .acoes-estoque-v269 button{
        width:100%;min-width:0;white-space:normal;line-height:1.15;padding:7px 5px;
      }

      @media(max-width:900px){
        #s-clientes>div,#s-estoque>div{grid-template-columns:1fr!important;width:100%!important;min-width:0!important;}
      }

      @media(max-width:768px){
        body{width:100%!important;}
        .content{padding-left:10px!important;padding-right:10px!important;}
        .section{width:100%!important;overflow-x:hidden!important;}
        .j-card{overflow:hidden!important;}
        .j-card-header{flex-direction:column!important;align-items:stretch!important;gap:10px!important;}
        .j-card-header>.btn-primary,.j-card-header>.btn-success,.j-card-header>.btn-ghost{width:100%!important;min-height:46px;}
        .j-collapse-tools{width:100%!important;grid-template-columns:1fr!important;}

        /* Clientes e veículos viram cards verticais reais. */
        #s-clientes .j-card-body{overflow:hidden!important;padding:0!important;}
        #s-clientes table,#s-clientes tbody{display:block!important;width:100%!important;max-width:100%!important;}
        #s-clientes thead{display:none!important;}
        #tbClientesBusca,#tbVeiculosBusca{display:block!important;padding:10px!important;}
        #tbClientesBusca tr,#tbVeiculosBusca tr,
        #tbClientesBusca td,#tbVeiculosBusca td{display:block!important;width:100%!important;max-width:100%!important;padding:0!important;border:0!important;}
        #buscaClientesCadastro,#buscaVeiculosCadastro{
          width:100%!important;max-width:100%!important;min-width:0!important;font-size:16px!important;
          white-space:normal!important;text-overflow:ellipsis;
        }
        #tbClientes,#tbVeiculos{padding:10px!important;}
        #tbClientes tr,#tbVeiculos tr{
          display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;
          margin:0 0 12px!important;padding:12px!important;border:1px solid var(--border)!important;
          border-radius:10px!important;background:var(--surf2)!important;overflow:hidden!important;
        }
        #tbClientes td,#tbVeiculos td{
          display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;
          padding:8px 0!important;border:0!important;white-space:normal!important;
          overflow-wrap:anywhere!important;word-break:break-word!important;text-align:left!important;
        }
        #tbClientes td::before,#tbVeiculos td::before{
          content:attr(data-label);display:block;margin-bottom:4px;font-family:var(--fm);
          font-size:.56rem;line-height:1.3;color:var(--muted);letter-spacing:1.2px;text-transform:uppercase;
        }
        #tbClientes td:last-child,#tbVeiculos td:last-child{
          display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;
        }
        #tbClientes td:last-child::before,#tbVeiculos td:last-child::before{grid-column:1/-1;}
        #tbClientes td:last-child button,#tbVeiculos td:last-child button{
          width:100%!important;min-width:0!important;min-height:42px!important;margin:0!important;
          white-space:normal!important;overflow-wrap:anywhere!important;
        }
        #tbClientes .pill,#tbVeiculos .pill{max-width:100%;white-space:normal;}
        #tbVeiculos .placa-badge{display:inline-flex;max-width:100%;overflow-wrap:anywhere;}

        /* Fornecedores: nenhum texto ou ação pode sair do card. */
        .j-card-fornecedores,.j-card-fornecedores .j-card-body{overflow:hidden!important;}
        .j-card-fornecedores table,.j-card-fornecedores tbody{
          display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;
        }
        .j-card-fornecedores thead{display:none!important;}
        .j-card-fornecedores #tbFornec{padding:10px!important;}
        .j-card-fornecedores #tbFornec tr{
          display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;
          padding:12px!important;margin:0 0 12px!important;border:1px solid var(--border)!important;
          border-radius:10px!important;background:var(--surf2)!important;overflow:hidden!important;
        }
        .j-card-fornecedores #tbFornec td{
          display:block!important;width:100%!important;max-width:100%!important;min-width:0!important;
          padding:8px 0!important;border:0!important;white-space:normal!important;
          overflow-wrap:anywhere!important;word-break:break-word!important;
        }
        .j-card-fornecedores #tbFornec td::before{
          content:attr(data-label);display:block;margin-bottom:4px;font-family:var(--fm);
          font-size:.56rem;color:var(--muted);letter-spacing:1.1px;text-transform:uppercase;
        }
        .j-card-fornecedores #tbFornec td:last-child{
          display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;
        }
        .j-card-fornecedores #tbFornec td:last-child::before{grid-column:1/-1;}
        .j-card-fornecedores #tbFornec td:last-child button{
          display:flex!important;align-items:center!important;justify-content:center!important;
          width:100%!important;max-width:100%!important;min-width:0!important;min-height:44px!important;
          margin:0!important;padding:8px 5px!important;white-space:normal!important;overflow:hidden!important;
        }

        /* Inventário mobile sem tabela de 760px e sem rolagem lateral. */
        #estoqueFiltrosV269{grid-template-columns:1fr!important;padding:10px!important;}
        #estoqueFiltrosV269 input,#estoqueFiltrosV269 select{font-size:16px!important;min-height:46px;}
        #s-estoque .j-card:first-child .j-card-body{overflow:hidden!important;}
        #s-estoque .j-card:first-child .j-card-body>.j-table{display:none!important;}
        #estoqueMobileCardsFix{display:none!important;}
        #estoqueMobileV269{display:block!important;padding:10px!important;}
        #estoqueMobileV269 .em-v269-head{
          display:flex;flex-wrap:wrap;justify-content:space-between;gap:6px;margin-bottom:10px;
          font-family:var(--fm);font-size:.64rem;color:var(--muted);text-transform:uppercase;
        }
        #estoqueMobileV269 .em-v269-list{display:grid;grid-template-columns:1fr;gap:12px;}
        #estoqueMobileV269 .em-v269-card{
          width:100%;max-width:100%;min-width:0;border:1px solid var(--border);border-radius:14px;
          padding:14px;background:var(--surf2);overflow:hidden;
        }
        #estoqueMobileV269 .em-v269-code{font-family:var(--fm);font-size:.7rem;color:var(--muted);overflow-wrap:anywhere;}
        #estoqueMobileV269 .em-v269-title{font-weight:800;font-size:1rem;line-height:1.25;margin-top:5px;overflow-wrap:anywhere;word-break:break-word;}
        #estoqueMobileV269 .em-v269-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px;}
        #estoqueMobileV269 .em-v269-field{min-width:0;}
        #estoqueMobileV269 .em-v269-k{font-family:var(--fm);font-size:.56rem;color:var(--muted);text-transform:uppercase;letter-spacing:.8px;}
        #estoqueMobileV269 .em-v269-v{font-family:var(--fm);font-size:.76rem;font-weight:700;margin-top:3px;overflow-wrap:anywhere;word-break:break-word;}
        #estoqueMobileV269 .em-v269-status{display:inline-flex;margin-top:12px;padding:5px 9px;border-radius:999px;font-family:var(--fm);font-size:.62rem;font-weight:800;border:1px solid var(--border);}
        #estoqueMobileV269 .em-v269-status.zero,#estoqueMobileV269 .em-v269-status.critical{color:var(--danger);border-color:rgba(255,59,59,.45);}
        #estoqueMobileV269 .em-v269-status.stock{color:var(--success);border-color:rgba(0,255,136,.35);}
        #estoqueMobileV269 .em-v269-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px;}
        #estoqueMobileV269 .em-v269-actions button{width:100%!important;min-width:0!important;min-height:46px!important;white-space:normal!important;line-height:1.2;}
      }

      @media(max-width:420px){
        #tbClientes td:last-child,#tbVeiculos td:last-child,
        .j-card-fornecedores #tbFornec td:last-child,
        #estoqueMobileV269 .em-v269-actions{grid-template-columns:1fr!important;}
        #estoqueMobileV269 .em-v269-grid{grid-template-columns:1fr!important;}
      }
    `;
    D.head.appendChild(style);
  }

  function labelRows(tbodyId, labels) {
    const tbody = byId(tbodyId);
    if (!tbody) return;
    Array.from(tbody.rows || []).forEach(row => {
      Array.from(row.cells || []).forEach((cell, index) => {
        if (!cell.hasAttribute('colspan')) cell.dataset.label = labels[index] || `Campo ${index + 1}`;
      });
    });
  }

  function labelAllResponsiveRows() {
    labelRows('tbClientes', ['Nome / acesso', 'WhatsApp', 'Veículos', 'Ações']);
    labelRows('tbVeiculos', ['Placa', 'Tipo', 'Modelo', 'Dono', 'KM', 'Ações']);
    labelRows('tbFornec', ['Razão social', 'Documento / contato', 'Endereço', 'Ações']);
  }

  function stockCode(p) {
    return p?.codigo || p?.codigoFornecedor || p?.codigoComercial || p?.oem || p?.ean || '';
  }

  function stockText(p) {
    return norm([
      p?.codigo,p?.codigoFornecedor,p?.codigoComercial,p?.oem,p?.ean,
      p?.desc,p?.descricao,p?.marca,p?.fornecedor,p?.fornecedorNome,p?.nomeFornecedor,
      p?.ultimaFornecedor,p?.ultimaNF,p?.nfNumero,p?.notaFiscal,p?.ncm,p?.cfop
    ].filter(Boolean).join(' '));
  }

  function stockStatus(p) {
    const qtd = num(p?.qtd ?? p?.quantidade ?? p?.saldo ?? 0);
    const min = num(p?.min ?? p?.minimo ?? 0);
    if (qtd === 0) return 'zero';
    if (qtd <= min) return 'critical';
    return 'stock';
  }

  function currentStockFilters() {
    return {
      q:norm(byId('estoqueBuscaV269')?.value || W._estoqueBuscaPecas || ''),
      status:byId('estoqueStatusV269')?.value || 'all'
    };
  }

  function filteredStockList(source) {
    const filters = currentStockFilters();
    return (Array.isArray(source) ? source : []).filter(p => {
      if (filters.q && !stockText(p).includes(filters.q)) return false;
      const st = stockStatus(p);
      const qtd = num(p?.qtd ?? p?.quantidade ?? p?.saldo ?? 0);
      if (filters.status === 'stock' && qtd <= 0) return false;
      if (filters.status === 'zero' && qtd !== 0) return false;
      if (filters.status === 'critical' && !['critical','zero'].includes(st)) return false;
      return true;
    });
  }

  function ensureStockFilters() {
    const tbody = byId('tbEstoque');
    const body = tbody?.closest('.j-card-body');
    const table = tbody?.closest('table');
    if (!tbody || !body || !table) return false;

    let toolbar = byId('estoqueFiltrosV269');
    if (!toolbar) {
      toolbar = D.createElement('div');
      toolbar.id = 'estoqueFiltrosV269';
      toolbar.innerHTML = `
        <div class="ef-v269-field">
          <label for="estoqueBuscaV269">Pesquisar peça</label>
          <input class="j-input" id="estoqueBuscaV269" type="search"
            placeholder="Código, descrição, marca, fornecedor ou NF..." autocomplete="off">
        </div>
        <div class="ef-v269-field">
          <label for="estoqueStatusV269">Situação do saldo</label>
          <select class="j-select" id="estoqueStatusV269">
            <option value="all">Todas as peças</option>
            <option value="stock">Em estoque</option>
            <option value="zero">Zeradas</option>
            <option value="critical">Críticas / abaixo do mínimo</option>
          </select>
        </div>
        <div id="estoqueResumoV269">Aguardando estoque...</div>`;
      body.insertBefore(toolbar, table);
      const oldSearch = byId('buscaEstoquePecas');
      if (oldSearch?.value) byId('estoqueBuscaV269').value = oldSearch.value;
      byId('estoqueBuscaV269')?.addEventListener('input', () => {
        W._estoqueBuscaPecas = byId('estoqueBuscaV269').value;
        renderStockV269();
      });
      byId('estoqueStatusV269')?.addEventListener('change', renderStockV269);
    }

    let mobile = byId('estoqueMobileV269');
    if (!mobile) {
      mobile = D.createElement('div');
      mobile.id = 'estoqueMobileV269';
      body.insertBefore(mobile, table);
    }
    return true;
  }

  function supplierName(p) {
    return p?.fornecedor || p?.fornecedorNome || p?.nomeFornecedor || p?.ultimaFornecedor || '-';
  }

  function nfName(p) {
    return p?.nfNumero || p?.notaFiscal || p?.ultimaNF || p?.nf || '-';
  }

  function renderMobileStock(list, total) {
    const box = byId('estoqueMobileV269');
    if (!box) return;
    const zero = list.filter(p => stockStatus(p) === 'zero').length;
    const critical = list.filter(p => ['zero','critical'].includes(stockStatus(p))).length;
    if (!list.length) {
      box.innerHTML = `<div class="em-v269-head"><span>Peças localizadas</span><span>0 de ${esc(total)}</span></div>
        <div style="padding:10px 2px;color:var(--muted);font-family:var(--fm);font-size:.72rem;">Nenhuma peça corresponde à pesquisa e ao filtro selecionado.</div>`;
      return;
    }
    box.innerHTML = `<div class="em-v269-head"><span>Peças localizadas</span><span>${esc(list.length)} de ${esc(total)} · zeradas ${esc(zero)} · críticas ${esc(critical)}</span></div>
      <div class="em-v269-list">${list.map(p => {
        const qtd = num(p?.qtd ?? p?.quantidade ?? p?.saldo ?? 0);
        const min = num(p?.min ?? p?.minimo ?? 0);
        const st = stockStatus(p);
        const statusLabel = st === 'zero' ? 'ZERADA' : st === 'critical' ? 'CRÍTICA' : 'EM ESTOQUE';
        const id = esc(p?.id || '');
        return `<article class="em-v269-card" data-stock-id="${id}">
          <div class="em-v269-code">Código: ${esc(stockCode(p) || '-')}</div>
          <div class="em-v269-title">${esc(p?.desc || p?.descricao || 'Peça sem descrição')}</div>
          <div class="em-v269-grid">
            <div class="em-v269-field"><div class="em-v269-k">Quantidade</div><div class="em-v269-v">${esc(qtd)}</div></div>
            <div class="em-v269-field"><div class="em-v269-k">Mínimo</div><div class="em-v269-v">${esc(min)}</div></div>
            <div class="em-v269-field"><div class="em-v269-k">Custo</div><div class="em-v269-v">${esc(moeda(p?.custo || p?.valorCompra || p?.precoCusto || 0))}</div></div>
            <div class="em-v269-field"><div class="em-v269-k">Venda</div><div class="em-v269-v">${esc(moeda(p?.venda || p?.precoVenda || 0))}</div></div>
            <div class="em-v269-field"><div class="em-v269-k">Fornecedor</div><div class="em-v269-v">${esc(supplierName(p))}</div></div>
            <div class="em-v269-field"><div class="em-v269-k">Última NF</div><div class="em-v269-v">${esc(nfName(p))}</div></div>
          </div>
          <div class="em-v269-status ${st}">${statusLabel}</div>
          <div class="em-v269-actions">
            <button type="button" class="btn-ghost" onclick="window.prepPeca&&window.prepPeca('edit','${id}');window.abrirModal&&window.abrirModal('modalPeca')">EDITAR PEÇA</button>
            <button type="button" class="btn-ghost btn-kardex-v269" onclick="window.rastrearPecaKardexV269('${id}')">RASTREAR / KARDEX</button>
          </div>
        </article>`;
      }).join('')}</div>`;
  }

  function enhanceDesktopStockRows(list) {
    const tbody = byId('tbEstoque');
    if (!tbody) return;
    const rows = Array.from(tbody.rows || []).filter(row => !row.cells?.[0]?.hasAttribute('colspan'));
    rows.forEach((row, index) => {
      const p = list[index];
      if (!p) return;
      row.dataset.stockId = p.id || '';
      const cell = row.cells[row.cells.length - 1];
      if (!cell) return;
      let actions = cell.querySelector('.acoes-estoque-v269');
      if (!actions) {
        const existing = Array.from(cell.children || []);
        actions = D.createElement('div');
        actions.className = 'acoes-estoque-v269';
        existing.forEach(el => actions.appendChild(el));
        cell.appendChild(actions);
      }
      if (!actions.querySelector('.btn-kardex-v269')) {
        const button = D.createElement('button');
        button.type = 'button';
        button.className = 'btn-ghost btn-kardex-v269';
        button.textContent = 'KARDEX';
        button.title = 'Rastrear compras, notas, aplicações e vínculos desta peça';
        button.addEventListener('click', () => W.rastrearPecaKardexV269(p.id));
        actions.appendChild(button);
      }
    });
  }

  let originalRenderStock = null;
  let rendering = false;

  function renderStockV269() {
    if (rendering) return;
    if (!ensureStockFilters()) return;
    const J = W.J || {};
    const all = Array.isArray(J.estoque) ? J.estoque : [];
    const list = filteredStockList(all);
    const oldInput = byId('buscaEstoquePecas');
    const newInput = byId('estoqueBuscaV269');
    const oldTerm = W._estoqueBuscaPecas;
    const rawSearch = newInput?.value || '';

    rendering = true;
    try {
      if (oldInput) oldInput.value = '';
      W._estoqueBuscaPecas = '';
      if (originalRenderStock) {
        const saved = J.estoque;
        J.estoque = list;
        try { originalRenderStock.call(W); }
        finally { J.estoque = saved; }
      }
      if (oldInput) oldInput.value = rawSearch;
      W._estoqueBuscaPecas = rawSearch;
      renderMobileStock(list, all.length);
      enhanceDesktopStockRows(list);
      const summary = byId('estoqueResumoV269');
      if (summary) {
        const zero = list.filter(p => stockStatus(p) === 'zero').length;
        const positive = list.filter(p => num(p?.qtd) > 0).length;
        const critical = list.filter(p => ['zero','critical'].includes(stockStatus(p))).length;
        summary.textContent = `${list.length} peça(s) localizada(s) de ${all.length} · em estoque ${positive} · zeradas ${zero} · críticas ${critical}`;
      }
    } finally {
      rendering = false;
      if (!rawSearch) W._estoqueBuscaPecas = oldTerm || '';
    }
  }

  function wrapStockRender() {
    const fn = W.renderEstoque;
    if (typeof fn !== 'function') return false;
    if (fn.__thiaV269Stock) return true;
    originalRenderStock = fn;
    const wrapped = function () {
      renderStockV269();
    };
    wrapped.__thiaV269Stock = true;
    wrapped.__original = fn;
    W.renderEstoque = wrapped;
    return true;
  }

  function ensureKardexBanner(p, code) {
    const box = byId('fiscalPecasV266');
    if (!box) return;
    let banner = byId('kardexResumoV269');
    if (!banner) {
      banner = D.createElement('div');
      banner.id = 'kardexResumoV269';
      banner.style.cssText = 'margin:0 0 10px;padding:10px;border:1px solid rgba(0,212,255,.35);border-radius:6px;background:rgba(0,212,255,.06);font-family:var(--fm);font-size:.68rem;line-height:1.55;overflow-wrap:anywhere;';
      const filters = box.querySelector('.fp-v266-filters');
      if (filters) box.insertBefore(banner, filters); else box.insertBefore(banner, box.firstChild);
    }
    const qtd = num(p?.qtd ?? p?.quantidade ?? p?.saldo ?? 0);
    const min = num(p?.min ?? p?.minimo ?? 0);
    const st = stockStatus(p);
    const label = st === 'zero' ? 'ZERADA' : st === 'critical' ? 'CRÍTICA / ABAIXO DO MÍNIMO' : 'EM ESTOQUE';
    banner.innerHTML = `<strong>KARDEX — ${esc(code || 'SEM CÓDIGO')}</strong><br>${esc(p?.desc || p?.descricao || 'Peça sem descrição')}<br>Saldo atual: <strong>${esc(qtd)}</strong> · Mínimo: <strong>${esc(min)}</strong> · Situação: <strong>${label}</strong><br><span style="color:var(--muted)">Abaixo estão as compras, notas fiscais, aplicações, O.S., veículos, devoluções e vínculos encontrados nos dados fiscais carregados.</span>`;
  }

  function openFiscalCardAndSearch(p, attempt) {
    const code = stockCode(p) || p?.desc || p?.descricao || '';
    const search = byId('fiscalPecaBuscaV266');
    const card = byId('fiscalPecasCardV268') || byId('fiscalPecasV266');
    if (!search || !card) {
      if ((attempt || 0) < 24) setTimeout(() => openFiscalCardAndSearch(p, (attempt || 0) + 1), 160);
      return;
    }
    const independentCard = card.closest?.('.j-card') || card;
    if (independentCard.classList?.contains('j-minimized')) {
      independentCard.classList.remove('j-minimized');
      const toggle = independentCard.querySelector('.j-collapse-toggle');
      if (toggle) {
        toggle.textContent = '−';
        toggle.setAttribute('aria-expanded', 'true');
      }
    }
    ['fiscalPecaDestinoV266','fiscalPecaStatusV266','fiscalPecaInicioV266','fiscalPecaFimV266'].forEach(id => {
      const el = byId(id); if (el) el.value = '';
    });
    search.value = code;
    ensureKardexBanner(p, code);
    search.dispatchEvent(new Event('input', { bubbles:true }));
    W.renderFiscalPecasV266?.();
    independentCard.classList.add('kardex-highlight-v269');
    independentCard.scrollIntoView({ behavior:'smooth', block:'start', inline:'nearest' });
    setTimeout(() => {
      independentCard.classList.remove('kardex-highlight-v269');
      try { search.focus({ preventScroll:true }); } catch (_) { search.focus?.(); }
    }, 2800);
  }

  W.rastrearPecaKardexV269 = function (id) {
    const p = (W.J?.estoque || []).find(item => String(item.id) === String(id));
    if (!p) {
      W.toast?.('Peça não localizada no estoque carregado.', 'warn');
      return;
    }
    try { W.ir?.('estoque'); } catch (_) {}
    setTimeout(() => openFiscalCardAndSearch(p, 0), 80);
  };

  function observeTables() {
    ['tbClientes','tbVeiculos','tbFornec'].forEach(id => {
      const el = byId(id);
      if (!el || el.dataset.thiaV269Observed === '1') return;
      el.dataset.thiaV269Observed = '1';
      new MutationObserver(labelAllResponsiveRows).observe(el, { childList:true, subtree:true });
    });
  }

  function boot() {
    installCSS();
    labelAllResponsiveRows();
    observeTables();
    wrapStockRender();
    ensureStockFilters();
    renderStockV269();
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot, { once:true });
  else boot();
  [100,300,700,1400,2800,5200,9000].forEach(ms => setTimeout(boot, ms));

  const observer = new MutationObserver(mutations => {
    let relabel = false;
    let stock = false;
    for (const mutation of mutations) {
      if (mutation.type !== 'childList' || !mutation.addedNodes.length) continue;
      const target = mutation.target;
      if (target?.id === 'tbClientes' || target?.id === 'tbVeiculos' || target?.id === 'tbFornec') relabel = true;
      if (target?.id === 'tbEstoque') stock = true;
    }
    if (relabel) labelAllResponsiveRows();
    if (stock && !rendering) {
      const all = W.J?.estoque || [];
      const list = filteredStockList(all);
      renderMobileStock(list, all.length);
      enhanceDesktopStockRows(list);
    }
  });
  observer.observe(D.documentElement, { childList:true, subtree:true });

  W.addEventListener('resize', () => {
    labelAllResponsiveRows();
    renderStockV269();
  });
  W.addEventListener('orientationchange', () => setTimeout(boot, 250));

  W.thiaRenderEstoqueV269 = renderStockV269;
  console.info('[OFICIN-IA] Responsividade e Kardex V' + VERSION + ' instalados');
})(window, document);
