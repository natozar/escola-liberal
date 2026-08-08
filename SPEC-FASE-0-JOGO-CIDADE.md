# SPEC — Fase 0 (Pré-produção) — Jogo "Cidade Livre"

**Referência:** `GDD-JOGO-CIDADE.md` v0.1
**Duração:** 1 semana
**Portão de saída:** Renato aprova a tela-conceito. Sem arte aprovada, nada avança.

---

## 1. Entregáveis da Fase 0

1. GDD aprovado (feito — `GDD-JOGO-CIDADE.md`)
2. **Tela-conceito** da Rua Principal em 3 estados (§2)
3. **Decisão do pipeline de arte** (§3)
4. **Decisão de identidade visual**: pixel art vs flat ilustrado (§3.1 — pendente do Renato)
5. As **15 primeiras cartas do Ato 1** com dados completos (§4)
6. **Mapa crise ↔ módulo** do Ato 1 com IDs reais do currículo (§5)

---

## 2. Tela-conceito — requisitos (REVISADO 2026-08-08 após análise SimCity)

**Análise SimCity (fonte da revisão):** os city builders profissionais (SimCity BuildIt, Megapolis, SuperCity) NÃO usam arte 2D desenhada — usam **modelos 3D renderizados para sprites isométricos 2.5D** com iluminação e ambient occlusion assados no render, kits modulares (footprints 1×1/1×2/2×2, 5-6 materiais) e leve exagero lúdico nas proporções. É esse pipeline que produz o acabamento "profissional".

**Decisão:** a arte do jogo será **isométrica pré-renderizada de 3D** (sprites PNG/WebP alta resolução), produzida por artista/estúdio conforme `game-concept/BRIEF-ARTE-JOGO.md`.

- O mockup `game-concept/tela-conceito.html` (SVG) fica rebaixado a **blocking de layout/narrativa** — prova a mecânica dos 3 estados e a composição da cena; NÃO é referência de estilo
- Tela-conceito oficial da Fase 0 = **1 prédio-teste (padaria) nos 3 estados**, renderizado no pipeline profissional (teste pago do artista, ver brief §8) + 1 cena montada da Rua Principal
- Sprites a 3x (tile 1×1 = 256×128 em 1x), fundo alpha, sombra de contato assada, câmera dimétrica ~30° fixada no primeiro render aprovado

**Elementos mínimos no conceito (8):**
| Elemento | Próspero | Crise | Abandono |
|---|---|---|---|
| Padaria | vitrine acesa, movimento | **fila na porta, prateleira vazia** | placa FECHADO |
| Mercado municipal | bancas cheias | prateleiras vazias, camelô no beco (mercado paralelo) | esqueleto vazio |
| Escola | crianças no pátio | pichada, portão fechado | em ruína |
| Prédio residencial | janelas acesas, vasos | janelas escuras, aluga-se | **caminhão de mudança (êxodo)** |
| Banca de jornal | jornais variados | um jornal só ("Diário Oficial Popular") | fechada |
| Praça | feira, gente | vazia, mato | ponto de abandono |
| Agência/banco | movimento | fila de saque | fechada |
| Obra/guindaste | ativa (crescimento) | parada | removida |

**Critério de aceite:** o par de prints "cidade próspera vs cidade em crise" precisa impressionar **sozinho, sem legenda**, numa tela de WhatsApp.

---

## 3. Pipeline de arte (REVISADO 2026-08-08)

Caminho profissional, duas rotas — decisão de orçamento do Renato:

- **(A) Artista/estúdio 3D isométrico** executa o `BRIEF-ARTE-JOGO.md` completo: modela em Blender, renderiza sprites nos 3 estados. Máxima identidade (cidade brasileira do interior, ipê, mercado de arcos). Processo: teste pago de 1 prédio → lote 1 (8 prédios-herói + tiles + props)
- **(B) Asset pack isométrico profissional licenciado** como base (RetroStyle, Unity Asset Store, itch.io premium) + artista customiza APENAS os prédios-herói e os props de estado (fila, tapume, ALUGA-SE). Mais rápido e barato; identidade brasileira parcial

Recomendação: **(A) para os 8 prédios-herói do Ato 1** (são poucos e são o rosto do jogo) — avaliar (B) para preencher quarteirões genéricos nos atos seguintes.

