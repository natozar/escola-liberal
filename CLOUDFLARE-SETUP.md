# Cloudflare na frente do GitHub Pages — Guia de Execução

**Objetivo:** banda ilimitada e gratuita + proteção DDoS + cache global, mantendo o fluxo de deploy exatamente como está (push → GitHub Actions → Pages). Custo: **R$ 0** (plano Free).

**Por quê:** o GitHub Pages tem limite macio de ~100GB/mês de banda (~150-200 mil usuários novos/mês no nosso payload de ~450KB). Com o Cloudflare na frente, o GitHub vira só a "origem" — quase todo o tráfego é servido do cache do Cloudflare, que não tem limite de banda no plano Free.

---

## Passo 1 — Criar conta e adicionar o site (5 min)

1. Acesse `dash.cloudflare.com/sign-up` e crie a conta (e-mail + senha).
2. Clique **Add a site** → digite `escolaliberal.com.br` → plano **Free** → Continue.
3. O Cloudflare vai escanear os DNS atuais e importar os registros automaticamente. Confira que apareceram:
   - `A` ou `CNAME` apontando para o GitHub Pages (os A records do Pages são 185.199.108.153, .109.153, .110.153, .111.153; ou CNAME `natozar.github.io`)
   - Registro `www` se existir
4. Deixe TODOS os registros com a **nuvem laranja** (Proxied) ligada.
5. O Cloudflare mostra **2 nameservers** (ex.: `alice.ns.cloudflare.com` e `bob.ns.cloudflare.com`). Copie os dois.

## Passo 2 — Trocar os nameservers no Registro.br (5 min + propagação)

1. Entre em `registro.br` → login → domínio `escolaliberal.com.br`.
2. Menu **DNS** → **Alterar servidores DNS** → **Utilizar outros servidores**.
3. Cole os 2 nameservers do Cloudflare (apague os atuais).
4. Salvar. O Registro.br avisa que pode levar até 24-48h, mas normalmente propaga em 1-4h.
5. Quando propagar, o Cloudflare envia e-mail "site is active" e o painel muda para **Active**.

⚠️ Durante a propagação o site NÃO cai — os dois DNS respondem em paralelo.

## Passo 3 — Configuração no painel Cloudflare (10 min)

Em `dash.cloudflare.com` → escolaliberal.com.br:

### SSL/TLS
- **SSL/TLS → Overview:** modo **Full (strict)** — o GitHub Pages tem certificado válido.
- **SSL/TLS → Edge Certificates:** ligar **Always Use HTTPS**.

### Cache (o passo que zera a banda do GitHub)
- **Caching → Cache Rules → Create rule:**
  - Nome: `assets-e-aulas`
  - When: `URI Path starts with "/assets/"` OR `URI Path starts with "/lessons/"`
  - Then: **Eligible for cache** · **Edge TTL: 2 hours** (Override origin)
- Isso faz o Cloudflare segurar aulas e assets por 2h no edge sem consultar o GitHub. Como o app tem Service Worker + banner de update, um deploy demora no máximo 2h para chegar ao edge — compatível com a política de atualização.
- **Opcional pós-deploy:** Caching → Configuration → **Purge Everything** força o edge a buscar a versão nova imediatamente.

### Não configurar (deixar padrão)
- **Speed → Auto Minify / Rocket Loader:** DESLIGADOS (o build já minifica; Rocket Loader pode quebrar o boot do app).
- **Scrape Shield → Email Obfuscation:** desligar (injeta script; conflita com CSP).

## Passo 4 — Verificação (2 min)

Depois do e-mail "active", rodar no terminal:

```
curl -s -I https://escolaliberal.com.br/ | findstr /i "server cf-cache"
```

Deve aparecer `server: cloudflare` e `cf-cache-status: HIT` (ou MISS na primeira, HIT nas seguintes).

---

## O que NÃO muda

- Deploy continua: push na main → GitHub Actions → Pages.
- O arquivo CNAME no repo continua igual.
- HTTPS, PWA, Service Worker: tudo funciona igual.
- Supabase/Stripe: não passam pelo Cloudflare (são domínios próprios).

## Resultado

| Antes | Depois |
|---|---|
| ~100GB/mês (limite macio GitHub) | Ilimitado (Cloudflare Free) |
| Sem proteção DDoS explícita | DDoS mitigation automática |
| Cache max-age=600 fixo | Edge cache 2h + purge sob demanda |
| Custo R$ 0 | Custo R$ 0 |
