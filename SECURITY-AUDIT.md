# Security Audit — Escola Liberal

**Date:** 2026-04-02
**Scope:** supabase-client.js, Edge Functions, client-side data exposure, RLS policies
**Auditor:** Claude Code (automated)

---

## 1. Database Operations Inventory

### Table: `profiles`
| Operation | Location | Code |
|-----------|----------|------|
| SELECT plan, plan_expires_at | loadUserPlan() L210-214 | `.from('profiles').select('plan, plan_expires_at').eq('id', currentUser.id).single()` |
| UPDATE plan → free | loadUserPlan() L223-226 | `.from('profiles').update({ plan: 'free', plan_expires_at: null }).eq('id', currentUser.id)` |
| UPDATE name, avatar, etc. | mergeLocalToCloud() L354-365 | `.from('profiles').update({name, avatar, onboarding_done, theme, daily_goal, pin, state}).eq('id', currentUser.id)` |
| UPDATE plan (webhook) | stripe-webhook L102, L139 | `.from('profiles').update({ plan }).eq('id', userId)` |

**Risk without RLS:** Any authenticated user could read/modify ANY user's profile (plan, PIN, name). An attacker could upgrade their own plan to 'vitalicio' or read other users' PINs.

### Table: `progress`
| Operation | Location | Code |
|-----------|----------|------|
| SELECT * | mergeLocalToCloud() L308-313 | `.from('progress').select('*').eq('profile_id', currentUser.id).is('sub_profile_id', null).maybeSingle()` |
| UPSERT | syncProgressToCloud() L376-389 | `.from('progress').upsert({profile_id: currentUser.id, ...}, {onConflict: 'profile_id,sub_profile_id'})` |

**Risk without RLS:** Users could read/overwrite other users' progress, inflate XP, or tamper with quiz results.

### Table: `notes`
| Operation | Location | Code |
|-----------|----------|------|
| SELECT | syncNotesFromCloud() L430-434 | `.from('notes').select('lesson_key, content').eq('profile_id', currentUser.id).is('sub_profile_id', null)` |
| UPSERT | syncNotesToCloud() L419-420 | `.from('notes').upsert(rows, {onConflict: 'profile_id,sub_profile_id,lesson_key'})` |

**Risk without RLS:** Users could read other users' private notes.

### Table: `favorites`
| Operation | Location | Code |
|-----------|----------|------|
| SELECT | syncFavsFromCloud() L469-473 | `.from('favorites').select('lesson_key').eq('profile_id', currentUser.id)` |
| DELETE + INSERT | syncFavsToCloud() L451-459 | `.from('favorites').delete().eq('profile_id', currentUser.id)` then `.insert(rows)` |

**Risk without RLS:** User could delete another user's favorites via crafted profile_id.

### Table: `timeline`
| Operation | Location | Code |
|-----------|----------|------|
| SELECT | syncTimelineFromCloud() L507-513 | `.from('timeline').select('...').eq('profile_id', currentUser.id).order().limit(200)` |
| DELETE + INSERT | syncTimelineToCloud() L496-497 | `.from('timeline').delete().eq('profile_id', currentUser.id)` then `.insert(rows)` |

**Risk without RLS:** User could read another user's activity timeline (study habits, timestamps).

### Table: `weekly_xp`
| Operation | Location | Code |
|-----------|----------|------|
| UPSERT | _syncLeaderboardXP() (leaderboard.js) | `.from('weekly_xp').upsert({user_id, week_id, xp, league, name, avatar}, {onConflict: 'user_id,week_id'})` |
| SELECT (top 20) | _fetchRealLeaderboard() (leaderboard.js) | `.from('weekly_xp').select('...').eq('week_id', weekId).order('xp', {ascending: false}).limit(20)` |

**Risk without RLS:** Users could inflate their leaderboard XP to any value. The SELECT is intentionally public (leaderboard).

### Table: `subscriptions`
| Operation | Location | Code |
|-----------|----------|------|
| SELECT stripe_customer_id | create-checkout L70-74 | (Edge Function, uses service_role) |
| UPSERT | create-checkout L85-88, stripe-webhook L75-98 | (Edge Function, uses service_role) |
| UPDATE status | stripe-webhook L115-155 | (Edge Function, uses service_role) |

**Risk without RLS:** If RLS is missing, any user could read/modify subscription records. However, these operations use `service_role` key in Edge Functions, bypassing RLS. Client-side never directly accesses this table.

