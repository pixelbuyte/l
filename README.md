# l

Two projects, unrelated to each other, sharing a repository.

- **How People Write** (`index.html`, `humanize.html`) — a corpus of human
  prose and a rewriter that runs on it. Described below.
- **[Daily Route](day/)** (`day/`) — a scheduler for one daily routine that
  works backwards from its deadlines to say how much slack is left.
  See [`day/README.md`](day/README.md).

---

## How People Write

Two connected things:

1. **A corpus** (`index.html`) — 28 annotated passages of ordinary human prose, a
   library of 169 habits that give unedited machine prose away, and the
   measurements that separate the two.
2. **A rewriter** (`humanize.html`) — paste AI-generated text, see every habit
   found and why it reads that way, and get an edited version measured against
   the corpus.

No build step, no dependencies, no backend, no network calls. Open
`index.html` in a browser, or serve the directory over HTTP.

```
python3 -m http.server 8000     # then visit localhost:8000
node test/run.js                # 8,326 assertions
```

## What the rewriter is allowed to do

The engine may only **delete** text, **substitute** from the fixed lexicon in
`data/patterns.js`, or **split** a sentence at a coordinating joint. It never
generates a clause. There is no model behind it, which is why it can run
offline in a page — and why it cannot introduce a claim you did not write. The
worst it can do is read flat.

Everything is seeded, so the same input and seed always produce the same
output. "Another pass" advances the seed.

## What it cannot do, and says so

Sentence-length variation — *burstiness* — is the strongest single signal
separating the corpus from the contrast set (0.74 against 0.34 on average). It
is also the one thing rules mostly cannot repair, because you can only split a
sentence that already contains two clauses that could stand alone, and prose
that runs to sixteen even words of single-clause statement offers nothing to
split.

So when a rewrite comes out flat, the tool says so, quotes the specific
sentences, and hands the work back rather than reporting success it did not
achieve.

## Honest limits

- **The passages were written for this corpus, not collected.** A scraped
  corpus would be larger and better evidence, but could not be republished
  cleanly, and the annotations could not quote exact spans. What matters for
  the argument is the shape of the writing, and shape survives the
  substitution. It is still the first thing to fix if this were to become
  evidence rather than illustration.
- **The contrast specimens are imitations.** They were written in the register
  unedited model output tends to occupy. They were not sampled from any model
  and are not evidence about any particular system. They exist so the
  comparison is reproducible from files you can read and argue with.
- **The pattern library is curated, not measured.** Severity is a judgement.
- **None of this detects anything.** The measurements describe a register, not
  an author. Human burstiness in this corpus ranges from 0.46 to 0.94 — the
  academic abstract is nearly as even as generated prose. Using numbers like
  these to accuse a student or a colleague is a misuse of them.
- **Editing prose does not change a disclosure obligation.** If you are
  somewhere that requires you to disclose AI assistance, this tool has no
  bearing on that.

## Layout

```
index.html          corpus, comparison, pattern library, method
humanize.html       the rewriter
css/main.css        one stylesheet, light and dark
js/metrics.js       measurement engine — every figure on both pages
js/humanize.js      the rewrite engine (five passes + seam repair)
js/corpus-app.js    builds the corpus page from the data
js/humanize-app.js  wiring for the rewriter
data/patterns.js    169 machine-writing habits
data/corpus.js      28 human passages, 108 span annotations
data/specimens.js   8 contrast specimens
test/run.js         test suite
```

Every statistic on both pages is computed at load time from the raw strings in
`data/`. Nothing is hand-entered, so any figure can be checked by reading the
text it came from.

## Tests

`node test/run.js` runs 8,326 assertions covering sentence splitting,
metrics, the integrity of all 169 patterns and 108 annotations, and the
rewriter across a battery of inputs at every strength and twelve seeds —
asserting no unexpanded backreferences, no doubled articles or punctuation,
no `a`/`an` errors, and correct tense on inflecting rules.

Two of them are the load-bearing ones:

- Running the **human corpus** through the rewriter changes ~21 edits per
  1,000 words.
- Running **generated prose** through it changes ~246 per 1,000 words.

A twelvefold separation on the tool's own measure. If a future pattern starts
mangling human writing, that first number moves and the suite fails.
