// Regras do app: quais tarefas valem em cada dia, situação do dia e estrelas da semana.
// Não depende de tela nem de banco de dados.

export const ESTADOS = {
  PENDENTE: 'pendente',   // ainda não marcou
  FEITO: 'feito',         // ela marcou, esperando os pais
  APROVADO: 'aprovado',   // pais confirmaram (vale estrela)
  DEVOLVIDO: 'devolvido', // pais pediram para refazer
};

// quando: 'semana' = seg a sex, 'todos' = todos os dias, 'fds' = só sábado e domingo
// periodo: 'manha' | 'tarde' | 'noite'; horario: texto livre opcional ("15h às 16h")
// direto: vale a estrela na hora, sem aprovação dos pais
export const TAREFAS_INICIAIS = [
  { id: 'cama', nome: 'Arrumar a cama', icone: '🛏️', quando: 'semana', periodo: 'manha', horario: '', direto: false },
  { id: 'dente-manha', nome: 'Escovar os dentes (manhã)', icone: '🪥', quando: 'todos', periodo: 'manha', horario: '', direto: false },
  { id: 'orar', nome: 'Orar', icone: '🙏', quando: 'todos', periodo: 'manha', horario: '', direto: true },
  { id: 'dente-almoco', nome: 'Escovar os dentes (almoço)', icone: '🪥', quando: 'todos', periodo: 'tarde', horario: '', direto: false },
  { id: 'louca', nome: 'Lavar a louça', icone: '🍽️', quando: 'semana', periodo: 'tarde', horario: '', direto: false },
  { id: 'estudar', nome: 'Estudar 30 minutos', icone: '📚', quando: 'semana', periodo: 'tarde', horario: '', direto: false },
  { id: 'banho', nome: 'Tomar banho', icone: '🚿', quando: 'todos', periodo: 'noite', horario: '', direto: false },
  { id: 'dente-noite', nome: 'Escovar os dentes (noite)', icone: '🪥', quando: 'todos', periodo: 'noite', horario: '', direto: false },
  { id: 'quarto', nome: 'Arrumar o quarto', icone: '🧸', quando: 'todos', periodo: 'noite', horario: '', direto: false },
  { id: 'celular', nome: 'Só 1 hora de celular', icone: '📱', quando: 'semana', periodo: 'noite', horario: '', direto: false },
  { id: 'agradecer', nome: 'Agradecer a Deus por algo do dia', icone: '💛', quando: 'todos', periodo: 'noite', horario: '', direto: true },
  { id: 'palavras-positivas', nome: 'Falar coisas boas sobre mim', icone: '🌟', quando: 'todos', periodo: 'noite', horario: '', direto: true },
];

export const PERIODOS = { manha: 'Manhã', tarde: 'Tarde', noite: 'Noite' };
export const ICONES_PERIODO = { manha: '☀️', tarde: '🌤️', noite: '🌙' };

export function periodoAgora(d) {
  const h = d.getHours();
  if (h < 12) return 'manha';
  if (h < 18) return 'tarde';
  return 'noite';
}

const PERIODO_PADRAO = Object.fromEntries(TAREFAS_INICIAIS.map((t) => [t.id, t.periodo]));
const DIRETO_PADRAO = new Set(TAREFAS_INICIAIS.filter((t) => t.direto).map((t) => t.id));

// Tarefas salvas antes da versão 2 não tinham período, horário nem "direto".
export function normalizarTarefa(t) {
  return {
    ...t,
    periodo: PERIODOS[t.periodo] ? t.periodo : (PERIODO_PADRAO[t.id] || 'tarde'),
    horario: typeof t.horario === 'string' ? t.horario : '',
    direto: typeof t.direto === 'boolean' ? t.direto : DIRETO_PADRAO.has(t.id),
  };
}

export const META_INICIAL = 80; // % das tarefas da semana

export const NOMES_QUANDO = {
  semana: 'Seg a sex',
  todos: 'Todos os dias',
  fds: 'Só fim de semana',
};

// ---------- datas (sempre no horário local) ----------