### Table: `admin_settings`
| Operation | Location | Code |
|-----------|----------|------|
| SELECT value (paywall_enabled) | loadPaywallSetting() L279 | `.from('admin_settings').select('value').eq('key','paywall_enabled').single()` |
| SELECT (rate limit) | ai-tutor L74-78 | (Edge Function) `.from('admin_settings').select('value').eq('key', rateLimitKey)` |
| UPSERT (rate limit, event log) | ai-tutor L141-145, stripe-webhook L56-60 | (Edge Functions, service_role) |

**Risk without RLS:** If RLS is missing, any user could read admin settings or modify rate limit counters to bypass rate limiting. The rate limit key format (`tutor:{userId}:{date}`) could be guessed.

### Table: `leads`
| Operation | Location | Code |
|-----------|----------|------|
| UPSERT | saveLeadEmail() L605-612 | `.from('leads').upsert({email, name, age_group, lang, source}, {onConflict: 'email'})` |

**Risk without RLS:** Any user could read ALL lead emails (data leak), or insert spam entries.

### Table: `plans`
| Operation | Location | Code |
|-----------|----------|------|
| SELECT * | loadUserPlan() L234-238 | `.from('plans').select('*').eq('id', userPlan).single()` |

**Risk without RLS:** Plans table is likely read-only config. Low risk, but should still be protected.

---

## 2. Recommended RLS Policies

```sql
-- ============================================================
-- PROFILES: users can only read/update their own profile
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users read own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Users update own profile (cannot change plan — only webhook can)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    -- Prevent client from changing plan directly
    AND (plan = OLD.plan OR plan IS NOT DISTINCT FROM OLD.plan)
  );

-- Profile creation handled by trigger on auth.users insert
-- No direct INSERT policy for clients

-- ============================================================
-- PROGRESS: users manage only their own progress
-- ============================================================
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_select_own" ON progress
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "progress_insert_own" ON progress
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "progress_update_own" ON progress
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

-- No DELETE policy (progress should not be deletable)

-- ============================================================
-- NOTES: users manage only their own notes
-- ============================================================
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notes_select_own" ON notes
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "notes_insert_own" ON notes
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "notes_update_own" ON notes
  FOR UPDATE TO authenticated
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "notes_delete_own" ON notes
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- ============================================================
-- FAVORITES: users manage only their own favorites
-- ============================================================
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favorites_select_own" ON favorites
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "favorites_insert_own" ON favorites
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "favorites_delete_own" ON favorites
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- ============================================================
-- TIMELINE: users manage only their own timeline
-- ============================================================
ALTER TABLE timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "timeline_select_own" ON timeline
  FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "timeline_insert_own" ON timeline
  FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "timeline_delete_own" ON timeline
  FOR DELETE TO authenticated
  USING (profile_id = auth.uid());

-- ============================================================
-- WEEKLY_XP: users can read all (leaderboard), write only own
-- ============================================================
ALTER TABLE weekly_xp ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read (public leaderboard)
CREATE POLICY "weekly_xp_select_all" ON weekly_xp
  FOR SELECT TO authenticated
  USING (true);

-- Users can only insert/update their own XP
CREATE POLICY "weekly_xp_upsert_own" ON weekly_xp
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "weekly_xp_update_own" ON weekly_xp
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- SUBSCRIPTIONS: no client access (Edge Functions use service_role)
-- ============================================================
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only read their own subscription status
CREATE POLICY "subscriptions_select_own" ON subscriptions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- No INSERT/UPDATE/DELETE for clients
-- Edge Functions use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS

-- ============================================================
-- ADMIN_SETTINGS: read-only for clients, write via service_role
-- ============================================================
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read non-sensitive settings (paywall_enabled, etc.)
-- Rate limit keys contain user IDs but values are just counters
CREATE POLICY "admin_settings_select_public" ON admin_settings
  FOR SELECT TO authenticated
  USING (
    key = 'paywall_enabled'
    OR key LIKE 'tutor:%'  -- rate limit counters
  );

-- No INSERT/UPDATE/DELETE for clients
-- Edge Functions use service_role

-- ============================================================
-- LEADS: insert-only for clients, no read
-- ============================================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Anyone (even anon) can insert a lead
CREATE POLICY "leads_insert_anon" ON leads
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- No SELECT for clients (admin-only via dashboard with service_role)

-- ============================================================
-- PLANS: read-only config table
-- ============================================================
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_select_all" ON plans
  FOR SELECT TO authenticated, anon
  USING (true);

-- No INSERT/UPDATE/DELETE for clients
```

---

## 3. Vulnerabilities Found

### CRITICAL

