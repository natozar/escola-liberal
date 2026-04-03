Tarefa: Testar CADA caminho de navegação do app. Cada botão, cada tela, cada transição. Se encontrar erro, corrigir IMEDIATAMENTE antes de ir para o próximo teste. Leia app.js, app.html, app.css ANTES de testar. Execute sem perguntar. Commit e deploy ao final.

REGRA: NÃO pule para o próximo teste se o atual falhar. Corrija primeiro.

---

### TESTE 1 — BOOT SEM ERROS

```bash
npm run dev
```

Abrir app.html no browser. Verificar:

- [ ] Tela carrega sem tela branca
- [ ] Console tem ZERO erros (abrir DevTools > Console)
- [ ] Console tem ZERO warnings de "undefined" ou "null"
- [ ] Nenhum 404 no Network tab
- [ ] Dashboard renderiza com módulos visíveis
- [ ] XP, streak e level aparecem

Se QUALQUER erro existir no console: LER o erro, ENCONTRAR a linha no código, CORRIGIR. Recarregar e testar novamente até zero erros.

---

### TESTE 2 — BOTTOM NAV (5 botões)

Clicar em cada botão da barra inferior, um por um:

```
Botão 1 → Qual função chama? Verificar que renderiza a view correta no #main
         → Conteúdo aparece? SIM/NÃO → Se NÃO: debug e corrigir
         → Console tem erro? → Se SIM: corrigir

Botão 2 → Mesma verificação
Botão 3 → Mesma verificação (botão central/destaque)
Botão 4 → Mesma verificação
Botão 5 → Mesma verificação
```

Para cada botão:
- Clicar
- Verificar que #main.innerHTML mudou (não ficou vazio)
- Verificar zero erros no console
- Verificar que o botão ativo muda de visual (cor/estado)
- Clicar no próximo botão e verificar que a view anterior é substituída

Se algum botão não funciona: verificar o onclick/event listener, verificar que a função existe no escopo global, corrigir.

---

### TESTE 3 — MOBILE HEADER (barra superior)

- [ ] Header aparece como UMA barra só (não duas)
- [ ] Botão 💬 Debate existe e é clicável
- [ ] Botão Debate executa goDebate() sem erro
- [ ] Badge de online count mostra número
- [ ] Streak e XP aparecem com valores
- [ ] Avatar aparece
- [ ] Botão voltar (←) aparece SOMENTE em sub-telas, NÃO no dashboard
- [ ] Botão update (🔄) está escondido (só aparece quando há SW update)

Se header mostra DUAS barras: verificar se há dois elementos fixos no topo (ver app.html), remover duplicata, verificar safe-area-inset-top não aplicada 2x.

---

### TESTE 4 — DEBATE COMPLETO

```
4.1 Clicar 💬 Debate
→ [ ] Lista de 15 salas renderiza no #main
→ [ ] Cada sala tem: ícone, nome, contagem online
→ [ ] Zero erros no console
→ Se NÃO renderiza: verificar goDebate() existe, DEBATE_ROOMS definido, #main existe

4.2 Clicar sala "Economia & Livre Mercado"
→ [ ] Chat abre (mensagens visíveis)
→ [ ] Se não logado: prompt de login aparece no lugar do input
→ [ ] Se logado/OFFLINE_MODE com nome: input de texto aparece
→ [ ] Zero erros no console
→ Se tela branca: verificar goRoom() existe, recebe roomId correto

4.3 Testar login offline (se OFFLINE_MODE = true)
→ [ ] Modal pede nome + avatar
→ [ ] Digitar nome + selecionar avatar + confirmar
→ [ ] Modal fecha e input libera
→ [ ] Zero erros no console

4.4 Enviar mensagem
→ [ ] Digitar texto no campo + Enter
→ [ ] Mensagem aparece no chat com nome + avatar + hora
→ [ ] Campo limpa após envio
→ [ ] Auto-scroll para baixo
→ [ ] Zero erros no console
→ Se mensagem NÃO aparece: verificar sendDebateMessage(), appendDebateMessage()

4.5 Botão áudio (🎤)
→ [ ] Botão existe e é clicável
→ [ ] Ao clicar: pede permissão de microfone OU mostra toast "não suportado"
→ [ ] Zero erros no console (mesmo se browser não suporta)

4.6 Navegação de volta
→ [ ] Botão voltar no chat → lista de salas (goDebate)
→ [ ] Botão voltar na lista → dashboard (goDash)
→ [ ] Botão voltar do browser (history.back) funciona
→ [ ] Zero erros em cada transição
```

---

### TESTE 5 — MÓDULOS E AULAS

```
5.1 No dashboard, clicar no módulo 0
→ [ ] Lista de aulas aparece
→ [ ] Zero erros no console

5.2 Clicar na primeira aula
→ [ ] Conteúdo renderiza (texto + quiz)
→ [ ] Zero erros no console
→ Se tela branca: verificar openL(), loadFullModule()

5.3 Responder quiz
→ [ ] Opções clicáveis
→ [ ] Feedback (certo/errado) aparece
→ [ ] XP incrementa
→ [ ] Zero erros

5.4 Próxima aula (nextL)
→ [ ] Navega para aula seguinte
→ [ ] Conteúdo novo renderiza
→ [ ] Zero erros

5.5 Aula anterior (prevL)
→ [ ] Volta para aula anterior
→ [ ] Zero erros

5.6 Voltar para módulo
→ [ ] Lista de aulas reaparece
→ [ ] Zero erros

5.7 Voltar para dashboard
→ [ ] Grid de módulos reaparece
→ [ ] Zero erros
```

