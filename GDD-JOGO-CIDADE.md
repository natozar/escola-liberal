# GDD — Jogo "Cidade Livre" (título provisório)

**Versão:** 0.1 — 2026-08-08
**Status:** Concepção aprovada por Renato. Fase 0 em andamento (ver `SPEC-FASE-0-JOGO-CIDADE.md`).
**Plataforma:** PWA Escola Liberal (vanilla JS, offline-first, mobile-first).

---

## 1. Visão

Um jogo viral e viciante onde **cada recompensa é uma aula**. O jogador assume uma cidade e toma medidas para melhorá-la. As medidas coletivistas parecem boas e dão aprovação imediata — o jogador cai nelas por conta própria. O caos chega com atraso. Nesse momento de dor, a aula certa do currículo aparece como remédio. Estudar gera **Lucidez**, que compra as reformas de recuperação.

**Missão maior:** formação do cidadão. O jogo demonstra, por simulação e nunca por sermão, que liberdade econômica + educação + mídia honesta tornam uma cidade rica por si só.

**Referências de persuasão:** Papers, Please e Frostpunk — o jogador *vive* as consequências e conclui sozinho. O jogo não conclui nada. Mesma régua editorial da disciplina Voto Consciente: **método, nunca conclusão; zero político real; arquétipos fictícios.**

---

## 2. Pilares de design (invioláveis)

1. **Persuasão por experiência, não sermão.** Nenhum texto do jogo opina. As regras da simulação são honestas; a conclusão é do jogador.
2. **O custo invisível se torna visível.** (Hazlitt: o que se vê e o que não se vê.) Toda medida sedutora tem efeito imediato visível e efeito atrasado oculto — e o jogo eventualmente **mostra** o efeito oculto na cidade.
3. **A aula chega na hora da dor.** Andragogia: adulto aprende quando precisa. A crise fabrica a demanda pela aula.
4. **Educação e mídia honesta melhoram a cidade POR SI SÓ** — como regra emergente da simulação, jamais como bônus escriptado (ver §6).
5. **Ver a crise acontecendo.** A cidade é um diorama vivo. A fila na padaria vazia é o argumento — não um número num painel.
6. **Quem já sabe não é obrigado a cair.** Resistir a todas as tentações é um caminho vencível (selo "A Cidade Que Nunca Caiu").
7. **Aulas nunca ficam trancadas atrás do jogo.** O jogo é a porta divertida do currículo, não a única.
8. **100% jogável offline** após a primeira visita. Rede só para o social, com degradação graciosa.

---

## 3. Núcleo — o loop

```
decisão sedutora → aprovação sobe → efeito invisível acumula
→ crise estoura (visível na cidade) → aula certa aparece
→ estudo gera Lucidez → reforma aplicada (paga o preço)
→ cidade se recupera → próxima tentação, maior
```

Arco emocional projetado: orgulho → sedução → caos → humildade → estudo → redenção.
A história compartilhável: *"quebrei minha cidade e reconstruí"* (confissão viraliza; sermão não).

---

## 4. Formato

**Cartas como entrada, cidade viva como saída.**

- **Interação:** cartas de decisão estilo Reigns — swipe esquerda/direita (ou toque nos dois botões), medidores no topo. Sessões de 3–8 minutos.
- **Feedback:** diorama da cidade ao fundo (SVG em camadas). A carta sai, a câmera vai até o ponto da consequência (pan/zoom) e segura 2 segundos.
- **Tempo:** por turnos — cada carta jogada = 1 tick da simulação. Zero loop em tempo real, zero dreno de bateria.

---

## 5. Mecânicas

### 5.1 Medidores
- **Visíveis desde o início:** Aprovação, Caixa.
- **Ocultos até desbloqueio:** preços/inflação, moradia, produtividade, escolaridade, corrupção, confiança.
- **Aprender = enxergar:** cada aula concluída pode **instalar um instrumento no painel** (a aula de inflação dá o medidor de inflação). No começo o jogador governa quase cego — como o eleitor real.

