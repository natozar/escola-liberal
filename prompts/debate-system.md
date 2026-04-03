Tarefa: Implementar sistema de Debate completo — botão destaque no topo, salas com presença online, chat real-time. Leia TODOS os arquivos relevantes antes de alterar (app.html, app.js, app.css, sw.js, src/boot.js, supabase-client.js, CLAUDE.md). Não quebre OFFLINE_MODE. Execute tudo sem perguntar. Commit e deploy ao final.

### 1. BOTÃO DEBATE NO TOPO (app.html + app.css)

No mobile header (id: mobileHeader) e no top bar desktop, adicionar botão de debate centralizado e destacado:

```html
<button id="debateTopBtn" class="debate-btn-top" onclick="goDebate()">
  💬 <span>Debate</span> <span class="online-count" id="debateOnlineCount">0</span>
</button>
```

Estilo — botão pill verde vibrante, centralizado na barra superior, visualmente maior e mais chamativo que os outros ícones. Deve parecer o "botão principal" do topo, assim como o botão central da barra inferior é destaque lá:

```css
.debate-btn-top {
  background: var(--debate-accent, #10b981);
  color: white;
  border: none;
  border-radius: 24px;
  padding: 6px 16px;
  font-weight: 700;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(16,185,129,0.3);
  transition: transform 0.15s, box-shadow 0.15s;
  z-index: 10;
}
.debate-btn-top:active { transform: scale(0.95); }
.debate-btn-top .online-count {
  background: white;
  color: var(--debate-accent, #10b981);
  border-radius: 12px;
  padding: 1px 7px;
  font-size: 0.75rem;
  font-weight: 800;
  min-width: 20px;
  text-align: center;
}
.debate-btn-top.has-activity {
  animation: debatePulse 2s infinite;
}
@keyframes debatePulse {
  0%, 100% { box-shadow: 0 2px 8px rgba(16,185,129,0.3); }
  50% { box-shadow: 0 2px 16px rgba(16,185,129,0.6); }
}
```

O botão deve respeitar dark/light mode e safe-area iOS.

### 2. SALAS DE DEBATE (app.js — função goDebate)

Adicionar constante com 15 salas temáticas:

```javascript
const DEBATE_ROOMS = [
  { id: 'economia',    name: 'Economia & Livre Mercado',   icon: '📊', color: '#f59e0b' },
  { id: 'filosofia',   name: 'Filosofia & Ética',          icon: '🏛️', color: '#8b5cf6' },
  { id: 'historia',    name: 'História & Revisionismo',     icon: '📜', color: '#ef4444' },
  { id: 'politica',    name: 'Política & Estado',           icon: '⚖️', color: '#3b82f6' },
  { id: 'educacao',    name: 'Educação & Homeschool',       icon: '📚', color: '#10b981' },
  { id: 'tecnologia',  name: 'IA & Tecnologia',             icon: '🤖', color: '#06b6d4' },
  { id: 'direito',     name: 'Direito & Liberdade',         icon: '🔒', color: '#6366f1' },
  { id: 'midia',       name: 'Mídia & Fake News',           icon: '📡', color: '#ec4899' },
  { id: 'financas',    name: 'Finanças & Investimento',     icon: '💰', color: '#eab308' },
  { id: 'psicologia',  name: 'Psicologia & Comportamento',  icon: '🧠', color: '#a855f7' },
  { id: 'ciencias',    name: 'Ciências & Clima',            icon: '🔬', color: '#22c55e' },
  { id: 'empreender',  name: 'Empreendedorismo',            icon: '🚀', color: '#f97316' },
  { id: 'cultura',     name: 'Cultura & Sociedade',         icon: '🎭', color: '#e11d48' },
  { id: 'saude',       name: 'Saúde & Bem-estar',           icon: '❤️', color: '#dc2626' },
  { id: 'logica',      name: 'Lógica & Argumentação',       icon: '♟️', color: '#64748b' }
];
```

Função `goDebate()`:
- Renderiza grid de cards (1 col mobile, 2 tablet, 3 desktop)
- Cada card mostra: ícone + nome + "🟢 X online" + última mensagem preview
- Borda left com a cor da sala
- Click no card chama `goRoom(roomId)`
- `renderBackLink('main', '← Início', goDash)` no topo (desktop only)

### 3. PRESENÇA ONLINE EM TEMPO REAL

Verificar se OFFLINE_MODE está ativo (checar variável global OFFLINE_MODE de src/boot.js).

**Quando OFFLINE_MODE = true (mock):**
```javascript
function mockPresence() {
  DEBATE_ROOMS.forEach(room => {
    updateRoomCount(room.id, Math.floor(Math.random() * 15) + 1);
  });
  updateTotalOnline();
}
```

