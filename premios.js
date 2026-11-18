// Mascotes, prêmios do cofrinho e figurinhas. Não depende de tela nem de banco.
// O cofrinho guarda só o que foi GASTO; o saldo é (estrelas ganhas - gastas).
// Assim gastar nunca diminui a meta da semana nem o crescimento do mascote.

export const MASCOTES = {
  gato: { nome: 'Gatinho' },
  coelho: { nome: 'Coelhinho' },
  panda: { nome: 'Panda' },
  cachorro: { nome: 'Cachorrinho' },
};

export const CORES = [
  { id: 'roxo', nome: 'Roxo', preco: 0, valor: '#7c3aed' },
  { id: 'rosa', nome: 'Rosa', preco: 15, valor: '#db2777' },
  { id: 'azul', nome: 'Azul', preco: 15, valor: '#2563eb' },
  { id: 'verde', nome: 'Verde', preco: 15, valor: '#15803d' },
  { id: 'laranja', nome: 'Laranja', preco: 15, valor: '#c2410c' },
  { id: 'turquesa', nome: 'Turquesa', preco: 20, valor: '#0f766e' },
  { id: 'vermelho', nome: 'Vermelho', preco: 20, valor: '#b91c1c' },
];

// Fundos são o cenário do bichinho
export const FUNDOS = [
  { id: 'nenhum', nome: 'Simples', preco: 0, css: 'linear-gradient(180deg,#f5f3ff,#ede9fe)' },
  { id: 'nuvens', nome: 'Nuvens', preco: 40, css: 'radial-gradient(circle at 25% 30%,#fff 0 12%,transparent 13%),radial-gradient(circle at 70% 22%,#fff 0 9%,transparent 10%),linear-gradient(180deg,#bae6fd,#e0f2fe)' },
  { id: 'jardim', nome: 'Jardim', preco: 40, css: 'radial-gradient(circle at 15% 85%,#f9a8d4 0 4%,transparent 5%),radial-gradient(circle at 80% 88%,#fde047 0 4%,transparent 5%),linear-gradient(180deg,#e0f2fe 0 62%,#86efac 62%)' },
  { id: 'praia', nome: 'Praia', preco: 40, css: 'radial-gradient(circle at 82% 18%,#fde047 0 9%,transparent 10%),linear-gradient(180deg,#bae6fd 0 55%,#38bdf8 55% 70%,#fde68a 70%)' },
  { id: 'por-do-sol', nome: 'Pôr do sol', preco: 50, css: 'radial-gradient(circle at 50% 75%,#fde047 0 14%,transparent 15%),linear-gradient(180deg,#fdba74,#f9a8d4)' },
  { id: 'arco-iris', nome: 'Arco-íris', preco: 50, css: 'radial-gradient(circle at 50% 110%,transparent 0 38%,#c4b5fd 38% 43%,#93c5fd 43% 48%,#86efac 48% 53%,#fde047 53% 58%,#fdba74 58% 63%,#fca5a5 63% 68%,transparent 68%),linear-gradient(180deg,#e0f2fe,#fdf4ff)' },
  { id: 'galaxia', nome: 'Galáxia', preco: 60, css: 'radial-gradient(circle at 20% 25%,#fff 0 1%,transparent 1.5%),radial-gradient(circle at 75% 15%,#fff 0 1%,transparent 1.5%),radial-gradient(circle at 60% 60%,#fff 0 .8%,transparent 1.3%),radial-gradient(circle at 35% 70%,#fde047 0 1%,transparent 1.5%),linear-gradient(180deg,#4c1d95,#1e3a8a)' },
];

// x, y e tamanho no desenho do bichinho (200x200)
export const ACESSORIOS = [
  { id: 'nenhum', nome: 'Nenhum', preco: 0, emoji: '', x: 0, y: 0, tamanho: 0 },
  { id: 'laco', nome: 'Laço', preco: 80, emoji: '🎀', x: 128, y: 52, tamanho: 34 },
  { id: 'flor', nome: 'Florzinha', preco: 80, emoji: '🌸', x: 70, y: 52, tamanho: 30 },
  { id: 'oculos', nome: 'Óculos', preco: 90, emoji: '🕶️', x: 100, y: 98, tamanho: 50 },
  { id: 'cachecol', nome: 'Cachecol', preco: 100, emoji: '🧣', x: 100, y: 146, tamanho: 44 },
  { id: 'chapeu', nome: 'Chapéu', preco: 120, emoji: '🎩', x: 100, y: 44, tamanho: 44 },
  { id: 'coroa', nome: 'Coroa', preco: 150, emoji: '👑', x: 100, y: 42, tamanho: 42 },
];

