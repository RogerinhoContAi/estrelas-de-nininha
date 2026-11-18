import { configFirebase } from './config-firebase.js';
import { criarArmazenamento } from './armazenamento.js';
import * as R from './regras.js';
import * as P from './premios.js';
import * as C from './cripto.js';
import { svgMascote } from './mascote-svg.js';

const $app = document.getElementById('app');
const $aviso = document.getElementById('aviso');
const $festa = document.getElementById('festa');

const CHAVE_CODIGO = 'tarefas:codigo';
const CHAVE_LEMBRAR = 'tarefas:pais';
const LETRAS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'; // sem 0/O, 1/I/L
const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const DIAS_LONGOS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const PERGUNTAS = {
  gratidao: ['Pelo que você quer agradecer a Deus hoje?', 'Qual foi uma coisa boa que aconteceu hoje?', 'Quem fez o seu dia melhor hoje?'],
  eu: ['Qual qualidade sua você percebeu hoje?', 'Do que você se orgulha hoje?', 'Escreva 3 coisas boas sobre você.'],
};
const TIPOS_DIARIO = { gratidao: '🙏 Agradeço a Deus', eu: '🌟 Coisas boas sobre mim' };
const TAREFA_DO_TIPO = { gratidao: 'agradecer', eu: 'palavras-positivas' };

// localStorage pode falhar (modo privado); o app continua funcionando
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignora */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* ignora */ } },
};

const est = {
  arm: null,
  codigo: null,
  familia: undefined, // undefined = carregando, null = não existe
  registros: {},
  diario: [],
  textos: {}, // textos do diário já abertos (só na memória)
  chaveDiario: null, // só na memória, some ao sair da aba
  diaSel: new Date(),
  modoPais: false,
  aba: 'dia', // abas dos pais
  tela: 'hoje', // abas da filha
  bateuAntes: null,
  faseAntes: null,
  ultimoDia: R.chaveData(new Date()),
  redesenharDepois: false,
  errosPin: 0,
  bloqueioPinAte: 0,
  rascunho: { tipo: 'gratidao', texto: '' },
  abrindo: false,
};
let pararFamilia = null;
let pararDias = null;
let pararDiario = null;

// ---------------- utilidades ----------------

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ddmm = (d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
const mesmoDia = (a, b) => R.chaveData(a) === R.chaveData(b);
const sorteio = (lista) => lista[Math.floor(Math.random() * lista.length)];

function gerarCodigo() {
  const n = new Uint32Array(12);
  crypto.getRandomValues(n);
  return Array.from(n, (x) => LETRAS[x % LETRAS.length]).join('');
}
const limparCodigo = (s) => String(s || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
const formatarCodigo = (c) => (c.match(/.{1,4}/g) || []).join('-');
const linkDaFamilia = () => `${location.origin}${location.pathname}?f=${est.codigo}`;

async function hashPin(codigo, pin) {
  const dados = new TextEncoder().encode(`${codigo}:${pin}`);
  const h = await crypto.subtle.digest('SHA-256', dados);
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, '0')).join('');
}

let timerAviso;
function aviso(msg) {
  $aviso.textContent = msg;
  $aviso.classList.add('mostrar');
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => $aviso.classList.remove('mostrar'), 3200);
}

