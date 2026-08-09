# Kit de Prompts — Imagens Realistas do Protótipo "Cidade Livre"

Gerar em qualquer gerador de imagem (Midjourney, DALL-E, Imagen, Firefly). Salvar com o **nome exato** abaixo nesta pasta (`game-prototype/img/`) — o protótipo detecta e exibe automaticamente; sem o arquivo, mostra o placeholder.

## Especificações fixas (todas as imagens)

- **Formato:** 16:9, mínimo 1920×1080, exportar JPG qualidade ~80 (alvo: ≤ 350 KB cada)
- **Identidade:** MESMA rua em todas — padaria de esquina numa rua de comércio de cidade do interior de São Paulo (sobrados baixos, fiação aérea, calçada de pedra portuguesa). Gerar as variações na mesma sessão/seed pra manter consistência
- **Pessoas:** sempre de costas ou distantes, rostos não identificáveis (LGPD + segurança jurídica)
- **PROIBIDO:** rostos reconhecíveis, políticos, bandeiras de partido, marcas reais, texto legível em placas (exceto genéricos tipo "PADARIA")
- **Bloco de estilo** (colar no fim de todo prompt):
  `photorealistic, cinematic photography, 35mm lens, natural light, muted color grade, editorial documentary style, no text, no logos, 16:9`

---

## As 4 imagens principais (slots já ligados no protótipo)

### 1. `crise.jpg` — O PROBLEMA (aparece na carta de crise, antes da aula)
A imagem mais importante do jogo: a fila e a prateleira vazia.

> A long queue of people seen from behind, waiting outside a small corner bakery in a Brazilian countryside town at 7am, overcast gray morning light, the bakery shelves visible through the window are almost empty, worn colorful low storefronts, portuguese stone sidewalk, overhead power lines, somber documentary mood — photorealistic, cinematic photography, 35mm lens, natural light, muted color grade, editorial documentary style, no text, no logos, 16:9

### 2. `solucao.jpg` — A SOLUÇÃO (aparece quando o abastecimento se recupera pós-reforma)
A mesma padaria, prateleiras cheias, sem fila. O contraste é o argumento.

> The same small corner bakery in a Brazilian countryside town, weeks later on a bright golden morning, shelves full of fresh bread visible through the open door, no queue, a woman seen from behind leaving with a bakery bag, warm inviting light, life returning to normal, hopeful documentary mood — photorealistic, cinematic photography, 35mm lens, natural light, warm color grade, editorial documentary style, no text, no logos, 16:9

### 3. `vitoria.jpg` — FIM: REELEITO
> Main commercial street of a Brazilian countryside town at sunrise, shopkeepers seen from behind opening their storefronts, construction crane working in the background, golden hour light over low colorful buildings, portuguese stone sidewalk, sense of quiet prosperity and normal life — photorealistic, cinematic photography, 35mm lens, natural light, warm color grade, editorial documentary style, no text, no logos, 16:9

### 4. `derrota.jpg` — FIM: DERROTADO
> View from inside a dim office window at dusk, looking down at a distant crowded political rally in a town square below, confetti in the air, the crowd seen from far above and behind, rain drops on the window glass, melancholic blue-gray tones, sense of watching from the outside — photorealistic, cinematic photography, 35mm lens, natural light, muted cold color grade, editorial documentary style, no text, no logos, 16:9

---

## Extras (fase seguinte — slots serão ligados quando as cartas ganharem momento visual)

### 5. `moradia-crise.jpg` — congelamento de aluguéis cobrando o preço
> Abandoned unfinished apartment building in a Brazilian town, construction halted, weathered concrete skeleton, faded "for rent" style paper signs on old buildings nearby (illegible), overcast light, documentary mood — + bloco de estilo

### 6. `mercado-paralelo.jpg` — o beco do camelô
> Narrow alley behind a municipal market in a Brazilian town, improvised street vendor stall with tarp roof selling basic goods, a customer seen from behind, dim light, informal economy atmosphere — + bloco de estilo

### 7. `promessa.jpg` — o palanque do Prometedor
> Crowded town square rally at night in a Brazilian countryside town, a charismatic speaker seen only from behind in silhouette on a small stage with dramatic spotlights, hands raised in the crowd, faces not visible, theatrical populist atmosphere — + bloco de estilo

---

## Depois de gerar

1. Salvar os JPGs nesta pasta com os nomes exatos
2. Testar localmente (abrir `game-prototype/index.html`)
3. Me avisar — eu embuto as imagens em base64 no arquivo e republico o artifact (o link de teste bloqueia arquivos externos, então a versão publicada precisa das imagens embutidas)
