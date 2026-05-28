# 05 — Design hooks

Editorial pass. The other notes describe what OB does; this one is
_what's worth lifting_ for the ant-vs-spider game given its current
state (R7–R18, six-template item slot, gold-no-sink, turn-capped
30-turn loop, queens as passive sinks). Ordered by how cleanly it
slots in.

## Tier A — likely high-leverage

### A1. Earned stats that gate progression (CHA/ALI analogue)

OB's CHA and ALI aren't allocated, they're _accrued from how you
fought_. Punching down loses you both; risky fights gain them; running
costs CHA.

**For boa-foodfight:** introduce one or two earned stats per party —
e.g. **Aggression** (gained from initiating, lost from defending)
and/or **Discipline** (gained from holding POST, lost from
retreating). Use them to unlock party promotions or special abilities
mid-campaign. Promotions become _behavioral fingerprints_.

This addresses "the game is a bit empty" — every fight now has a
_reputational_ second-order outcome on top of the immediate kill.

### A2. Branching promotion via behavior bands

A single base unit becomes one of three (or more) variants depending
on the band you stayed in. OB's base Dragon → Black/Red/Silver at
level 7 by ALI, then again at 15 and 23. _Same starting unit, three
permanent silhouettes by the late game._

**For boa-foodfight:** the level-progression plan already has
units like ant-mage. Add **behavior-gated promotions** — an
ant-mage that pheroblasts a lot becomes one branch; one that recruits
a lot becomes another; one that's spent turns healing becomes a
third. Each branch unlocks different abilities at the next tier.

This gives forward motion without adding content: the player is
_shaping_ a class catalog through play.

### A3. Item-gated terminal classes

In OB the rarest classes (Princess, Vampyre, Lich, Dragon Master)
_require_ a specific dropped item. Items are infrequent random
rewards or shop-locked. The item is the permission slip, not the
power.

**For boa-foodfight:** the 6-template item slot (R14) is currently
flat +1 buffs. Repurpose a few item _templates_ as **promotion
keys** — held = unlocks a specific elite promotion at the next
level-up. The item itself isn't strong, but it's a unique unlock
for one tier-3 unit per scenario.

Eats the "gold has no sink" problem and "items are flat +1" problem
in one move: scarcity items become the late-game sink and the late-game
fork.

## Tier B — strong but more design work

### B1. Tarot-style dual-purpose resource

A deck of cards where each card has two uses: a **one-shot
battle effect** _or_ a **persistent map effect** (one of them only).
The player draws cards passively during a scenario.

**For boa-foodfight:** treat this as the gold sink AND the late-game
pressure-breaker the mechanics-research memo already flagged. Cards
are bought (or dropped) at towns. Spending one as a "tactical card"
in a fight is a swingy moment; spending it on a POST flip gives a
_persistent_ boon for that POST for the rest of the scenario. Player
agonizes over which use matters more.

22 cards is too many — start with 6–8. Pattern: 2 attack cards,
2 defense/heal cards, 2 status cards, 2 meta cards (clock-set,
world-buff).

This is the single most stealable OB mechanic and probably the
biggest player-facing depth gain.

### B2. The named-leader / game-over unit

OB's Lord is a single permanent unit whose death ends the game.
Everything is colored by him.

**For boa-foodfight:** the queen is currently a passive sink. Make
her active-but-mortal: deployable, mobile, vulnerable. _If she dies,
the colony loses._ The drama jumps because suddenly the player has
something to protect that isn't a number.

This is high-risk — it changes the entire texture of the game. But
the current criticism is "queens are passive sinks" so the leverage
is there.

### B3. Personality-driven character creation

The 22-question Tarot questionnaire determines the Lord's attack set
and starting party. **The player describes themselves through moral
questions, the game decides what kind of leader they are.**

**For boa-foodfight:** L0 (the tutorial / prologue) is a great place
for a 4–6 question prologue interview (the Queen asks Antonio about
his temperament before the march) that pins down the player's
starting party composition. Costs almost nothing to implement,
massive replay/personality reward.

## Tier C — useful patterns, not blockers

### C1. Front-row attack count as the central lever

In OB, "tier" is mostly "more attacks per fight." A Fighter gets 2,
a Ninja gets 3, an Octopus gets 4. Stat creep is small; _attack
count_ creep is the real progression.

**For boa-foodfight:** check whether the current units' progression
is mostly stat-bump (boring) or move-count / move-type (interesting).
If stat-bump, consider replacing some level-up bumps with an extra
attack instance per turn at thresholds.

### C2. Multi-target attacks are back-row-only

A class-defining constraint that forces positional thinking. In OB
you _cannot_ AoE from the front row. The placement matters more
than the spell.

**For boa-foodfight:** if abilities have positional placement,
binding hit-all abilities to a specific row/plane gives positioning
real meaning. (Plane affinity is already this conceptually — the
extra rule would be that AoE abilities require the caster to _not_
be on the front line.)

### C3. Day/night unit variants

Werewolves are a different unit at night. Vampyres are invincible by
day but combat-incapable. This is a clean "the map changes who
matters" rule.

**For boa-foodfight:** if there's a day/night clock (or analogous —
e.g. "wet"/"dry" terrain, "fed"/"hungry" colony state), tie at least
one unit type to its swing. Players notice the clock when one of
their units lives or dies by it.

### C4. Inverse class-bonus on alignment

Holy classes lose alignment fast for doing unholy things; evil
classes the same in reverse. Self-correcting morality lock.

**For boa-foodfight:** if you adopt A1 (earned stats), consider this
twist — units of a certain "role" lose the earned stat _faster_ when
they act against role. Forces specialization and rewards in-character
play without a hard rail.

### C5. Some classes don't promote

OB has terminal picks. Skeletons, Werewolves, Golems are what they
are forever. They're chosen for their _now_, not for what they'll
become.

**For boa-foodfight:** worth having 1–2 "monster" units that are
just _there_ — recruitable, useful, never promoting. They become
roster anchors instead of stepping stones.

## What I'd ignore

- **The 60-class catalog itself.** Too dense; the _structure_
  (gating recipe, branching, item-lock) is the lift, not the list.
- **Six damage elements + six resistances.** Reasonable system but
  the current game's faction/plane model already does the job of
  "this attacker is good vs this defender." Don't double up.
- **The unit-loss-from-leader-down auto-retreat.** Cute but
  redundant given the existing HP-threshold + Lanchester retreat
  (R15/R16).
- **The deployment-cost-per-class-per-level economy.** OB's economy
  is tight and clever but it's a different shape from a 30-turn
  squad loop. Not worth porting.

## Priority for next memo

If picking one thing to draft into a real spec: **B1 (Tarot dual-use
deck)**. It's the closest OB mechanic to the gaps the
mechanics-research memo already flagged (gold sink, late-game
pressure, swingy moments) and the design space is well-understood.

Second pick: **A2 (behavior-gated branching promotions)** — the
slowest-burn but highest-replayability lift. Probably a Phase-5
candidate, not Phase-4.

Third pick: **B3 (prologue questionnaire)** — cheap, high-flavor,
slots straight into L0.