**Quando OFFLINE_MODE = false (Supabase real):**
```javascript
function subscribePresence() {
  if (typeof sbClient === 'undefined') return mockPresence();
  DEBATE_ROOMS.forEach(room => {
    const channel = sbClient.channel('debate:' + room.id, {
      config: { presence: { key: getUserId() || 'anon-' + Math.random().toString(36).slice(2) } }
    });
    channel.on('presence', { event: 'sync' }, () => {
      const count = Object.keys(channel.presenceState()).length;
      updateRoomCount(room.id, count);
      updateTotalOnline();
    });
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user: S.name || 'Visitante', avatar: S.avatar || '🧑‍🎓' });
      }
    });
  });
}
```

Funções auxiliares:
- `updateRoomCount(roomId, count)` — atualiza o badge no card da sala
- `updateTotalOnline()` — soma todos os counts e atualiza `#debateOnlineCount` no botão do topo
- Ao sair do debate (`goDash` ou outra nav), fazer `unsubscribePresence()` para limpar channels

### 4. CHAT DA SALA (goRoom)

Função `goRoom(roomId)`:
- Header: nome da sala + "🟢 X online" + botão voltar
- Área de mensagens com scroll (auto-scroll para baixo em novas msgs)
- Cada mensagem: avatar + nome + texto + hora (HH:mm)
- Input fixo no bottom: textarea + botão enviar
- `renderBackLink('main', '← Salas', goDebate)` no topo (desktop)

