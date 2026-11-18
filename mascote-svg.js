// Desenhos originais dos bichinhos (SVG 200x200), em 5 fases.

const PALETAS = {
  gato: { corpo: '#f6a65a', barriga: '#fde3c4', detalhe: '#e07b2c', orelhaDentro: '#f9a8d4' },
  coelho: { corpo: '#f5f3fa', barriga: '#ffffff', detalhe: '#d9d3e6', orelhaDentro: '#f9a8d4' },
  panda: { corpo: '#ffffff', barriga: '#f3f4f6', detalhe: '#2d2d3a', orelhaDentro: '#2d2d3a' },
  cachorro: { corpo: '#d6a06b', barriga: '#f5dcc0', detalhe: '#8b5a2b', orelhaDentro: '#8b5a2b' },
};

const ESCALA = { filhote: 0.62, crianca: 0.76, jovem: 0.88, adulto: 1 };
const CONTORNO = '#3b2a4d';

function orelhas(tipo, p) {
  const c = `stroke="${CONTORNO}" stroke-width="3"`;
  if (tipo === 'gato') {
    return `<path d="M60 70 L66 22 L98 50 Z" fill="${p.corpo}" ${c} stroke-linejoin="round"/>
      <path d="M140 70 L134 22 L102 50 Z" fill="${p.corpo}" ${c} stroke-linejoin="round"/>
      <path d="M68 60 L71 34 L88 50 Z" fill="${p.orelhaDentro}"/>
      <path d="M132 60 L129 34 L112 50 Z" fill="${p.orelhaDentro}"/>`;
  }
  if (tipo === 'coelho') {
    return `<ellipse cx="80" cy="30" rx="13" ry="36" transform="rotate(-10 80 30)" fill="${p.corpo}" ${c}/>
      <ellipse cx="120" cy="30" rx="13" ry="36" transform="rotate(10 120 30)" fill="${p.corpo}" ${c}/>
      <ellipse cx="80" cy="32" rx="6" ry="26" transform="rotate(-10 80 32)" fill="${p.orelhaDentro}"/>
      <ellipse cx="120" cy="32" rx="6" ry="26" transform="rotate(10 120 32)" fill="${p.orelhaDentro}"/>`;
  }
  if (tipo === 'panda') {
    return `<circle cx="62" cy="50" r="17" fill="${p.detalhe}" ${c}/>
      <circle cx="138" cy="50" r="17" fill="${p.detalhe}" ${c}/>`;
  }
  return ''; // cachorro: orelhas caídas vêm depois da cabeça
}

function rosto(tipo, p) {
  const olhos = `
    <circle cx="84" cy="86" r="6.5" fill="${CONTORNO}"/><circle cx="116" cy="86" r="6.5" fill="${CONTORNO}"/>
    <circle cx="86" cy="84" r="2.2" fill="#fff"/><circle cx="118" cy="84" r="2.2" fill="#fff"/>`;
  const manchas = tipo === 'panda'
    ? `<ellipse cx="83" cy="88" rx="13" ry="15" transform="rotate(20 83 88)" fill="${p.detalhe}"/>
       <ellipse cx="117" cy="88" rx="13" ry="15" transform="rotate(-20 117 88)" fill="${p.detalhe}"/>
       <circle cx="84" cy="86" r="5" fill="#fff"/><circle cx="116" cy="86" r="5" fill="#fff"/>
       <circle cx="85" cy="87" r="3" fill="${CONTORNO}"/><circle cx="115" cy="87" r="3" fill="${CONTORNO}"/>`
    : olhos;
  const focinho = tipo === 'cachorro'
    ? `<ellipse cx="100" cy="104" rx="20" ry="14" fill="${p.barriga}"/><ellipse cx="100" cy="98" rx="7" ry="5" fill="${CONTORNO}"/>`
    : `<path d="M96 97 L104 97 L100 102 Z" fill="${tipo === 'panda' ? CONTORNO : '#f472b6'}"/>`;
  const bigodes = tipo === 'gato'
    ? `<g stroke="${CONTORNO}" stroke-width="2" stroke-linecap="round">
        <line x1="62" y1="98" x2="80" y2="100"/><line x1="62" y1="106" x2="80" y2="104"/>
        <line x1="138" y1="98" x2="120" y2="100"/><line x1="138" y1="106" x2="120" y2="104"/></g>`
    : '';
  return `${manchas}
    <circle cx="70" cy="102" r="7" fill="#f9a8d4" opacity=".55"/><circle cx="130" cy="102" r="7" fill="#f9a8d4" opacity=".55"/>
    ${focinho}
    <path d="M92 106 Q100 114 108 106" fill="none" stroke="${CONTORNO}" stroke-width="3" stroke-linecap="round"/>
    ${bigodes}`;
}

