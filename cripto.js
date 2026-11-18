// Tranca do Cantinho do coração. Os textos saem do celular dela já cifrados
// (AES-GCM com chave derivada da senha dela por PBKDF2). Sem a senha, ninguém
// lê, nem os pais, nem quem tiver acesso ao banco. Esqueceu a senha = perdeu os textos.

export const SENHA_MINIMA = 6;
const ITERACOES = 210000;
const MARCA = 'cantinho-ok';

const enc = new TextEncoder();
const dec = new TextDecoder();

function paraB64(buf) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}
function deB64(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function derivar(senha, salt, iteracoes) {
  const base = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: iteracoes, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function cifrar(chave, texto) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const dados = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, chave, enc.encode(texto));
  return { iv: paraB64(iv), dados: paraB64(dados) };
}

export async function decifrar(chave, { iv, dados }) {
  const claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(iv) }, chave, deB64(dados));
  return dec.decode(claro);
}

// Cria a tranca nova. "cofre" vai para o banco (não contém a senha); "chave" fica só na memória.
export async function criarCofre(senha) {
  if (String(senha).length < SENHA_MINIMA) throw new Error(`A senha precisa ter pelo menos ${SENHA_MINIMA} letras ou números.`);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const id = paraB64(crypto.getRandomValues(new Uint8Array(9))).replace(/[^A-Za-z0-9]/g, 'x');
  const chave = await derivar(senha, salt, ITERACOES);
  const verificador = await cifrar(chave, MARCA);
  return { cofre: { id, salt: paraB64(salt), iteracoes: ITERACOES, verificador }, chave };
}

// Devolve a chave se a senha estiver certa, ou null.
export async function abrirCofre(senha, cofre) {
  try {
    const chave = await derivar(senha, deB64(cofre.salt), cofre.iteracoes || ITERACOES);
    return (await decifrar(chave, cofre.verificador)) === MARCA ? chave : null;
  } catch {
    return null;
  }
}