**OFFLINE_MODE = true — mensagens mockadas:**
```javascript
const MOCK_MESSAGES = {
  economia: [
    { user_name: 'Ana', user_avatar: '👩‍🎓', text: 'O livre mercado é realmente a melhor forma de distribuir recursos?', created_at: new Date(Date.now() - 180000).toISOString() },
    { user_name: 'Pedro', user_avatar: '👨‍🎓', text: 'Depende do contexto. Em mercados com falhas naturais, regulação mínima ajuda.', created_at: new Date(Date.now() - 120000).toISOString() },
    { user_name: 'Julia', user_avatar: '👩‍💻', text: 'Mas quem define falha de mercado? Isso já é intervenção!', created_at: new Date(Date.now() - 60000).toISOString() },
    { user_name: 'Lucas', user_avatar: '🧑‍🔬', text: 'Hayek argumentava que o conhecimento disperso torna planificação impossível.', created_at: new Date(Date.now() - 30000).toISOString() }
  ],
  filosofia: [
    { user_name: 'Maria', user_avatar: '👩‍🎓', text: 'A ética utilitarista pode justificar sacrificar um para salvar muitos?', created_at: new Date(Date.now() - 180000).toISOString() },
    { user_name: 'Thiago', user_avatar: '👨‍🎓', text: 'Kant diria que nunca — a pessoa é fim, não meio.', created_at: new Date(Date.now() - 120000).toISOString() },
    { user_name: 'Sofia', user_avatar: '👩‍💻', text: 'E se o "muitos" incluir crianças inocentes? A equação muda?', created_at: new Date(Date.now() - 60000).toISOString() }
  ],
  historia: [
    { user_name: 'Gabriel', user_avatar: '👨‍🎓', text: 'Revisionismo é necessário ou perigoso para a sociedade?', created_at: new Date(Date.now() - 180000).toISOString() },
    { user_name: 'Beatriz', user_avatar: '👩‍🎓', text: 'Questionar fontes é método científico. Negar fatos é ideologia.', created_at: new Date(Date.now() - 120000).toISOString() },
    { user_name: 'Rafael', user_avatar: '🧑‍🔬', text: 'O problema é quando governos usam "revisão" para reescrever história a seu favor.', created_at: new Date(Date.now() - 60000).toISOString() }
  ],
  politica: [
    { user_name: 'Isabela', user_avatar: '👩‍💻', text: 'Estado mínimo é viável num país com tanta desigualdade?', created_at: new Date(Date.now() - 180000).toISOString() },
    { user_name: 'Mateus', user_avatar: '👨‍🎓', text: 'A desigualdade é efeito do excesso de Estado, não da falta.', created_at: new Date(Date.now() - 120000).toISOString() },
    { user_name: 'Carolina', user_avatar: '👩‍🎓', text: 'Singapura tem estado forte em educação e saúde, mas mercado livre no resto.', created_at: new Date(Date.now() - 60000).toISOString() }
  ],
  educacao: [
    { user_name: 'Fernanda', user_avatar: '👩‍🎓', text: 'Homeschool deveria ser direito garantido por lei?', created_at: new Date(Date.now() - 180000).toISOString() },
    { user_name: 'Diego', user_avatar: '👨‍🎓', text: 'Com certeza. A família tem prioridade sobre o Estado na educação.', created_at: new Date(Date.now() - 120000).toISOString() },
    { user_name: 'Camila', user_avatar: '👩‍💻', text: 'Mas precisa de fiscalização para garantir qualidade mínima.', created_at: new Date(Date.now() - 60000).toISOString() }
  ],
  tecnologia: [
    { user_name: 'Bruno', user_avatar: '🧑‍🔬', text: 'IA vai substituir professores nos próximos 10 anos?', created_at: new Date(Date.now() - 180000).toISOString() },
    { user_name: 'Larissa', user_avatar: '👩‍🎓', text: 'Não substituir, mas transformar completamente o papel deles.', created_at: new Date(Date.now() - 120000).toISOString() },
    { user_name: 'Henrique', user_avatar: '👨‍🎓', text: 'O tutor IA já consegue personalizar o ensino melhor que uma sala com 40 alunos.', created_at: new Date(Date.now() - 60000).toISOString() }
  ],
  direito: [
    { user_name: 'Amanda', user_avatar: '👩‍💻', text: 'Liberdade de expressão deve ter limites?', created_at: new Date(Date.now() - 180000).toISOString() },
    { user_name: 'Victor', user_avatar: '👨‍🎓', text: 'Só quando há incitação direta à violência. Opinião nunca.', created_at: new Date(Date.now() - 120000).toISOString() },
    { user_name: 'Leticia', user_avatar: '👩‍🎓', text: 'E fake news que causa danos reais? Onde fica a linha?', created_at: new Date(Date.now() - 60000).toISOString() }
  ],
  midia: [
    { user_name: 'Felipe', user_avatar: '👨‍🎓', text: 'A grande mídia tem mais poder que governos em moldar opinião?', created_at: new Date(Date.now() - 180000).toISOString() },
    { user_name: 'Mariana', user_avatar: '👩‍🎓', text: 'Redes sociais democratizaram, mas também polarizaram.', created_at: new Date(Date.now() - 120000).toISOString() },
    { user_name: 'Gustavo', user_avatar: '🧑‍🔬', text: 'O algoritmo de engajamento é o verdadeiro editor-chefe.', created_at: new Date(Date.now() - 60000).toISOString() }
  ],
  financas: [
    { user_name: 'Rodrigo', user_avatar: '👨‍🎓', text: 'Bitcoin é reserva de valor ou especulação?', created_at: new Date(Date.now() - 180000).toISOString() },
    { user_name: 'Patricia', user_avatar: '👩‍💻', text: 'Ambos. Depende do horizonte temporal do investidor.', created_at: new Date(Date.now() - 120000).toISOString() },
    { user_name: 'Daniel', user_avatar: '🧑‍🔬', text: 'A volatilidade atual impede uso como moeda no dia a dia.', created_at: new Date(Date.now() - 60000).toISOString() }
  ],
  psicologia: [
    { user_name: 'Juliana', user_avatar: '👩‍🎓', text: 'Redes sociais estão causando epidemia de ansiedade em jovens?', created_at: new Date(Date.now() - 180000).toISOString() },
    { user_name: 'André', user_avatar: '👨‍🎓', text: 'Correlação não é causalidade, mas os dados são preocupantes.', created_at: new Date(Date.now() - 120000).toISOString() },
    { user_name: 'Laura', user_avatar: '👩‍💻', text: 'O problema é a comparação social constante, não a tecnologia em si.', created_at: new Date(Date.now() - 60000).toISOString() }
  ],
  ciencias: [
    { user_name: 'Ricardo', user_avatar: '🧑‍🔬', text: 'Mudança climática: até que ponto a ciência é consensual?', created_at: new Date(Date.now() - 180000).toISOString() },
    { user_name: 'Natalia', user_avatar: '👩‍🎓', text: '97% dos climatologistas concordam com aquecimento antropogênico.', created_at: new Date(Date.now() - 120000).toISOString() },
    { user_name: 'Eduardo', user_avatar: '👨‍🎓', text: 'Consenso não é prova. A pergunta é: quais soluções funcionam?', created_at: new Date(Date.now() - 60000).toISOString() }
  ],
  empreender: [
    { user_name: 'Vanessa', user_avatar: '👩‍💻', text: 'Vale mais empreender jovem ou ter experiência antes?', created_at: new Date(Date.now() - 180000).toISOString() },
    { user_name: 'Leonardo', user_avatar: '👨‍🎓', text: 'Jovem tem menos a perder. O custo de oportunidade é menor.', created_at: new Date(Date.now() - 120000).toISOString() },
    { user_name: 'Aline', user_avatar: '👩‍🎓', text: 'Mas sem experiência você comete erros que capital não resolve.', created_at: new Date(Date.now() - 60000).toISOString() }
  ],
  cultura: [
    { user_name: 'Marcos', user_avatar: '👨‍🎓', text: 'Cultura pop influencia mais valores que a escola formal?', created_at: new Date(Date.now() - 180000).toISOString() },
    { user_name: 'Bianca', user_avatar: '👩‍🎓', text: 'Com certeza. Séries e música formam a visão de mundo.', created_at: new Date(Date.now() - 120000).toISOString() },
    { user_name: 'Caio', user_avatar: '🧑‍🔬', text: 'Por isso educação precisa incluir pensamento crítico sobre mídia.', created_at: new Date(Date.now() - 60000).toISOString() }
  ],
  saude: [
    { user_name: 'Priscila', user_avatar: '👩‍💻', text: 'Saúde mental deveria ser disciplina obrigatória na escola?', created_at: new Date(Date.now() - 180000).toISOString() },
    { user_name: 'Thiago', user_avatar: '👨‍🎓', text: 'Sem dúvida. Prevenção é mais barato que tratamento.', created_at: new Date(Date.now() - 120000).toISOString() },
    { user_name: 'Renata', user_avatar: '👩‍🎓', text: 'O desafio é quem ensina. Professores não são psicólogos.', created_at: new Date(Date.now() - 60000).toISOString() }
  ],
  logica: [
    { user_name: 'Paulo', user_avatar: '🧑‍🔬', text: 'Falácias lógicas deveriam ser ensinadas no ensino fundamental?', created_at: new Date(Date.now() - 180000).toISOString() },
    { user_name: 'Clara', user_avatar: '👩‍🎓', text: 'Se soubéssemos identificar ad hominem e espantalho, o debate público seria outro.', created_at: new Date(Date.now() - 120000).toISOString() },
    { user_name: 'Igor', user_avatar: '👨‍🎓', text: 'Platão já defendia isso há 2400 anos. Nada novo.', created_at: new Date(Date.now() - 60000).toISOString() }
  ]
};
```

