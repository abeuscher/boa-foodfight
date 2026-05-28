# 04 — The Opinion Leader and the Tarot deck

Sources: `tmp-ob-rules.txt:2827-3138` (Opinion Leader),
`tmp-ob-rules.txt:3238-3452` (Tarot Cards).

## The Opinion Leader (Lord / Hero)

The player has _one_ permanent named character — the Lord — and **if
he dies, the game ends.** No revival. He's the only unit with no
deployment cost (cost is `0`). Everything else can be raised, lost,
re-raised.

This single irreplaceable unit is the game's central tension. Every
deployment choice is colored by whether the Lord himself is going out.

### Four Lord variants ("attack sets")

| Set               | Front row     | Back row                | Starting ALI | Default party                     |
| ----------------- | ------------- | ----------------------- | ------------ | --------------------------------- |
| **Icecloud Lord** | 2 Banish (W)  | 1 Icecloud (C) hits all | ~65          | Cleric + 3 Fighters               |
| **Iainuki Lord**  | 3 Slashes (P) | 1 Iainuki (P)           | ~50–55       | Beast Man / Valkyrie + 3 Fighters |
| **Thunder Lord**  | 2 Slashes (P) | 1 Thunder (T) hits all  | ~40–45       | Beast Man / Wizard + 3 Fighters   |
| **Phantom Lord**  | 2 Poison (B)  | 1 Phantom (B) hits all  | ~40–45       | Wizard + 3 Fighters               |

Three of four have a back-row multi-target — the Lord is meant to
be a _force multiplier_, not a duelist. Iainuki Lord is the
contrarian pick (no hit-all, but the strongest single-target moves).

### How the variant is picked

A **22-question Tarot questionnaire** at game start. Each major arcana
(Fool, Magician, Priestess, Empress, Emperor, Hierophant, Lovers,
Chariot, Strength, Hermit, Fortune, Justice, Hanged Man, Death,
Temperance, Devil, Tower, Star, Moon, Sun, Judgement, World) poses a
question with three answers (A/B/C). The pattern of answers maps to
one of four attack sets.

This is the only character-creation step in the game. **The
player's worldview, expressed through 22 moral-flavored questions,
literally determines who follows them into war.** Not a stat
distribution — a personality test.

### Lord-specific quirks

- **The Lord gains XP from every Tarot-card kill.** Any unit
  finished by a Tarot, the XP routes to the Lord — so a player who
  spams cards passively levels the Lord without him entering combat.
- **The Lord's CHA/ALI affect what _other_ special characters do.**
  Some NPC heroes refuse to join a low-ALI Lord. The Lord's
  reputation gates content.
- **Endings are CHA/ALI-driven for the Lord.** Multiple endings
  branch off whether the Lord stays low-level (high CHA possible) or
  grinds (low CHA possible) and whether he stays good or drifts.

## The Tarot deck — dual-purpose cards

There are 22 Tarot cards. Each card has **two effects** — one when
played in battle, one when used to _liberate_ a town:

### Battle effects (in-fight cards)

| Card           | Effect                                                        |
| -------------- | ------------------------------------------------------------- |
| **Chariot**    | Direct damage (god with hammer)                               |
| **Death**      | Kills any enemy below half HP                                 |
| **Devil**      | All-target Dark attack                                        |
| **Emperor**    | +1 attack for every member of your unit this fight            |
| **Empress**    | Refills your unit's HP                                        |
| **Fool**       | Enemy troops (not leader) skip one round                      |
| **Fortune**    | Enemy unit retreats, no penalty                               |
| **Hanged Man** | Lowers enemy defense                                          |
| **Hermit**     | All-target Thunder (Merlin)                                   |
| **Hierophant** | Puts enemies to sleep                                         |
| **Judgement**  | All-target White; obliterates Undead                          |
| **Justice**    | All-target Cold                                               |
| **Lovers**     | Enemies attack themselves                                     |
| **Magician**   | All-target Fire                                               |
| **Moon**       | Permanently switches enemy front/back rows                    |
| **Priestess**  | Heals 50 HP per unit member                                   |
| **Star**       | +AGI for your unit (dodge buff)                               |
| **Strength**   | +DEF for your unit                                            |
| **Sun**        | Hits _both_ sides; damage scales inverse to ALI; kills Undead |
| **Temperance** | Cures status (stun/sleep) on your unit                        |
| **Tower**      | Damage that misses Low/High Sky units                         |
| **World**      | Magic immunity for your unit this fight                       |

### Liberation bonuses (when used to flip a town)

The same card, used to liberate a town instead of in combat, gives
the _map_ a persistent bonus:

| Card       | Liberation effect                                                          |
| ---------- | -------------------------------------------------------------------------- |
| Chariot    | +2 STR                                                                     |
| Death      | −2 Reputation                                                              |
| Devil      | −1 / −2 Reputation                                                         |
| Emperor    | +2 CHA                                                                     |
| Empress    | +1 CHA                                                                     |
| Fool       | +1 Luck                                                                    |
| Fortune    | −3 to +3 Reputation (random)                                               |
| Hanged Man | −1 STR                                                                     |
| Hermit     | +1 / +2 INT                                                                |
| Hierophant | +2 ALI                                                                     |
| Judgement  | +2 HP                                                                      |
| Justice    | +1 HP                                                                      |
| Lovers     | +2 Reputation                                                              |
| Magician   | +1 INT                                                                     |
| Moon       | sets clock to midnight                                                     |
| Priestess  | +1 ALI                                                                     |
| Star       | +1 AGI                                                                     |
| Strength   | +1 STR                                                                     |
| Sun        | sets clock to noon                                                         |
| Temperance | +2 Reputation                                                              |
| Tower      | −2 ALI                                                                     |
| World      | every unit on the map gets _all_ the other drawn cards' liberation bonuses |

### What makes this design interesting

- **Same resource, two uses.** Every Tarot draw is a decision: spend
  it in a tough fight (one-shot effect), or save it to liberate the
  next town (permanent map effect).
- **Some cards are _traps_ in one mode.** Death is a clutch battle
  card and a reputation hit if used on a town. Tower is a great
  battle clearer and an ALI penalty for liberation.
- **Time-of-day cards are persistent.** Moon and Sun set the clock —
  affecting Werewolf/Tiger Man/Vampyre forms across the whole map.
- **World is a meta-card.** Save it for last to multiply every other
  liberation bonus you've banked. Creates a planning loop across the
  whole scenario.
- **Cards bypass combat entirely.** XP from Tarot-kills routes to the
  Lord, so the deck is also a Lord-XP delivery system.

## Pattern in one sentence

> The Lord is a single irreplaceable character whose attack set is
> chosen by a moral questionnaire, and the Tarot deck is a 22-card
> resource where every card has both a battle effect _and_ a
> persistent map effect, forcing the player to pick which use
> matters more.
