"""Build the portfolio's OFL display cut from the Podkova variable TTF.

Usage: python scripts/build-tide-font.py Podkova.ttf output.woff2
Requires fonttools[woff]. Upstream source (SHA-256 checked below):
https://github.com/google/fonts/tree/main/ofl/podkova
"""
import hashlib
import math
import sys
from pathlib import Path

from fontTools import subset
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphCoordinates
from fontTools.ttLib.tables.ttProgram import Program
from fontTools.varLib.instancer import instantiateVariableFont


def bead(pen, x, y, w, h):
    # A gathering drop with a high off-centre tip and a round lower bowl.
    pen.moveTo((x + .73*w, y + h))
    pen.qCurveTo((x + w, y + .68*h), (x + w, y + .44*h))
    pen.qCurveTo((x + w, y), (x + .49*w, y))
    pen.qCurveTo((x, y), (x, y + .37*h))
    pen.qCurveTo((x, y + .66*h), (x + .73*w, y + h))
    pen.closePath()


source, output = map(Path, sys.argv[1:])
if hashlib.sha256(source.read_bytes()).hexdigest() != 'a7be6732a489b1c5c7c37a5c2e816fad901563ccd882e9bbc56d13eeebf4a4e7':
    raise SystemExit('Expected the Podkova variable font from google/fonts.')
font = instantiateVariableFont(TTFont(source), {'wght': 535}, inplace=True)
opt = subset.Options()
opt.hinting = False
sub = subset.Subsetter(options=opt)
sub.populate(unicodes=[*range(0x20, 0x180), *range(0x300, 0x370),
                       *range(0x400, 0x530), *range(0x2000, 0x2070), 0x20B8, 0x2116])
sub.subset(font)
glyf = font['glyf']
for name in ['uni0307', 'dieresis', 'period', 'colon']:
    g = glyf[name]
    coords, ends, _ = g.getCoordinates(glyf)
    pen = TTGlyphPen(None)
    start = 0
    for end in ends:
        xs, ys = zip(*coords[start:end+1])
        bead(pen, min(xs), min(ys), max(xs)-min(xs), (max(ys)-min(ys))*1.08)
        start = end + 1
    glyf[name] = pen.glyph()

# Expand composites first so accents and the letter underneath share one
# sloped axis. Preserve the advance relationships used by the kerning table.
outlines = {}
for name in font.getGlyphOrder():
    coords, ends, flags = glyf[name].getCoordinates(glyf)
    if not coords:
        continue
    result = Glyph()
    result.numberOfContours = len(ends)
    result.endPtsOfContours = list(ends)
    result.flags = flags[:]
    result.program = Program()
    result.program.fromBytecode([])
    advance, bearing = font['hmtx'][name]
    span = max(advance, 360)
    def point(x, y):
        u = min(1, max(0, x / span))
        v = min(1, max(0, y / 700))
        bow = math.sin(math.pi*v)
        return (round(x*1.035 - y*.115 + 15*bow),
                round(y + 18*math.sin(2*math.pi*u)*bow))
    result.coordinates = GlyphCoordinates([point(x, y) for x, y in coords])
    outlines[name] = result
    font['hmtx'][name] = (round(advance*1.035), min(x for x, _ in result.coordinates))
for name, outline in outlines.items():
    glyf[name] = outline
names = {1:'Ayat Tide', 2:'Regular', 3:'Ayat Tide 1.0', 4:'Ayat Tide',
         5:'Version 1.000', 6:'AyatTide-Regular',
         10:'A backslanted display cut adapted from Podkova for the portfolio of Ayat. SIL OFL 1.1.'}
table = font['name']
table.names = [n for n in table.names if n.nameID not in {*names, 16, 17, 25}]
for key, value in names.items():
    table.setName(value, key, 3, 1, 0x409)
font['post'].italicAngle = 6.6
font.flavor = 'woff2'
font.save(output)
