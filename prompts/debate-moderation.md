Tarefa: Implementar sistema de moderação e controle para as salas de debate. O público é crianças de 10 a 16 anos junto com adultos. Segurança é prioridade absoluta. Leia app.js, app.html, app.css e CLAUDE.md antes de alterar. Não quebre OFFLINE_MODE. Execute tudo sem perguntar. Commit e deploy ao final.

### CONTEXTO

As salas de debate são ambientes onde crianças interagem. Toda mensagem DEVE ser filtrada antes de aparecer. O tema de cada sala é fixo e mensagens fora do assunto devem ser bloqueadas. Reincidência gera suspensão temporária e depois permanente.

### 1. FILTRO DE CONTEÚDO (app.js)

Criar função `moderateMessage(text, roomId)` que retorna `{ allowed: boolean, reason: string }`.

O filtro tem 3 camadas:

**Camada 1 — Palavras proibidas (bloqueio imediato):**
```javascript
const BANNED_WORDS = [
  // Palavrões PT-BR (incluir variações com acentos, leetspeak, espaços)
  'merda','porra','caralho','foda','fodase','puta','putaria','cuzao','cuza','arrombado',
  'viado','viad','bixa','bicha','buceta','piranha','vagabunda','desgraça','fdp','pqp',
  'krl','crl','vsf','tnc','lixo humano','retardado','mongoloide','imbecil',
  // Inglês
  'fuck','shit','bitch','ass','dick','pussy','damn','crap','bastard','slut','whore',
  // Variações com caracteres especiais (normalizar antes de checar)
  // Conteúdo sexual
  'sexo','nude','nudes','porn','gostosa','gostoso','safada','safado','tesão','piroca',
  'rola','pau','peito','bunda','pelada','pelado',
  // Drogas
  'maconha','cocaina','crack','droga','baseado','beck','erva','cheirar pó',
  // Violência
  'matar','morrer','suicidio','se matar','vou te pegar','ameaça',
  // Dados pessoais (impedir compartilhamento)
  'meu telefone','meu celular','meu whatsapp','meu insta','meu instagram',
  'meu tiktok','meu snap','meu discord','me chama no','chama no zap',
  'meu numero','meu endereço','onde moro','minha escola'
];
```

Normalizar texto antes de checar: lowercase, remover acentos, remover espaços extras, substituir 0→o, 1→i, 3→e, 4→a, 5→s, @→a.

**Camada 2 — Relevância ao tema da sala:**
```javascript
const ROOM_KEYWORDS = {
  economia: ['mercado','economia','capitalismo','socialismo','livre mercado','inflação','preço','oferta','demanda','imposto','estado','governo','empresa','lucro','trabalho','salário','pobreza','riqueza','desigualdade','pib','moeda','banco','investimento','comércio'],
  filosofia: ['ética','moral','filosofia','platão','aristóteles','kant','lógica','razão','verdade','virtude','justiça','bem','mal','liberdade','consciência','existência','pensamento','argumento','sabedoria','valor','dilema'],
  historia: ['história','guerra','revolução','império','civilização','democracia','ditadura','rei','colônia','independência','constituição','república','monarquia','escravidão','abolição','medieval','antigo','moderno'],
  politica: ['política','estado','governo','democracia','direita','esquerda','liberal','conservador','lei','constituição','eleição','partido','presidente','congresso','senado','voto','cidadão','direito','dever'],
  educacao: ['educação','escola','homeschool','ensino','professor','aluno','aprendizado','currículo','pedagogia','didática','estudo','prova','avaliação','conhecimento','família','pai','mãe','criança'],
  tecnologia: ['tecnologia','inteligência artificial','ia','computador','programação','internet','algoritmo','dados','robô','automação','software','app','inovação','digital','futuro','código','machine learning'],
  direito: ['direito','lei','liberdade','constituição','justiça','tribunal','juiz','advogado','crime','pena','propriedade','contrato','cidadão','processo','norma','regulação','censura','expressão'],
  midia: ['mídia','notícia','jornal','imprensa','fake news','informação','comunicação','rede social','televisão','rádio','internet','jornalista','opinião','propaganda','publicidade','manipulação','algoritmo','engajamento'],
  financas: ['finanças','dinheiro','investimento','poupança','ação','bolsa','bitcoin','crypto','banco','juros','renda','orçamento','lucro','patrimônio','economia','aposentadoria','empreendedor','empresa'],
  psicologia: ['psicologia','mente','comportamento','emoção','ansiedade','depressão','autoestima','motivação','personalidade','hábito','cérebro','cognição','memória','aprendizado','trauma','resiliência','inteligência emocional'],
  ciencias: ['ciência','pesquisa','experimento','hipótese','teoria','clima','meio ambiente','sustentabilidade','energia','natureza','evolução','biologia','física','química','planeta','ecologia','poluição'],
  empreender: ['empreendedorismo','negócio','startup','empresa','produto','cliente','mercado','venda','marketing','lucro','inovação','risco','investidor','plano de negócios','modelo','receita','escala','mvp'],
  cultura: ['cultura','arte','música','literatura','cinema','teatro','sociedade','tradição','identidade','diversidade','religião','costume','valor','patrimônio','folclore','expressão cultural'],
  saude: ['saúde','exercício','alimentação','nutrição','sono','bem-estar','doença','prevenção','vacina','higiene','mental','física','esporte','corpo','medicina','hábito saudável','dieta'],
  logica: ['lógica','argumento','falácia','premissa','conclusão','dedução','indução','raciocínio','debate','retórica','silogismo','paradoxo','evidência','prova','pensamento crítico','viés','sofisma']
};
```