#### C1: Profiles plan field writable from client
**Severity:** CRITICAL
**File:** supabase-client.js L354-365 (mergeLocalToCloud)
**Issue:** The `profiles.update()` call sets multiple fields but does NOT explicitly set `plan`. However, if RLS is missing, a malicious user could craft a direct Supabase API call:
```js
sbClient.from('profiles').update({ plan: 'vitalicio' }).eq('id', currentUser.id)
```
This would give them lifetime premium access without paying.
**Fix:** Apply RLS policy `profiles_update_own` with plan immutability check (see SQL above). The plan field should only be modifiable by service_role (Edge Functions).

#### C2: No RLS verification confirmed
**Severity:** CRITICAL
**Issue:** The codebase has no evidence that RLS is enabled on ANY table. The CLAUDE.md mentions "RLS policies" but there are no migration files creating them. Without RLS, the anon key grants full read/write to all tables.
**Fix:** Execute all RLS policies above in the Supabase SQL Editor immediately.

### HIGH

#### H1: XP inflation via weekly_xp
**Severity:** HIGH
**File:** src/features/leaderboard.js (_syncLeaderboardXP)
**Issue:** The client sends arbitrary XP values to `weekly_xp` table. A user could open DevTools and run:
```js
sbClient.from('weekly_xp').upsert({user_id: currentUser.id, week_id: '2026-W14', xp: 999999})
```
**Fix:** RLS limits writes to own user_id (prevents impersonation) but cannot validate XP values. For proper validation, move XP sync to an Edge Function that calculates server-side.

#### H2: Rate limit bypass via admin_settings
**Severity:** HIGH
**File:** supabase/functions/ai-tutor/index.ts L74-78, L141-145
**Issue:** Rate limiting stores counters in `admin_settings` using service_role, which is correct. However, if `admin_settings` has no RLS, a client could directly reset their rate limit:
```js
sbClient.from('admin_settings').delete().eq('key', 'tutor:USER_ID:2026-04-02')
```
**Fix:** Apply RLS on admin_settings (see SQL above — clients can only SELECT specific keys, no DELETE).

#### H3: Leads table readable without RLS
**Severity:** HIGH
**File:** supabase-client.js L605 (saveLeadEmail)
**Issue:** Without RLS, any authenticated user could run:
```js
sbClient.from('leads').select('*')
```
This exposes ALL lead emails, names, and age groups — a LGPD violation for a platform serving minors.
**Fix:** Apply RLS: insert-only for clients, no SELECT.

### MEDIUM

#### M1: Supabase anon key exposed in source
**Severity:** MEDIUM (by design)
**File:** supabase-client.js L8-9
**Issue:** `SUPABASE_URL` and `SUPABASE_ANON_KEY` are in the client code.
**Mitigation:** This is standard for SPAs. The anon key is a publishable key (not service_role). Security relies entirely on RLS policies. **This is acceptable IF and ONLY IF RLS is properly configured.**
**Note:** The key format `sb_publishable_-_ZYfPPllImPNCKOA1ZMXQ_zYYM-P6q` appears truncated or obfuscated. Verify the actual key in Supabase Dashboard.

#### M2: PIN hash stored in localStorage
**Severity:** MEDIUM
**File:** src/features/profiles.js (_hashPin, setPin)
**Issue:** Parent dashboard PIN is hashed with SHA-256 and stored in localStorage. The hash uses a static salt (`ec_pin_salt_`). While SHA-256 is irreversible, a 4-digit PIN has only 10,000 combinations — easily brute-forceable offline.
**Fix:** This is acceptable for a local convenience lock (not a security boundary). Add a comment clarifying this is NOT a security feature. The PIN protects against child access, not attackers.

#### M3: Implicit OAuth flow exposes tokens in URL hash
**Severity:** MEDIUM
**File:** supabase-client.js L26 (`flowType: 'implicit'`)
**Issue:** Implicit flow puts access tokens in the URL hash fragment (`#access_token=...`). This can be leaked via:
- Browser history
- Referrer headers (mitigated by hash not being sent in Referer)
- Screen sharing
**Fix:** Consider migrating to PKCE flow (`flowType: 'pkce'`). This requires server-side token exchange but is more secure. For the current SPA-only architecture, implicit flow is the standard choice.

