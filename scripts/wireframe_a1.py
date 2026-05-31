#!/usr/bin/env python3
"""Wireframe of the in-zoom battle overlay (round-2 A-1 recommendation)."""
from PIL import Image, ImageDraw, ImageFont
import glob, os

W, H = 1440, 920
bg          = (18, 20, 26)
grid_faint  = (38, 42, 51)
tile_hi     = (52, 58, 72)
panel_bg    = (29, 32, 40)
panel_bd    = (74, 81, 95)
card_bg     = (38, 42, 52)
card_bd     = (60, 66, 79)
ant         = (231, 201, 122)
spider      = (212, 117, 106)
hp_track    = (46, 50, 60)
hp_full     = (108, 170, 108)
hp_low      = (196, 142, 92)
txt         = (224, 227, 234)
dim         = (150, 156, 168)
banner_bg   = (33, 44, 66)
banner_bd   = (122, 152, 214)
flash       = (235, 96, 96)
btn_bg      = (47, 51, 62)
btn_go      = (122, 110, 58)
note        = (108, 200, 178)

img = Image.new("RGB", (W, H), bg)
d = ImageDraw.Draw(img)

def _fp():
    for p in ["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
              "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"]:
        if os.path.exists(p): return p
    g = glob.glob("/usr/share/fonts/**/*.ttf", recursive=True)
    return g[0] if g else None
FP = _fp()
FPB = FP.replace("DejaVuSans.ttf", "DejaVuSans-Bold.ttf") if FP else None
if FPB and not os.path.exists(FPB): FPB = FP
def font(sz, bold=False):
    try: return ImageFont.truetype(FPB if bold else FP, sz)
    except Exception: return ImageFont.load_default(size=sz)

f_sm  = font(15); f_smb = font(15, True)
f_md  = font(18); f_mdb = font(18, True)
f_lg  = font(22, True); f_xl = font(30, True)
f_tiny= font(13)

def rr(box, r, fill=None, outline=None, w=1):
    d.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=w)

def ctext(x, y, s, fnt, fill, anchor="mm"):
    d.text((x, y), s, font=fnt, fill=fill, anchor=anchor)

# --- faint dimmed cube face showing through behind the overlay ---
gx0, gy0, gx1, gy1 = 470, 150, 970, 620
for i in range(6):
    xx = gx0 + (gx1 - gx0) * i / 5
    d.line([(xx, gy0), (xx, gy1)], fill=grid_faint, width=1)
    yy = gy0 + (gy1 - gy0) * i / 5
    d.line([(gx0, yy), (gx1, yy)], fill=grid_faint, width=1)
# contested tile highlighted (center cell)
cellw = (gx1 - gx0) / 5; cellh = (gy1 - gy0) / 5
tx = gx0 + 2 * cellw; ty = gy0 + 2 * cellh
d.rectangle([tx, ty, tx + cellw, ty + cellh], fill=tile_hi, outline=(90, 98, 116))
ctext(tx + cellw * 0.32, ty + cellh / 2, "A", f_lg, ant)
ctext(tx + cellw * 0.68, ty + cellh / 2, "S", f_lg, spider)
ctext((gx0 + gx1) / 2, gy1 + 18, "(dimmed cube shows through — the contested tile / 'where')",
      f_tiny, dim)

# --- header strip (top center) ---
hw = 660; hx = (W - hw) / 2
rr([hx, 26, hx + hw, 62], 18, fill=(34, 38, 47), outline=panel_bd)
ctext(W / 2, 44, "⏸  Combat 1 of 1 this turn  ·  advance-scout  vs  vanguard-bravo",
      f_md, txt)

# --- roster panel renderer ---
def hpbar(x, y, w, hp, mx):
    rr([x, y, x + w, y + 12], 6, fill=hp_track)
    frac = max(0, hp / mx) if mx else 0
    col = hp_full if frac > 0.34 else hp_low
    if frac > 0:
        rr([x, y, x + w * frac, y + 12], 6, fill=col)

def panel(x0, x1, title, accent, units, flash_idx=None):
    y0, y1 = 96, 700
    rr([x0, y0, x1, y1], 14, fill=panel_bg, outline=panel_bd)
    ctext((x0 + x1) / 2, y0 + 26, title, f_lg, accent)
    d.line([(x0 + 18, y0 + 46), (x1 - 18, y0 + 46)], fill=panel_bd, width=1)
    n = len(units); top = y0 + 64; bot = y1 - 18
    ch = 92; gap = (bot - top - n * ch) / max(1, n - 1) if n > 1 else 0
    for i, (name, hp, mx, leader) in enumerate(units):
        cy = top + i * (ch + gap)
        cx0, cx1 = x0 + 16, x1 - 16
        down = hp <= 0
        rr([cx0, cy, cx1, cy + ch], 9,
           fill=(30, 32, 38) if down else card_bg,
           outline=(80, 70, 40) if leader else card_bd,
           w=2 if leader else 1)
        label = ("★ " if leader else "") + name
        ctext(cx0 + 14, cy + 22, label, f_mdb,
              (90, 94, 104) if down else (accent if leader else txt), anchor="lm")
        hpbar(cx0 + 14, cy + 44, (cx1 - cx0) - 90, hp, mx)
        ctext(cx1 - 14, cy + 50, f"{hp}/{mx}", f_sm, dim, anchor="rm")
        if flash_idx == i and not down:
            ctext(cx1 - 14, cy + 20, "-3", f_lg, flash, anchor="rm")
            return (cx0 if x0 < W/2 else cx1, cy + 20)  # flash anchor pt
    return None

