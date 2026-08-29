# Daily Route

A scheduler for one particular day — the routine below — that treats it as
what it actually is: a chain of blocks with four deadlines nailed into it.

```
python3 -m http.server 8000     # then visit localhost:8000/day/
node day/test/run.js            # 167 assertions, ~30,000 plans swept
```

No build step, no dependencies, no backend. Open `day/index.html`, or serve
the directory over HTTP.

## The day it plans

| | | |
|---|---|---|
| Wake up | the anchor | everything is measured from it |
| Get ready | 30 min | **starts within 30 minutes of waking** |
| Pray | 20 min | **finished by 14:00** |
| Walk | 45 min | **finished before sunset**, and earlier scores better |
| Back home, eat | 40 min | |
| Out | 90 min | optional; switching it on eats the afternoon |
| Work — code, ship, tweet | fills the gap | **ends at 18:30** |
| Recite, read | 40 min | not before 18:30 |
| Read a little | 25 min | not before sunset |
| Tweet, something productive | 45 min | |
| Workout — sit-ups, push-ups, dumbbells, weight | 30 min | **over by 22:24** |
| Free | what is left | |

Prayer and the walk are offered as *pray*, *walk* or *both*, because the two
have separate deadlines and both are worth holding to. Both is the default.

## What it actually computes

Stacking blocks end to end is the easy half, and on its own it tells you
nothing you did not already know. The useful half is the backward pass.

After placing everything as early as its order allows, the planner walks the
chain backwards from every hard deadline to find the latest each block could
start and still clear all of them. The difference between those two numbers is
the **slack** shown against each row — not how long the block lasts, but how
far it can slip before something downstream breaks, and which deadline is doing
the breaking. At nine in the morning that is the thing worth knowing: the
evening's 22:24 is usually what is quietly deciding your afternoon.

From the same pass it derives the latest you could have woken up and still
cleared the day. On a normal summer schedule that is 13:10, and prayer is what
sets it; drop prayer and the binding constraint moves to the evening.

## Sunset

Two of the deadlines move with the year, so sunset cannot be a fixed time. It
is computed in the page from your latitude and the date using the NOAA solar
equations — accurate to about a minute, verified in the tests against published
times for New York at both solstices, London at the equinox, and Singapore.
Polar day and polar night return no sunset at all rather than a wrong one, and
the planner drops those two constraints instead of inventing a time.

Your coordinates are guessed from the browser's time zone, which costs no
permission and lands within a degree or so. Pressing **use my location**
replaces the guess; typing into **sunset** overrides both.

## Layout

```
index.html          the page
css/day.css         one stylesheet, light and dark, and a print sheet
js/sun.js           sunrise and sunset, NOAA
js/schedule.js      the planner — forward pass, backward pass, slack
js/motion.js        the animation used here: tween, count, reveal, marker, type
js/app.js           wiring; no decisions about the day live here
data/routine.js     the day itself — durations, order, deadlines
data/places.js      time zone to coordinate, for the first guess
test/run.js         the test suite
```

Changing the routine means editing `data/routine.js` and nothing else.

## Tests

`node day/test/run.js`. Most of it is ordinary: the sun equations against
published times, the clock formatting, the ordering, each deadline enforced,
each option adding and removing the right blocks.

The load-bearing one is the sweep at the end. Every wake time in the day, at
every combination of options, at eight sunsets from an arctic winter to an
equatorial evening — 29,664 plans — asserting that no block ever starts before
something it depends on has finished, that every time is a whole finite minute,
and that **a plan reporting itself clear never actually misses one of its own
hard deadlines**. That last one is the contract. A planner that quietly reports
a broken day as fine is worse than no planner.

## Honest limits

- **It does not know what your afternoon is really like.** It knows durations
  you gave it. A block that always overruns will keep being planned at the
  length written in `routine.js` until you change the number.
- **A missed deadline here is arithmetic.** It means the blocks as written do
  not fit between the time you got up and the time you set. It is not a
  judgement about the day, and the page is written to avoid sounding like one.
- **Ticks are per-day and per-browser.** They live in `localStorage`, reset at
  midnight, and are not synced anywhere.
- **Fonts load from Google Fonts.** That is the one network request the page
  makes. It degrades to a system serif/grotesque/mono stack that the design was
  checked against, so it is readable offline and on a blocked network.