### 5.2 Aprovação — a moeda-armadilha
- Medidas estatistas dão aprovação **imediata**; medidas liberais custam aprovação no curto prazo.
- O jogador otimiza para o número que vê — como um político de verdade. Essa é a experiência que vacina.
- O bônus de aprovação das cartas demagógicas é **proporcional à ignorância da população** (ver §6.1).

### 5.3 Efeitos agendados — o custo invisível
- Implementação: fila de efeitos com atraso em ticks. Ex.: "congelar aluguéis" aplica +aprovação no tick atual e agenda −oferta de moradia para o tick +8.
- Quando o efeito atrasado dispara, a cidade **mostra**: fila, placa FECHADO, prateleira vazia, caminhão de mudança.

### 5.4 Lucidez — a moeda do aprendizado
- Crise estoura → a aula vinculada aparece (módulo real do currículo, já cacheado offline).
- Concluir a aula gera **Lucidez**. Lucidez compra reformas.
- **Efeito catraca:** desfazer uma medida ruim custa MAIS Lucidez do que custou implantá-la, e derruba aprovação temporariamente (protestos). Entrar é fácil; sair dói.

### 5.5 O Prometedor — antagonista
- Arquétipo fictício recorrente. **Seduz oferecendo, nunca assusta.** Cada oferta cobra o preço depois, escondido, em outro lugar.
- Em época de eleição vira adversário político: promete o impagável. Se vencer, o jogador **assiste** a cidade ser desmontada por 30 segundos antes de poder disputar a volta.

### 5.6 Mandatos e eleições
- 1 mandato = ritmo natural de sessão (5–8 min). Ao fim, a cidade vota.
- A aprovação decide a eleição — mas aprovação só reflete a realidade se a mídia for livre (§6.2). Derrota nas urnas fazendo tudo certo é uma lição possível (escolha pública vivida).
- Duas derrotas possíveis: colapso da cidade ou derrota eleitoral. Nenhuma é permanente (reconstrução/nova disputa — Lei Felca: sem punição definitiva).

### 5.7 Território — o placar honesto
- A cidade **expande um quarteirão** apenas ao cruzar marcos de prosperidade real (população + empregos + caixa saudável). Território = prova de governança, não de tempo jogado.
- Colapso encolhe a cidade: quarteirões escurecem, abandono, êxodo visível.
- Comparação viral: **dois mapas lado a lado** (mesma seed, mandatos iguais). O print é o argumento.

### 5.8 Atos — círculos de responsabilidade
1. **Sobreviver** (a Rua Principal) — trabalho, escassez, preços. → economia básica, finanças
2. **Cooperar** — troca voluntária, contrato, confiança. → empreendedorismo, ética
3. **Construir instituições** — árvore de tecnologia = **instituições, não prédios** (propriedade → investimento; justiça independente → comércio; imprensa livre → corrupção visível). → história, direito, civismo
4. **Defender** — o Prometedor em campanha: falácias, manipulação, promessas impagáveis. → lógica, retórica, Voto Consciente
5. **Transmitir** — vitória = fundar a escola da cidade e convidar um amigo real (a propagação é a mecânica de vitória).

---

## 6. Educação e mídia como simulação emergente

### 6.1 Educação — a vacina
- O jogador monta o **currículo da escola pública da cidade, disciplina por disciplina** — usando as disciplinas reais da Escola Liberal.
- Cada disciplina tem efeito sistêmico próprio e visível na cidade; efeitos **compõem**:
  - Educação Financeira → cidadãos poupam/investem → capital local → juros caem → negócios nascem
  - Lógica → resistência a falácias → cartas demagógicas rendem menos aprovação
  - Empreendedorismo → novos negócios surgem no mapa → arrecadação sobe **sem subir imposto**
  - Voto Consciente → eleições refletem a gestão real, não o marketing
