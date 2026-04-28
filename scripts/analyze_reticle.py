"""DEFINITIVE decode — verify by grouping DOT elements by their first few entries.

Looking at BSA first 8 elements:
  [0] DOT x=0.05, y=0.2, r=0      => r=0 tick at lineWidth=0.05 position=0.2
  [1] DOT x=0.00, y=0.2, r=0      => r=0 tick at lineWidth=0.00 position=0.2 
  [2] DOT x=0.05, y=3.0, r=0.05   => r=0.05 small circle at lineWidth=0.05 position=3.0
  [3] DOT x=0.00, y=0.05, r=6.0   => r=6.0 BIG circle at lineWidth=0.0 position=0.05
  [4] DOT x=0.05, y=3.0, r=6.0    => r=6.0 BIG circle at lineWidth=0.05 position=3.0

Observation: for BSA, the data contains MULTIPLE LAYERS, each with the SAME
positions but different radii. It's like a multi-pass drawing:
  Pass 1 (r=0): tiny ticks forming the thin crosshair
  Pass 2 (r=0.05): very small dots
  Pass 3 (r=6.0): medium circles
  Pass 4 (r=9.0): big circles/thick elements

For each pass, the SAME positions (1,2,3...10) are visited.

Now the CRITICAL question: what do elements [3] and [5] mean?
  [3] DOT x=0.00, y=0.05, r=6.0
  [5] DOT x=0.00, y=0.05, r=9.0

These have position=0.05 (almost center), radius=6.0 and 9.0.
These are the CIRCLE DEFINITIONS:
  - A circle of radius 6.0 MIL centered near origin
  - A circle of radius 9.0 MIL centered near origin

Looking at BSA in ChairGun screenshot: there ARE visible circles near the center 
that act as thick bars. Wait... no. The BSA has THICK DUPLEX BARS, not circles.

Actually, I think each "pass" defines HOW to draw the crosshair at that radius:
  The elements at each radius level define which positions get a mark at that radius.
  
  For r=6.0 with BSA, positions include 3,6,9...30 on both axes.
  These aren't separate circles — they are the SAME crosshair marks but drawn at
  a LARGER visual size (thicker line/bigger dot).

WAIT — I think I finally get it. Let me think about it differently.

The data is organized as a list of (armWidth, position, markerRadius) tuples.

For each element:
  armWidth = x (the width of the crosshair ARM at this position, 0 means no arm)
  position = y (signed distance from center)
  markerRadius = radius (size of a dot/circle marker at this position)

To DRAW the reticle, for each element on EACH axis:
  1. If armWidth > 0: draw a horizontal/vertical line segment of length armWidth
     centered at the position on that axis
  2. If markerRadius > 0: draw a filled circle of that radius at the position

The elements with (x=0, y=0.05, r=6.0) mean:
  No arm, but draw a circle of radius 6.0 at position 0.05 from center.
  That's a BIG circle slightly off-center — matching the BSA thick circle!

And (x=12.0, y=3.0, r=9.0) means:
  Arm of width 12.0 (extremely thick bar) at position 3.0, with a 9.0 radius circle.
  That's the thick outer duplex bar of the BSA!

THIS MAKES SENSE!
"""

import json, urllib.request

API = "http://192.168.1.150:8000/rest/v1/chairgun_reticles_catalog"
KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzc2NzI0MzU4LCJleHAiOjIwOTIwODQzNTh9.aurKzGs6VGFsHAU0EotCqNe_6R6EME3M90JdhAZ1Fp0"

def fetch(rid):
    url = f"{API}?select=name,unit,elements&reticle_id=eq.{rid}"
    req = urllib.request.Request(url, headers={"apikey": KEY})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())[0]

# Verify with Hawke 1038
data = fetch(1038)
els = data['elements']
dots = [e for e in els if e['type'] == 'dot']

print("HAWKE 1/2 Mil Dot — interpretation as (armWidth, position, markerRadius)")
print("="*60)

# Group by radius
from collections import defaultdict
groups = defaultdict(list)
for d in dots:
    groups[d.get('radius', 0)].append((d['x'], d['y']))

for r in sorted(groups.keys()):
    items = groups[r]
    print(f"\nmarkerRadius={r}:")
    widths = sorted(set(w for w, p in items))
    for w in widths:
        positions = sorted(p for ww, p in items if ww == w)
        print(f"  armWidth={w}: positions={positions}")
    
print("\n\nChairGun shows Hawke 1/2 Mil Dot has:")
print("  - Thin crosshair lines (no gap at center)")
print("  - Filled dots at every 1 MIL on both axes (±1..±10)")
print("  - Extra dots at ±3,6,9..30 intervals on horizontal axis")
print("  - Small tick marks near center (±0.08 apart)")
print()
print("Our data says:")
print("  r=0, width=1.0: ticks at ±0.08..±0.8 => matches the solid crosshair section")
print("  r=1, width=0.0: dots at ±1..±10 on vertical axis => filled dots, no arm")
print("  r=1, width=1.0: dots at ±1..±30 on horizontal axis => filled dots WITH arm")
print()
print("So armWidth=1.0 DOES define the crosshair line, and armWidth=0 means just a dot!")