---

### TESTE 6 — TODAS AS VIEWS SECUNDÁRIAS

Testar cada uma. Para cada view: chamar a função, verificar que renderiza, verificar zero erros, verificar que voltar funciona.

```
goPerf()        → [ ] Desempenho renderiza     → [ ] Voltar OK  → [ ] Zero erros
goBadges()      → [ ] Conquistas renderiza      → [ ] Voltar OK  → [ ] Zero erros
goGlossary()    → [ ] Glossário renderiza       → [ ] Voltar OK  → [ ] Zero erros
goFlashcards()  → [ ] Flashcards renderiza      → [ ] Voltar OK  → [ ] Zero erros
goStudyPlan()   → [ ] Plano de estudo renderiza → [ ] Voltar OK  → [ ] Zero erros
goGame()        → [ ] Jogo renderiza            → [ ] Voltar OK  → [ ] Zero erros
goTimeline()    → [ ] Timeline renderiza        → [ ] Voltar OK  → [ ] Zero erros
```

Se alguma função não existe ou dá erro: verificar se foi removida acidentalmente, restaurar do git se necessário.

---

### TESTE 7 — FEATURES DENTRO DA AULA

Abrir qualquer aula e testar cada feature:

```
TTS (🔊)     → [ ] Clicável → [ ] Lê texto ou mostra toast → [ ] Zero erros
Notas (📝)   → [ ] Abre painel → [ ] Digitar texto → [ ] Salva → [ ] Persiste após fechar/reabrir → [ ] Zero erros
Favorito (⭐) → [ ] Clicável → [ ] Toggle visual muda → [ ] Persiste → [ ] Zero erros
Imprimir     → [ ] Se existir, funciona ou toast → [ ] Zero erros
```

---

### TESTE 8 — PERFIL / LOGIN

```
Clicar no avatar/perfil
→ [ ] Se OFFLINE_MODE: mostra modal "Modo Apresentação" ou perfil local
→ [ ] Se online: mostra opções de login
→ [ ] Zero erros
→ [ ] Voltar para dashboard funciona
```

---

### TESTE 9 — DARK MODE / LIGHT MODE

```
9.1 Ativar dark mode
→ [ ] Fundo muda para escuro
→ [ ] Texto muda para claro
→ [ ] Zero erros no console

9.2 Navegar por TODAS as telas em dark mode
→ Dashboard    → [ ] Legível, sem texto invisível
→ Debate salas → [ ] Cards legíveis
→ Debate chat  → [ ] Mensagens legíveis, input visível
→ Módulo       → [ ] Aulas legíveis
→ Aula aberta  → [ ] Texto legível, quiz legível
→ Badges       → [ ] Legível
→ Glossário    → [ ] Legível

9.3 Voltar para light mode
→ [ ] Tudo restaura
→ [ ] Zero erros
```

---

### TESTE 10 — NAVEGAÇÃO CIRCULAR

Testar que ir e voltar repetidamente não quebra nada:

```
Dashboard → Debate → Sala → Voltar → Voltar → Dashboard → Módulo 0 → Aula 0 → Voltar → Voltar → Dashboard → Debate → Sala → Enviar msg → Voltar → Voltar → Dashboard → Badges → Voltar → Glossário → Voltar → Dashboard

→ [ ] Nenhuma tela branca em nenhum momento
→ [ ] Nenhum erro acumulado no console
→ [ ] Memória não estoura (sem leak visível)
→ [ ] Bottom nav continua funcional o tempo todo
→ [ ] Mobile header continua funcional o tempo todo
```

---

### TESTE 11 — OFFLINE

```
1. Desligar internet (Network tab → Offline)
2. Recarregar app.html
→ [ ] App carrega do cache do SW
→ [ ] Dashboard aparece
→ [ ] Navegar para Debate → salas aparecem com contagem mockada
→ [ ] Entrar numa sala → mensagens mockadas aparecem
→ [ ] Enviar mensagem → funciona localmente
→ [ ] Voltar para dashboard → módulos aparecem
→ [ ] Abrir aula → conteúdo renderiza
→ [ ] Zero erros no console

3. Religar internet
→ [ ] App continua rodando sem reload necessário
```

---

### TESTE 12 — BUILD DE PRODUÇÃO

```bash
npm run build
npx vite preview --port 4173
```

Abrir http://localhost:4173/app.html e repetir testes 1-3 (boot, bottom nav, header).

- [ ] Build roda sem erros
- [ ] App de produção funciona igual ao dev
- [ ] Zero erros no console

---

### AO ENCONTRAR BUG

Para cada bug, seguir este processo:

```
1. PARAR o teste atual
2. COPIAR o erro do console
3. IDENTIFICAR o arquivo e linha
4. LER o código ao redor
5. CORRIGIR
6. SALVAR
7. RECARREGAR
8. VERIFICAR que o erro sumiu
9. CONTINUAR o teste de onde parou
```

Não acumular bugs para corrigir depois. Corrigir UM POR UM na hora.

---

### RELATÓRIO FINAL

Listar no final:

```
TESTES REALIZADOS: XX
BUGS ENCONTRADOS: XX
BUGS CORRIGIDOS: XX
ERROS RESTANTES: 0 (obrigatório)

Bugs corrigidos:
1. [arquivo:linha] — descrição do bug → como foi corrigido
2. [arquivo:linha] — descrição do bug → como foi corrigido
...
```

---

### COMMIT E DEPLOY

```bash
git add -A
git commit -m "test+fix: full navigation test — [N] bugs fixed, zero console errors, all routes working"
git push origin main
```