- **A mecânica-chave:** o bônus de aprovação da demagogia é proporcional à ignorância. Cidade educada recusa o almoço grátis sozinha — o jogador assiste a armadilha do próprio jogo ser desarmada pela educação.
- Cada disciplina do jogo **linka para a disciplina real** (1 toque até as aulas). O jogo é o mapa do currículo.

### 6.2 Mídia honesta — o medidor que mede
- Imprensa livre → aprovação acompanha a realidade (dói no curto prazo, viabiliza boa gestão no longo).
- Tentação-espelho: "Departamento de Comunicação" (comprar mídia) → aprovação sobe agora, medidor descola da realidade, e o tombo de confiança na crise é **dobrado**. Sem imprensa livre, corrupção drena o caixa invisivelmente.

### 6.3 Condição de credibilidade
- Educação e mídia honesta têm **custo real e retorno lento (2–3 mandatos)**. É isso que separa simulação honesta de propaganda — e ensina por que o político real não planta escola: o retorno chega depois do mandato. O jogo recompensa o estadista.

---

## 7. Social e viral (tudo assíncrono, offline-compatível)

1. **Duelo direto** — mesma seed, amigo específico, mapas lado a lado ao fim. Funciona **P2P por link de WhatsApp** (seed + snapshot comprimido no convite; sem servidor). Evolui `createChallenge()`/`shareWhatsApp()` existentes.
2. **Vizinhança** — a cidade do amigo aparece como **cidade-fantasma no horizonte** do seu mapa (snapshot estático, atualizado quando ambos online).
3. **Liga semanal** — mesma cidade/eventos para todos (seed semanal), ranking por prosperidade/território. Pluga nas ligas e `weekly_xp` existentes. A seed semanal inclui **crises externas inevitáveis** (seca, choque de preços) para que o expert também precise governar em tempestade — o ranking mede quem atravessa melhor, não quem evita tudo.
- Histórias compartilháveis: "quebrei e reconstruí", "A Cidade Que Nunca Caiu", mapa antes/depois, selos de identidade ao fim de cada rodada.

---

## 8. Restrições

- **Técnica:** vanilla JS + canvas 2D/DOM, zero dependência npm de runtime, zero WebGL na v1 (iOS Safari + Android de entrada). Animações só por transform/opacity (compositor). `prefers-reduced-motion` respeitado.
- **Arte (revisado 2026-08-08):** isométrico 2.5D **pré-renderizado de 3D** — pipeline padrão da indústria (SimCity BuildIt, Megapolis): modelos Blender → sprites PNG/WebP com luz e AO assados, kit modular (footprints 1×1/1×2/2×2, 5-6 materiais), câmera dimétrica ~30° fixa. Ver `game-concept/BRIEF-ARTE-JOGO.md`. Cada prédio em 3 estados (próspero/crise/abandono) + props de estado separados (fila, tapume, placa).
- **Offline:** 100% jogável em modo avião após primeira visita, incluindo as aulas das crises (prefetch por ato). Ver §9.
- **Lei Felca:** zero urgência/perda/ansiedade FORA da partida (notificações sempre positivas). Pressão dramática só dentro do jogo. Sem loot box com aparência de aposta. Derrotas sempre reversíveis.
- **Editorial:** zero político/partido real; arquétipos fictícios; instituições citadas como fonte. Varredura automática antes de cada release (mesma da disciplina Voto).
- **PWA:** política de atualização permanente intocada (banner + botão; `skipWaiting` só no message handler; bump de `SW_VERSION` a cada release).

---

## 9. Arquitetura técnica