Ao enviar mensagem em OFFLINE_MODE, adicionar no array local e re-renderizar (sem persistência).

**OFFLINE_MODE = false — Supabase real:**

Carregar últimas 50 mensagens:
```javascript
const { data } = await sbClient.from('debate_messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }).limit(50);
```

Subscribe para novas mensagens:
```javascript
sbClient.channel('debate-msgs:' + roomId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'debate_messages', filter: 'room_id=eq.' + roomId }, payload => appendMessage(payload.new)).subscribe();
```

Enviar mensagem (requer auth):
```javascript
async function sendDebateMsg(roomId, text) {
  const user = sbClient?.auth?.getUser?.();
  if (!user) return showLoginPrompt('debate');
  if (!text.trim()) return;
  await sbClient.from('debate_messages').insert({ room_id: roomId, user_id: user.id, user_name: S.name || 'Aluno', user_avatar: S.avatar || '🧑‍🎓', text: text.trim() });
}
```

### 5. NAVEGAÇÃO

- Botão debate no topo: sempre visível em todas as telas do app
- Menu lateral: adicionar "💬 Debate" na seção de ferramentas
- `goDebate()` → lista de salas
- `goRoom(roomId)` → chat da sala
- Voltar no chat → `goDebate()`
- Voltar em Debate → `goDash()`
- History API: `history.pushState` para goDebate e goRoom (suportar botão voltar do browser/Android)

### 6. REGRAS INVIOLÁVEIS

- NUNCA quebrar OFFLINE_MODE — se ativo, tudo mockado, zero fetch
- Respeitar dark/light theme (CSS variables)
- Zero npm dependencies — vanilla JS
- Safe area iOS: env(safe-area-inset-*)
- Incrementar SW_VERSION no sw.js
- Verificar que skipWaiting está APENAS no message handler do sw.js
- Adicionar novos assets ao CORE_ASSETS se necessário
- Não modificar fluxo de pagamento
- Não alterar design existente das outras telas

### 7. COMMIT E DEPLOY

```bash
git add app.html app.js app.css sw.js CLAUDE.md
git commit -m "feat: debate system with 15 rooms, realtime presence, chat, offline mock support"
git push origin main
```

### 8. ANOTAR NO CLAUDE.md

Na seção Bugs Conhecidos, adicionar:
```
11. **Debate implementado** — 15 salas temáticas com Supabase Presence (contagem online) e Postgres Changes (mensagens real-time). Mock completo quando OFFLINE_MODE = true. Auth required apenas para enviar mensagens. Botão destaque no topo com badge de online count.
```