function corpo(tipo, p) {
  const c = `stroke="${CONTORNO}" stroke-width="3"`;
  const orelhasCaidas = tipo === 'cachorro'
    ? `<ellipse cx="58" cy="82" rx="14" ry="28" transform="rotate(18 58 82)" fill="${p.detalhe}" ${c}/>
       <ellipse cx="142" cy="82" rx="14" ry="28" transform="rotate(-18 142 82)" fill="${p.detalhe}" ${c}/>`
    : '';
  const bracos = tipo === 'panda' ? p.detalhe : p.corpo;
  return `
    <ellipse cx="80" cy="186" rx="16" ry="9" fill="${tipo === 'panda' ? p.detalhe : p.corpo}" ${c}/>
    <ellipse cx="120" cy="186" rx="16" ry="9" fill="${tipo === 'panda' ? p.detalhe : p.corpo}" ${c}/>
    <ellipse cx="100" cy="146" rx="50" ry="42" fill="${p.corpo}" ${c}/>
    <ellipse cx="100" cy="152" rx="30" ry="26" fill="${p.barriga}"/>
    <ellipse cx="56" cy="146" rx="11" ry="17" transform="rotate(25 56 146)" fill="${bracos}" ${c}/>
    <ellipse cx="144" cy="146" rx="11" ry="17" transform="rotate(-25 144 146)" fill="${bracos}" ${c}/>
    ${orelhas(tipo, p)}
    <circle cx="100" cy="88" r="46" fill="${p.corpo}" ${c}/>
    ${orelhasCaidas}
    ${rosto(tipo, p)}`;
}

function ovo(p, progresso) {
  const rachado = progresso >= 0.5
    ? `<path d="M70 108 L82 100 L90 112 L102 98 L112 110 L124 100 L132 108" fill="none" stroke="${CONTORNO}" stroke-width="3" stroke-linejoin="round"/>`
    : '';
  const balanco = progresso >= 0.8 ? 'class="balancar"' : '';
  return `<g ${balanco} style="transform-origin:100px 180px">
    <ellipse cx="100" cy="122" rx="50" ry="62" fill="#fffbeb" stroke="${CONTORNO}" stroke-width="3"/>
    <circle cx="80" cy="96" r="9" fill="${p.corpo}"/><circle cx="118" cy="82" r="7" fill="${p.detalhe}" opacity=".7"/>
    <circle cx="112" cy="140" r="11" fill="${p.corpo}"/><circle cx="78" cy="150" r="6" fill="${p.detalhe}" opacity=".7"/>
    ${rachado}</g>`;
}

// fase: 'ovo' | 'filhote' | 'crianca' | 'jovem' | 'adulto'
// acessorio: item de premios.ACESSORIOS (ou null); progresso: 0..1 dentro da fase
export function svgMascote(tipo, fase, { acessorio = null, progresso = 0, titulo = '' } = {}) {
  const p = PALETAS[tipo] || PALETAS.gato;
  const rotulo = titulo ? `<title>${titulo}</title>` : '';
  if (fase === 'ovo') {
    return `<svg viewBox="0 0 200 200" role="img" aria-label="${titulo}" xmlns="http://www.w3.org/2000/svg">${rotulo}${ovo(p, progresso)}</svg>`;
  }
  const s = ESCALA[fase] || 1;
  const enfeite = acessorio && acessorio.emoji
    ? `<text x="${acessorio.x}" y="${acessorio.y}" font-size="${acessorio.tamanho}" text-anchor="middle" dominant-baseline="middle">${acessorio.emoji}</text>`
    : '';
  const brilho = fase === 'adulto'
    ? `<text x="168" y="40" font-size="26" text-anchor="middle">✨</text>`
    : '';
  return `<svg viewBox="0 0 200 200" role="img" aria-label="${titulo}" xmlns="http://www.w3.org/2000/svg">${rotulo}
    <ellipse cx="100" cy="194" rx="${56 * s}" ry="6" fill="#000" opacity=".12"/>
    <g transform="translate(${100 - 100 * s} ${196 - 196 * s}) scale(${s})">${corpo(tipo, p)}${enfeite}</g>
    ${brilho}</svg>`;
}
