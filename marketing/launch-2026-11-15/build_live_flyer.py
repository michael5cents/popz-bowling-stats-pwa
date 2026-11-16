#!/usr/bin/env python3
"""Update the original Popz Bowling Public Beta flyer for the live commercial release.

Preserves the original bowling artwork, phone/tablet mockups, and original
QR pixels. No original is destroyed; legacy Beta copies are archived.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import shutil

FOLDER = Path.home() / "Desktop" / "Popz Bowling Public Beta"
ARCHIVE = FOLDER / "Archive - Original Beta Flyers"
SOURCE = "Popz-Bowling-Public-Beta-Flyer.png"
src = ARCHIVE / SOURCE if (ARCHIVE / SOURCE).exists() else FOLDER / SOURCE
assert src.is_file(), "Original flyer missing."
im = Image.open(src).convert("RGBA")
assert im.size == (1060, 1484), "Original flyer dimensions changed; check source before editing."
FONTS = Path("/System/Library/Fonts/Supplemental")
impact = str(FONTS / "Impact.ttf")
arial = str(FONTS / "Arial Bold.ttf")
arialitalic = str(FONTS / "Arial Bold Italic.ttf")
arialblack = str(FONTS / "Arial Black.ttf")
font = lambda p, s: ImageFont.truetype(p, int(s))
navy = (6, 18, 53, 255)
gold = (255, 221, 0, 255)
red = (222, 21, 23, 255)
white = (255, 255, 255, 255)
cyan = (0, 199, 255, 255)

def poly_shadow(points, fill, shadow=10, accent=None):
    """Place an opaque neon-edged banner over outdated baked-in text."""
    o = Image.new("RGBA", im.size)
    d = ImageDraw.Draw(o, "RGBA")
    d.polygon([(x+shadow, y+shadow) for x,y in points], fill=(0,0,0,190))
    d.polygon(points, fill=fill)
    if accent: d.line(points + [points[0]], fill=accent, width=5, joint="curve")
    im.alpha_composite(o)

def panel(rect, fill, radius=12, border=None, border_width=2):
    o = Image.new("RGBA", im.size)
    d = ImageDraw.Draw(o,"RGBA")
    d.rounded_rectangle(rect,radius=radius,fill=fill)
    if border: d.rounded_rectangle(rect,radius=radius,outline=border,width=border_width)
    im.alpha_composite(o)

def text(x,y,s,size,colour=white,ft=impact,outline=5,shadow=4,max_width=None):
    f=font(ft,size)
    if max_width:
        while f.getlength(s)>max_width and size>16:
            size-=1;f=font(ft,size)
    layer=Image.new("RGBA",im.size)
    d=ImageDraw.Draw(layer)
    if shadow:
        d.text((x+shadow,y+shadow),s,font=f,fill=(2,3,13,255),
               stroke_width=outline+2,stroke_fill=(2,3,13,255))
    d.text((x,y),s,font=f,fill=colour,stroke_width=outline,
           stroke_fill=(2,7,24,255))
    im.alpha_composite(layer)
    return f.getlength(s)

# Rebrand the three top headline areas while keeping the original Popz logo.
# Exact overlay regions avoid the app screenshots, bowling icons and QR artwork.
panel((50, 293, 1002, 442), (5, 16, 51, 251), radius=17,
      border=(9, 151, 241, 255), border_width=3)
poly_shadow([(168,207),(803,200),(825,289),(153,306)],
            (205,20,25,255),accent=(255,232,30,255))
title="NOW AVAILABLE"
titlefont=font(impact,82)
titlewidth=titlefont.getlength(title)
text(int((980-titlewidth)/2),207,title,82,white,impact,5,4)

headline="BOWL SMARTER"
f=font(impact,111)
size=111
while f.getlength(headline)>865:
    size-=1;f=font(impact,size)
word="BOWL "
left=int((1060-f.getlength(headline))/2)
left2=left+f.getlength(word)
text(left,309,word,size,gold,impact,6,5)
text(int(left2),309,"SMARTER",size,white,impact,6,5)

# Original yellow commentary row was only a Beta call for testers.
poly_shadow([(95,438),(956,429),(967,529),(73,530)],
            (255,219,19,255),accent=(255,242,126,255))
tag1="Track your scores, spot trends,"
tag2="and improve your game."
for ln,y in [(tag1,446),(tag2,482)]:
    f=font(arialitalic,39)
    sz=39
    while f.getlength(ln)>812:
        sz-=1;f=font(arialitalic,sz)
    # Unlike the neon headline, the copy is dark and readable on yellow.
    draw=ImageDraw.Draw(im)
    draw.text(((1060-f.getlength(ln))/2,y),ln,font=f,fill=(5,14,32,255))

# Keep all five existing Free/core product feature rows unchanged.
# Replace only the obsolete "Pro Preview" statement in the last row.
panel((150,1037,628,1150),(4,22,58,248),radius=10)
text(166,1047,"PRO: LANE INSIGHTS",38,white,arialblack,2,2,max_width=441)
text(166,1100,"& LIVE SCORE SHARING",34,white,arialblack,2,2,max_width=438)

# New live-install call to action, ending before the original QR code.
panel((48,1151,631,1304),(216,17,24,255),radius=24,border=(255,228,0,255),border_width=6)
# White arrow — user scans the original untouched QR shown to the right.
arrow=Image.new("RGBA",im.size)
ad=ImageDraw.Draw(arrow)
ad.polygon([(80,1200),(134,1200),(134,1179),(181,1225),(134,1271),
            (134,1250),(80,1250)],fill=white)
im.alpha_composite(arrow)
text(202,1172,"SCAN TO",62,white,impact,3,3,max_width=402)
text(201,1220,"INSTALL FREE",68,gold,impact,3,3,max_width=410)

# Clear, non-mandatory paid upgrade: the standard Free app remains usable.
# Keep the QR code and existing website above the footer untouched.
panel((0,1380,1060,1484),(4,21,61,255),radius=0)
d=ImageDraw.Draw(im)
d.line([(35,1383),(1020,1383)],fill=cyan,width=4)

footer_lines=[
    ("BASIC VERSION STAYS FREE", 1385, 55, gold, impact),
    ("30-DAY PRO TRIAL  •  OPTIONAL $9.99 LIFETIME PRO", 1439, 34, white, impact)
]
for caption, top, size, ink, face in footer_lines:
    f=font(face,size)
    while f.getlength(caption)>995 and size>18:
        size-=1
        f=font(face,size)
    d.text(((1060-f.getlength(caption))/2,top),caption,
           font=f,fill=ink,stroke_width=1,stroke_fill=(2,7,24))

# Verify the bottom-right QR image is byte-identical to the original.
original=Image.open(src).convert("RGB")
fixed=im.convert("RGB")
assert original.crop((665,1020,990,1360)).tobytes() == fixed.crop((665,1020,990,1360)).tobytes(), \
       "QR pixels unexpectedly changed"
assert all(s not in ["PUBLIC BETA","TESTERS WANTED","Scan to try the beta"] for s in [title,headline,tag1,tag2])

png=FOLDER/"Popz-Bowling-Live-Launch-Flyer.png"
jpg=FOLDER/"Popz-Bowling-Live-Launch-Flyer-Facebook.jpg"
fixed.save(png,format="PNG",optimize=True)
fixed.save(jpg,format="JPEG",quality=93,subsampling=0,optimize=True)

ARCHIVE.mkdir(parents=True,exist_ok=True)
for filename in ("Popz-Bowling-Public-Beta-Flyer.png",
                 "Popz-Bowling-Public-Beta-Flyer-Facebook.jpg"):
    old=FOLDER/filename
    new=ARCHIVE/filename
    if old.exists() and not new.exists(): shutil.move(str(old),str(new))
print("LIVE_FLYER_PNG="+str(png))
print("LIVE_FLYER_FACEBOOK="+str(jpg))
print("ORIGINAL_BETA_ARCHIVE="+str(ARCHIVE))
print("ORIGINAL_QR_PIXELS=UNCHANGED")
print("DIMENSIONS=1060x1484")