#### M4: create-checkout missing priceId validation
**Severity:** MEDIUM
**File:** supabase/functions/create-checkout/index.ts L55
**Issue:** The `priceId` from the request body is passed directly to `stripe.prices.retrieve(priceId)`. While Stripe will reject invalid IDs, there's no server-side allowlist of valid price IDs. A user could potentially pass a different price ID from another Stripe account or a test-mode price.
**Fix:** Add allowlist validation:
```typescript
const ALLOWED_PRICES = [
  'price_1TEZ923hFZmDmgU4CNzKGG3B',  // mensal
  'price_1TEZAz3hFZmDmgU4ZJMJrsVT',  // anual
  'price_1TEZBj3hFZmDmgU4aYOfHYhy',  // vitalicio
];
if (!ALLOWED_PRICES.includes(priceId)) {
  return new Response(JSON.stringify({ error: 'Invalid price' }), { status: 400 });
}
```

#### M5: Error responses leak debug info
**Severity:** MEDIUM
**Files:** ai-tutor/index.ts L131, L158
**Issue:** Error responses include `debug` field with raw error messages:
```json
{"error": "...", "debug": {"status": 502, "detail": "..."}}
```
In production, this could leak internal API details.
**Fix:** Remove `debug` field in production or gate it behind an environment variable.

### LOW

#### L1: No CSRF protection on auth forms
**Severity:** LOW
**File:** auth.html
**Issue:** The login/signup forms don't have CSRF tokens. However, Supabase auth endpoints use bearer tokens and CORS, which provides CSRF protection.
**Mitigation:** Acceptable — Supabase SDK handles CSRF via its authentication flow.

#### L2: innerHTML usage with lesson content
**Severity:** LOW
**Files:** src/core/navigation.js (openL), multiple render functions
**Issue:** Lesson content from JSON files is inserted via `innerHTML`. If lesson JSON files were compromised, this could be an XSS vector.
**Mitigation:** Lesson files are static and controlled by the developer. Risk is only if the content generation pipeline is compromised. For defense-in-depth, consider using CSP to block inline scripts (already partially done).

#### L3: localStorage has no encryption
**Severity:** LOW
**Issue:** All user data (progress, notes, quiz results, PIN hash) is stored in plaintext localStorage.
**Mitigation:** This is standard for web apps. The data is not sensitive enough to warrant encryption. The PIN is already hashed.

#### L4: create-checkout CORS allows localhost
**Severity:** LOW
**File:** supabase/functions/create-checkout/index.ts L18-22
**Issue:** ALLOWED_ORIGINS includes `http://localhost:3000` and `http://127.0.0.1:5500`. These should be removed in production.
**Fix:** Use environment variable to control allowed origins, or remove localhost in production.

---

## 4. Edge Function Analysis

### ai-tutor (Claude API proxy)
| Aspect | Status | Notes |
|--------|--------|-------|
| Authentication | OPTIONAL | Works for both authed and anon users |
| Rate limiting | IMPLEMENTED | 10/day free, 50/day premium |
| Rate limit bypass | VULNERABLE (H2) | Client can delete rate limit key if no RLS |
| Input validation | OK | Message max 1000 chars |
| Prompt injection | MITIGATED | System prompt has clear instructions |
| Cost control | OK | Uses Haiku (cheapest), max_tokens 500 |
| CORS | OK | Allowlist-based, includes escolaliberal.com.br |

### create-checkout (Stripe)
| Aspect | Status | Notes |
|--------|--------|-------|
| Authentication | REQUIRED | JWT validated via getUser() |
| Input validation | PARTIAL (M4) | priceId not allowlisted |
| Open redirect | PROTECTED | successUrl/cancelUrl validated against allowlist |
| Customer isolation | OK | Stripe customer created per user |
| CORS | OK | Allowlist-based |
| Error handling | OK | No sensitive data leaked |

### stripe-webhook
| Aspect | Status | Notes |
|--------|--------|-------|
| Signature verification | OK | Uses `constructEvent(body, signature, webhookSecret)` |
| Idempotency | OK | Tracks processed event IDs in admin_settings |
| User validation | OK | Uses metadata.user_id from Stripe session |
| Plan upgrade | OK | Only sets plan based on Stripe session data |
| Error handling | OK | Returns 400 for invalid signatures |

---

## 5. Summary & Priority Actions

### Immediate (do today):
1. **Execute RLS policies** for all 9 tables (SQL above)
2. **Add priceId allowlist** in create-checkout Edge Function
3. **Remove debug info** from ai-tutor error responses in production

### This week:
4. **Verify RLS is enabled** via Supabase Dashboard → Authentication → Policies
5. **Remove localhost from CORS** in create-checkout
6. **Consider PKCE flow** for OAuth (replaces implicit flow)

### When possible:
7. **Move XP sync to Edge Function** (prevents client-side inflation)
8. **Add CSP report-uri** for monitoring XSS attempts
9. **Implement proper audit logging** for security-relevant events
