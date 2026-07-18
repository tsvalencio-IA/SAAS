/**
 * Catálogos técnicos locais para a IA interna.
 * Pesquisa objetiva, carregamento sob demanda e fonte/página verificáveis.
 * Powered by thIAguinho Soluções Digitais
 */
(function () {
  'use strict';

  const W = window;
  const MANIFEST_URL = 'data/catalogos-ia/manifest.json?v=20260718-v18';
  const cache = new Map();
  const pageNormCache = new WeakMap();
  let manifest = null;
  let manifestPromise = null;

  const STOP = new Set([
    'para','com','sem','uma','uns','das','dos','de','da','do','em','no','na','nos','nas',
    'por','que','qual','quais','tem','esta','este','essa','esse','peca','pecas','carro',
    'veiculo','veiculos','catalogo','catalogos','aplicacao','aplicacoes','codigo','codigos',
    'modelo','ano','anos','quero','saber','serve','servem','seria','ser','consulte','consultar','consulta','procure','procurar','busque','buscar','informe','informar','verifique','verificar','fabricante','marca'
  ]);
  const GENERICOS = new Set([
    'sensor','nivel','combustivel','bomba','valvula','temperatura','detonacao','pressao',
    'pastilha','sapata','freio','kit','reparo','motor','terminal','bucha','rolamento',
    'correia','tensor','polia','bico','injetor','filtro','chicote','interruptor'
  ]);
  const PREFIXOS = {
    ds: 'ds-2025', dni: 'dni', dpl: 'dpl', brk: 'brk', aje: 'aje', jurid: 'jurid',
    nytron: 'nytron', ranalle: 'ranalle', wahler: 'wahler', ete: 'rainha-sete', rainha: 'rainha-sete'
  };

  function norm(v) {
    return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase().replace(/[^a-z0-9./+\-\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  function compact(v) { return norm(v).replace(/[^a-z0-9]/g, ''); }
  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function tokens(v) {
    return [...new Set(norm(v).split(/\s+/).filter(t => t.length >= 3 && !STOP.has(t)))];
  }
  function codeTokens(v) {
    const textoNorm = norm(v);
    const codigoExplicito = /\b(codigo|cod|referencia|ref|oem)\b/.test(textoNorm);
    const encontrados = String(v || '').toUpperCase().match(/[A-Z0-9][A-Z0-9./-]{2,18}/g) || [];
    const saida = new Set();
    encontrados.forEach(raw => {
      const c = compact(raw);
      const numeroPuro = /^\d+$/.test(c) ? Number(c) : 0;
      if (c.length === 4 && numeroPuro >= 1900 && numeroPuro <= 2099 && !codigoExplicito) return;
      if (c.length >= 3 && /\d/.test(c)) saida.add(c);
      const m = c.match(/^(ds|dni|dpl|brk|aje|jurid|nytron|ranalle|wahler|ete)?0*([0-9]{3,})$/);
      if (m) {
        const n = Number(m[2]);
        if (m[2].length === 4 && n >= 1900 && n <= 2099 && !codigoExplicito && !m[1]) return;
        saida.add(m[2]);
        saida.add(String(n));
      }
    });
    return [...saida].filter(Boolean);
  }
  function sourceHint(v) {
    const n = norm(v);
    for (const [prefixo, id] of Object.entries(PREFIXOS)) {
      if (new RegExp(`\\b${prefixo}[-./ ]?\\d+\\b`).test(n) || new RegExp(`\\b${prefixo}\\b`).test(n)) return id;
    }
    return '';
  }
  function queryYear(v) {
    const m = String(v || '').match(/\b((?:19|20)\d{2})\b/);
    return m ? Number(m[1]) : 0;
  }
  function year2(v) {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    if (n < 30) return 2000 + n;
    if (n < 100) return 1900 + n;
    return n;
  }
  function rangeMatches(text, year) {
    if (!year) return false;
    const n = String(text || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    for (const m of n.matchAll(/\b(\d{2,4})\s*>\s*(\d{2,4})?/g)) {
      const ini = year2(m[1]);
      const fim = m[2] ? year2(m[2]) : 2099;
      if (ini && year >= ini && year <= fim) return true;
    }
    for (const m of n.matchAll(/\b((?:19|20)\d{2})\s+((?:19|20)\d{2})\b/g)) {
      if (year >= Number(m[1]) && year <= Number(m[2])) return true;
    }
    for (const m of n.matchAll(/\b(\d{2,4})\s*\/\s*(?:\.\.\.|(\d{2,4}))/g)) {
      const ini = year2(m[1]);
      const fim = m[2] ? year2(m[2]) : 2099;
      if (ini && year >= ini && year <= fim) return true;
    }
    return n.includes(String(year));
  }

  async function loadManifest() {
    if (manifest) return manifest;
    if (!manifestPromise) manifestPromise = fetch(MANIFEST_URL, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('manifesto HTTP ' + r.status); return r.json(); })
      .then(data => { manifest = data; return data; })
      .catch(err => { manifestPromise = null; throw err; });
    return manifestPromise;
  }

  async function loadSource(src) {
    if (cache.has(src.id)) return cache.get(src.id);
    const url = src.arquivoDados + (src.arquivoDados.includes('?') ? '&' : '?') + 'v=20260718-v18';
    const data = await fetch(url, { cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error(src.nome + ' HTTP ' + r.status); return r.json(); });
    cache.set(src.id, data);
    return data;
  }

  function candidateSources(q, mf) {
    const nq = norm(q);
    const qTokens = tokens(q);
    const qCodes = codeTokens(q);
    const byId = new Map(mf.fontes.map(s => [s.id, s]));
    const chosen = new Map();
    const dica = sourceHint(q);
    if (dica && byId.has(dica)) return [byId.get(dica)];

    mf.fontes.forEach(src => {
      const aliases = [src.id, src.nome, ...(src.aliases || [])].map(norm).filter(Boolean);
      if (aliases.some(a => a.length >= 3 && nq.includes(a))) chosen.set(src.id, src);
    });
    qCodes.forEach(code => (mf.codigoFontes?.[code] || []).forEach(id => {
      if (byId.has(id)) chosen.set(id, byId.get(id));
    }));
    if (chosen.size) return [...chosen.values()];

    const ranked = mf.fontes.map(src => {
      const lex = new Set(src.lexico || []);
      const score = qTokens.reduce((n, t) => n + (lex.has(t) ? (GENERICOS.has(t) ? 1 : 3) : 0), 0);
      return { src, score };
    }).filter(x => x.score > 0).sort((a,b) => b.score - a.score);
    // A carga ocorre apenas quando o usuário consulta catálogo. Para perguntas por
    // aplicação, carregar todas as fontes evita descartar o catálogo correto por
    // semelhança de palavras em capas ou páginas institucionais.
    if (ranked.length) return ranked.map(x => x.src);
    return mf.fontes;
  }

  async function prepararPergunta(pergunta) {
    try {
      const mf = await loadManifest();
      const fontes = candidateSources(pergunta, mf);
      await Promise.all(fontes.map(src => loadSource(src).catch(err => {
        console.warn('[catálogos IA] ' + src.nome, err?.message || err);
        return null;
      })));
      const status = document.getElementById('thiaIaLocalStatus');
      if (status) status.innerHTML = `<span style="padding:5px 9px;border-radius:999px;border:1px solid rgba(0,255,136,.35);color:var(--success,#00ff88);">IA INTERNA LOCAL • ${cache.size}/${mf.fontes.length} catálogo(s) preparado(s)</span>`;
      return true;
    } catch (err) {
      console.warn('[catálogos IA] manifesto indisponível', err?.message || err);
      return false;
    }
  }

  function ocorrencias(textoNorm, anchors) {
    const pos = [];
    anchors.filter(Boolean).forEach(a => {
      let i = textoNorm.indexOf(a);
      let guard = 0;
      while (i >= 0 && guard++ < 30) {
        pos.push({ pos: i, anchor: a });
        i = textoNorm.indexOf(a, i + Math.max(1, a.length));
      }
    });
    return pos;
  }

  function melhorJanela(texto, termos, especificos, codigos, ano) {
    const original = String(texto || '').replace(/\s+/g, ' ').trim();
    const n = norm(original);
    const anchors = [...especificos, ...codigos, ...termos];
    const pontos = ocorrencias(n, anchors);
    if (!pontos.length) return { texto: original.slice(0, 430), score: 0, anchor: '', anoOk: false };
    let melhor = null;
    pontos.forEach(p => {
      const ini = Math.max(0, p.pos - 430);
      const fim = Math.min(original.length, p.pos + 620);
      const trecho = original.slice(ini, fim);
      const nt = norm(trecho);
      const matchTermos = termos.filter(t => nt.includes(t)).length;
      const matchEsp = especificos.filter(t => nt.includes(t)).length;
      const matchCod = codigos.filter(c => compact(nt).includes(c)).length;
      const anoOk = rangeMatches(trecho, ano);
      const score = matchTermos * 3 + matchEsp * 8 + matchCod * 20 + (anoOk ? 18 : 0);
      if (!melhor || score > melhor.score) melhor = { texto: trecho, score, anchor: p.anchor, anoOk };
    });
    return melhor;
  }

  function categoriaDoTexto(texto) {
    const primeiro = String(texto || '').split('|').map(s => s.trim()).find(s =>
      /\b(sensor|valvula|válvula|bomba|kit|reparo|pastilha|sapata|terminal|bucha|rolamento|correia|tensor|polia|bico|filtro|interruptor|chicote)\b/i.test(s)
    );
    return primeiro ? primeiro.replace(/^\d+\s+/, '').slice(0, 100) : 'Peça automotiva';
  }

  function aplicacoesDaJanela(texto, especificos, ano, max = 5) {
    const segmentos = String(texto || '').split('|').map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const opcionais = new Set(['fire','evo','vhc','vhce','mpi','flex','gasolina','etanol','diesel','turbo','fiat','gm','chevrolet','ford','volkswagen','renault','toyota','honda']);
    const obrigatorios = especificos.filter(t => !opcionais.has(t));
    const termosAplicacao = obrigatorios.length ? obrigatorios : especificos;
    const candidatos = segmentos.filter(s => {
      const ns = norm(s);
      const temModelo = !termosAplicacao.length || termosAplicacao.every(t => ns.includes(t));
      const temMotorAno = /\b\d[.,]\d\b/.test(s) && (/\b\d{2}\s*>/.test(s) || /\b(?:19|20)\d{2}\b/.test(s));
      return temModelo && temMotorAno && (!ano || rangeMatches(s, ano));
    });
    if (ano && especificos.length && !candidatos.length) return [];
    const base = candidatos.length ? candidatos : segmentos.filter(s => {
      const ns = norm(s);
      return termosAplicacao.every(t => ns.includes(t)) && s.length > 12;
    });
    const modeloPrincipal = termosAplicacao.find(t => !/^\d[.,]\d$/.test(t));
    const limpas = base.map(s => {
      if (!modeloPrincipal) return s;
      const rx = new RegExp(`\\b${modeloPrincipal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      const achado = rx.exec(s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
      return achado && achado.index > 0 ? s.slice(achado.index).trim() : s;
    });
    return [...new Set(limpas)].slice(0, max);
  }

  function codigoProdutoDaJanela(texto, anchor, consultaCodigos) {
    const informado = consultaCodigos.find(x => /^\d{3,6}$/.test(x));
    if (informado) return informado;
    const n = norm(texto);
    const pos = anchor ? n.indexOf(anchor) : n.length;
    const antes = String(texto || '').slice(Math.max(0, pos - 380), Math.max(0, pos));
    const nums = [...antes.matchAll(/\b(\d{3,5})\b/g)].map(m => m[1]).filter(v => {
      const x = Number(v);
      return !(v.length === 4 && x >= 1900 && x <= 2099);
    });
    return nums.length ? nums[nums.length - 1] : '';
  }

  function buscar(pergunta, limite = 3) {
    const nq = norm(pergunta);
    const codigos = codeTokens(pergunta);
    const ano = queryYear(pergunta);
    const termos = tokens(pergunta).filter(t =>
      t !== String(ano || '') &&
      !codigos.includes(compact(t)) &&
      !/^(ds|dni|dpl|brk|aje|jurid|nytron|ranalle|wahler|ete)\d{3,}$/.test(compact(t))
    );
    const especificos = termos.filter(t => !GENERICOS.has(t) && !/^\d{2,4}$/.test(t));
    const categoriaPedida = termos.filter(t => GENERICOS.has(t));
    const temCodigo = codigos.some(c => /^\d{3,}$/.test(c));
    const resultados = [];

    cache.forEach(data => {
      const src = data.fonte || {};
      const aliases = [src.id, src.nome, ...(src.aliases || [])].map(norm).filter(Boolean);
      const fontePedida = aliases.some(a => a.length >= 3 && nq.includes(a)) || sourceHint(pergunta) === src.id;
      (data.paginas || []).forEach(pg => {
        let nt = pg.busca || pageNormCache.get(pg);
        if (!nt) { nt = norm(pg.texto); pageNormCache.set(pg, nt); }
        const categoria = categoriaDoTexto(pg.texto);
        const categoriaNorm = norm(categoria);
        const categoriaHits = categoriaPedida.filter(t => categoriaNorm.includes(t));
        if (categoriaPedida.length && categoriaHits.length < Math.max(1, Math.ceil(categoriaPedida.length * 0.66))) return;
        const ct = compact(nt);
        const codigoHits = codigos.filter(c => ct.includes(c));
        if (temCodigo && !codigoHits.length) return;
        const matchTermos = termos.filter(t => nt.includes(t));
        const matchEsp = especificos.filter(t => nt.includes(t));
        if (especificos.length && matchEsp.length < especificos.length) return;
        const minimoTermos = termos.length <= 2 ? termos.length : Math.max(2, Math.ceil(termos.length * 0.6));
        if (!temCodigo && matchTermos.length < minimoTermos) return;

        const janela = melhorJanela(pg.texto, termos, especificos, codigos, ano);
        if (ano && !temCodigo && !janela.anoOk) return;
        let score = (fontePedida ? 12 : 0) + matchTermos.length * 4 + matchEsp.length * 10 + codigoHits.length * 30 + janela.score;
        if (nq.length >= 7 && nt.includes(nq)) score += 25;
        const aplicacoes = aplicacoesDaJanela(janela.texto, especificos, ano, temCodigo ? 6 : 3);
        if (ano && especificos.length && !aplicacoes.length) return;
        const codigoProduto = codigoProdutoDaJanela(janela.texto, janela.anchor, codigos);
        resultados.push({
          score,
          fonte: src.nome,
          fonteId: src.id,
          pdf: src.pdf,
          pagina: pg.pagina,
          ocr: src.extracao === 'ocr',
          categoria,
          codigoProduto,
          aplicacoes,
          texto: janela.texto.slice(0, 520),
          consultaCodigo: temCodigo
        });
      });
    });

    const ordenados = resultados.sort((a,b) => b.score - a.score || a.fonte.localeCompare(b.fonte) || Number(a.pagina) - Number(b.pagina));
    if (!ordenados.length) return [];
    const max = temCodigo ? Math.min(2, Math.max(1, limite)) : 1;
    return ordenados.slice(0, max);
  }

  function formatar(resultados, pergunta) {
    if (!resultados?.length) return '';
    const codigoConsultado = codeTokens(pergunta).find(c => /^\d{3,6}$/.test(c)) || '';
    const primeiro = resultados[0];
    const aplicacoes = [...new Set(resultados.flatMap(r => r.aplicacoes || []))].slice(0, 4);
    const paginas = [...new Set(resultados.map(r => r.pagina))].join(', ');
    const codigo = codigoConsultado || primeiro.codigoProduto;
    const titulo = `${primeiro.fonte}${codigo ? ` ${codigo}` : ''} — ${primeiro.categoria}`;
    const ano = queryYear(pergunta);
    const codigos = codeTokens(pergunta);
    const termosConsulta = tokens(pergunta).filter(t =>
      t !== String(ano || '') &&
      !codigos.includes(compact(t)) &&
      !GENERICOS.has(t) &&
      !/^(ds|dni|dpl|brk|aje|jurid|nytron|ranalle|wahler|ete)\d{3,}$/.test(compact(t)) &&
      !/^\d[.,]\d$/.test(t)
    );

    let corpo = '';
    if (codigoConsultado && !termosConsulta.length && !ano) {
      corpo = `<strong>Código localizado.</strong> O catálogo possui várias aplicações para este código e a extração da página está distribuída em colunas. Informe veículo, motor e ano para filtrar sem atribuir uma aplicação errada.`;
    } else if (!codigoConsultado && !ano && termosConsulta.length <= 1) {
      corpo = `<strong>Encontrei referências para ${esc(termosConsulta[0] || primeiro.categoria)}, mas existem várias versões.</strong> Informe motor e ano para retornar o código correto.`;
    } else if (aplicacoes.length) {
      corpo = aplicacoes.length === 1
        ? `<strong>Aplicação catalogada:</strong> ${esc(aplicacoes[0])}`
        : `<strong>Aplicações catalogadas:</strong><br>${aplicacoes.map(a => `- ${esc(a)}`).join('<br>')}`;
    } else {
      corpo = `<strong>Trecho mais compatível:</strong> ${esc(primeiro.texto.slice(0, 300))}${primeiro.texto.length > 300 ? '…' : ''}`;
    }

    return [
      `<strong>${esc(titulo)}</strong>`,
      corpo,
      `<small>Fonte: ${esc(primeiro.pdf)}, página(s) ${esc(paginas)}${primeiro.ocr ? ' • texto obtido por OCR' : ''}. Confirme código original, motor, versão e chassi antes da compra ou aplicação.</small>`
    ].join('<br>');
  }

  W.thiaCatalogosPrepararPergunta = prepararPergunta;
  W.thiaCatalogosBuscar = buscar;
  W.thiaCatalogosFormatar = formatar;
  W.thiaCatalogosStatus = () => ({ carregados: cache.size, total: manifest?.fontes?.length || 0 });
})();