function festa(x, y, quantos = 10, emojis = ['⭐', '✨', '🌟']) {
  for (let i = 0; i < quantos; i++) {
    const s = document.createElement('span');
    s.textContent = emojis[i % emojis.length];
    const ang = Math.random() * Math.PI * 2;
    const dist = 60 + Math.random() * 120;
    s.style.left = `${x}px`;
    s.style.top = `${y}px`;
    s.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(ang) * dist - 60}px`);
    s.style.setProperty('--rot', `${Math.random() * 360 - 180}deg`);
    $festa.appendChild(s);
    setTimeout(() => s.remove(), 1200);
  }
}
function festaGrande(emojis = ['🎉', '⭐', '🏆', '✨', '🥳']) {
  const w = window.innerWidth;
  for (let i = 0; i < 5; i++) {
    setTimeout(() => festa(w * (0.15 + Math.random() * 0.7), window.innerHeight * 0.6, 14, emojis), i * 180);
  }
}

async function tentar(acao, msg = 'Não consegui salvar. Confira a internet e tente de novo.') {
  try {
    await acao();
    return true;
  } catch (e) {
    console.error(e);
    aviso(msg);
    return false;
  }
}

// ---------------- dados ----------------

const tarefas = () => (est.familia.tarefas || []).map(R.normalizarTarefa);
const cofrinho = () => P.normalizarCofrinho(est.familia.cofrinho);
const lista = (d) => R.listaDoDia(est.registros[R.chaveData(d)], tarefas(), d, new Date(), est.familia.inicio);
const totalGanho = () => R.estrelasTotais(est.registros, tarefas(), new Date(), est.familia.inicio);

function entrarNaFamilia(codigo) {
  est.codigo = codigo;
  est.familia = undefined;
  ls.set(CHAVE_CODIGO, codigo);
  const url = new URL(location.href);
  if (url.searchParams.get('f') !== codigo) {
    url.searchParams.set('f', codigo);
    history.replaceState(null, '', url); // assim "Adicionar à tela inicial" guarda o código
  }
  pararFamilia?.();
  let primeira = true;
  pararFamilia = est.arm.ouvirFamilia(
    codigo,
    (f) => {
      if (!f) {
        if (est.familia === undefined) {
          sairDaFamilia();
          desenharBoasVindas('Não achei nenhuma família com esse código. Confira o link.');
        }
        return;
      }
      est.familia = f;
      if (primeira) {
        primeira = false;
        if (ls.get(CHAVE_LEMBRAR) && ls.get(CHAVE_LEMBRAR) === f.pinHash) est.modoPais = true;
        ouvirDias();
        pararDiario = est.arm.ouvirDiario(codigo, (lista) => {
          est.diario = lista;
          abrirTextos();
          desenhar();
        }, erroDeConexao);
      }
      if (est.modoPais && ls.get(CHAVE_LEMBRAR) && ls.get(CHAVE_LEMBRAR) !== f.pinHash) {
        ls.del(CHAVE_LEMBRAR); // PIN trocado em outro celular
      }
      if (est.chaveDiario && (!f.cofreDiario || f.cofreDiario.id !== est.cofreAberto)) trancarDiario();
      conferirFase();
      desenhar();
    },
    erroDeConexao,
  );
}

function sairDaFamilia() {
  pararFamilia?.();
  pararDias?.();
  pararDiario?.();
  pararFamilia = pararDias = pararDiario = null;
  est.codigo = null;
  est.familia = undefined;
  est.registros = {};
  est.diario = [];
  est.modoPais = false;
  trancarDiario();
  ls.del(CHAVE_CODIGO);
  ls.del(CHAVE_LEMBRAR);
  const url = new URL(location.href);
  url.searchParams.delete('f');
  history.replaceState(null, '', url);
}

// Todos os dias desde o início: as estrelas do mascote somam a história toda.
function ouvirDias() {
  pararDias?.();
  pararDias = est.arm.ouvirDias(
    est.codigo,
    est.familia.inicio || '2000-01-01',
    '9999-12-31',
    (regs) => {
      est.registros = regs;
      conferirMeta();
      conferirFase();
      desenhar();
    },
    erroDeConexao,
  );
}

function erroDeConexao(e) {
  console.error(e);
  aviso('Problema de conexão. Tentando de novo…');
}

function conferirMeta() {
  if (!est.familia) return;
  const agora = new Date();
  const r = R.resumoDaSemana(est.registros, tarefas(), agora, est.familia.metaPct, agora, est.familia.inicio);
  if (est.bateuAntes === false && r.bateuMeta) {
    festaGrande();
    aviso('🏆 Meta da semana batida!');
  }
  est.bateuAntes = r.bateuMeta;
}

function conferirFase() {
  if (!est.familia || !est.familia.mascote) return;
  const f = R.faseDoMascote(totalGanho());
  if (est.faseAntes !== null && f.indice > est.faseAntes) {
    festaGrande(['🎉', '💖', '✨', '🌟', '🥚']);
    aviso(f.fase.id === 'filhote'
      ? `🐣 ${est.familia.mascote.nome} nasceu!`
      : `🎉 ${est.familia.mascote.nome} cresceu: agora é ${f.fase.nome}!`);
  }
  est.faseAntes = f.indice;
}

function trancarDiario() {
  est.chaveDiario = null;
  est.cofreAberto = null;
  est.textos = {};
}

async function abrirTextos() {
  const cofre = est.familia && est.familia.cofreDiario;
  if (!est.chaveDiario || !cofre) return;
  const chave = est.chaveDiario;
  let mudou = false;
  for (const e of est.diario) {
    if (e.cofreId !== cofre.id || e.id in est.textos) continue;
    try {
      est.textos[e.id] = await C.decifrar(chave, e);
    } catch {
      est.textos[e.id] = '(não deu para abrir este texto)';
    }
    mudou = true;
  }
  if (mudou && est.chaveDiario === chave) desenhar();
}

function aplicarCor() {
  const c = P.item('cor', cofrinho().usando.cor) || P.CORES[0];
  document.documentElement.style.setProperty('--roxo', c.valor);
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', c.valor);
}

// ---------------- telas ----------------

function desenhar() {
  if (!est.familia) return;
  const foco = document.activeElement;
  if ($app.contains(foco) && foco.matches('input[type=text], input[type=password], textarea, select')) {
    est.redesenharDepois = true; // não atrapalha quem está digitando
    return;
  }
  est.redesenharDepois = false;
  aplicarCor();
  const pais = est.modoPais;
  let corpo;
  if (pais) corpo = est.aba === 'dia' ? telaDia() : est.aba === 'tarefas' ? telaTarefas() : telaAjustes();
  else corpo = est.tela === 'mascote' ? telaMascote() : est.tela === 'coracao' ? telaCoracao() : telaDia();

  document.body.classList.toggle('com-nav', !pais);
  $app.innerHTML = `
    <header class="topo">
      <h1>Minhas <span>tarefas</span></h1>
      <button class="botao-pais ${pais ? 'ativo' : ''}" data-acao="pais">${pais ? '🔓 Sair' : '🔒 Pais'}</button>
    </header>
    ${est.arm.modo === 'teste' ? '<div class="faixa-teste">Modo teste: os dados ficam só neste aparelho.</div>' : ''}
    ${pais ? `
      <nav class="abas">
        <button data-acao="aba" data-aba="dia" class="${est.aba === 'dia' ? 'sel' : ''}">✅ Conferir</button>
        <button data-acao="aba" data-aba="tarefas" class="${est.aba === 'tarefas' ? 'sel' : ''}">📝 Tarefas</button>
        <button data-acao="aba" data-aba="ajustes" class="${est.aba === 'ajustes' ? 'sel' : ''}">⚙️ Ajustes</button>
      </nav>` : ''}
    ${corpo}
    ${pais ? '' : `
      <nav class="nav-inferior" aria-label="Seções">
        <button data-acao="tela" data-tela="hoje" class="${est.tela === 'hoje' ? 'sel' : ''}"><span>🏠</span>Hoje</button>
        <button data-acao="tela" data-tela="mascote" class="${est.tela === 'mascote' ? 'sel' : ''}"><span>🐾</span>Bichinho</button>
        <button data-acao="tela" data-tela="coracao" class="${est.tela === 'coracao' ? 'sel' : ''}"><span>💛</span>Coração</button>
      </nav>`}
  `;
}

function telaDia() {
  const f = est.familia;
  const agora = new Date();
  const d = est.diaSel;
  const r = R.resumoDaSemana(est.registros, tarefas(), d, f.metaPct, agora, f.inicio);
  const estaSemana = mesmoDia(R.inicioDaSemana(d), R.inicioDaSemana(agora));
  const pct = r.meta ? Math.min(100, Math.round((r.estrelas / r.meta) * 100)) : 0;
  const falta = Math.max(0, r.meta - r.estrelas);

  const convite = !est.modoPais && !f.mascote
    ? `<button class="convite" data-acao="tela" data-tela="mascote">🥚 <span>Tem um ovinho esperando por você! <b>Escolha o seu bichinho</b></span></button>`
    : '';

  const estrelas = `
    <section class="estrelas">
      <div class="linha">
        <strong>⭐ ${r.estrelas}</strong>
        <small>${estaSemana ? 'Esta semana' : `Semana de ${ddmm(R.inicioDaSemana(d))}`} · meta ${r.meta} ⭐</small>
      </div>
      <div class="barra" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>
      ${r.bateuMeta ? '<div class="meta-ok">🏆 Meta da semana batida!</div>' : `<div class="esperando">Faltam ${falta} ⭐ para a meta</div>`}
      ${est.modoPais && r.esperando ? `<div class="esperando">⏳ ${r.esperando} ${r.esperando === 1 ? 'tarefa esperando' : 'tarefas esperando'} vocês</div>` : ''}
    </section>`;

  const marcaDia = { completo: '✅', parcial: '🟡', naoFeito: '', hoje: '•', livre: '😎', futuro: '', antes: '' };
  const dias = R.diasDaSemana(d).map((dia) => {
    const sit = R.situacaoDoDia(est.registros[R.chaveData(dia)], tarefas(), dia, agora, f.inicio);
    return `<button class="dia ${sit} ${mesmoDia(dia, d) ? 'sel' : ''}" data-acao="dia" data-chave="${R.chaveData(dia)}"
      aria-label="${DIAS_LONGOS[dia.getDay()]} ${ddmm(dia)}">
      <b>${DIAS_CURTOS[dia.getDay()]}</b><span>${dia.getDate()}</span><em>${marcaDia[sit]}</em></button>`;
  }).join('');
  const semana = `
    <div class="semana">
      <button class="seta" data-acao="semana" data-passo="-7" aria-label="Semana anterior">‹</button>
      <div class="dias">${dias}</div>
      <button class="seta" data-acao="semana" data-passo="7" aria-label="Próxima semana" ${estaSemana ? 'disabled' : ''}>›</button>
    </div>
    <div class="legenda"><span>✅ tudo feito</span><span>🟡 em parte</span><span>😎 folga</span></div>`;

  return convite + estrelas + semana + listaDoDia(d, agora);
}

function itemTarefa(t, reg, { pais, futuro, passado, podeMarcar }) {
  const e = R.estadoDaTarefa(reg, t.id);
  const textos = {
    pendente: passado ? 'Não foi feita' : '',
    feito: 'Esperando os pais conferirem',
    aprovado: t.direto ? 'Feito! +1 ⭐' : 'Aprovada! +1 ⭐',
    devolvido: 'Refazer, por favor',
  };
  const marcas = { pendente: '', feito: '⏳', aprovado: '⭐', devolvido: '↩️' };
  const detalhes = [t.horario ? `🕒 ${esc(t.horario)}` : '', textos[e]].filter(Boolean).join(' · ');
  const miolo = `
    <span class="ic">${esc(t.icone)}</span>
    <span class="nome">${esc(t.nome)}${detalhes ? `<small>${detalhes}</small>` : ''}</span>`;
  if (pais && !futuro) {
    const b = (estado, emoji, rotulo) =>
      `<button data-acao="pais-estado" data-id="${esc(t.id)}" data-estado="${estado}" class="${e === estado ? 'on' : ''}" aria-label="${rotulo}" title="${rotulo}">${emoji}</button>`;
    return `<li><div class="tarefa ${e}">${miolo}
      <span class="acoes-pais">${b('aprovado', '✅', 'Aprovar')}${b('devolvido', '↩️', 'Devolver para refazer')}${b('pendente', '⭕', 'Marcar como não feita')}</span>
    </div></li>`;
  }
  if (podeMarcar && (e !== R.ESTADOS.APROVADO || t.direto)) {
    return `<li><button class="tarefa ${e}" data-acao="marcar" data-id="${esc(t.id)}">${miolo}<span class="marca">${marcas[e]}</span></button></li>`;
  }
  return `<li><div class="tarefa ${e}">${miolo}<span class="marca">${marcas[e]}</span></div></li>`;
}

function listaDoDia(d, agora) {
  const pais = est.modoPais;
  const reg = est.registros[R.chaveData(d)];
  const doDia = lista(d);
  const ehHoje = mesmoDia(d, agora);
  const futuro = R.chaveData(d) > R.chaveData(agora);
  const passado = !ehHoje && !futuro;
  const aprovadas = doDia.filter((t) => R.estadoDaTarefa(reg, t.id) === R.ESTADOS.APROVADO).length;
  const titulo = ehHoje ? 'Hoje' : `${DIAS_LONGOS[d.getDay()]}, ${ddmm(d)}`;

  if (est.familia.inicio && R.chaveData(d) < est.familia.inicio) {
    return `<h2 class="titulo-dia">${titulo}</h2><div class="vazio"><span>📅</span>O app ainda não estava em uso nesse dia.</div>`;
  }
  if (doDia.length === 0) {
    return `<h2 class="titulo-dia">${titulo}</h2><div class="vazio"><span>😎</span>Dia de folga!</div>`;
  }

  const ctx = { pais, futuro, passado, podeMarcar: !pais && R.filhaPodeMarcar(d, agora) };
  const periodoAtual = ehHoje ? R.periodoAgora(agora) : null;
  const blocos = Object.keys(R.PERIODOS).map((p) => {
    const doPeriodo = doDia.filter((t) => t.periodo === p);
    if (!doPeriodo.length) return '';
    const feitas = doPeriodo.filter((t) => R.estadoDaTarefa(reg, t.id) === R.ESTADOS.APROVADO).length;
    const agoraTag = p === periodoAtual ? '<span class="selo">agora</span>' : '';
    return `
      <section class="periodo ${p === periodoAtual ? 'agora' : ''}">
        <h3>${R.ICONES_PERIODO[p]} ${R.PERIODOS[p]} ${agoraTag}<small>${feitas}/${doPeriodo.length}</small></h3>
        <ul class="tarefas">${doPeriodo.map((t) => itemTarefa(t, reg, ctx)).join('')}</ul>
      </section>`;
  }).join('');

  const esperando = doDia.filter((t) => R.estadoDaTarefa(reg, t.id) === R.ESTADOS.FEITO).length;
  let nota = '';
  if (futuro) nota = 'Esse dia ainda não chegou.';
  else if (pais && esperando) nota = `<button class="botao" data-acao="aprovar-todas">✅ Aprovar as ${esperando} que ela marcou</button>`;
  else if (pais) nota = 'Toque em ✅ para aprovar, ↩️ para pedir que refaça ou ⭕ para desmarcar.';
  else if (ehHoje) nota = 'Toque na tarefa quando terminar. Seus pais conferem e você ganha a ⭐. Orar, agradecer e falar coisas boas sobre você valem na hora!';
  else nota = 'Só dá para marcar as tarefas de hoje.';

  return `
    <h2 class="titulo-dia">${titulo}<small>${aprovadas} de ${doDia.length} ⭐</small></h2>
    ${blocos}
    <div class="nota">${nota}</div>`;
}

// ----- bichinho e prêmios -----

function telaEscolherMascote() {
  const opcoes = Object.entries(P.MASCOTES).map(([id, m], i) => `
    <label class="escolha">
      <input type="radio" name="tipo" value="${id}" ${i === 0 ? 'checked' : ''}>
      <span class="desenho">${svgMascote(id, 'filhote', { titulo: m.nome })}</span>
      <b>${m.nome}</b>
    </label>`).join('');
  return `
    <section class="cartao">
      <h2>🥚 Escolha o seu bichinho</h2>
      <p>Ele começa num ovinho. Cada ⭐ que você ganhar faz ele crescer, e ele nunca fica triste se você descansar.</p>
      <form data-form="mascote">
        <div class="escolhas">${opcoes}</div>
        <div class="campo"><label for="nome-mascote">Nome do bichinho</label>
          <input id="nome-mascote" name="nome" type="text" maxlength="20" placeholder="Ex.: Pipoca" required></div>
        <button class="botao" type="submit">É esse! 💖</button>
      </form>
    </section>`;
}

function telaMascote() {
  const f = est.familia;
  if (!f.mascote) return telaEscolherMascote();
  const total = totalGanho();
  const fase = R.faseDoMascote(total);
  const c = cofrinho();
  const saldo = P.saldo(total, c);
  const fundo = P.item('fundo', c.usando.fundo) || P.FUNDOS[0];
  const acessorio = P.item('acessorio', c.usando.acessorio);
  const nome = esc(f.mascote.nome);
  const prox = fase.proxima
    ? `Faltam <b>${fase.faltam} ⭐</b> para virar <b>${fase.proxima.nome}</b>`
    : `${nome} já é adulto! Continue ganhando ⭐ para os prêmios.`;
  const pct = Math.round(fase.progresso * 100);

  const card = (cat, it) => {
    const tem = P.temItem(c, cat, it.id);
    const usando = c.usando[cat] === it.id;
    const amostra = cat === 'cor'
      ? `<span class="amostra cor" style="background:${it.valor}"></span>`
      : cat === 'fundo'
        ? `<span class="amostra fundo" style="background:${it.css}"></span>`
        : `<span class="amostra emoji">${it.emoji || '🚫'}</span>`;
    const rotulo = usando ? '✓ Usando' : tem ? 'Usar' : `⭐ ${it.preco}`;
    const falta = !tem && saldo < it.preco;
    return `<button class="item ${usando ? 'usando' : ''} ${falta ? 'falta' : ''}" data-acao="loja" data-cat="${cat}" data-id="${it.id}">
      ${amostra}<span class="item-nome">${esc(it.nome)}</span><span class="preco">${rotulo}</span></button>`;
  };
  const secao = (titulo, cat, itens) => `
    <section class="cartao">
      <h2>${titulo}</h2>
      <div class="loja">${itens.map((it) => card(cat, it)).join('')}</div>
    </section>`;

  const album = P.FIGURINHAS.map((fi) => c.figurinhas.includes(fi.id)
    ? `<span class="figurinha tem" title="${fi.nome}">${fi.emoji}<small>${fi.nome}</small></span>`
    : '<span class="figurinha">?</span>').join('');
  const completo = c.figurinhas.length === P.FIGURINHAS.length;

  return `
    <section class="cena" style="background:${fundo.css}">
      <div class="mascote ${fase.fase.id === 'ovo' ? '' : 'pulinho'}">${svgMascote(f.mascote.tipo, fase.fase.id, { acessorio, progresso: fase.progresso, titulo: f.mascote.nome })}</div>
    </section>
    <section class="cartao info-mascote">
      <h2>${nome} <small>${fase.fase.nome}</small></h2>
      <div class="barra clara"><i style="width:${pct}%"></i></div>
      <p>${prox}</p>
      <p class="cofrinho">🐷 Cofrinho: <b>${saldo} ⭐</b> para gastar</p>
      <p class="rotulo">Gastar estrelas não atrapalha a meta da semana nem o crescimento de ${nome}.</p>
    </section>
    ${secao('🎨 Cor do app', 'cor', P.CORES)}
    ${secao('🖼️ Cenário', 'fundo', P.FUNDOS)}
    ${secao(`🎀 Enfeites para ${nome}`, 'acessorio', P.ACESSORIOS)}
    <section class="cartao">
      <h2>📒 Álbum de figurinhas <small>${c.figurinhas.length}/${P.FIGURINHAS.length}</small></h2>
      ${completo ? '<p>🎉 Álbum completo!</p>' : `<button class="botao" data-acao="pacote">Abrir pacotinho (⭐ ${P.PRECO_PACOTE})</button>`}
      <div class="album">${album}</div>
    </section>`;
}

// ----- cantinho do coração -----

function telaCoracao() {
  const f = est.familia;
  const cofre = f.cofreDiario;
  if (!cofre) {
    return `
      <section class="cartao coracao">
        <h2>💛 Cantinho do coração</h2>
        <p>Aqui você escreve pelo que agradece a Deus e as coisas boas sobre você.</p>
        <p><b>Só você consegue ler.</b> Nem o papai nem a mamãe conseguem abrir.</p>
        <form data-form="criar-cofre">
          <div class="campo"><label for="s1">Crie uma senha (pelo menos ${C.SENHA_MINIMA} letras ou números)</label>
            <input id="s1" name="senha" type="password" autocomplete="new-password" minlength="${C.SENHA_MINIMA}" required></div>
          <div class="campo"><label for="s2">Repita a senha</label>
            <input id="s2" name="senha2" type="password" autocomplete="new-password" minlength="${C.SENHA_MINIMA}" required></div>
          <p class="alerta">⚠️ Guarde bem essa senha. Se esquecer, ninguém consegue recuperar os textos.</p>
          <button class="botao" type="submit">Criar meu cantinho</button>
        </form>
      </section>`;
  }
  if (!est.chaveDiario) {
    return `
      <section class="cartao coracao">
        <h2>💛 Cantinho do coração</h2>
        <form data-form="abrir-cofre">
          <div class="campo"><label for="s3">Sua senha</label>
            <input id="s3" name="senha" type="password" autocomplete="current-password" required></div>
          <button class="botao" type="submit" ${est.abrindo ? 'disabled' : ''}>${est.abrindo ? 'Abrindo…' : '🔓 Abrir'}</button>
        </form>
        <button class="link" data-acao="esqueci">Esqueci a senha</button>
      </section>`;
  }
  const meus = est.diario
    .filter((e) => e.cofreId === cofre.id)
    .sort((a, b) => (b.criadoEm || 0) - (a.criadoEm || 0));
  const tipo = est.rascunho.tipo;
  const textos = meus.map((e) => {
    const d = R.dataDaChave(e.data);
    return `<article class="entrada ${esc(e.tipo)}">
      <small>${TIPOS_DIARIO[e.tipo] || ''} · ${DIAS_LONGOS[d.getDay()]}, ${ddmm(d)}</small>
      <p>${esc(est.textos[e.id] ?? '…')}</p></article>`;
  }).join('');
  return `
    <section class="cartao coracao">
      <div class="linha-topo"><h2>💛 Cantinho do coração</h2><button class="link" data-acao="trancar">🔒 Trancar</button></div>
      <form data-form="diario">
        <div class="tipos">
          ${Object.entries(TIPOS_DIARIO).map(([v, n]) => `
            <label class="tipo ${tipo === v ? 'sel' : ''}"><input type="radio" name="tipo" value="${v}" ${tipo === v ? 'checked' : ''}> ${n}</label>`).join('')}
        </div>
        <textarea name="texto" maxlength="1000" rows="4" placeholder="${esc(sorteio(PERGUNTAS[tipo]))}" required>${esc(est.rascunho.texto)}</textarea>
        <button class="botao" type="submit">Guardar no meu cantinho</button>
      </form>
    </section>
    ${textos || '<p class="nota">Seus textos vão aparecer aqui. 💛</p>'}`;
}

// ----- pais -----

function telaTarefas() {
  const lista = tarefas();
  const opcoesQuando = (sel) => Object.entries(R.NOMES_QUANDO)
    .map(([v, n]) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${n}</option>`).join('');
  const opcoesPeriodo = (sel) => Object.entries(R.PERIODOS)
    .map(([v, n]) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${R.ICONES_PERIODO[v]} ${n}</option>`).join('');
  const itens = lista.map((t, i) => `
    <li data-indice="${i}">
      <input class="icone" type="text" value="${esc(t.icone)}" data-campo="icone" aria-label="Ícone">
      <input type="text" value="${esc(t.nome)}" data-campo="nome" maxlength="40" aria-label="Nome da tarefa">
      <div class="linha2">
        <select data-campo="periodo" aria-label="Período">${opcoesPeriodo(t.periodo)}</select>
        <input type="text" value="${esc(t.horario)}" data-campo="horario" maxlength="20" placeholder="Horário (opcional)" aria-label="Horário">
      </div>
      <div class="linha2">
        <select data-campo="quando" aria-label="Quando vale">${opcoesQuando(t.quando)}</select>
        <button data-acao="subir" aria-label="Subir" ${i === 0 ? 'disabled' : ''}>⬆️</button>
        <button data-acao="descer" aria-label="Descer" ${i === lista.length - 1 ? 'disabled' : ''}>⬇️</button>
        <button data-acao="apagar" aria-label="Apagar tarefa">🗑️</button>
      </div>
      <label class="check linha-inteira"><input type="checkbox" data-campo="direto" ${t.direto ? 'checked' : ''}> Vale a ⭐ na hora, sem aprovação</label>
    </li>`).join('');
  return `
    <section class="cartao">
      <h2>📝 Tarefas</h2>
      <p class="rotulo">As mudanças valem a partir de hoje. Os dias que já passaram não mudam.</p>
      <ul class="editar">${itens || '<p>Nenhuma tarefa ainda.</p>'}</ul>
    </section>
    <section class="cartao">
      <h2>➕ Nova tarefa</h2>
      <form data-form="nova">
        <div class="campo"><label for="nova-icone">Ícone (um emoji)</label><input id="nova-icone" name="icone" type="text" value="⭐"></div>
        <div class="campo"><label for="nova-nome">Nome</label><input id="nova-nome" name="nome" type="text" maxlength="40" placeholder="Ex.: Ler 10 páginas" required></div>
        <div class="campo"><label for="nova-periodo">Período</label><select id="nova-periodo" name="periodo">${opcoesPeriodo(R.periodoAgora(new Date()))}</select></div>
        <div class="campo"><label for="nova-horario">Horário (opcional)</label><input id="nova-horario" name="horario" type="text" maxlength="20" placeholder="Ex.: 15h às 16h"></div>
        <div class="campo"><label for="nova-quando">Quando vale</label><select id="nova-quando" name="quando">${opcoesQuando('semana')}</select></div>
        <label class="check"><input type="checkbox" name="direto"> Vale a ⭐ na hora, sem aprovação</label>
        <button class="botao" type="submit">Adicionar</button>
      </form>
    </section>`;
}

function telaAjustes() {
  const f = est.familia;
  const agora = new Date();
  const r = R.resumoDaSemana(est.registros, tarefas(), agora, f.metaPct, agora, f.inicio);
  const lembrar = ls.get(CHAVE_LEMBRAR) === f.pinHash;
  const total = totalGanho();
  const textosDela = f.cofreDiario ? est.diario.filter((e) => e.cofreId === f.cofreDiario.id).length : 0;
  const bichinho = f.mascote
    ? `${esc(f.mascote.nome)} (${P.MASCOTES[f.mascote.tipo]?.nome || ''}, ${R.faseDoMascote(total).fase.nome})`
    : 'ainda não escolhido';
  return `
    <section class="cartao">
      <h2>🎯 Meta da semana</h2>
      <p><b data-meta-texto>${f.metaPct}%</b> das tarefas aprovadas (${r.meta} de ${r.total} ⭐ nesta semana)</p>
      <input type="range" min="50" max="100" step="5" value="${f.metaPct}" data-campo="meta" aria-label="Meta da semana em porcentagem">
      <p class="rotulo">O prêmio vocês combinam com ela fora do app.</p>
    </section>
    <section class="cartao">
      <h2>🐾 Como ela está</h2>
      <p>Bichinho: <b>${bichinho}</b></p>
      <p>Estrelas ganhas desde o início: <b>${total} ⭐</b> · no cofrinho: <b>${P.saldo(total, cofrinho())} ⭐</b></p>
      <p>Cantinho do coração: <b>${textosDela} ${textosDela === 1 ? 'texto escrito' : 'textos escritos'}</b>. Só ela consegue ler.</p>
    </section>
    <section class="cartao">
      <h2>📲 Levar para outros celulares</h2>
      <p>Abra este link no celular da sua filha e no da sua esposa:</p>
      <div class="codigo">${formatarCodigo(est.codigo)}</div>
      <button class="botao" data-acao="compartilhar">Compartilhar o link</button>
      <p class="rotulo" style="margin-top:12px">Depois de abrir o link:<br>
        <b>iPhone:</b> no Safari, toque em Compartilhar ⬆️ e depois em "Adicionar à Tela de Início".<br>
        <b>Android:</b> no Chrome, toque nos ⋮ e depois em "Adicionar à tela inicial" ou "Instalar app".</p>
      <p class="rotulo">Quem tiver o link consegue ver e marcar as tarefas. Envie só para a família.</p>
    </section>
    <section class="cartao">
      <h2>🔒 PIN dos pais</h2>
      <label class="check"><input type="checkbox" data-campo="lembrar" ${lembrar ? 'checked' : ''}> Lembrar o PIN neste celular (só no celular de vocês)</label>
      <button class="botao sec" data-acao="trocar-pin">Trocar o PIN</button>
    </section>
    <section class="cartao">
      <h2>📵 Este celular</h2>
      <button class="botao perigo" data-acao="sair-familia">Desconectar este celular da família</button>
      <p class="rotulo">Use só se entrou com o código errado. Os dados não são apagados.</p>
    </section>`;
}

function desenharBoasVindas(mensagem) {
  document.body.classList.remove('com-nav');
  $app.innerHTML = `
    <section class="boas-vindas">
      <div class="grande">✅⭐</div>
      <h1>Minhas tarefas</h1>
      ${est.arm.modo === 'teste' ? '<div class="faixa-teste">Modo teste: os dados ficam só neste aparelho.</div>' : ''}
      ${mensagem ? `<div class="faixa-teste">${esc(mensagem)}</div>` : ''}
      <div class="cartao">
        <h2>👨‍👩‍👧 Primeira vez?</h2>
        <p>Um dos pais cria a família e escolhe um PIN de 4 números.</p>
        <button class="botao" data-acao="criar">Criar a família</button>
      </div>
      <div class="cartao">
        <h2>🔑 Já tenho o código</h2>
        <form data-form="codigo">
          <div class="campo"><label for="cod">Código da família</label>
            <input id="cod" name="codigo" type="text" autocomplete="off" autocapitalize="characters" placeholder="XXXX-XXXX-XXXX" required></div>
          <button class="botao sec" type="submit">Entrar</button>
        </form>
      </div>
    </section>`;
}

// ---------------- janela do PIN ----------------

function pedirPin(titulo) {
  return new Promise((resolve) => {
    const fundo = document.createElement('div');
    fundo.className = 'fundo-janela';
    fundo.innerHTML = `
      <form class="janela cartao" role="dialog" aria-modal="true" aria-labelledby="pin-titulo">
        <h2 id="pin-titulo">${esc(titulo)}</h2>
        <input class="codigo-pin" type="password" inputmode="numeric" pattern="[0-9]{4}" maxlength="4"
          autocomplete="off" required aria-label="PIN de 4 números">
        <button class="botao" type="submit">OK</button>
        <button class="botao sec" type="button" data-cancelar>Cancelar</button>
      </form>`;
    const fechar = (v) => { fundo.remove(); resolve(v); };
    const input = fundo.querySelector('input');
    fundo.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (/^\d{4}$/.test(input.value)) fechar(input.value);
      else aviso('O PIN tem 4 números.');
    });
    fundo.querySelector('[data-cancelar]').addEventListener('click', () => fechar(null));
    fundo.addEventListener('keydown', (e) => { if (e.key === 'Escape') fechar(null); });
    document.body.appendChild(fundo);
    input.focus();
  });
}

async function pedirPinNovo() {
  const a = await pedirPin('Escolha um PIN de 4 números');
  if (!a) return null;
  const b = await pedirPin('Digite o PIN de novo');
  if (!b) return null;
  if (a !== b) { aviso('Os PINs não são iguais. Tente de novo.'); return null; }
  return a;
}

// ---------------- ações ----------------

async function salvarCofrinho(novo) {
  return tentar(() => est.arm.atualizarFamilia(est.codigo, { cofrinho: novo }));
}

async function marcarHoje(idTarefa, estado) {
  const d = new Date();
  return tentar(() => est.arm.marcar(est.codigo, R.chaveData(d), idTarefa, estado, lista(d)));
}

const acoes = {
  async pais() {
    if (est.modoPais) {
      est.modoPais = false;
      est.aba = 'dia';
      desenhar();
      return;
    }
    if (Date.now() < est.bloqueioPinAte) { aviso('Muitas tentativas. Espere um minuto.'); return; }
    const pin = await pedirPin('PIN dos pais');
    if (!pin) return;
    if (await hashPin(est.codigo, pin) === est.familia.pinHash) {
      est.errosPin = 0;
      est.modoPais = true;
      est.aba = 'dia';
      trancarDiario();
      desenhar();
    } else {
      est.errosPin++;
      if (est.errosPin >= 5) { est.errosPin = 0; est.bloqueioPinAte = Date.now() + 60_000; }
      aviso('PIN errado.');
    }
  },

  aba(b) { est.aba = b.dataset.aba; desenhar(); },

  tela(b) {
    if (est.tela === 'coracao' && b.dataset.tela !== 'coracao') trancarDiario();
    est.tela = b.dataset.tela;
    if (est.tela === 'hoje') est.diaSel = new Date();
    desenhar();
    window.scrollTo(0, 0);
  },

  dia(b) {
    est.diaSel = R.dataDaChave(b.dataset.chave);
    desenhar();
  },

  semana(b) {
    let d = R.somarDias(est.diaSel, Number(b.dataset.passo));
    const agora = new Date();
    if (d > agora) d = agora;
    est.diaSel = d;
    desenhar();
  },

  async marcar(b) {
    const d = est.diaSel;
    if (!R.filhaPodeMarcar(d, new Date())) return;
    const chave = R.chaveData(d);
    const t = lista(d).find((x) => x.id === b.dataset.id);
    if (!t) return;
    const prox = R.proximoEstadoDaFilha(R.estadoDaTarefa(est.registros[chave], t.id), t.direto);
    if (!prox) return;
    if (prox === R.ESTADOS.FEITO || prox === R.ESTADOS.APROVADO) {
      const r = b.getBoundingClientRect();
      festa(r.right - 30, r.top + r.height / 2, prox === R.ESTADOS.APROVADO ? 14 : 10);
    }
    await tentar(() => est.arm.marcar(est.codigo, chave, t.id, prox, lista(d)));
  },

  async 'pais-estado'(b) {
    if (!est.modoPais) return;
    const d = est.diaSel;
    if (b.dataset.estado === R.ESTADOS.APROVADO) {
      const r = b.getBoundingClientRect();
      festa(r.left + r.width / 2, r.top, 6);
    }
    await tentar(() => est.arm.marcar(est.codigo, R.chaveData(d), b.dataset.id, b.dataset.estado, lista(d)));
  },

  async 'aprovar-todas'() {
    if (!est.modoPais) return;
    const d = est.diaSel;
    const chave = R.chaveData(d);
    const doDia = lista(d);
    const ids = doDia.filter((t) => R.estadoDaTarefa(est.registros[chave], t.id) === R.ESTADOS.FEITO).map((t) => t.id);
    await tentar(async () => {
      for (const id of ids) await est.arm.marcar(est.codigo, chave, id, R.ESTADOS.APROVADO, doDia);
    });
    festa(window.innerWidth / 2, window.innerHeight / 2, 16);
  },

  async loja(b) {
    const { cat, id } = b.dataset;
    const it = P.item(cat, id);
    if (!it) return;
    const c = cofrinho();
    if (c.usando[cat] === id) return;
    try {
      if (P.temItem(c, cat, id)) {
        await salvarCofrinho(P.usar(c, cat, id));
        return;
      }
      const total = totalGanho();
      if (P.saldo(total, c) < it.preco) {
        aviso(`Faltam ${it.preco - P.saldo(total, c)} ⭐ para "${it.nome}". Você consegue!`);
        return;
      }
      if (!confirm(`Trocar ${it.preco} ⭐ por "${it.nome}"?`)) return;
      if (await salvarCofrinho(P.comprar(c, cat, id, total))) {
        const r = b.getBoundingClientRect();
        festa(r.left + r.width / 2, r.top + r.height / 2, 12, ['🎁', '✨', '⭐']);
        aviso(`🎁 "${it.nome}" é seu!`);
      }
    } catch (e) {
      aviso(e.message);
    }
  },

  async pacote(b) {
    const c = cofrinho();
    const total = totalGanho();
    let r;
    try {
      r = P.abrirPacote(c, total);
    } catch (e) {
      aviso(e.message);
      return;
    }
    if (!confirm(`Abrir um pacotinho por ${P.PRECO_PACOTE} ⭐?`)) return;
    if (await salvarCofrinho(r.cofrinho)) {
      const q = b.getBoundingClientRect();
      festa(q.left + q.width / 2, q.top, 14, [r.figurinha.emoji, '✨', '⭐']);
      aviso(`${r.figurinha.emoji} Figurinha nova: ${r.figurinha.nome}!`);
    }
  },

  trancar() {
    trancarDiario();
    desenhar();
  },

  async esqueci() {
    if (!confirm('Criar uma senha nova? Os textos antigos não vão mais abrir, nem com a senha nova.')) return;
    trancarDiario();
    await tentar(() => est.arm.atualizarFamilia(est.codigo, { cofreDiario: null }));
  },

  subir(b) { mover(b, -1); },
  descer(b) { mover(b, 1); },

  async apagar(b) {
    const i = Number(b.closest('li').dataset.indice);
    const t = tarefas()[i];
    if (!confirm(`Apagar a tarefa "${t.nome}"? Os dias que já passaram continuam com ela.`)) return;
    await salvarTarefas(tarefas().filter((_, j) => j !== i));
  },

  async compartilhar() {
    const link = linkDaFamilia();
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Minhas tarefas', text: 'App de tarefas da família:', url: link });
        return;
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(link);
      aviso('Link copiado! Cole no WhatsApp da família.');
    } catch {
      prompt('Copie o link:', link);
    }
  },

  async 'trocar-pin'() {
    const pin = await pedirPinNovo();
    if (!pin) return;
    const hash = await hashPin(est.codigo, pin);
    const lembrar = ls.get(CHAVE_LEMBRAR) === est.familia.pinHash;
    await tentar(async () => {
      await est.arm.atualizarFamilia(est.codigo, { pinHash: hash });
      if (lembrar) ls.set(CHAVE_LEMBRAR, hash);
      aviso('PIN trocado!');
    });
  },

  'sair-familia'() {
    if (!confirm('Desconectar este celular da família? Para voltar, vai precisar do link ou do código.')) return;
    sairDaFamilia();
    desenharBoasVindas();
  },

  async criar() {
    const pin = await pedirPinNovo();
    if (!pin) return;
    const codigo = gerarCodigo();
    const pinHash = await hashPin(codigo, pin);
    try {
      await est.arm.criarFamilia(codigo, {
        tarefas: R.TAREFAS_INICIAIS,
        metaPct: R.META_INICIAL,
        pinHash,
        inicio: R.chaveData(new Date()),
        mascote: null,
        cofrinho: P.COFRINHO_VAZIO,
        cofreDiario: null,
      });
    } catch (e) {
      console.error(e);
      aviso('Não consegui criar. Confira a internet e tente de novo.');
      return;
    }
    est.modoPais = true;
    est.aba = 'ajustes';
    entrarNaFamilia(codigo);
    aviso('Pronto! Agora compartilhe o link com a família.');
  },
};

function mover(b, passo) {
  const i = Number(b.closest('li').dataset.indice);
  const nova = tarefas();
  const j = i + passo;
  if (j < 0 || j >= nova.length) return;
  [nova[i], nova[j]] = [nova[j], nova[i]];
  salvarTarefas(nova);
}

async function salvarTarefas(nova) {
  const hoje = new Date();
  await tentar(async () => {
    await est.arm.atualizarFamilia(est.codigo, { tarefas: nova });
    // o registro de hoje passa a guardar a lista nova
    await est.arm.gravarListaDoDia(est.codigo, R.chaveData(hoje), R.tarefasDoDia(nova, hoje));
  });
}

function primeiroEmoji(s) {
  const t = String(s || '').trim();
  if (!t) return '⭐';
  if (window.Intl && Intl.Segmenter) {
    const [p] = new Intl.Segmenter('pt', { granularity: 'grapheme' }).segment(t);
    return p ? p.segment : '⭐';
  }
  return Array.from(t)[0];
}

// ---------------- eventos ----------------

$app.addEventListener('click', (e) => {
  const b = e.target.closest('[data-acao]');
  if (!b || b.disabled) return;
  const f = acoes[b.dataset.acao];
  if (f) f(b);
});

$app.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.campo === 'meta') {
    const t = $app.querySelector('[data-meta-texto]');
    if (t) t.textContent = `${el.value}%`;
  }
  if (el.closest('form[data-form=diario]') && el.name === 'texto') est.rascunho.texto = el.value;
});

$app.addEventListener('change', async (e) => {
  const el = e.target;
  // tipo do texto do diário (gratidão / coisas boas sobre mim)
  if (el.closest('form[data-form=diario]') && el.name === 'tipo') {
    est.rascunho.tipo = el.value;
    el.blur();
    desenhar();
    return;
  }
  const campo = el.dataset.campo;
  if (!campo || !est.modoPais) return;

  if (campo === 'meta') {
    await tentar(() => est.arm.atualizarFamilia(est.codigo, { metaPct: Number(el.value) }));
    return;
  }
  if (campo === 'lembrar') {
    if (el.checked) ls.set(CHAVE_LEMBRAR, est.familia.pinHash);
    else ls.del(CHAVE_LEMBRAR);
    return;
  }
  const li = el.closest('li[data-indice]');
  if (!li) return;
  const i = Number(li.dataset.indice);
  const nova = tarefas();
  if (campo === 'nome') {
    const nome = el.value.trim().slice(0, 40);
    if (!nome) { aviso('A tarefa precisa de um nome.'); el.value = nova[i].nome; return; }
    nova[i].nome = nome;
  } else if (campo === 'icone') {
    nova[i].icone = primeiroEmoji(el.value);
  } else if (campo === 'quando') {
    nova[i].quando = el.value;
  } else if (campo === 'periodo') {
    nova[i].periodo = el.value;
  } else if (campo === 'horario') {
    nova[i].horario = el.value.trim().slice(0, 20);
  } else if (campo === 'direto') {
    nova[i].direto = el.checked;
  }
  await salvarTarefas(nova);
});

$app.addEventListener('focusout', () => {
  setTimeout(() => { if (est.redesenharDepois) desenhar(); }, 0);
});

const formularios = {
  async codigo(dados) {
    const codigo = limparCodigo(dados.get('codigo'));
    if (codigo.length < 12) { aviso('O código tem 12 letras e números.'); return; }
    let existe = false;
    try { existe = await est.arm.familiaExiste(codigo); } catch (err) { console.error(err); aviso('Sem conexão. Tente de novo.'); return; }
    if (!existe) { aviso('Não achei esse código. Confira e tente de novo.'); return; }
    entrarNaFamilia(codigo);
  },

  async nova(dados) {
    if (!est.modoPais) return;
    const nome = String(dados.get('nome') || '').trim().slice(0, 40);
    if (!nome) { aviso('A tarefa precisa de um nome.'); return; }
    const atuais = tarefas();
    const nova = {
      id: R.novoIdDeTarefa(nome, atuais),
      nome,
      icone: primeiroEmoji(dados.get('icone')),
      quando: dados.get('quando') || 'semana',
      periodo: dados.get('periodo') || 'tarde',
      horario: String(dados.get('horario') || '').trim().slice(0, 20),
      direto: dados.get('direto') === 'on',
    };
    document.activeElement?.blur();
    await salvarTarefas([...atuais, nova]);
    aviso('Tarefa adicionada!');
  },

  async mascote(dados) {
    const tipo = dados.get('tipo');
    const nome = String(dados.get('nome') || '').trim().slice(0, 20);
    if (!P.MASCOTES[tipo] || !nome) { aviso('Escolha um bichinho e dê um nome.'); return; }
    document.activeElement?.blur();
    est.faseAntes = null;
    if (await tentar(() => est.arm.atualizarFamilia(est.codigo, { mascote: { tipo, nome } }))) {
      festaGrande(['💖', '✨', '🥚', '⭐']);
      aviso(`💖 ${nome} chegou! Cada ⭐ faz ${nome} crescer.`);
    }
  },

  async 'criar-cofre'(dados, form) {
    const senha = String(dados.get('senha') || '');
    if (senha !== String(dados.get('senha2') || '')) { aviso('As senhas não são iguais.'); return; }
    let novo;
    try { novo = await C.criarCofre(senha); } catch (e) { aviso(e.message); return; }
    form.reset();
    document.activeElement?.blur();
    if (await tentar(() => est.arm.atualizarFamilia(est.codigo, { cofreDiario: novo.cofre }))) {
      est.chaveDiario = novo.chave;
      est.cofreAberto = novo.cofre.id;
      est.textos = {};
      aviso('💛 Seu cantinho está pronto!');
      desenhar();
    }
  },

  async 'abrir-cofre'(dados, form) {
    const cofre = est.familia.cofreDiario;
    if (!cofre) return;
    est.abrindo = true;
    document.activeElement?.blur();
    desenhar();
    const chave = await C.abrirCofre(String(dados.get('senha') || ''), cofre);
    est.abrindo = false;
    form.reset?.();
    if (!chave) { aviso('Senha errada.'); desenhar(); return; }
    est.chaveDiario = chave;
    est.cofreAberto = cofre.id;
    est.textos = {};
    desenhar();
    abrirTextos();
  },

  async diario(dados) {
    const cofre = est.familia.cofreDiario;
    if (!est.chaveDiario || !cofre) return;
    const tipo = TIPOS_DIARIO[dados.get('tipo')] ? dados.get('tipo') : 'gratidao';
    const texto = String(dados.get('texto') || '').trim().slice(0, 1000);
    if (!texto) { aviso('Escreva alguma coisa primeiro. 💛'); return; }
    const hoje = new Date();
    const caixa = await C.cifrar(est.chaveDiario, texto);
    document.activeElement?.blur();
    const ok = await tentar(() => est.arm.adicionarDiario(est.codigo, {
      cofreId: cofre.id, data: R.chaveData(hoje), tipo, iv: caixa.iv, dados: caixa.dados, criadoEm: Date.now(),
    }));
    if (!ok) return;
    est.rascunho.texto = '';
    // escrever conta como a tarefa do dia, se ela existir e valer na hora
    const t = lista(hoje).find((x) => x.id === TAREFA_DO_TIPO[tipo]);
    const reg = est.registros[R.chaveData(hoje)];
    if (t && t.direto && R.estadoDaTarefa(reg, t.id) !== R.ESTADOS.APROVADO) {
      await marcarHoje(t.id, R.ESTADOS.APROVADO);
      aviso(`💛 Guardado! E a tarefa "${t.nome}" ganhou ⭐`);
    } else {
      aviso('💛 Guardado no seu cantinho!');
    }
    festa(window.innerWidth / 2, window.innerHeight / 3, 10, ['💛', '✨', '🙏']);
    desenhar();
  },
};

$app.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const f = formularios[form.dataset.form];
  if (f) await f(new FormData(form), form);
});

// virou o dia com o app aberto
function conferirVirada() {
  const k = R.chaveData(new Date());
  if (k === est.ultimoDia) return;
  const estavaEmHoje = R.chaveData(est.diaSel) === est.ultimoDia;
  est.ultimoDia = k;
  if (estavaEmHoje) est.diaSel = new Date();
  if (est.familia) desenhar();
}
setInterval(conferirVirada, 60_000);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // celular bloqueado ou outro app: o diário tranca sozinho
    if (est.chaveDiario) { trancarDiario(); if (est.familia) desenhar(); }
  } else {
    conferirVirada();
  }
});

// ---------------- início ----------------

async function iniciar() {
  try {
    est.arm = await criarArmazenamento(configFirebase);
  } catch (e) {
    console.error(e);
    $app.innerHTML = '<div class="vazio"><span>📡</span>Não consegui conectar.<br>Confira a internet e abra o app de novo.</div>';
    return;
  }
  const daUrl = limparCodigo(new URLSearchParams(location.search).get('f'));
  const codigo = daUrl.length >= 12 ? daUrl : ls.get(CHAVE_CODIGO);
  if (codigo) entrarNaFamilia(codigo);
  else desenharBoasVindas();

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('service worker', e));
  }
}

iniciar();