ants = [("Ant Footman", 4, 6, True), ("Ant Footman", 1, 6, False),
        ("Ant Footman", 0, 6, False), ("Ant Potato Bug", 12, 12, False),
        ("Ant Archer", 5, 5, False)]
spiders = [("Spider Scout", 0, 10, True), ("Spider Scout", 0, 10, False),
           ("Spider Scout", 0, 10, False), ("Spider Soldier", 10, 13, False)]

panel(90, 430, "ANTS  (you)", ant, ants)
flash_pt = panel(1010, 1350, "SPIDERS", spider, spiders, flash_idx=3)

# --- VS marker (center, between panels, over stage) ---
ctext(W / 2, 360, "⚔", f_xl, (200, 205, 214))
ctext(W / 2, 398, "VS", f_mdb, dim)

# --- play-by-play banner (centered over stage) ---
bw = 560; bx = (W - bw) / 2; by = 196
rr([bx, by, bx + bw, by + 64], 12, fill=banner_bg, outline=banner_bd, w=2)
ctext(W / 2, by + 22, "Round 2  ·  action 13 of 19", f_sm, (150, 175, 220))
ctext(W / 2, by + 44, "Ant footman  →  Spider soldier   ·   3 dmg  (10/13 HP)",
      f_mdb, txt)
# arrow from banner to the struck card (right side, spider soldier)
if flash_pt:
    d.line([(bx + bw, by + 40), (flash_pt[0] - 24, flash_pt[1])],
           fill=flash, width=2)

# --- modifier stack card (recedes, bottom-left) ---
rr([90, 716, 430, 800], 10, fill=(26, 28, 35), outline=card_bd)
ctext(106, 738, "MODIFIER STACK · CEILING", f_smb, dim, anchor="lm")
ctext(106, 766, "Attacker: none", f_sm, dim, anchor="lm")
ctext(280, 766, "Defender: none", f_sm, dim, anchor="lm")
ctext(106, 786, "(collapsed — expand on tap)", f_tiny, (110, 116, 128), anchor="lm")

# --- footer controls (bottom-right) ---
rr([1010, 740, 1160, 786], 9, fill=btn_bg, outline=card_bd)
ctext(1085, 763, "Skip combat", f_sm, txt)
rr([1180, 740, 1350, 786], 9, fill=btn_go, outline=(160, 145, 80))
ctext(1265, 763, "Continue", f_smb, (245, 240, 220))

# --- numbered callouts + legend ---
def badge(x, y, n):
    d.ellipse([x - 13, y - 13, x + 13, y + 13], fill=note, outline=bg, width=2)
    ctext(x, y, str(n), f_smb, (10, 20, 18))

badge(W / 2 - 350, 44, 1)        # header
badge(110, 122, 2)               # ants left
badge(1330, 122, 3)              # spiders right
badge(bx + 12, by + 12, 4)       # banner centered
badge(flash_pt[0] - 6, flash_pt[1] - 18, 5) if flash_pt else None  # flash side
badge(110, 730, 6)               # modifier
badge(1024, 752, 7)              # controls

legend = [
    "① header: which combat, who vs who",
    "② player roster always LEFT (ants) — leader ★, HP bar + value, downed greys out",
    "③ enemy roster always RIGHT (spiders) — equal weight, facing across the stage",
    "④ play-by-play CENTERED over the stage (one line per 750ms action)",
    "⑤ damage flash on the STRUCK side → volley ping-pongs L↔R beat to beat",
    "⑥ modifier stack recedes to a corner card",
    "⑦ skip / continue — bottom-right, where the hand expects them",
]
ly = 824
for i, s in enumerate(legend):
    col = ly + (i % 4) * 0  # single column rows
ly = 822
d.line([(60, 812), (W - 60, 812)], fill=panel_bd, width=1)
# two columns to fit
colx = [70, 760]
for i, s in enumerate(legend):
    cx = colx[0] if i < 4 else colx[1]
    cy = 826 + (i % 4) * 22
    ctext(cx, cy, s, f_sm, txt, anchor="lm")

ctext(W - 70, 826 + 3 * 22, "flat overlay over the dimmed scenario — not a new view",
      f_smb, note, anchor="rm")

out = "/home/user/boa-foodfight/docs/test-feedback/battle-screen/round2-wireframe-a1.png"
os.makedirs(os.path.dirname(out), exist_ok=True)
img.save(out)
print("wrote", out, img.size)
