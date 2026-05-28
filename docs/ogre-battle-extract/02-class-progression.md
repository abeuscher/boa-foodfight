# 02 — Class progression

Source: `tmp-ob-rules.txt:373-2826` (Classes — ~60 classes across
7 family trees).

## The promotion recipe

Every class entry is a slot-filled template:

```
Requirements: Level X, Cha. Y+, Ali. [low–high or +N]
[optional: + a specific Item]
Size        : Small | Large
Leader      : Yes | No
Recruit     : <list of unit types this class can recruit in the field>
Terrain     : <preferred terrain — Plains, Forest, Mountain, Snow,
               Low Sky, High Sky, Shallows, Ocean, Swamp>
Front Row   : N attacks of type X
Back Row    : N attacks of type Y
Hit Points  : range per level-up
Strength    : range per level-up
Agility     : range per level-up
Intelligence: range per level-up
Physical/Fire/Cold/Thunder/Black/White: resistances (0–100, higher = better)
Deployment  : base cost + (per-level × level)
```

That's the contract. Every class makes the same fields meaningful.

## The seven family trees

```
Fighter ─┬→ Samurai → Samurai Master
         ├→ Knight ─┬→ Paladin            (Ali. high)
         │          └→ Vampyre            (item: Blood Kiss)
         ├→ Wizard → Mage → Sorcerer → Lich → Skeleton
         │                  (item: Undead Staff, then Undead Ring)
         ├→ Beast Man → Beast Master → Dragoner → Dragon Master
         │                             (item: Stone of Dragos)
         ├→ Doll Mage → Doll Master
         ├→ Wild Man → Evil One → Vampyre
         ├→ Ninja → Ninja Master
         └→ Werewolf

Amazon ─┬→ Witch
        ├→ Valkyrie → Muse
        ├→ Cleric → Shaman → Monk
        └→ Princess                       (item: Royal Crown)

Non-Human Male ─┬→ Hawk Man → Eagle Man (Ali. high) / Raven Man (Ali. low)
                ├→ Imp → Demon → Devil
                ├→ Pumpkin → Halloween    (item: Pumpkin+)
                ├→ Tiger Man              (item: Full Moon)
                └→ Werewolf

Non-Human Female → Angel → Cherubim → Seraphim
                 → Faerie → Pixie → Sylph
                 → Mermaid → Nixie

Dragon ─┬→ Black Dragon → Tiamat → Zombie Dragon  (Ali. 0-35; item later)
        ├→ Red Dragon → Red Dragon II → Salamand  (Ali. 35-65)
        └→ Silver Dragon → Gold Dragon → Platinum Dragon  (Ali. 65+)

Monster ─┬→ Giant ─┬→ Fire Giant   (Ali. 0-40)
         │        ├→ Ice Giant    (Ali. 50-80)
         │        └→ Titan        (Ali. 70+)
         ├→ Gryphon → Cockatrice
         ├→ Hellhound → Cerberus
         ├→ Wyrm → Wyvern
         ├→ Octopus → Kraken
         └→ Golem / Rock Golem / Iron Golem  (no promotion)

Undead (no promotion path) → Skeleton, Wraith, Ghost, Phantom
```

## What's interesting about the gating

**Three knobs, not one.** A promotion isn't "spend XP" — it's
"reach a level AND have built the right reputation AND, sometimes,
held the right item." Skipping one disqualifies you.

**Alignment bands carve the same trunk into different branches.**
A base Dragon at level 7 becomes:

- Black Dragon if ALI 0–35
- Red Dragon if ALI 35–65
- Silver Dragon if ALI 65+

Same unit, three permanent futures, decided by how you played them.
Giants do the same trick at level 8–15 into Fire/Ice/Titan.

**Items are gatekeepers, not stat boosts.** A Royal Crown is the
_only_ way to a Princess; a Blood Kiss is the _only_ way to a
Vampyre; the Undead Ring/Staff line locks the highest mage classes.
These items drop randomly from fights or sit in specific shops —
they're scarce, story-shaped permission slips, not equipment.

**Some classes don't promote at all.** Skeletons, Ghosts, Werewolves,
Golems sit as terminal picks. You take them for what they _are_
(Skeletons can't be hurt by physical attacks; Ghosts are flying)
not for what they'll become.

## The pattern in one sentence

> Progression is _branching_ (ALI band picks which lineage), _gated_
> (CHA threshold proves you've earned it), _itemized_ (rare items
> unlock specific endings), and _level-paced_ (you can't skip the
> floor). Every promotion is a _commitment_ — you can demote, but
> you lose the levels.

## Other class-system mechanics worth flagging

- **Day/night classes.** Werewolf, Tiger Man, Vampyre have _two_
  full stat blocks — one for day, one for night, with different
  attack moves and very different resistances. A Vampyre is
  effectively two units that swap on a clock.
- **Recruit ability is a class trait.** Sorcerers can recruit
  Ghosts/Skeletons _in the field_, no town visit needed.
  Vampyres recruit Werewolves. Most classes can't recruit at all.
  This is how the army composition shifts mid-campaign.
- **Leader-eligibility is binary per class.** Fighters can't lead;
  Knights can. Many "useful" classes (Faerie, Ninja, Dragon,
  Skeleton) are _party members only_, never party leaders.
- **Deployment cost scales with class power.** A Fighter is
  `80 + 20·level`; a Lich is `1650 + 250·level`. Late-game classes
  are 5–10× the cost. The economy stays tight even as you tier up.
- **Size matters for stack composition.** Small vs Large. Large
  units (Dragons, Giants, Octopi) take a different slot. Stacks are
  composed under a size budget, not a body count.
- **Plane affinity is per-class.** Plains / Forest / Mountain / Snow /
  Low Sky / High Sky / Shallows / Ocean / Swamp. Each class fights
  best on one — your party's effective terrain is determined by its
  members.
- **Flying is contagious but conditional.** A Hawk Man can fly an
  entire small unit _unless_ certain heavy or holy classes
  (Paladin, Black Knight, Samurai Master, Werewolf, Muse, etc.) are
  in the unit. A Gryphon can additionally lift listed large units.
  Composition decides movement.
