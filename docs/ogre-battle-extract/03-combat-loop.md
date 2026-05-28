# 03 — Combat loop

Source: `tmp-ob-rules.txt:3139-3237` (Battle Tactics), plus the
per-class attack data from the Classes section.

## The fight in one minute

When two units collide, each side has up to 5 characters in a 2-row
formation (front row + back row). Combat is **a single exchange of
attacks** — not a back-and-forth duel. Each character on each side
makes their listed attacks (1–4 of them, depending on class and row),
ordered by AGI. Then the engagement ends. Survivors continue; losers
retreat or die.

The decision space is _which row you fight from_ and _what your AI
target rule is_.

## Front row vs back row — the central lever

Each class has a different attack count and attack _type_ per row.
Examples:

| Class    | Front row           | Back row                    |
| -------- | ------------------- | --------------------------- |
| Fighter  | 2 Slices (P)        | 1 Slice (P)                 |
| Ninja    | **3 Shuriken (P)**  | 2 Ninjutsu (O)              |
| Mage     | 2 Hits (P)          | 1 Magic (O) **hits all**    |
| Cleric   | 2 Ankhs (W)         | 2 Healings                  |
| Faerie   | 2 Slaps (P)         | 1 Kiss (buffs ally)         |
| Octopus  | **4 Tentacles (P)** | 2 Tentacles (P)             |
| Princess | 2 Stardust (P)      | 1 Starlite (W) **hits all** |

A few patterns:

1. **Most front-line classes get more attacks in front; most casters
   get their best move in back.** Composition forces an early
   decision — who's brawler, who's anchor.
2. **Multi-target (`*`) attacks live in the back row.** Mage's Magic,
   Princess's Starlite, Lich's 3 Magics, Titan's 2 Gales, Salamand's
   2 Novas — all back-row, all hit-all. Crowd clear is positional.
3. **Some classes attack equally well from either row** (Beast Man:
   2 Whips/2 Whips; Wyrm: 2 Tails/2 Tails; Octopus partially). These
   are flexible filler.
4. **Healing is back-row only.** Cleric, Shaman, Monk heal from back.
   Front-row healing doesn't exist.

The front row also _physically blocks attacks_ — see "Box blocking"
below.

## Attack settings (your one combat input)

You pick one of four target rules for the unit:

| Setting    | Behavior                            | Use case                                  |
| ---------- | ----------------------------------- | ----------------------------------------- |
| **Strong** | Hit the highest-HP target reachable | Burn down a Dragon/tank                   |
| **Weak**   | Hit the lowest-HP target            | Clear small fries to remove their attacks |
| **Leader** | Focus the unit leader               | Boss fights — leader down = level done    |
| **Best**   | Hit whichever you can hurt most     | Mixed compositions, directed attacks      |

**Clerics' Healing flips to attack-mode on Weak/Leader/Best.** On
Strong they heal allies; on the others they redirect Healing onto
enemy Undead to kill them. This is the one place where the target
rule changes a class's _function_, not just its targeting.

Also noted: Strong setting → both sides deal _and_ take less damage
(safer, slower). Weak → both deal and take more (faster, swingier).
Net effect is a pace knob, not a power knob.

## Box blocking (formation matters)

The 2×5 grid is `front[1..5]` / `back[1..5]`. A back-row character is
blocked from conventional physical attack if the corresponding front
slot is occupied:

| Back box           | Blocked by    |
| ------------------ | ------------- |
| 6 (paired with 1)  | front 1       |
| 7 (paired with 2)  | front 1, 2, 3 |
| 8 (paired with 3)  | front 3       |
| 9 (paired with 4)  | front 3, 4, 5 |
| 10 (paired with 5) | front 5       |

So putting a Mage in back-7 (center) is the _most_ protected slot —
needs all three front-row anchors down before he's reachable.
Aerial attacks bypass blocking. Multi-target attacks bypass blocking.

## Six damage elements

`P` Physical · `F` Fire · `C` Cold · `T` Thunder · `B` Black · `W` White
· `O` Optional (caster picks Fire/Cold/Thunder).

Every class has a resistance value per element, 0–100, higher is
better. Examples of extreme weights:

- Skeletons: 100 to everything physical and elemental, **0 to White**.
  Only White, Pumpkin, or Petrify touches them.
- Vampyres at day: 100 across the board (invulnerable while in
  coffin); at night: 80 phys / 10 White (kill them in daylight or
  with holy magic).
- Salamand: 86 Fire / 11 Cold. Counter with Cold.
- Iron Golem: 82 P / 90 W / 41 F. Counter with Fire.

The takeaway: **resistance asymmetry is the puzzle.** Lockpick the
right element and a "huge" enemy folds; bring the wrong one and you
bounce off.

## Terrain, time of day, ALI

Every class has a preferred terrain. Fighting outside it is a
penalty. A few combine _two_ terrains by time:

- Werewolf / Tiger Man: Forest at night, Plains at day.
- Vampyre: Forest at night, "Slow" (effectively non-combatant in the
  coffin) at day.
- Mermaid / Kraken: Shallows / Ocean only.

The map's day/night clock therefore changes who's a threat. Some
Tarot Cards (Sun, Moon) _set_ the clock — see the Tarot doc.

ALI matters for one specific element: the **Sun** Tarot deals damage
inversely to alignment — low-ALI characters take more. The Sun also
obliterates Undead. So ALI is a defensive stat against one specific
class of attack.

## Side mechanics

- **Pumpkin attacks** halve the target's current HP and outright kill
  units at 1 HP. Pumpkin/Halloween are crowd-control specialists,
  not damage dealers.
- **Petrify** (Cockatrice back row) takes a target out of the fight
  on success. Also kills Undead.
- **Charm** (Witch, Cerberus) flips targets to fight their own
  allies. Lands more often on low-INT enemies.
- **Iainuki** (Samurai) damages the _user_ too — a self-cost
  high-damage move.
- **Princess passive: +1 attack to every member of her unit.** Like a
  permanent free Emperor card (see Tarot). Best unit in the game,
  per the FAQ author.

## What this composes into

Each fight is a brief one-shot exchange where the player's leverage
is _all front-loaded_: row placement, party composition, unit
composition (which classes), terrain match, time of day, and one
attack-setting toggle. Once units collide, you're watching dice.

It's a _deck-building_ combat loop more than a tactical one — you
spent the strategic time _before_ contact, optimizing match-ups.
