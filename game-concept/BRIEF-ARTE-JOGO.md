# Brief de Arte — Jogo "Cidade Livre" (Escola Liberal)

**Para:** artista 3D / estúdio de sprites isométricos
**Referência de qualidade:** SimCity BuildIt, Megapolis, SuperCity — 2.5D isométrico pré-renderizado
**Data:** 2026-08-08 · Versão 1.0

---

## 1. O que é o projeto

Jogo de gestão de cidade dentro de uma plataforma educacional (PWA web/mobile, offline-first). O jogador governa uma cidade brasileira do interior; as decisões dele fazem a cidade **prosperar, entrar em crise ou ser abandonada** — e cada prédio precisa contar esse estado visualmente. A cidade É a interface emocional do jogo.

## 2. Pipeline exigido (padrão da indústria)

- Modelagem 3D low/mid-poly (Blender ou equivalente) → **render pré-assado para sprites 2D** (PNG com alpha, depois convertemos a WebP)
- Iluminação no render: sol quente de fim de tarde (~35° de elevação, vindo da direita), ambient occlusion assado, sombra de contato no chão incluída no sprite
- Câmera: **isométrica/dimétrica padrão de city builder** (~30° — mesma família visual do SimCity BuildIt). Ângulo EXATO fixado no primeiro render aprovado e nunca mais alterado
- Resolução: sprites a 3x (tile base 256×128 px em 1x → render a 768×384) para telas de alta densidade
- Fundo transparente, margem de 2 px, pivô no centro da base do footprint

## 3. Grid e modularidade

- Grid isométrico com footprints **1×1, 1×2, 2×2** (tile 1×1 = 256×128 px em 1x)
- Kit de materiais enxuto (5-6): reboco colorido, telha cerâmica, vidro, madeira, concreto, metal — variações geram diversidade sem modelar do zero
- Cada prédio entregue em **3 estados** (ver §5) — mesmo modelo, materiais/props trocados

## 4. Direção de arte

- **Tema:** cidade brasileira do interior (interior de SP). Sobrados com platibanda colorida, mercado municipal de arcos, praça com coreto e **ipê-amarelo**, banca de jornal, padaria de esquina. NÃO é cidade americana/europeia genérica
- **Tom:** cores saturadas e convidativas, leve exagero lúdico nas proporções (janelas/toldos um pouco maiores que o real — legibilidade mobile), silhuetas limpas e leitura instantânea de cada prédio a 100 px de altura
- **Paleta base:** terracota `#C96F4E` · amarelo-canário `#EEC95C` · rosa-queimado `#D97E6A` · verde-menta `#9EC4B4` · creme `#F4E6C4` · asfalto `#5B5666` · ipê `#FFC94A`
- **Luz:** hora dourada como estado "próspero" padrão; a luz é personagem — janelas acesas quentes, sombras longas suaves
- **Proibido:** qualquer marca real, político real, texto legível em placas além dos nomes genéricos (PADARIA, MERCADO, ESCOLA, BANCO)

## 5. Os 3 estados por prédio (o coração do jogo)

| Estado | Linguagem visual |
|---|---|
| **Próspero** | materiais vivos, janelas acesas, toldos abertos, props de vida (floreiras, mercadorias, bicicleta) |
| **Crise** | dessaturação parcial, janelas apagadas, props de escassez: **fila de pessoas na porta**, prateleiras vazias visíveis, placa ALUGA-SE, pichação discreta |
| **Abandono** | tábuas nas janelas, placa FECHADO, mato na base, entulho, cores lavadas |

Props de estado entregues como **sprites separados** (fila, tapume, placa, mato) para compor por cima do prédio base quando possível — reduz peso do atlas.

## 6. Lote 1 — Ato "Rua Principal" (entrega inicial)

Prédios-herói (modelagem única, 3 estados cada):
1. Padaria de esquina (sobrado, 1×1)
2. Mercado municipal de arcos (2×2)
3. Escola municipal (2×1) — **prédio mais importante do jogo**: precisa de 3 níveis de evolução (simples → reformada → com biblioteca/quadra) além dos estados
4. Agência bancária (1×1)
5. Prédio residencial 4 andares (1×1)
6. Banca de jornal (prop grande)
7. Praça: coreto, banco de praça, poste, **ipê-amarelo** (florido / ralo / seco — a árvore é o barômetro emocional da cidade)
8. Obra com guindaste (2×1, animável: ativa/parada)

Tiles de chão: rua asfalto (reta, curva, cruzamento, faixa de pedestre), calçada, grama/praça, terreno vazio, terreno abandonado.
Props de vida: pessoas (6-8 silhuetas estilizadas paradas/andando), carro popular, caminhão de mudança, camelô/barraca, caixa d'água ao fundo.

## 7. Formato de entrega

- PNG alpha 3x, nomeados `{elemento}_{footprint}_{estado}.png` (ex.: `padaria_1x1_crise.png`)
- Arquivo-fonte 3D (.blend) incluído — precisaremos renderizar variações futuras
- 1 render de cena montada (a Rua Principal completa nos 3 estados) para aprovação de conjunto
- Style guide de 1 página: ângulo de câmera, setup de luz, materiais — para manter consistência em lotes futuros

## 8. Processo de aprovação

1. **Teste pago:** 1 prédio (a padaria) nos 3 estados → aprovação de estilo antes do lote
2. Lote 1 completo (§6)
3. Lotes futuros: ~1 ato por mês (6-10 prédios novos por ato)

---

*Nota interna (não enviar ao artista): alternativa B em avaliação — asset pack isométrico profissional licenciado como base + artista customiza só os prédios-herói e os estados de crise. Decisão de orçamento do Renato. O mockup `tela-conceito.html` serve apenas como blocking de layout/narrativa dos estados, não como referência de estilo.*