A mensagem deve conter pelo menos 1 keyword da sala OU ser uma resposta direta a outra mensagem (quote/reply). Mensagens muito curtas (< 3 palavras) como "concordo", "verdade", "boa", "exato" são permitidas (são reações naturais de debate). Perguntas (contém "?") também são permitidas.

Se bloqueada por irrelevância, mostrar toast: "Mensagem fora do tema. Esta sala é sobre [nome da sala]. Tente reformular."

**Camada 3 — Rate limit:**
- Máximo 1 mensagem a cada 5 segundos
- Máximo 30 mensagens por hora por sala
- Se exceder: toast "Aguarde um momento antes de enviar outra mensagem."

### 2. SISTEMA DE STRIKES E SUSPENSÃO

Armazenar strikes no localStorage (key: `escola_debate_strikes`):

```javascript
// Estrutura
{
  strikes: 3,           // total de infrações
  history: [            // log de infrações
    { date: '2026-04-03T15:30:00', room: 'economia', reason: 'palavra proibida', msg: 'me***' },
    { date: '2026-04-03T15:35:00', room: 'filosofia', reason: 'fora do tema', msg: 'alguem joga free fire?' }
  ],
  suspended_until: null, // ISO date se suspenso, null se livre
  banned: false          // banimento permanente
}
```

**Escala de punição:**
- Strike 1: Toast de aviso amarelo "Aviso 1/3 — Mantenha o respeito e foque no tema."
- Strike 2: Toast de aviso laranja "Aviso 2/3 — Próxima infração resulta em suspensão."
- Strike 3: Suspensão de 24h. Toast vermelho "Você foi suspenso do debate por 24 horas." Salvar `suspended_until` com data +24h.
- Strike 4 (após retorno): Suspensão de 72h.
- Strike 5: Suspensão de 7 dias.
- Strike 6+: Banimento permanente do debate. `banned: true`.

**Quando suspenso:**
- Pode VER as salas e mensagens (modo leitura)
- NÃO pode enviar mensagens
- Input de mensagem desabilitado com texto: "Você está suspenso até [data]. Motivo: [última infração]."
- Contador regressivo visível: "Retorno em: 23h 45min"

**Quando banido:**
- Pode VER as salas
- Mensagem fixa: "Acesso ao debate foi revogado por violações repetidas. Fale com seus pais/responsável."

### 3. PAINEL DE CONTROLE PARA PAIS (Dashboard Pais)

No dashboard de pais (já existe com PIN), adicionar seção "Debate":

- Ver histórico de infrações do filho
- Botão "Resetar strikes" (limpa histórico, remove suspensão)
- Botão "Desativar debate" (bloqueia acesso do perfil ao debate completamente)
- Botão "Reativar debate"
- Ver últimas 20 mensagens enviadas pelo filho (salvar no localStorage)

```javascript
// No localStorage, salvar mensagens enviadas pelo perfil ativo
// key: escola_debate_sent_{subProfileId}
[
  { room: 'economia', text: 'Concordo com a Ana...', date: '2026-04-03T15:30:00' },
  ...
]
```

### 4. AVISOS VISUAIS NA SALA

Ao entrar em qualquer sala de debate, exibir banner fixo no topo:

```html
<div class="debate-rules-banner">
  📋 Regras: Fale apenas sobre o tema da sala. Respeite todos. Não compartilhe dados pessoais. Infrações = suspensão.
</div>
```

Estilo: fundo amarelo claro, texto pequeno, sempre visível no topo da área de chat. Dispensável com X (salva no sessionStorage que fechou).

### 5. DISCLAIMER LGPD NO PRIMEIRO ACESSO

Na primeira vez que o aluno acessa o debate (checar localStorage `escola_debate_consent`):

```javascript
function showDebateConsent() {
  // Modal com:
  // Título: "Regras do Debate"
  // Texto:
  // "As salas de debate são moderadas automaticamente para sua segurança.
  //  - Fale apenas sobre o tema da sala
  //  - Não compartilhe informações pessoais (nome, telefone, endereço, redes sociais)
  //  - Respeite todos os participantes
  //  - Mensagens são filtradas por segurança
  //  - Infrações resultam em suspensão temporária ou permanente
  //  - Seus pais/responsáveis podem ver suas mensagens no painel familiar
  //
  //  Ao continuar, você concorda com estas regras."
  //
  // Botão: "Entendi e Concordo" → salva consent no localStorage
  // Botão: "Voltar" → goDash()
}
```

### 6. FILTRO DE DADOS PESSOAIS (LGPD — CRÍTICO)

