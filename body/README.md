# Bodyworks

A configurator for a humanoid platform: four pre-built body variants drawn as
engineering elevations, swappable end effectors, and — for one of the four — a
bill of materials priced down to the individual motor, added up live on the
page.

```
python3 -m http.server 8000     # then visit localhost:8000/body/
node body/test/run.js           # 350 assertions
```

No build step, no dependencies, no backend. The only network requests are two
Google fonts, and it works without them.

## The four bodies

| | | |
|---|---|---|
| **Warden** | guardian · rescue | The one from the brief: paired to a wrist sensor, re-tasked by your pulse, four microturbines when walking is too slow. Gets the full cost sheet. |
| **Aide** | domestic · care | The body that cooks and cleans. Spends on quietness what the Warden spends on thrust. |
| **Swift** | flight · courier | The airframe wearing legs. Swept winglets, no proper hands, 62 m/s. |
| **Forge** | industrial · heavy | The stocky one. Shorter levers, doubled load, tool chuck fitted, the scissor hand lives here too. |

All four share a rig — same joints, same places — and differ in what they are
specified to do, which is how real product families work. You do not redesign
the skeleton; you re-spec it.

## What you can do with it

- **Pick a body** and the elevation, the dimension line, the specification and
  the caption all follow.
- **Swap the end effector** — 16-DoF hand, scissor blade, two-jaw gripper,
  tool chuck — and every wrist on the plate changes, the specs re-mass, and
  the Warden's hands row re-prices itself. As configured with hands the sheet
  reads $105,403; with tool chucks, $97,083.
- **Hover the cost sheet** and the joint it prices lights up on the drawing;
  hover a joint and the rows light up on the sheet.
- **Run the distress link.** A strip-chart of a simulated pulse, an alarm
  threshold, and a three-state machine: STANDBY until the rate crosses the
  line, ALERT while it confirms the spike is sustained, INBOUND as the closing
  velocity ramps. The confirmation delay is the honest part — a robot that
  launches on a single noisy sample launches at every staircase.

Honours `prefers-reduced-motion`: the sweep line stays off and the distress
demo jumps to its end state and says what happened.

## Where the money goes

Of the Warden's whole sheet, more than a third is the ability to fly — four
microturbines and the plumbing to feed them. The actuators are the next third:
harmonic drives where the torque is brutal, quasi-direct-drive everywhere the
joint has to feel the world. The distress link itself — the UWB ranging radio
and the pulse receiver — is under one per cent. That is the honest shape of
the idea: the sensor is nearly free, the hands are dear, and the flying is
what decides whether the body costs like a car or like a house.

The test suite re-adds the entire sheet for every effector, checks every line
equals quantity × unit and every subtotal and grand total closes, checks that
each priced joint exists on the drawing and each drawn joint is priced, and
that the encoder count equals the joint count it claims to encode.

## Honest limits

- **The prices are estimates, openly.** Assembled from public prices for the
  same class of part — QDD actuators of the kind open-source humanoids use,
  hobbyist microturbines, an automotive battery pack. Believable, not quoted,
  and a purchasing department would tear the sheet apart.
- **These are concept elevations, not fabrication drawings.** No tolerances,
  no materials engineering, no control software, and no claim that the mass
  budget closes — a real airframe team would start by proving it does not.
- **The robot is fictional.** This page is the stage before engineering: the
  stage where you decide which body is worth that work.

## Layout

```
index.html          the page, and the four SVG elevations
css/body.css        one stylesheet — blueprint dark, paper light
data/bodies.js      the four bodies, the effectors, the parts list, the adder
js/app.js           selection, the joint↔row link, the distress demo
test/run.js         the test suite
```

Every right arm and right leg on the plate is the left one mirrored — the
drawing carries half the limbs the page shows. The effectors are `<defs>`
symbols worn through `<use>`, which is what makes them interchangeable in the
drawing the way they are interchangeable on the chuck.
