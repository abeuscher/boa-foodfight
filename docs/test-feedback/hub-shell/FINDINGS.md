# Hub-Shell Test & Verify — Findings

**Scope:** Run the test suites, build + drive the game client, and report on
the Hill hub shell + four sub-views shipped in PR #41 ("Build the real Hill
hub shell + client Playwright smoke", commit `e781e60`).

**Environment:** Windows 10, Node v22.15.0, pnpm 10.33.0 (via corepack),
Playwright Chromium v1217 (installed locally — the build env couldn't).
Branch `test/hub-shell-verify` cut from `origin/main` @ `12c05be`.

**Bottom line:** The hub shell and all four sub-views work. Every interaction
exercised behaves correctly, success/error banners surface the right text, and
there were **zero console errors or page errors** across the whole walk. The
only `pnpm check` failure is a Windows line-ending artifact (not a code
defect). One cosmetic terminology inconsistency noted. No functional bugs found.

---

## 1. `pnpm check` (gate suite)

Run step-by-step (the `&&` chain short-circuits on the first failure, so the
later steps were run individually after `format:check` tripped).

| Step                      | Result                             | Notes                                                      |
| ------------------------- | ---------------------------------- | ---------------------------------------------------------- |
| `typecheck` (tsc)         | ✅ pass                            |                                                            |
| `gen:fixture`             | ✅ pass                            | regenerates `client/src/fixtures/l1.json` byte-identically |
| `typecheck:client`        | ✅ pass                            |                                                            |
| `lint` (eslint)           | ✅ pass                            |                                                            |
| `format:check` (prettier) | ❌ **fail — environment artifact** | flags **all 394 files**; see below                         |
| `duplication` (jscpd)     | ✅ pass                            | 0 clones, 118 files / 21,117 lines                         |
| `test` (vitest)           | ✅ pass                            | **742 passed, 6 skipped (748 total)**, 66 files            |
| `reconcile`               | ✅ pass                            | 0 cross-file findings                                      |

### The `format:check` failure is a CRLF artifact, not a defect

`format:check` reported "Code style issues found in 394 files" — i.e. _every_
tracked file. Root cause:

- `git config core.autocrlf` = `true` and the repo has **no `.gitattributes`**,
  so Git checked out every file with CRLF line endings on this Windows host.
- `.prettierrc.json` pins `"endOfLine": "lf"`, so Prettier rejects all CRLF files.

**Verification:** re-running with the line-ending check relaxed passes cleanly —

```
pnpm exec prettier --check --end-of-line auto .
→ All matched files use Prettier code style!
```

So the actual formatting is correct; only the line endings differ, and only
because of the local Windows checkout. The Linux build/CI environment checks
out LF and this step passes there. (This is a _different_ cause than the
briefing's note about `.claude/settings.local.json` — here it's the whole tree.)

> Optional follow-up (not done — out of scope for a test pass): adding a
> `.gitattributes` with `* text=auto eol=lf` would make `format:check` pass on
> Windows checkouts too. Flagging only; no behavior/spec change made.

---

## 2. `pnpm test:client` (build + Playwright smoke) — ✅ PASS

`vite build client` → 49 modules, built in ~0.7s, no warnings.
Playwright (headless Chromium, 1100×900):

```
Running 3 tests using 1 worker
  ok 1 [chromium] › Hill hub loads with resource strip and verb rail (511ms)
  ok 2 [chromium] › Organize Army opens and shows squads + equip picker (339ms)
  ok 3 [chromium] › Shop purchase deducts buttons and grows the inventory (257ms)
  3 passed (3.0s)
```

Screenshots written to `out/screenshots/client/` (copied into
`./screenshots/` here): `hill.png`, `organize.png`, `shop.png`.

---

## 3. Deep interaction verification

The 3-test smoke covers hub-load, Organize-open, and a Shop purchase, but not
equip / ranks / disband / move / recruit / system / error paths. I drove those
with a throwaway Playwright deep-walk (not committed) that also captured all
`console` and `pageerror` events. Results (`./screenshots/` has the captures):

| Flow                             | Action                                  | Result                                                                                                                                                       |
| -------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Hill hub**                     | load                                    | ✅ resource strip `120 buttons · 28 ants`; verb rail Deploy (disabled, "not built yet") / Organize Army / Recruit / Shop / System; "Scenario 1" context band |
| **Shop**                         | Buy Leather Pad (40)                    | ✅ banner "bought Leather Pad"; buttons 120→80; Inventory 4→5 (Leather Pad ×2)                                                                               |
| **Organize → equip**             | pick Leather Pad in a unit's dropdown   | ✅ banner "equipped Leather Pad on Ant Queen"; row shows `⚔ Leather Pad`; dropdown switches to "Leather Pad (equipped)"; pool decremented                    |
| **Organize → rank**              | click `back` on the Queen               | ✅ **error** banner "the queen is pinned to the front rank" (correct §7.7 queen-pin guard)                                                                   |
| **Organize → disband (guarded)** | Disband `queen-guard`                   | ✅ **error** banner "the queen-guard party cannot be disbanded"                                                                                              |
| **Organize → disband**           | Disband `vanguard-bravo`                | ✅ banner "disbanded 'vanguard-bravo'"; Barracks 0→6                                                                                                         |
| **Organize → move**              | move a barracks unit → `vanguard-alpha` | ✅ banner "Ant Footman → vanguard-alpha"                                                                                                                     |
| **Organize → create squad**      | tick a non-leader-eligible unit         | ✅ correctly shows **no** "Create with… as leader" button (create requires a leader-eligible pick)                                                           |
| **Recruit**                      | Recruit Cockroach (40)                  | ✅ banner "recruited Cockroach (lvl 1)"; ants 28→29; buttons 120→80; new unit lands in Barracks                                                              |
| **System**                       | open                                    | ✅ placeholder copy renders (save/load/settings/quit "not built" — as specified)                                                                             |
| **Back to Hill**                 | from each sub-view                      | ✅ returns to hub; resource strip persists                                                                                                                   |

**Console / page errors captured across the entire walk: 0.**

UI ↔ engine consistency held everywhere checked: button/gold deductions,
inventory counts, ant counts, barracks membership, and equipped-item markers
all matched what the operators returned. Success vs. error banner styling
(green vs. red) tracks the `OrganizeResult.ok` flag correctly.

---

## 4. Observations (not bugs)

1. **Currency label inconsistency (cosmetic).** The resource strip and the Shop
   label the currency "**buttons**"; the Recruit view labels the same costs
   "**gold**". Both read/deduct `WorldState.gold`. Functionally correct, just
   two names for one resource. Worth unifying when copy is finalized.
   _(Recruit.tsx: `{r.cost} gold`; Shop.tsx / App.tsx: `… buttons`.)_

2. **Deploy is intentionally disabled** with title "Briefing + scenario not
   built yet" — matches the hub spec (Deploy → Briefing, which isn't built).
   Visible-but-disabled, which is what the smoke asserts. Not a bug.

3. **Resource strip omits Royal Jelly.** The hub spec lists jelly as a
   provisional strip item, but `shared.ts` notes (correctly) that jelly has no
   between-scenario persisted source in `WorldState` — `Party.jellyDoses` is
   scenario-bound — so the strip shows only buttons + ant count. Consistent
   with the troop-reference §10 persistence contract. Not a bug.

4. **Visual styling is intentionally minimal** (cube memo §D defers
   look-and-feel). "Unstyled" is expected per the brief, not reported as a fault.

---

## 5. Verdict

The Hill hub shell and its four sub-views (Organize Army, Recruit, Shop,
System) **work as specified**. The verb rail, resource strip, back-to-Hill
chrome affordance, scenario-context band, and all engine-backed operations
(buy, equip, rank, move, disband, swap-leader paths, recruit) function
correctly and surface accurate success/error feedback, with no runtime errors.

The single `pnpm check` failure (`format:check`) is a Windows CRLF checkout
artifact, independently confirmed to be line-endings-only; all substantive
gates — typecheck, client typecheck, lint, duplication, 748-test vitest suite,
reconciler — pass, as does the full client build + Playwright smoke.
