# A Working Heart

A four-chambered human heart drawn in SVG, driven by a model of the cardiac
cycle. Change the rate, the contractility and the filling; the valves open when
the pressures cross, the walls thicken as the cavities empty, the blood only
moves through a valve while that valve is open, and the ECG, the pressure
traces and the pressure-volume loop are all drawn from the same numbers.

```
python3 -m http.server 8000     # then visit localhost:8000/heart/
node heart/test/run.js          # 4,817 assertions
```

No build step, no dependencies, no backend. Open `heart/index.html`, or serve
the directory over HTTP. The only network requests on the page are two Google
fonts, and it works without them.

## What you can do with it

| | |
|---|---|
| **Point at anything** | Sixteen labelled parts, each with a note and, where there is one, a live reading — the pressure in that chamber or how far that valve is open. |
| **Drag across the heart** | Pauses and scrubs one beat by hand, a millisecond at a time. The same thing the position slider does, without leaving the drawing. |
| **Move the three sliders** | Rate, contractility, filling. Everything on the page recomputes, including all three instruments. |
| **Six presets** | Asleep, at rest, running hard, endurance-trained, after blood loss, and a failing pump. |
| **Two views** | Cut away from the front for the chambers and valves; whole, for the lit surface, the fat-packed grooves and the coronary tree. |
| **Tap a rate** | Tap the button in time with something and it takes the rate from your tapping. |
| **Listen** | The two heart sounds, synthesised — the inlet valves shutting, then the outlet valves. The gap between them is systole, and it barely changes when you double the rate while the gap after them collapses. |
| **Quarter speed** | For watching a valve actually move. |

Keyboard-reachable throughout, and it honours `prefers-reduced-motion` by
starting still — press play, or drag across the heart, to move it by hand.

## The cycle

The beat starts at the QRS complex and runs through seven phases:

| | | |
|---|---|---|
| Isovolumic contraction | all four valves shut | pressure builds, nothing moves |
| Rapid ejection | outlet valve open | about seven tenths of the stroke volume leaves |
| Reduced ejection | outlet valve open | flow tails off, pressure already falling |
| Isovolumic relaxation | all four valves shut | pressure collapses to nearly nothing |
| Rapid filling | inlet valve open | blood falls in with nothing pushing it |
| Diastasis | inlet valve open | the idle middle; **the first thing a fast heart spends** |
| Atrial systole | inlet valve open | the atrium wrings out the last fifth |

## What is actually modelled

**Timing is the load-bearing part.** Systole is 420 ms at 60 bpm shrinking as
the 0.55 power of the beat length — close to the standard regression on the
electromechanical interval through the middle of the range, and better behaved
than a straight line at the top of it, where a linear fit eventually shortens
systole faster than the beat itself and has diastole *growing* as the heart
races. Diastole is whatever is left, and diastasis is whatever is left of that.
So at 60 bpm the ventricle spends nearly six tenths of the beat filling; at 180
it spends a third, and the idle middle is gone entirely.

**Only one valve at a time.** A ventricle's inlet and outlet are never open
together, and twice a beat neither is. The drawing takes the valve positions
from the phase; the pressure curves are constructed to agree; and the test
suite checks the agreement in the other direction, at eighty instants of every
beat, across every setting the sliders allow.

**Filling is where the rate bites.** What arrives over one diastole approaches
a ceiling on an exponential, with a time constant that shortens when
contractility rises — catecholamines speed relaxation as well as contraction,
and that is most of how a heart still fills at 180 bpm. Shorten the time the
inlet valve is open and you cut the top off that curve. Holding the other two
sliders still, output climbs to about 150 bpm and then falls.

**What comes out is a fraction of what is there**, above an unstressed volume
of about 15 mL that no beat ejects, and contractility sets the fraction.
Writing it that way round rather than fixing an end-systolic volume matters: a
ventricle that has hardly filled must not then be left holding more than it
started with, which is what a fixed end-systolic volume implies at the bottom
of the range. It was a bug, and the sweep found it.

**The whole-heart view is painted, not diagrammed.** Flat fills in anatomical
order look like a diagram. What makes tissue read as tissue is the order a lit
object is painted in: a body colour, then the form shading that says which way
it bulges, then the things lying on top of it, then the wet highlight over
everything. The vessels get a contact shadow and a specular ridge from one
filter over the whole tree, which is what stops them reading as ink; the cut
ends of the great vessels show an open lumen, which is a small thing that does
more for the look of a specimen than anything else on the page.

