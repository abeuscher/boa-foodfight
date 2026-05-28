# 01 — Stats and deeds

Source: `tmp-ob-rules.txt:173-372` (Character Stats section).

## The six stats

| Stat                   | What it does                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **HP**                 | Hit Points. Drop to 0 → unconscious. **Undead have 0 HP** — only killable by white attacks, pumpkin attacks, or petrification. |
| **STR** (Strength)     | Damage on physical attacks; partial physical defense.                                                                          |
| **AGI** (Agility)      | Attack initiative _and_ dodge rate. One stat, two jobs.                                                                        |
| **INT** (Intelligence) | Spell power. Also influences whether status effects (Stun, Charm) land.                                                        |
| **CHA** (Charisma)     | **Earned, not grown.** Gate for promotions (most need 50–80). Moves with deeds.                                                |
| **ALI** (Alignment)    | **Earned, not grown.** Gates entire class branches (some need <30, some need 70+). Moves with deeds.                           |

The split between four stats that go up on level (HP/STR/AGI/INT) and
two stats that change through _behavior_ (CHA/ALI) is the system's
spine. CHA/ALI are why the game has a personality.

## How CHA changes

Capped at ±8 per kill, summed across kills (a hit-all spell that kills
5 underlings can cost you 40 CHA).

| Kill is…                  | ΔCHA |
| ------------------------- | ---- |
| 2+ levels higher than you | +8   |
| 1 level higher            | +6   |
| Same level                | +4   |
| 1 level below             | +2   |
| 2 levels below            | 0    |
| 3 levels below            | −2   |
| … (scales linearly)       | …    |
| 6+ levels below           | −8   |

Plus: running from a battle → −1 CHA on every unit member.

**Reading:** punching down is _punished_ — actively, not just
indifferently. The reward is tilted toward fighting up.

## How ALI changes

Formula:

```
ΔALI = enemyLevel − yourLevel + classBonus + aliBonus
```

**Class bonus** (each class has an inherent moral weight, −3 to +3):

| Bonus                           | Examples                                              |
| ------------------------------- | ----------------------------------------------------- |
| −3 (acts evil → loses ALI fast) | Paladin, Titan, Muse, Princess, Monk                  |
| −2 / −1                         | Knight, Cleric, Valkyrie, Eagle Man, Angel            |
| +1 / +2                         | Ninja, Mage, Werewolf, Black Knight, Sorcerer, Wyvern |
| +3 (acts good → loses ALI fast) | Vampyre, Phantom, Zombie Dragon, Skeleton, Lich       |

The sign is **inverse to the class's morality** — a Paladin killing
weaker enemies has a strong −3 pull because it's a holy class doing an
unholy thing. This is the lever that lets a _single_ unit drift into
darkness or rise into holiness over a campaign.

**ALI bonus** (a centering force toward 50):

| Current ALI | Bonus |
| ----------- | ----- |
| 0–29        | −3    |
| 30–39       | −2    |
| 40–49       | −1    |
| 50–59       | 0     |
| 60–69       | +1    |
| 70–79       | +2    |
| 80–100      | +3    |

So extreme alignment is _harder to push further_ — there's a built-in
gravity pulling everyone back to centrist. Reaching the high-end
promotion bands (Seraphim needs 80+, Lich needs the opposite) requires
a sustained pattern of behavior, not one big swing.

## Pattern worth stealing

- **Two earned stats that gate progression** turn every fight into a
  small reputation decision. The player's class catalog at level 20
  is a fingerprint of _how_ they fought, not just whether they won.
- **Centering forces** (ALI bonus, CHA cap) prevent runaway snowballs
  in either direction — you can't grind to sainthood by farming
  weaklings.
- **Inverse class bonus** (good classes lose ALI doing bad things) is
  a self-correcting morality lock — characters drift toward where they
  _belong_ without a hard rail.

See [05-design-hooks.md](05-design-hooks.md) for the editorial pass.
