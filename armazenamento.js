// Onde os dados ficam guardados. Mesma interface para os dois modos:
//  - 'firebase': sincroniza entre os celulares (Firestore + login anônimo)
//  - 'teste': só neste aparelho (localStorage), para experimentar sem configurar nada
//
// Estrutura:
//   familias/{codigo}             { tarefas, metaPct, pinHash }
//   familias/{codigo}/dias/{data} { tarefas, marcas: { idTarefa: estado } }

const VERSAO_FIREBASE = '10.12.2';

export async function criarArmazenamento(config) {
  if (config && config.apiKey) return criarFirebase(config);
  return criarTeste();
}

// ---------------- Firebase ----------------

async function criarFirebase(config) {
  const base = `https://www.gstatic.com/firebasejs/${VERSAO_FIREBASE}`;
  const { initializeApp } = await import(`${base}/firebase-app.js`);
  const { getAuth, signInAnonymously } = await import(`${base}/firebase-auth.js`);
  const fs = await import(`${base}/firebase-firestore.js`);

  const app = initializeApp(config);
  await signInAnonymously(getAuth(app));
  const db = fs.initializeFirestore(app, {
    localCache: fs.persistentLocalCache(), // continua abrindo sem internet
  });

  const refFamilia = (cod) => fs.doc(db, 'familias', cod);
  const refDia = (cod, chave) => fs.doc(db, 'familias', cod, 'dias', chave);

  return {
    modo: 'firebase',

    async familiaExiste(cod) {
      const s = await fs.getDoc(refFamilia(cod));
      return s.exists();
    },

    async criarFamilia(cod, dados) {
      await fs.setDoc(refFamilia(cod), dados);
    },

    ouvirFamilia(cod, cb, erro) {
      return fs.onSnapshot(refFamilia(cod), (s) => cb(s.exists() ? s.data() : null), erro);
    },

    async atualizarFamilia(cod, parcial) {
      await fs.updateDoc(refFamilia(cod), parcial);
    },

    ouvirDias(cod, deChave, ateChave, cb, erro) {
      const q = fs.query(
        fs.collection(db, 'familias', cod, 'dias'),
        fs.where(fs.documentId(), '>=', deChave),
        fs.where(fs.documentId(), '<=', ateChave),
      );
      return fs.onSnapshot(
        q,
        (snap) => {
          const regs = {};
          snap.forEach((d) => { regs[d.id] = d.data(); });
          cb(regs);
        },
        erro,
      );
    },

    async marcar(cod, chave, idTarefa, estado, tarefasDoDia) {
      await fs.setDoc(
        refDia(cod, chave),
        { tarefas: tarefasDoDia, marcas: { [idTarefa]: estado } },
        { merge: true },
      );
    },

    async gravarListaDoDia(cod, chave, tarefasDoDia) {
      await fs.setDoc(refDia(cod, chave), { tarefas: tarefasDoDia }, { merge: true });
    },

    // Cantinho do coração: os textos já chegam aqui cifrados
    ouvirDiario(cod, cb, erro) {
      return fs.onSnapshot(
        fs.collection(db, 'familias', cod, 'diario'),
        (snap) => {
          const lista = [];
          snap.forEach((d) => lista.push({ id: d.id, ...d.data() }));
          cb(lista);
        },
        erro,
      );
    },

    async adicionarDiario(cod, entrada) {
      await fs.addDoc(fs.collection(db, 'familias', cod, 'diario'), entrada);
    },
  };
}

// ---------------- Modo teste (só neste aparelho) ----------------

function criarTeste() {
  const PREFIXO = 'tarefas-teste:';
  const ouvintes = new Set();

  const ler = (k) => {
    try { return JSON.parse(localStorage.getItem(PREFIXO + k)); } catch { return null; }
  };
  const gravar = (k, v) => {
    try { localStorage.setItem(PREFIXO + k, JSON.stringify(v)); } catch { /* sem espaço */ }
    avisar();
  };
  const avisar = () => ouvintes.forEach((f) => f());
  window.addEventListener('storage', avisar); // outra aba mudou

  const ouvir = (f) => {
    ouvintes.add(f);
    f();
    return () => ouvintes.delete(f);
  };

  return {
    modo: 'teste',

    async familiaExiste(cod) { return !!ler(`familia:${cod}`); },

    async criarFamilia(cod, dados) { gravar(`familia:${cod}`, dados); },

    ouvirFamilia(cod, cb) { return ouvir(() => cb(ler(`familia:${cod}`))); },

    async atualizarFamilia(cod, parcial) {
      gravar(`familia:${cod}`, { ...ler(`familia:${cod}`), ...parcial });
    },

    ouvirDias(cod, deChave, ateChave, cb) {
      return ouvir(() => {
        const todos = ler(`dias:${cod}`) || {};
        const regs = {};
        for (const [k, v] of Object.entries(todos)) if (k >= deChave && k <= ateChave) regs[k] = v;
        cb(regs);
      });
    },

    async marcar(cod, chave, idTarefa, estado, tarefasDoDia) {
      const todos = ler(`dias:${cod}`) || {};
      const atual = todos[chave] || { marcas: {} };
      todos[chave] = {
        tarefas: tarefasDoDia,
        marcas: { ...atual.marcas, [idTarefa]: estado },
      };
      gravar(`dias:${cod}`, todos);
    },

    async gravarListaDoDia(cod, chave, tarefasDoDia) {
      const todos = ler(`dias:${cod}`) || {};
      todos[chave] = { marcas: {}, ...todos[chave], tarefas: tarefasDoDia };
      gravar(`dias:${cod}`, todos);
    },

    ouvirDiario(cod, cb) {
      return ouvir(() => cb(ler(`diario:${cod}`) || []));
    },

    async adicionarDiario(cod, entrada) {
      const lista = ler(`diario:${cod}`) || [];
      lista.push({ id: `e${Date.now()}${Math.random().toString(36).slice(2, 6)}`, ...entrada });
      gravar(`diario:${cod}`, lista);
    },
  };
}
