// Rodar com: node --test testes/
import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../regras.js';

const seg = new Date(2026, 10, 16); // segunda 16/11/2026
const sab = new Date(2026, 10, 21);
const dom = new Date(2026, 10, 22);

test('semana começa na segunda, inclusive quando é domingo', () => {
  assert.equal(R.chaveData(R.inicioDaSemana(dom)), '2026-11-16');
  assert.equal(R.chaveData(R.inicioDaSemana(seg)), '2026-11-16');
  assert.equal(R.diasDaSemana(sab).length, 7);
});

test('12 tarefas de seg a sex e 8 no fim de semana', () => {
  assert.equal(R.tarefasDoDia(R.TAREFAS_INICIAIS, seg).length, 12);
  const fds = R.tarefasDoDia(R.TAREFAS_INICIAIS, sab).map((t) => t.id);
  assert.deepEqual(fds.sort(), ['agradecer', 'banho', 'dente-almoco', 'dente-manha', 'dente-noite', 'orar', 'palavras-positivas', 'quarto']);
});

test('dia passado registrado mantém a própria lista; hoje segue a lista atual', () => {
  const reg = { tarefas: [{ id: 'x', nome: 'X', icone: '⭐' }], marcas: {} };
  const depois = new Date(2026, 10, 18);
  assert.deepEqual(R.listaDoDia(reg, R.TAREFAS_INICIAIS, seg, depois).map((t) => t.id), ['x']);
  assert.equal(R.listaDoDia(reg, R.TAREFAS_INICIAIS, seg, seg).length, 12);
});

test('situação do dia', () => {
  const hoje = new Date(2026, 10, 18);
  const lista = [{ id: 'a', nome: 'A', icone: '', quando: 'todos' }];
  assert.equal(R.situacaoDoDia(undefined, lista, new Date(2026, 10, 19), hoje), 'futuro');
  assert.equal(R.situacaoDoDia(undefined, lista, seg, hoje), 'naoFeito');
  assert.equal(R.situacaoDoDia({ marcas: { a: 'feito' } }, lista, seg, hoje), 'parcial');
  assert.equal(R.situacaoDoDia({ marcas: { a: 'aprovado' } }, lista, seg, hoje), 'completo');
  assert.equal(R.situacaoDoDia(undefined, lista, hoje, hoje), 'hoje');
  assert.equal(R.situacaoDoDia(undefined, [], seg, hoje), 'livre');
});

test('estrelas só contam aprovadas; meta arredonda para cima', () => {
  const regs = {
    '2026-11-16': { marcas: { louca: 'aprovado', cama: 'feito', banho: 'devolvido' } },
  };
  const r = R.resumoDaSemana(regs, R.TAREFAS_INICIAIS, seg, 80, new Date(2026, 10, 18));
  assert.equal(r.total, 12 * 5 + 8 * 2); // 76
  assert.equal(r.estrelas, 1);
  assert.equal(r.esperando, 1);
  assert.equal(r.meta, 61);
  assert.equal(r.bateuMeta, false);
});

test('dias antes do início não têm tarefas nem contam na meta', () => {
  const hoje = new Date(2026, 10, 18); // quarta
  assert.equal(R.situacaoDoDia(undefined, R.TAREFAS_INICIAIS, seg, hoje, '2026-11-18'), 'antes');
  assert.equal(R.situacaoDoDia(undefined, R.TAREFAS_INICIAIS, hoje, hoje, '2026-11-18'), 'hoje');
  const r = R.resumoDaSemana({}, R.TAREFAS_INICIAIS, hoje, 80, hoje, '2026-11-18');
  assert.equal(r.total, 12 * 3 + 8 * 2); // qua, qui, sex + fim de semana = 52
});

test('filha: alterna feito/pendente, refaz devolvida, não desmarca aprovada, só hoje', () => {
  assert.equal(R.proximoEstadoDaFilha('pendente'), 'feito');
  assert.equal(R.proximoEstadoDaFilha('feito'), 'pendente');
  assert.equal(R.proximoEstadoDaFilha('devolvido'), 'feito');
  assert.equal(R.proximoEstadoDaFilha('aprovado'), null);
  assert.equal(R.filhaPodeMarcar(seg, new Date(2026, 10, 16, 23, 59)), true);
  assert.equal(R.filhaPodeMarcar(seg, new Date(2026, 10, 17)), false);
});

test('id de tarefa nova sem acento e sem repetir', () => {
  assert.equal(R.novoIdDeTarefa('Dar comida ao cão', []), 'dar-comida-ao-cao');
  assert.equal(R.novoIdDeTarefa('Louça', [{ id: 'louca' }]), 'louca-2');
});