export const PRECO_PACOTE = 25;

export const FIGURINHAS = [
  ['unicornio', '🦄', 'Unicórnio'], ['golfinho', '🐬', 'Golfinho'], ['borboleta', '🦋', 'Borboleta'],
  ['arco', '🌈', 'Arco-íris'], ['morango', '🍓', 'Morango'], ['rosquinha', '🍩', 'Rosquinha'],
  ['cupcake', '🧁', 'Cupcake'], ['melancia', '🍉', 'Melancia'], ['girassol', '🌻', 'Girassol'],
  ['lua', '🌙', 'Lua'], ['estrela', '⭐', 'Estrela'], ['foguete', '🚀', 'Foguete'],
  ['pintura', '🎨', 'Pintura'], ['violao', '🎸', 'Violão'], ['livros', '📚', 'Livros'],
  ['bola', '⚽', 'Bola'], ['tartaruga', '🐢', 'Tartaruga'], ['raposa', '🦊', 'Raposa'],
  ['abelha', '🐝', 'Abelha'], ['trevo', '🍀', 'Trevo'], ['balao', '🎈', 'Balão'],
  ['onda', '🌊', 'Onda'], ['castelo', '🏰', 'Castelo'], ['diamante', '💎', 'Diamante'],
].map(([id, emoji, nome]) => ({ id, emoji, nome }));

export const CATEGORIAS = { cor: CORES, fundo: FUNDOS, acessorio: ACESSORIOS };

export const COFRINHO_VAZIO = {
  gastas: 0,
  comprados: [],
  figurinhas: [],
  usando: { cor: 'roxo', fundo: 'nenhum', acessorio: 'nenhum' },
};

export function normalizarCofrinho(c) {
  const v = c || {};
  return {
    gastas: Number.isFinite(v.gastas) ? v.gastas : 0,
    comprados: Array.isArray(v.comprados) ? v.comprados : [],
    figurinhas: Array.isArray(v.figurinhas) ? v.figurinhas : [],
    usando: { ...COFRINHO_VAZIO.usando, ...(v.usando || {}) },
  };
}

export function saldo(totalGanho, cofrinho) {
  return Math.max(0, totalGanho - normalizarCofrinho(cofrinho).gastas);
}

export function item(categoria, id) {
  return (CATEGORIAS[categoria] || []).find((x) => x.id === id) || null;
}

export function temItem(cofrinho, categoria, id) {
  const it = item(categoria, id);
  if (!it) return false;
  return it.preco === 0 || normalizarCofrinho(cofrinho).comprados.includes(`${categoria}:${id}`);
}

// Devolve o cofrinho novo, já usando o item. Lança Error com mensagem para a tela.
export function comprar(cofrinho, categoria, id, totalGanho) {
  const c = normalizarCofrinho(cofrinho);
  const it = item(categoria, id);
  if (!it) throw new Error('Esse prêmio não existe.');
  if (temItem(c, categoria, id)) return usar(c, categoria, id);
  if (saldo(totalGanho, c) < it.preco) throw new Error('Ainda faltam estrelas para esse prêmio.');
  return usar({
    ...c,
    gastas: c.gastas + it.preco,
    comprados: [...c.comprados, `${categoria}:${id}`],
  }, categoria, id);
}

export function usar(cofrinho, categoria, id) {
  const c = normalizarCofrinho(cofrinho);
  if (!temItem(c, categoria, id)) throw new Error('Primeiro troque as estrelas por esse prêmio.');
  return { ...c, usando: { ...c.usando, [categoria]: id } };
}

// Um pacotinho sempre traz uma figurinha que ela ainda não tem.
export function abrirPacote(cofrinho, totalGanho, aleatorio = Math.random) {
  const c = normalizarCofrinho(cofrinho);
  const faltando = FIGURINHAS.filter((f) => !c.figurinhas.includes(f.id));
  if (faltando.length === 0) throw new Error('Você já completou o álbum! 🎉');
  if (saldo(totalGanho, c) < PRECO_PACOTE) throw new Error('Ainda faltam estrelas para o pacotinho.');
  const figurinha = faltando[Math.floor(aleatorio() * faltando.length) % faltando.length];
  return {
    cofrinho: { ...c, gastas: c.gastas + PRECO_PACOTE, figurinhas: [...c.figurinhas, figurinha.id] },
    figurinha,
  };
}