**The coronary tree is grown, not drawn.** Forty tapering vessels placed by
hand come out evenly spaced and all the same length, which is the one thing a
real tree never is. So `tools/coronaries.js` places the three trunks — their
course is anatomy, not taste — and grows everything finer off them from a seed,
clipping each branch to stay on the muscle. Fat is grown the same way, as
overlapping lobules along the grooves, because drawn as one soft band it reads
as a painted stripe. Vessels are emitted as filled outlines rather than
strokes: a stroke cannot taper, and an artery that does not taper reads as a
wire. The output is committed as markup so the page stays a file you can open,
and the suite re-runs the generator and checks the two still agree.

**The drawing is redundant with the data on purpose.** Every hotspot, flow
route, moving group and animated wall is named in `js/anatomy.js` and drawn in
`index.html`. Rename a path in the SVG and the part stops being clickable and
the blood stops moving, with nothing on screen to say so — so the test suite
reads both files and checks that every name in one exists in the other, along
with every `url(#…)` reference to a gradient or filter.

## Honest limits

- **The numbers are plausible, not clinical.** They come from a small set of
  textbook relations tuned so a resting adult lands near 120/80, 70 mL, 60%.
  Nothing here is fitted to data and nothing here should be used to judge
  anything about a person.
- **Peak output is too low.** At hard exercise this heart moves about eight
  litres a minute; a real untrained adult manages fifteen. The shape of the
  curve is right and the height is not.
- **Arterial pressure is a rough derivation** — mean pressure from output
  against a fixed resistance, pulse pressure from stroke volume against a fixed
  compliance. Both change constantly in a real body, most visibly at exercise,
  where the pulse pressure should widen and here it narrows.
- **Nothing responds to anything.** A real heart is governed second by second
  by the nervous system, and rate, contractility and filling move together.
  Here they are three independent knobs, which is exactly what a body will not
  give you — and their extremes combine into states no person would present in.
- **Conduction is assumed perfect.** Every beat is identical, on time, and
  arrives everywhere at once. Most of what makes cardiology difficult is the
  beat that does not.
- **The whole-heart view is an illustration, not a photograph.** It is painted
  with gradients, noise and two lighting filters. Against a rendered specimen
  it gives itself away in the same places every time: the atria are smoother
  than real auricles, the silhouette is cleaner than a real one, and there is
  no subsurface scattering anywhere in it.
- **The cut-away is a diagram, not a scan.** Hand-drawn Bézier curves in a
  single plane. A real heart is not planar: the outflow tracts cross, the valve
  planes are oblique, and the right ventricle wraps around the left rather than
  sitting beside it. Treat the anatomy as honest about topology and approximate
  about geometry.

## Layout

```
index.html          the page, and the SVG anatomy
tools/coronaries.js grows the coronary tree and the fat; prints SVG
css/heart.css       one stylesheet, dark and light
js/cycle.js         the cardiac cycle — timing, volumes, pressures, valves, ECG
js/anatomy.js       what each part is, where blood goes, what moves
js/flow.js          blood cells walked along the routes in the SVG
js/sound.js         the two heart sounds, synthesised
js/charts.js        the ECG, the pressure plot and the pressure-volume loop
js/app.js           the clock, the controls, everything that touches the DOM
test/run.js         the test suite
```

`js/cycle.js` touches no DOM and decides everything; every other file only
draws what it says. That is what makes the whole model runnable in node.

## Tests

`node heart/test/run.js` runs 4,817 assertions. The load-bearing one is the
sweep: 816 combinations of rate, contractility and filling, sampled at eighty
instants each, asserting that

- a ventricle never has both valves open, and is sealed for exactly two
  intervals per beat with nothing moving through it;
- an open valve always has a pressure gradient behind it, and a shut one never
  does;
- every beat ends holding the volume it started with;
- and the ejection fraction stays inside what a ventricle can physically do.

Two of those started as failures. The flow figure was a numerical derivative
taken across phase boundaries, and reported blood moving during the intervals
when every valve is shut. The ejection fraction fell below 7% in the corner
where a weak pump meets an empty circulation, because end-systolic volume did
not depend on how much had arrived. Both are fixed above, and both would have
been invisible on screen.
