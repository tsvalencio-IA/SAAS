/**
 * Catálogos técnicos locais para a IA interna.
 * Os arquivos de conhecimento são carregados sob demanda: nada é baixado na
 * abertura de Jarvis/Equipe. Cada resultado mantém fabricante, PDF e página.
 * Powered by thIAguinho Soluções Digitais
 */
(function () {
  'use strict';

  const W = window;
  const MANIFEST_URL = 'data/catalogos-ia/manifest.json?v=20260718';
  const cache = new Map();
  const pageNormCache = new WeakMap();
  let manifest = null;
  let manifestPromise = null;

  const STOP = new Set([
    'para','com','sem','uma','uns','das','dos','de','da','do','em','no','na','nos','nas',
    'por','que','qual','quais','tem','esta','este','essa','esse','peca','pecas','carro',
    'veiculo','veiculos','catalogo','aplicacao','aplicacoes','codigo','codigos','modelo'
  ]);

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
    return [...new Set(String(v || '').toUpperCase().match(/[A-Z0-9][A-Z0-9./-]{2,18}/g) || [])]
      .map(compact).filter(t => t.length >= 3 && /\d/.test(t));
  }

  async function loadManifest() {
    if (manifest) return manifest;
    if (!manifestPromise) manifestPromise = fetch(MANIFEST_URL, { cache: 'force-cache' })
      .then(r => { if (!r.ok) throw new Error('manifesto HTTP ' + r.status); return r.json(); })
      .then(data => { manifest = data; return data; })
      .catch(err => { manifestPromise = null; throw err; });
    return manifestPromise;
  }

  async function loadSource(src) {
    if (cache.has(src.id)) return cache.get(src.id);
    const data = await fetch(src.arquivoDados, { cache: 'force-cache' })
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
      const score = qTokens.reduce((n, t) => n + (lex.has(t) ? (/\d/.test(t) ? 5 : 1) : 0), 0);
      return { src, score };
    }).filter(x => x.score > 0).sort((a,b) => b.score - a.score);
    if (ranked.length) return ranked.slice(0, 5).map(x => x.src);
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

  function snippet(texto, termos) {
    const original = String(texto || '').replace(/\s+/g, ' ').trim();
    const n = norm(original);
    let pos = -1;
    termos.forEach(t => {
      const p = n.indexOf(t);
      if (p >= 0 && (pos < 0 || p < pos)) pos = p;
    });
    const ini = Math.max(0, (pos < 0 ? 0 : pos) - 170);
    const fim = Math.min(original.length, ini + 620);
    return (ini ? '…' : '') + original.slice(ini, fim) + (fim < original.length ? '…' : '');
  }

  function buscar(pergunta, limite = 8) {
    const nq = norm(pergunta);
    const termos = tokens(pergunta);
    const codigos = codeTokens(pergunta);
    const resultados = [];
    cache.forEach(data => {
      const src = data.fonte || {};
      const aliases = [src.id, src.nome, ...(src.aliases || [])].map(norm).filter(Boolean);
      const fontePedida = aliases.some(a => a.length >= 3 && nq.includes(a));
      (data.paginas || []).forEach(pg => {
        let nt = pg.busca || pageNormCache.get(pg);
        if (!nt) { nt = norm(pg.texto); pageNormCache.set(pg, nt); }
        let score = fontePedida ? 5 : 0;
        if (nq.length >= 7 && nt.includes(nq)) score += 20;
        termos.forEach(t => { if (nt.includes(t)) score += /\d/.test(t) ? 6 : 2; });
        codigos.forEach(c => { if (compact(nt).includes(c)) score += 16; });
        if (score > 0) resultados.push({
          score,
          fonte: src.nome,
          pdf: src.pdf,
          pagina: pg.pagina,
          ocr: src.extracao === 'ocr',
          texto: snippet(pg.texto, [...codigos, ...termos])
        });
      });
    });
    return resultados.sort((a,b) => b.score - a.score || a.fonte.localeCompare(b.fonte))
      .slice(0, Math.max(1, limite));
  }

  function formatar(resultados) {
    if (!resultados?.length) return '';
    const linhas = resultados.map(r =>
      `<div style="margin:7px 0;padding:8px;border-left:2px solid var(--cyan,#00d4ff);background:rgba(0,212,255,.04);">` +
      `<strong>${esc(r.fonte)}</strong> • PDF ${esc(r.pdf)} • página ${esc(r.pagina)}${r.ocr ? ' • texto obtido por OCR' : ''}<br>` +
      `<span>${esc(r.texto)}</span></div>`
    ).join('');
    return `<strong>Catálogos técnicos fornecidos:</strong>${linhas}` +
      `<small>Resultado documental: confirme veículo, ano, motor, versão e código antes da compra ou aplicação. A IA não transforma semelhança textual em compatibilidade garantida.</small>`;
  }

  W.thiaCatalogosPrepararPergunta = prepararPergunta;
  W.thiaCatalogosBuscar = buscar;
  W.thiaCatalogosFormatar = formatar;
  W.thiaCatalogosStatus = () => ({ carregados: cache.size, total: manifest?.fontes?.length || 0 });
})();
