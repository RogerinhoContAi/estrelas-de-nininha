// Rodar com: node --test testes/
import test from 'node:test';
import assert from 'node:assert/strict';
import * as R from '../regras.js';
import * as P from '../premios.js';
import * as C from '../cripto.js';

const seg = new Date(2026, 10, 16);
const hoje = new Date(2026, 10, 18);

test('cada tarefa inicial tem período; orar/agradecer/palavras são diretas', () => {
  for (const t of R.TAREFAS_INICIAIS) assert.ok(R.PERIODOS[t.periodo], t.id);
  const diretas = R.TAREFAS_INICIAIS.filter((t) => t.direto).map((t) => t.id);
  assert.deepEqual(diretas, ['orar', 'agradecer', 'palavras-positivas']);
});

test('tarefa antiga sem período recebe o padrão', () => {
  const t = R.normalizarTarefa({ id: 'celular', nome: 'Celular', icone: '📱', quando: 'semana' });
  assert.equal(t.periodo, 'noite');
  assert.equal(t.horario, '');
  assert.equal(t.direto, false);
  assert.equal(R.normalizarTarefa({ id: 'nova', quando: 'todos' }).periodo, 'tarde');
  assert.equal(R.normalizarTarefa({ id: 'orar' }).direto, true);
});

test('período do dia pela hora', () => {
  assert.equal(R.periodoAgora(new Date(2026, 0, 1, 7)), 'manha');
  assert.equal(R.periodoAgora(new Date(2026, 0, 1, 12)), 'tarde');
  assert.equal(R.periodoAgora(new Date(2026, 0, 1, 18)), 'noite');
});

test('tarefa direta vai direto para aprovada e ela pode desmarcar', () => {
  assert.equal(R.proximoEstadoDaFilha('pendente', true), 'aprovado');
  assert.equal(R.proximoEstadoDaFilha('aprovado', true), 'pendente');
  assert.equal(R.proximoEstadoDaFilha('aprovado', false), null);
});

test('estrelas totais somam todos os dias, só aprovadas', () => {
  const regs = {
    '2026-11-16': { marcas: { louca: 'aprovado', cama: 'feito', orar: 'aprovado' } },
    '2026-11-17': { marcas: { banho: 'aprovado' } },
  };
  assert.equal(R.estrelasTotais(regs, R.TAREFAS_INICIAIS, hoje), 3);
  assert.equal(R.estrelasTotais(regs, R.TAREFAS_INICIAIS, hoje, '2026-11-17'), 1);
});

test('fases do mascote nunca voltam e chegam a adulto em 780', () => {
  assert.equal(R.faseDoMascote(0).fase.id, 'ovo');
  assert.equal(R.faseDoMascote(29).faltam, 1);
  assert.equal(R.faseDoMascote(30).fase.id, 'filhote');
  assert.equal(R.faseDoMascote(779).fase.id, 'jovem');
  const a = R.faseDoMascote(5000);
  assert.equal(a.fase.id, 'adulto');
  assert.equal(a.proxima, null);
  assert.equal(a.progresso, 1);
});

test('comprar desconta do cofrinho, não do total, e já usa o item', () => {
  let c = P.normalizarCofrinho(null);
  assert.equal(P.saldo(50, c), 50);
  c = P.comprar(c, 'fundo', 'praia', 50);
  assert.equal(c.gastas, 40);
  assert.equal(c.usando.fundo, 'praia');
  assert.equal(P.saldo(50, c), 10);
  assert.throws(() => P.comprar(c, 'fundo', 'galaxia', 50), /faltam estrelas/);
  // comprar de novo o que já tem não cobra
  assert.equal(P.comprar(c, 'fundo', 'praia', 50).gastas, 40);
  // itens grátis podem ser usados sem comprar
  assert.equal(P.usar(c, 'cor', 'roxo').usando.cor, 'roxo');
  assert.throws(() => P.usar(c, 'cor', 'rosa'), /Primeiro troque/);
});

test('pacotinho sempre traz figurinha nova até completar o álbum', () => {
  let c = P.normalizarCofrinho(null);
  const total = P.PRECO_PACOTE * P.FIGURINHAS.length;
  const vistas = new Set();
  for (let i = 0; i < P.FIGURINHAS.length; i++) {
    const r = P.abrirPacote(c, total, () => 0.999);
    assert.ok(!vistas.has(r.figurinha.id));
    vistas.add(r.figurinha.id);
    c = r.cofrinho;
  }
  assert.equal(P.saldo(total, c), 0);
  assert.throws(() => P.abrirPacote(c, total + 100), /completou/);
});

test('diário: senha certa abre, errada não, e o texto volta igual', async () => {
  const { cofre, chave } = await C.criarCofre('girassol7');
  assert.ok(!JSON.stringify(cofre).includes('girassol7'));
  const caixa = await C.cifrar(chave, 'Obrigada, Deus, pela minha família 💛');
  assert.ok(!caixa.dados.includes('família'));
  const k2 = await C.abrirCofre('girassol7', cofre);
  assert.ok(k2);
  assert.equal(await C.decifrar(k2, caixa), 'Obrigada, Deus, pela minha família 💛');
  assert.equal(await C.abrirCofre('errada1', cofre), null);
  await assert.rejects(() => C.criarCofre('123'), /pelo menos 6/);
});
