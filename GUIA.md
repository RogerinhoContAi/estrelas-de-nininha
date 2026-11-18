# Minhas tarefas: como colocar no ar

O app já funciona em **modo teste**, mas nesse modo os dados ficam só no aparelho em que ele foi aberto.
Para os três celulares verem as mesmas tarefas, faltam dois passos.

## Passo 1: criar o Firebase (você faz, uns 10 minutos)

1. Entre em https://console.firebase.google.com com a sua conta Google.
2. **Adicionar projeto** → nome `tarefas-casa` → desligue o Google Analytics → **Criar projeto**.
3. No menu da esquerda: **Criação → Authentication → Vamos começar**.
   Na aba *Método de login*, escolha **Anônimo**, ligue e **Salvar**.
4. No menu: **Criação → Firestore Database → Criar banco de dados**.
   - Local: **southamerica-east1 (São Paulo)**
   - Escolha **modo de produção**
   - Depois de criado, abra a aba **Regras**, apague tudo, cole o conteúdo do arquivo
     [firestore.rules](firestore.rules) e clique em **Publicar**.
5. Clique na engrenagem ⚙️ → **Configurações do projeto** → em *Seus apps*, clique no ícone **`</>`** (Web).
   Apelido `tarefas` → **Registrar app** (não precisa marcar o Hosting).
6. Vai aparecer um bloco `firebaseConfig` com `apiKey`, `authDomain`, `projectId`, `appId`...
   **Copie e me mande.** Esses dados não são senha: eles ficam visíveis dentro de qualquer app web.
   A proteção é feita pelas regras do passo 4.

## Passo 2: publicar o link (eu faço, com a sua autorização)

Eu coloco o app no GitHub Pages da sua conta. Ele fica num endereço como
`https://rogerinhocontai.github.io/app-tarefas/`.
O código fica público, mas os dados da família não. Eles ficam no Firebase e só abrem com o código da família.

## Depois de publicado

1. **No seu celular:** abra o link → **Criar a família** → escolha o PIN.
2. Na aba **⚙️ Ajustes**, toque em **Compartilhar o link** e mande pelo WhatsApp para a sua esposa e para a sua filha.
3. Em cada celular, abra o link e adicione o app à tela inicial:
   - **iPhone:** abra no **Safari** → botão Compartilhar ⬆️ → **Adicionar à Tela de Início**.
   - **Android:** abra no **Chrome** → ⋮ → **Adicionar à tela inicial** ou **Instalar app**.
4. No seu celular e no da sua esposa: entre no modo **🔒 Pais** e, em Ajustes, marque
   **Lembrar o PIN neste celular**. **Não marque essa opção no celular da sua filha.**

## Como funciona no dia a dia

O app dela tem três abas embaixo: **🏠 Hoje**, **🐾 Bichinho** e **💛 Coração**.

- **Hoje:** as tarefas aparecem separadas em ☀️ Manhã, 🌤️ Tarde e 🌙 Noite, e o período atual fica em destaque.
  Ela toca na tarefa quando termina e a tarefa fica ⏳ esperando vocês. Só dá para marcar as tarefas do dia de hoje.
- **Orar, agradecer a Deus e falar coisas boas sobre mim** valem a ⭐ na hora, sem aprovação.
  No modo pais, na aba Tarefas, dá para ligar ou desligar isso em qualquer tarefa ("Vale a ⭐ na hora").
- **Bichinho:** na primeira vez ela escolhe entre gatinho, coelhinho, panda e cachorrinho e dá um nome.
  Ele nasce de um ovo e cresce com as estrelas: ovo → filhote → criança → jovem → adulto, em cerca de 3 meses.
  Ele nunca encolhe nem fica triste.
- **Cofrinho:** com as estrelas ela troca por cores do app, cenários, enfeites para o bichinho e pacotinhos de figurinhas.
  Gastar não diminui a meta da semana nem o crescimento do bichinho.
- **Coração:** é um diário trancado com uma senha só dela, de pelo menos 6 letras ou números.
  Os textos saem do celular já embaralhados: vocês veem quantos ela escreveu, mas não conseguem ler.
  **Se ela esquecer a senha, os textos antigos se perdem**, porque ninguém consegue recuperar.
  O diário tranca sozinho quando ela sai da aba ou bloqueia o celular.
- **Ela (resumo):** toca na tarefa quando termina e ela fica ⏳ esperando. Só dá para marcar as tarefas do dia de hoje.
- **Vocês:** 🔒 Pais → ✅ aprova (ela ganha ⭐), ↩️ devolve para refazer, ⭕ desmarca.
  O botão "Aprovar as X que ela marcou" aprova todas de uma vez.
- **Calendário:** ✅ dia completo, 🟡 feito em parte, 😎 folga. Um dia sem nada feito fica cinza, sem ❌. As setas ‹ › mostram as semanas anteriores.
- **Tarefas (modo pais):** dá para incluir e tirar tarefas, mudar o período (manhã, tarde ou noite) e colocar um horário opcional, como "15h às 16h".
- **Ajustes (modo pais):** o quadro "Como ela está" mostra o bichinho, as estrelas ganhas, o saldo do cofrinho e quantos textos ela escreveu.
- **Meta:** começa em 80% das tarefas da semana (segunda a domingo). Vocês mudam em Ajustes.

## Limites que é bom saber

- O PIN protege bem dentro de casa, mas não é um cofre. Se ela vir vocês digitando, ela descobre. Para trocar: Ajustes → Trocar o PIN.
- Quem tiver o link da família consegue ver e marcar tarefas. Envie só para vocês três.
- O "1h de celular" é só um check. O app não bloqueia o celular. Para isso existem o Family Link (Android) e o Tempo de Uso (iPhone).
- Ainda não há notificações. Dá para incluir depois.

## Para quem for mexer no código

- `regras.js`: regras das tarefas, dos dias e das estrelas (testes em `testes/`, rodar com `node --test testes/`)
- `premios.js`: bichinhos, cofrinho, prêmios e figurinhas
- `cripto.js`: tranca do Cantinho do coração (AES-GCM + PBKDF2)
- `mascote-svg.js`: desenhos dos bichinhos
- `armazenamento.js`: Firebase ou modo teste
- `app.js` + `estilo.css`: as telas
- `config-firebase.js`: a configuração do passo 1