**Implicação técnica (atualiza GDD §9):** render do diorama passa de SVG para **canvas 2D com sprites em atlas WebP** (painter's algorithm isométrico, pan/zoom por transform, dia/noite por overlay de cor + camada de janelas acesas). Orçamento de peso do Ato 1 revisado: ≤ 4 MB (atlas 3x comprimido em WebP). Continua 100% offline.

**Fase 0 produz apenas o teste pago da padaria (3 estados) + cena montada.** O lote completo é trabalho da Fase 2 — não gastar antes do portão da Fase 1 (diversão comprovada com placeholders).

### 3.1 Identidade visual — DECIDIDO (Renato, 2026-08-08)
- **Flat ilustrado em ALTA RESOLUÇÃO.** Pixel art descartado.
- Vetorial (SVG) — nítido em qualquer densidade de tela, do Android de entrada ao print em 4K
- Referências de acabamento: Monument Valley, Alto's Odyssey — geometria limpa, paleta forte, luz e sombra longas, gradientes suaves
- Padrão de exigência: perfeição visual; a cena precisa parecer premium, não "joguinho"

---

## 4. As 15 primeiras cartas do Ato 1 — "A Rua Principal"

Estrutura de dados (formato do `game/act1.json`):

```json
{
  "id": "a1-06",
  "tipo": "decisao | prometedor | crise | eleicao",
  "titulo": "…",
  "texto": "…",
  "opcoes": [
    {
      "rotulo": "…",
      "efeitos": { "aprovacao": 0, "caixa": 0 },
      "agendados": [ { "tick": 8, "efeito": { "moradia": -2 }, "cena": "el-predio:--crise" } ]
    }
  ],
  "crise": "id-da-carta-de-crise-que-destrava",
  "aula": "id-do-modulo-real"
}
```

Convenções: efeitos em pontos abstratos (balanceamento na Fase 1); `cena:` indica a mudança visual no diorama; aprovação de cartas do Prometedor é multiplicada por (1 − escolaridade) — a vacina da educação.

**Bloco 1 — Prosperidade honesta (cartas 1–4).** Objetivo: apego. A queda só dói se houver altura. Sem armadilhas aqui — decisões legítimas com trade-offs reais.

1. **A Cratera da Rua Principal** *(decisão — tutorial de efeitos agendados)*
   "A cratera da Rua Principal engoliu mais um pneu. O conserto custa caro. Adiar é sempre uma opção."
   - **Consertar agora:** −caixa, +aprovação
   - **Adiar:** caixa preservado; agendado t+6: conserto custa o dobro, −aprovação (cena: rua esburacada piora)
   - Lição embutida: adiar manutenção multiplica o custo. Sem aula vinculada (tutorial).

2. **A Praça Abandonada** *(decisão)*
   "A praça central virou mato. Reformar custa. Um empresário oferece comprar o terreno para estacionamento."
   - **Reformar:** −caixa, +aprovação; agendado t+8: +comércio ao redor (cena: praça viva, feira)
   - **Vender o terreno:** +caixa; agendado t+8: novo negócio abre ali (cena: estacionamento + lojinha)
   - Ambas legítimas. Ensina: não há resposta "do bem" única — há trade-offs.

3. **O Alvará da Feira** *(decisão)*
   "Feirantes esperam 8 meses por licença. Pedem um alvará simplificado. O fiscal reclama que 'vai virar bagunça'."
   - **Simplificar:** +aprovação; agendado t+6: +novos negócios, +caixa via movimento (cena: feira na praça)
   - **Manter a burocracia:** nada muda; agendado t+6: feirantes migram para cidade vizinha (cena: barracas some)
   - Aula relacionada (opcional, não-crise): `entrepreneur`

4. **O Teto da Escola** *(decisão — planta a linha da educação)*
   "O teto da escola municipal goteja sobre as carteiras. Consertar não rende manchete."
   - **Consertar:** −caixa; agendado t+10: +escolaridade (lento, silencioso) (cena: escola ativa)
   - **Adiar:** caixa preservado; agendado t+10: −escolaridade (cena: escola pichada)
   - Primeira semente da mecânica-vacina: escolaridade multiplica a resistência à demagogia.

**Bloco 2 — A sedução (cartas 5–10).** O Prometedor entra. Cada oferta dá aprovação AGORA e agenda o custo invisível.

5. **O Prometedor Chega** *(prometedor — introdução do antagonista)*
   "Um sujeito carismático reúne multidão na praça: 'Pão de graça às sextas! A prefeitura paga. Ou o prefeito é contra o pão do povo?'"
   - **Bancar o pão de graça:** ++aprovação (×ignorância), −caixa; agendado t+6: padarias vendem menos, uma fecha (cena: `el-padaria` meia-luz)
   - **Recusar:** −aprovação ("o prefeito negou pão ao povo")
   - Aula (não dispara ainda; referência futura): `critical` — Falácia do Almoço Grátis

6. **Congelar os Aluguéis** *(prometedor — a tentação central do Ato 1)*
   "Os aluguéis subiram. O Prometedor propõe: 'Congele os aluguéis por lei. Proteja as famílias — custa zero aos cofres!'"
   - **Congelar:** ++aprovação (×ignorância), caixa intacto; agendado t+8: −construção de moradias; t+10: proprietários param manutenção; t+12: escassez de imóveis, filas (cena: `el-predio` janelas escuras + "aluga-se" some + obra parada)
   - **Não congelar:** −aprovação (protesto de inquilinos em frente à prefeitura)
   - Destrava crise: `a1-11`. Aula: `supply` (aulas "Por que Controle de Preços Falha", "O que São Preços?")

7. **Tabelar a Comida** *(prometedor)*
   "Preços do mercado subiram. 'Tabele os alimentos! Nenhuma família pode pagar mais que o preço justo.'"
   - **Tabelar:** ++aprovação (×ignorância); agendado t+6: prateleiras esvaziam; t+10: camelô vende por fora mais caro (cena: `el-mercado` vazio + mercado paralelo no beco)
   - **Não tabelar:** −aprovação
   - Destrava crise: `a1-11`. Aula: `supply`

8. **Os Vales da Prefeitura** *(prometedor)*
   "O caixa apertou. 'Simples: emita vales-compra municipais. Todo comércio será obrigado a aceitar. Dinheiro novo, problema velho resolvido.'"
   - **Emitir vales:** +caixa (fictício), +aprovação; agendado t+6: preços dos comércios sobem; t+10: vales valem metade (cena: cartazes de preço trocando, seta pra cima)
   - **Cortar gastos:** −aprovação, −caixa real menor
   - Aula: `money` (aulas "O que é Inflação?", "O que Dá Valor ao Dinheiro?")

9. **O Jornal Incômodo** *(prometedor)*
   "O jornal da cidade publicou: 'Prefeitura gasta mais do que arrecada'. O Prometedor sugere: 'Crie o Diário Oficial Popular. Notícia boa, feita por nós. E anuncie só nele.'"
   - **Criar o Diário:** +aprovação; efeito oculto permanente: medidor de aprovação **descola da realidade**; corrupção passa a drenar caixa invisivelmente (cena: `el-banca` só com um jornal)
   - **Manter imprensa livre:** −aprovação (as críticas continuam); efeito oculto: aprovação continua medindo a realidade
   - Aula: `media-literacy` / `fake-news-e-fact-checking`

10. **A Padaria do Povo** *(prometedor)*
    "A padaria da carta 5 faliu. Multidão na porta. 'Estatize! Padaria do Povo: pão barato, emprego garantido, gestão do povo.'"
    - **Estatizar:** ++aprovação (×ignorância), −caixa (folha de pagamento); agendado t+8: produtividade cai, fila dobra, prejuízo mensal (cena: `el-padaria` fila crescendo)
    - **Leiloar para novo dono:** −aprovação ("entregou ao capital"); agendado t+8: reabre, fila some (cena: padaria acesa)
    - Aula: `history` (aulas "URSS: O Fracasso do Socialismo", "Venezuela: Destruição pela Intervenção")

**Bloco 3 — Caos, aula e redenção (cartas 11–15).** O loop completo se fecha.

11. **CRISE: As Prateleiras Vazias** *(crise — disparada pelos agendados de 6/7)*
    Sem escolha: a câmera desce até a fila da padaria e o mercado vazio, segura 2s. Texto: "As prateleiras esvaziaram. As filas cresceram. Ninguém na cidade sabe explicar por quê."
    - **Botão único: "Entender o que houve"** → abre a aula real `supply` ("Por que Controle de Preços Falha") — já cacheada offline
    - Concluir a aula: **+Lucidez** (primeira vez que a moeda aparece) + instala o instrumento **medidor de preços** no painel
    - Adiar a aula é permitido; a crise continua degradando a cena até o jogador voltar

12. **A Reforma Impopular** *(decisão — gastar Lucidez)*
    "Agora você sabe o que causou as filas. Descongelar tem preço: manchetes, protestos, o Prometedor gritando 'traição'."
    - **Descongelar preços e aluguéis (custa Lucidez):** −aprovação temporária (protestos na cena); agendado t+4: prateleiras voltam; t+8: obras retomam (cena: recuperação progressiva)
    - **Manter congelamento:** crise segue piorando (cena degrada mais um nível)
    - Ensina o efeito catraca: sair custa mais que entrar.

13. **O Fiscal de Preços** *(prometedor — a dobra na aposta)*
    "O Prometedor tem outra saída: 'O problema não é a tabela, é o comerciante ganancioso. Contrate fiscais. Multe quem cobrar caro.'"
    - **Contratar fiscais:** −caixa, +aprovação leve; agendado t+6: mercado paralelo cresce, corrupção sobe (cena: beco do camelô dobra de tamanho)
    - **Recusar ("o problema é a tabela")**: requer Lucidez ≥ 1 para desbloquear a opção com argumento — sem Lucidez o jogador pode recusar, mas sem convencer: −aprovação maior
    - Ensina: intervenção que falha vira pretexto para a próxima intervenção. Aula: `critical` ("Pensamento de Primeira vs. Segunda Ordem")

14. **A Promessa Impagável** *(prometedor — pré-eleição)*
    "Véspera de eleição. O Prometedor, agora candidato, promete: 'Aluguel zero para todos. Comida tabelada. Vales em dobro.' A cidade escuta."
    - **Rebater com números (custa Lucidez):** eficácia proporcional à escolaridade da cidade — população educada faz as contas junto (+confiança); população ignorante vaia
    - **Prometer mais ainda:** ++aprovação agora; agendado t+2 do próximo mandato: cobrança impagável, −confiança forte
    - Aula: `voto-aritmetica-das-promessas` (mod-176) + `falacias-e-manipulacao`

15. **A Primeira Eleição** *(eleicao — fecho do Ato 1)*
    A cidade vota. Resultado = função de aprovação; aprovação = função da realidade **somente se** a imprensa ficou livre (carta 9).
    - **Vitória:** mandato 2 + expansão de 1 quarteirão se os marcos de prosperidade foram cruzados (cena: quarteirão novo revelado) + selo da rodada
    - **Derrota:** o jogador assiste 30 segundos do Prometedor governando (cena degradando em sequência) → botão "Disputar a próxima eleição" (derrota nunca é permanente — Lei Felca)
    - Tela de fim de rodada: selo de identidade compartilhável + print do mapa

---

## 5. Mapa crise ↔ módulo do Ato 1 (IDs reais do currículo)

| Tentação/crise no jogo | Módulo (id real em `lessons/index.json`) | Aulas-âncora |
|---|---|---|
| Congelamento de aluguéis / tabelamento | `supply` | "Por que Controle de Preços Falha", "O que São Preços?", "Equilíbrio de Mercado" |
| Emissão de vales (inflação) | `money` | "O que é Inflação?", "O que Dá Valor ao Dinheiro?", "Banco Central e Política Monetária" |
| Pão de graça / almoço grátis | `critical` | "Falácia do Almoço Grátis", "Falácia da Janela Quebrada" |
| Estatização da padaria | `history` | "URSS: O Fracasso do Socialismo", "Venezuela: Destruição pela Intervenção" |
| Mídia comprada / Diário Oficial Popular | `media-literacy`, `fake-news-e-fact-checking` | "Como a Mídia Distorce Economia" (em `critical`) + módulos dedicados |
| Fiscal de preços (dobra da intervenção) | `critical` | "Pensamento de Primeira vs. Segunda Ordem" |
| Promessa impagável (eleição) | `voto-aritmetica-das-promessas` (mod-176), `falacias-e-manipulacao` | módulo inteiro (orçamento público, teste de viabilidade) |
| Burocracia do alvará (referência opcional) | `entrepreneur` | "Identificando Problemas", "Modelo de Negócio" |
| Orçamento da prefeitura (Ato 2, preparar) | `impostos-e-orcamento-publico`, `como-funciona-o-estado` | — |

Prefetch offline do Ato 1 = os JSONs dos módulos: `supply`, `money`, `critical`, `history`, `media-literacy`, `fake-news-e-fact-checking`, `voto-aritmetica-das-promessas`, `falacias-e-manipulacao` (+ assets do jogo). Estimativa: 8 módulos × ~18 KB = ~150 KB — dentro do orçamento.

---

## 6. Critérios de aceite da Fase 0

- [ ] Tela-conceito nos 3 estados aprovada pelo Renato
- [x] Estilo visual decidido: flat ilustrado alta resolução (2026-08-08)
- [ ] Pipeline de arte decidido e (se ilustrador) orçado
- [ ] 15 cartas revisadas pelo Renato (texto e efeitos)
- [ ] Varredura editorial das 15 cartas: zero político real, arquétipos fictícios ✓ (verificado nesta spec)
- [ ] Mapa crise↔módulo validado contra `lessons/index.json` ✓ (IDs conferidos em 2026-08-08)

**Próxima fase (1 — Core loop):** engine determinística + as 15 cartas jogáveis com arte placeholder + save/restore + teste dos 30 segundos com 10 pessoas + teste modo avião.