- **Código:** `src/features/game-cidade/` — módulos ES: `engine.js` (simulação), `cards.js` (deck/decisões), `diorama.js` (render SVG + câmera), `social.js` (duelo/fantasma/liga), `save.js`.
- **Estado:** localStorage `escola_game_v1` (variáveis da cidade, histórico de decisões, mandato, território, Lucidez, cartas vistas — poucos KB). Save a cada carta jogada. Dual-write Supabase quando online + **outbox** para pendências offline.
- **Determinismo:** PRNG com seed (mulberry32); `Math.random` proibido no engine. Habilita duelo justo, liga semanal, replays e QA reproduzível.
- **Dados:** cartas/crises em JSON versionado (`game/act1.json`…), gerado por script em `scripts/` a partir dos módulos reais (crise ↔ aula) com curadoria manual. Entra no **pipeline anti-cloning** (watermark + integrity manifest).
- **Cache:** assets do jogo em cache-first com versão no caminho (`/game/v1/...`). Primeiro acesso ao jogo: prefetch dos assets do ato atual + módulos de aula mapeados às crises do ato. Indicador "✓ disponível offline".
- **Render da cidade:** canvas 2D com sprites em atlas WebP, draw order isométrico (painter's algorithm), pan/zoom por transform, ciclo dia/noite por overlay de cor + camada de janelas acesas.
- **Orçamento de peso (revisado p/ sprites 3x):** Ato 1 completo ≤ 4 MB; atos seguintes ~1 MB lazy (padrão `preloadModules()`). Continua 100% offline após primeira visita.
- **Integração com o app:** XP existente (jogar rende XP normal), `weekly_xp` (liga), `shareWhatsApp`/`shareProgress` (viral), aba/entrada própria na navegação.

---

## 10. Fases do projeto

| Fase | Duração | Entregável | Portão de saída |
|------|---------|-----------|-----------------|
| 0. Pré-produção | 1 sem | Este GDD + tela-conceito (3 estados) + decisão do pipeline de arte + 15 primeiras cartas | Renato aprova a arte |
| 1. Core loop | 2–3 sem | 1 arco completo jogável com arte placeholder + save/restore | Diverte sem gráfico (teste com 10 pessoas) + 10 min em modo avião sem erro |
| 2. Diorama | 3–4 sem | Rua viva (estados + câmera + dia/noite) com arte final | Print crise vs prosperidade impressiona sozinho no WhatsApp |
| 3. Conteúdo | 2–3 sem (paralela à 2) | Gerador de cartas, currículo da cidade (30 disciplinas), eleições, território | Ato 1 completo com aulas reais disparando offline |
| 4. Social | 2 sem | Duelo P2P por seed, cidade-fantasma, liga semanal | Duelo criado e resolvido sem internet no criador (outbox) |
| 5. Lançamento | 2 sem | SFX, polish, QA (Playwright + cenário modo avião), Lighthouse ≥ 90, Axe, SW bump, check Lei Felca | Roda liso num Android de R$ 800 |

**Total estimado: 12–15 semanas.** Portões abortam barato: risco de diversão morre na Fase 1 (~3 semanas), risco de arte morre na Fase 0 (~1 semana).

## 11. Riscos

1. **Loop não diverte** → morto na Fase 1 pelo teste dos 30 segundos. Mitigação: mecânica antes de arte (Vampire Survivors: mecânica vence gráfico).
2. **Arte abaixo de "incrível"** → morto na Fase 0 pela tela-conceito. Mitigação: direção de arte + luz + movimento, não quantidade de assets.
3. **Balanceamento (jogo fácil demais / punitivo demais)** → seed determinística permite ajuste por dados; liga semanal expõe outliers.
4. **Escopo social crescer** → v1 lança com duelo por link apenas se necessário; fantasma e liga podem ser 4.1.

## 12. Pesquisa de mercado que embasou as decisões (2026-08-08)

- Hyper-casual puro: D1 ~22–27%, D30 <1% → morre sozinho. Híbrido-casual (loop simples + meta persistente) é o que retém.
- Prodigy Math: conhecimento como munição funciona, mas quiz interrompe ação (ruim para adulto) → nossa decisão: a decisão É o conteúdo.
- SimCity: o vício está em **assistir a simulação responder**; Region Play (vizinhos assíncronos + especialização) é o modelo social certo; o desastre do always-online (2013) valida nosso offline-first.
- Reigns: formato de cartas com swipe provou viciar e é construível solo.
- Frostpunk / Papers, Please: persuasão por consequência vivida, não por texto.