export function chaveData(d) {
  const a = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${a}-${m}-${dia}`;
}

export function dataDaChave(chave) {
  const [a, m, d] = chave.split('-').map(Number);
  return new Date(a, m - 1, d);
}

export function somarDias(d, n) {
  const r = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  r.setDate(r.getDate() + n);
  return r;
}

// Segunda-feira da semana da data (semana vai de segunda a domingo)
export function inicioDaSemana(d) {
  const diaSemana = d.getDay(); // 0 = domingo
  const voltar = diaSemana === 0 ? 6 : diaSemana - 1;
  return somarDias(d, -voltar);
}

export function diasDaSemana(d) {
  const seg = inicioDaSemana(d);
  return Array.from({ length: 7 }, (_, i) => somarDias(seg, i));
}

export function ehFimDeSemana(d) {
  const ds = d.getDay();
  return ds === 0 || ds === 6;
}

// ---------- tarefas do dia ----------

export function valeNoDia(tarefa, d) {
  const fds = ehFimDeSemana(d);
  if (tarefa.quando === 'todos') return true;
  if (tarefa.quando === 'fds') return fds;
  return !fds; // 'semana'
}

export function tarefasDoDia(listaAtual, d) {
  return listaAtual
    .filter((t) => valeNoDia(t, d))
    .map((t) => {
      const { id, nome, icone, periodo, horario, direto } = normalizarTarefa(t);
      return { id, nome, icone, periodo, horario, direto };
    });
}

// Hoje e os próximos dias seguem a lista atual. Um dia que já passou e foi
// registrado guarda a própria lista, para não mudar o passado quando os pais
// editam as tarefas. Dia passado sem registro usa a lista atual.
// inicio (AAAA-MM-DD, opcional): dia em que a família começou a usar o app.
// Antes dele não há tarefas, para não contar dias em que o app nem existia.
export function listaDoDia(registroDoDia, listaAtual, d, hoje, inicio) {
  if (inicio && chaveData(d) < inicio) return [];
  const passado = chaveData(d) < chaveData(hoje);
  if (passado && registroDoDia && Array.isArray(registroDoDia.tarefas)) return registroDoDia.tarefas.map(normalizarTarefa);
  return tarefasDoDia(listaAtual, d);
}

export function estadoDaTarefa(registroDoDia, idTarefa) {
  return (registroDoDia && registroDoDia.marcas && registroDoDia.marcas[idTarefa]) || ESTADOS.PENDENTE;
}

// Situação de um dia para o calendário
// 'antes' | 'futuro' | 'hoje' | 'completo' | 'parcial' | 'naoFeito' | 'livre'
export function situacaoDoDia(registroDoDia, listaAtual, d, hoje, inicio) {
  const k = chaveData(d);
  const kh = chaveData(hoje);
  if (inicio && k < inicio) return 'antes';
  const lista = listaDoDia(registroDoDia, listaAtual, d, hoje, inicio);
  if (k > kh) return 'futuro';
  if (lista.length === 0) return 'livre';
  const aprovadas = lista.filter((t) => estadoDaTarefa(registroDoDia, t.id) === ESTADOS.APROVADO).length;
  if (aprovadas === lista.length) return 'completo';
  if (k === kh) return 'hoje';
  const mexeu = lista.some((t) => estadoDaTarefa(registroDoDia, t.id) !== ESTADOS.PENDENTE);
  return mexeu ? 'parcial' : 'naoFeito';
}

// ---------- estrelas ----------

// registros: { 'AAAA-MM-DD': registroDoDia }
export function resumoDaSemana(registros, listaAtual, dataQualquer, metaPct, hoje, inicio) {
  let total = 0;
  let estrelas = 0;
  let esperando = 0;
  for (const d of diasDaSemana(dataQualquer)) {
    const reg = registros[chaveData(d)];
    const lista = listaDoDia(reg, listaAtual, d, hoje, inicio);
    total += lista.length;
    for (const t of lista) {
      const e = estadoDaTarefa(reg, t.id);
      if (e === ESTADOS.APROVADO) estrelas++;
      if (e === ESTADOS.FEITO) esperando++;
    }
  }
  const meta = Math.ceil((total * metaPct) / 100);
  return { total, estrelas, esperando, meta, bateuMeta: total > 0 && estrelas >= meta };
}

// Todas as estrelas já ganhas (tarefas aprovadas em todos os dias registrados).
export function estrelasTotais(registros, listaAtual, hoje, inicio) {
  let total = 0;
  for (const [chave, reg] of Object.entries(registros)) {
    const d = dataDaChave(chave);
    for (const t of listaDoDia(reg, listaAtual, d, hoje, inicio)) {
      if (estadoDaTarefa(reg, t.id) === ESTADOS.APROVADO) total++;
    }
  }
  return total;
}

// ---------- mascote ----------

// Com ~80% das tarefas (≈60 estrelas por semana) vira adulto em cerca de 3 meses.
export const FASES = [
  { id: 'ovo', nome: 'Ovo', min: 0 },
  { id: 'filhote', nome: 'Filhote', min: 30 },
  { id: 'crianca', nome: 'Criança', min: 200 },
  { id: 'jovem', nome: 'Jovem', min: 450 },
  { id: 'adulto', nome: 'Adulto', min: 780 },
];

export function faseDoMascote(totalEstrelas) {
  let i = 0;
  while (i + 1 < FASES.length && totalEstrelas >= FASES[i + 1].min) i++;
  const fase = FASES[i];
  const proxima = FASES[i + 1] || null;
  const faltam = proxima ? proxima.min - totalEstrelas : 0;
  const progresso = proxima ? (totalEstrelas - fase.min) / (proxima.min - fase.min) : 1;
  return { indice: i, fase, proxima, faltam, progresso };
}

// ---------- quem pode mudar o quê ----------

// A filha só mexe no dia de hoje e só alterna entre pendente/devolvido -> feito e feito -> pendente.
// Uma tarefa já aprovada ela não desmarca, exceto as "diretas" (orar, agradecer...),
// que vão direto para aprovado e ela pode desmarcar se tocou sem querer.
export function proximoEstadoDaFilha(estadoAtual, direto = false) {
  if (direto) return estadoAtual === ESTADOS.APROVADO ? ESTADOS.PENDENTE : ESTADOS.APROVADO;
  if (estadoAtual === ESTADOS.FEITO) return ESTADOS.PENDENTE;
  if (estadoAtual === ESTADOS.APROVADO) return null;
  return ESTADOS.FEITO;
}

export function filhaPodeMarcar(d, hoje) {
  return chaveData(d) === chaveData(hoje);
}

// ---------- tarefas novas ----------

export function novoIdDeTarefa(nome, existentes) {
  const base = nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24) || 'tarefa';
  const ids = new Set(existentes.map((t) => t.id));
  let id = base;
  let n = 2;
  while (ids.has(id)) id = `${base}-${n++}`;
  return id;
}