Além das palavras na lista, detectar padrões de dados pessoais com regex:

```javascript
const PERSONAL_DATA_PATTERNS = [
  /\d{2}[\s.-]?\d{4,5}[\s.-]?\d{4}/,        // telefone BR
  /\(\d{2}\)\s?\d{4,5}-?\d{4}/,              // telefone com DDD
  /\+55\s?\d{2}\s?\d{4,5}\s?\d{4}/,          // telefone internacional
  /\d{3}\.\d{3}\.\d{3}-\d{2}/,               // CPF
  /\d{5}-?\d{3}/,                             // CEP
  /[\w.-]+@[\w.-]+\.\w{2,}/,                  // email
  /@[\w]{3,}/,                                // @ menção redes sociais
  /(?:instagram|insta|tiktok|snap|discord|whats|zap|telegram)[\s.:@\/]+\w+/i,
  /(?:rua|av|avenida|alameda|travessa)\s+[\w\s]{5,}/i,  // endereço
  /(?:meu nome é|me chamo|sou o|sou a)\s+\w+\s+\w+/i   // nome completo
];
```

Se detectar dados pessoais: bloquear mensagem + toast "Por sua segurança, não compartilhe dados pessoais no debate." + NÃO conta como strike (é proteção, não punição).

### 7. MODERAÇÃO OFFLINE_MODE

Quando OFFLINE_MODE = true:
- Filtros funcionam normalmente (testar na demo)
- Strikes funcionam normalmente (localStorage)
- Ao enviar mensagem mockada, passar pelo moderateMessage() antes de adicionar
- Se bloqueada, mostrar toast normalmente
- Consent modal funciona normalmente

### 8. INTEGRAÇÃO COM SUPABASE (quando OFFLINE_MODE = false, futuro)

Preparar estrutura para moderação server-side (NÃO implementar agora, só deixar os hooks prontos):

```javascript
// TODO: Quando online, enviar strikes para Supabase
// async function syncStrikes() { ... }

// TODO: Quando online, moderação pode usar Edge Function com IA
// async function aiModerate(text, roomId) { ... }

// TODO: Tabela moderation_log no Supabase
// CREATE TABLE moderation_log (id, user_id, room_id, action, reason, message_preview, created_at)
```

Adicionar comentários no código marcando onde a moderação server-side será plugada.

### 9. CSS DOS ELEMENTOS DE MODERAÇÃO

```css
/* Banner de regras */
.debate-rules-banner {
  background: var(--warning-bg, #fef3c7);
  color: var(--warning-text, #92400e);
  padding: 8px 12px;
  font-size: 0.8rem;
  text-align: center;
  border-bottom: 1px solid var(--warning-border, #fcd34d);
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* Toast de moderação */
.mod-toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  z-index: 9999;
  animation: toastIn 0.3s ease, toastOut 0.3s ease 3.7s;
  max-width: 90vw;
  text-align: center;
}
.mod-toast.warning { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
.mod-toast.danger { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
.mod-toast.info { background: #dbeafe; color: #1e40af; border: 1px solid #93c5fd; }
.mod-toast.blocked { background: #fce7f3; color: #9d174d; border: 1px solid #f9a8d4; }

@keyframes toastIn { from { opacity: 0; transform: translateX(-50%) translateY(20px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
@keyframes toastOut { from { opacity: 1; } to { opacity: 0; } }

/* Input suspenso */
.debate-input.suspended {
  opacity: 0.5;
  pointer-events: none;
}
.debate-input.suspended::after {
  content: attr(data-suspend-msg);
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 0.8rem;
  color: #991b1b;
}

/* Consent modal - respeitar dark/light theme */
.debate-consent-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.debate-consent-modal {
  background: var(--bg, white);
  color: var(--text, #1a1a1a);
  border-radius: 16px;
  padding: 24px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
```

### 10. REGRAS INVIOLÁVEIS

- NUNCA quebrar OFFLINE_MODE
- Filtros rodam 100% client-side (sem dependência de rede)
- Dados pessoais NUNCA passam pelo filtro — são bloqueados sempre
- Strikes persistem no localStorage (sobrevivem refresh)
- Dark/light theme respeitado
- Safe area iOS respeitado
- Zero npm dependencies
- Incrementar SW_VERSION se alterar assets cacheados
- Não modificar fluxo de pagamento ou outras features existentes

### 11. COMMIT E DEPLOY

```bash
git add app.js app.css app.html sw.js CLAUDE.md
git commit -m "feat: debate moderation — content filter, strikes, suspension, LGPD consent, parental controls"
git push origin main
```

### 12. ANOTAR NO CLAUDE.md

Na seção Bugs Conhecidos, adicionar:
```
12. **Moderação de debate implementada** — Filtro 3 camadas (palavras proibidas, relevância ao tema, rate limit). Sistema de strikes com suspensão progressiva (24h → 72h → 7d → ban). Filtro LGPD bloqueia dados pessoais. Consent modal obrigatório. Painel dos pais com histórico e controles. Tudo client-side, funciona offline.
```
