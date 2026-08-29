/*
 * corpus.js — the human writing corpus.
 *
 * Every passage here was written for this corpus rather than collected from
 * the web. That is a deliberate trade: a scraped corpus would be larger, but
 * it could not be republished cleanly, and the annotations could not point at
 * exact character spans without reproducing someone else's paragraph in full.
 *
 * What matters for the argument is the *shape* of the writing — how long the
 * sentences run, how much they vary, where the concrete nouns sit — and shape
 * survives the substitution. Every statistic shown on the corpus page is
 * computed from these strings at load time by js/metrics.js. Nothing is
 * hand-entered, so you can check any number by reading the passage.
 *
 * notes[]  each note quotes a span of the passage verbatim; the page finds
 *          and highlights it. If a quote ever stops matching, the page shows
 *          the note without the highlight rather than failing.
 */
(function (root) {
  'use strict';

  var HW = (root.HW = root.HW || {});

  var CORPUS = [

    { id: 'email-vendor', register: 'Work email', title: 'Chasing an invoice',
      context: 'Internal email, mid-sized company, written in about ninety seconds.',
      text:
"Hi Ravi,\n\nSorry to nag. The Q3 invoice from Dellhurst is still sitting unapproved and they've started emailing me directly, which I'd rather they didn't.\n\nI think the hold-up is that the PO number changed in July and nobody told finance. If that's it, it's a five-minute fix and I can do it myself — I just need someone to confirm the new number is the one ending 4471.\n\nCan you look tomorrow? If you're buried I'll ask Priya instead, no hard feelings.\n\nThanks,\nJo",
      notes: [
        { feature: 'Apology as opener', quote: 'Sorry to nag.', note: 'A three-word sentence doing social work. Model prose almost never opens below eight words.' },
        { feature: 'Named specifics', quote: 'the one ending 4471', note: 'Real writing is full of numbers, names and part-references that no general-purpose draft would invent.' },
        { feature: 'Aside mid-sentence', quote: "which I'd rather they didn't", note: 'The writer interrupts herself to register an annoyance that the sentence did not need.' },
        { feature: 'Offer of an out', quote: "If you're buried I'll ask Priya instead, no hard feelings.", note: 'Ordinary correspondence manages a relationship as well as a task.' }
      ] },

    { id: 'chat-thread', register: 'Group chat', title: 'Arranging a lift',
      context: 'Four messages from a family thread, sent over about a minute.',
      text:
"can pick you up at half 6 but only if the car passes its MOT tomorrow\n\notherwise it's the bus and you'll have to leave at 5\n\nsorry. I know. I've been putting it off since March\n\nbring a coat either way, it's supposed to turn",
      notes: [
        { feature: 'No capitals, no closing punctuation', quote: 'can pick you up at half 6', note: 'Register is set by what the writer leaves out as much as what they put in.' },
        { feature: 'Self-reproach in fragments', quote: "sorry. I know. I've been putting it off since March", note: 'Three clauses, three separate admissions, no connective between them.' },
        { feature: 'Unexplained deixis', quote: "it's supposed to turn", note: '"Turn" needs shared context. Machine prose over-specifies because it assumes no shared world.' }
      ] },

    { id: 'review-boots', register: 'Product review', title: 'Two winters in a pair of boots',
      context: 'Left on a retailer site, four stars.',
      text:
"I've had these since November 2022, worn most days, and they've held up better than the last three pairs I bought.\n\nThe good: the sole hasn't separated, which is what killed my old ones. Waterproofing is genuinely waterproof — I stood in a flooded car park in Sheffield for twenty minutes and came out dry. They're heavy, but that's the point.\n\nThe bad: the laces are rubbish and snapped inside a month. Replace them on day one and save yourself the walk home with a boot flapping. Also the size runs small. I'm normally a 9 and the 9 was tight across the toe; the 10 is right.\n\nWould I buy again? Probably, but I'd wait for a sale. Full price is a lot for something you're going to get mud on.",
      notes: [
        { feature: 'Anchored in time and place', quote: 'a flooded car park in Sheffield for twenty minutes', note: 'The detail is unnecessary to the argument, which is exactly why it reads as testimony.' },
        { feature: 'Concession structure', quote: "They're heavy, but that's the point.", note: 'Human reviewers defend the flaw they just named. Generated reviews list pros and cons in separate blocks.' },
        { feature: 'Question to self', quote: 'Would I buy again?', note: 'A rhetorical question that gets a hedged answer rather than a triumphant one.' },
        { feature: 'Deflating close', quote: "something you're going to get mud on", note: 'The last line lowers the stakes. Model prose tends to raise them.' }
      ] },

    { id: 'bug-report', register: 'Bug report', title: 'Import fails silently on files over 4 MB',
      context: 'Filed by a support engineer against an internal tracker.',
      text:
"Repro: upload any CSV over about 4 MB through the web importer. The progress bar completes, the success toast fires, and nothing lands in the table.\n\nHappens on Chrome and Firefox, both on the staging box and in prod. Doesn't happen through the CLI importer, which is how I narrowed it down.\n\nI think it's the nginx client_max_body_size, which is still at the default 1 MB — but that should give a 413, and we're not seeing one, so either we're swallowing the error in uploadHandler or the proxy is truncating rather than rejecting. I haven't had time to check which.\n\nSeverity: I'd call it high. It's silent. Two customers have re-uploaded the same file five or six times assuming they did something wrong.",
      notes: [
        { feature: 'Falsifiable steps first', quote: 'Repro: upload any CSV over about 4 MB', note: 'Domain writing front-loads whatever the reader needs to reproduce the problem.' },
        { feature: 'Admitted uncertainty with a reason', quote: "I haven't had time to check which.", note: 'The writer names the limit of their own investigation. Generated text hedges without ever saying why.' },
        { feature: 'Severity argued, not asserted', quote: "It's silent.", note: 'Two words, then the evidence. The argument is compressed because the reader is a colleague.' }
      ] },

    { id: 'journal', register: 'Private journal', title: 'Thursday, late',
      context: 'A notebook entry, never intended to be read.',
      text:
"Didn't sleep. Kept going over the conversation with M. and finding better things I could have said, which is useless at 3am and useless now.\n\nThe thing I keep landing on is that she wasn't even angry. That's what's bothering me. If she'd shouted I'd know where I stood.\n\nWent for a walk at six. The canal was full of that flat white light it gets before the sun clears the flats. Two swans, one asleep. I felt better for about ten minutes.\n\nRing the dentist. Buy stamps. Don't reply to that email until Monday.",
      notes: [
        { feature: 'Subjectless opening', quote: "Didn't sleep.", note: 'The "I" is dropped. Private writing assumes its only reader.' },
        { feature: 'Circling, not concluding', quote: 'The thing I keep landing on', note: 'The passage returns to its problem instead of resolving it. Model prose resolves almost compulsively.' },
        { feature: 'Register break', quote: 'Ring the dentist. Buy stamps.', note: 'A to-do list interrupts the reflection. Human documents rarely stay in one mode.' },
        { feature: 'Undecorated image', quote: 'Two swans, one asleep.', note: 'Four words, no adjective doing sentiment work.' }
      ] },

    { id: 'recipe-note', register: 'Recipe with annotations', title: "Grandmother's onion soup, as actually made",
      context: 'Copied onto an index card, then amended in different pens over years.',
      text:
"Six onions, sliced thin. Butter, not oil, and more than you think — a good knob, maybe 50g.\n\nCook them low for forty-five minutes. Not twenty. This is the whole recipe and every time I rush it I regret it. They should go the colour of a conker.\n\nFlour, one spoon, stir it round. Then stock, about a litre, and a glass of whatever white wine is open. Simmer twenty minutes.\n\nSalt at the end, never the start.\n\n(Written 1998. Since amended: use half beef stock. Mum was right about the sherry — a splash, off the heat. Also she never measured anything, so the 50g is my guess at what her hand did.)",
      notes: [
        { feature: 'Instruction plus enforcement', quote: 'Not twenty.', note: 'The correction anticipates the reader cheating, because the writer has cheated.' },
        { feature: 'Simile from the kitchen', quote: 'the colour of a conker', note: 'Comparison drawn from a domestic world, not from a stock of literary images.' },
        { feature: 'Layered authorship', quote: 'Since amended: use half beef stock.', note: 'The document has a history. Generated text arrives all at once, from nowhere.' },
        { feature: 'Measurement as estimate', quote: 'my guess at what her hand did', note: 'Human documents admit their own imprecision.' }
      ] },

    { id: 'news-local', register: 'Local news report', title: 'Council rejects riverside plan',
      context: 'Filed to a weekly paper on deadline.',
      text:
"Plans for 140 flats on the old Corrigan's site were turned down on Tuesday night, after a planning meeting that ran past eleven.\n\nThe committee voted six to three against. Councillor Anne Whitrow, who moved the rejection, said the development \"puts a hundred and forty front doors on a road that floods twice a winter\" and that the flood modelling submitted by the developer was four years old.\n\nDevelopers Marchwood Estates said they were \"disappointed\" and were considering an appeal. A spokesman declined to say whether a revised application would keep the same number of units.\n\nAbout thirty residents attended. Several applauded when the vote was read out and were asked by the chair to stop.\n\nThe site has been empty since the printworks closed in 2009.",
      notes: [
        { feature: 'Inverted pyramid', quote: 'were turned down on Tuesday night', note: 'The outcome lands in the first clause. Everything after it is descending detail.' },
        { feature: 'Quote carrying the colour', quote: 'a road that floods twice a winter', note: 'Reporters let a source supply the vivid phrase and keep their own prose flat.' },
        { feature: 'Attribution discipline', quote: 'A spokesman declined to say', note: 'The absence of an answer is itself reported. Generated news invents the answer.' },
        { feature: 'Orphan closing fact', quote: 'empty since the printworks closed in 2009', note: 'Papers end on the fact most easily cut for space, not on a summary.' }
      ] },

    { id: 'academic', register: 'Academic abstract', title: 'Tenant mobility and school catchments',
      context: 'Abstract from a housing-policy paper.',
      text:
"This paper examines whether catchment-area boundaries affect private-rental turnover in three English cities between 2011 and 2019. Using tenancy deposit records matched to admissions data (n = 41,206), we find that households with a child aged four to six are 18 per cent less likely to move in the year preceding a school application than comparable households without one.\n\nThe effect is concentrated in catchments whose primary schools were rated Outstanding, and disappears entirely where two adjacent catchments hold the same rating. We interpret this as evidence that the constraint operates through perceived scarcity rather than through school quality as such.\n\nOur identification relies on boundary changes that were announced after the tenancy start date, and we cannot rule out anticipatory behaviour by better-informed households. The finding should therefore be read as an upper bound.",
      notes: [
        { feature: 'Method before result', quote: 'Using tenancy deposit records matched to admissions data', note: 'Academic prose earns its claim by naming the data first.' },
        { feature: 'Numbers with units', quote: '18 per cent less likely', note: 'Specific and checkable. Generated abstracts favour direction words over magnitudes.' },
        { feature: 'Stated limitation', quote: 'we cannot rule out anticipatory behaviour', note: 'A real limitation, named precisely enough to be attacked.' },
        { feature: 'Hedge that costs something', quote: 'should therefore be read as an upper bound', note: 'This hedge weakens the paper’s own headline. Decorative hedging never does.' }
      ] },

    { id: 'oral-history', register: 'Oral history transcript', title: 'On leaving the pit',
      context: 'Transcribed from a recorded interview; the interviewer’s questions are removed.',
      text:
"Well I was twenty-three. Twenty-three, twenty-four. And you didn't think about it as a career, that's a word that came later, you just went where your dad went.\n\nThe noise is what people don't ask about. Everybody asks about the dark. It wasn't dark, we had lamps. It was the noise — you'd come up and the world above sounded like it had been switched off.\n\nWhen it shut, I was one of the lucky ones, I got taken on at the depot within about six weeks. Lucky. My brother-in-law didn't work again. Not properly. He did bits.\n\nDo I miss it? No. God, no. I miss the men.",
      notes: [
        { feature: 'Self-correction in place', quote: "Twenty-three, twenty-four.", note: 'Speech revises out loud. Written prose revises before it reaches the page.' },
        { feature: 'Expectation overturned', quote: "Everybody asks about the dark. It wasn't dark, we had lamps.", note: 'The speaker argues with a question nobody asked in the transcript.' },
        { feature: 'Word repeated, then reweighted', quote: 'Lucky.', note: 'The same word returns carrying irony it did not have four words earlier.' },
        { feature: 'Turn at the last clause', quote: 'I miss the men.', note: 'The passage answers its own rhetorical question twice and reverses on the second.' }
      ] },

    { id: 'complaint', register: 'Complaint letter', title: 'Regarding order 88-2210',
      context: 'Posted, not emailed, which the writer mentions.',
      text:
"Dear Sir or Madam,\n\nI ordered a replacement carriage bolt for a Fenwick mower on 3 April. I received a garden hose.\n\nI telephoned on the 8th and was told it would be resolved in five working days. I telephoned again on the 17th and was told there was no record of the first call. On the 24th I was told the item was discontinued, which is not what your website said when I ordered it, and is not what it says now.\n\nI am writing rather than emailing because I have twice been told that emails to your support address are answered within 24 hours, and twice they have not been.\n\nI would like the bolt, or failing that £14.99 and the return postage on the hose, which is still in its packaging in my hall.\n\nYours faithfully,\nD. Mercer",
      notes: [
        { feature: 'Chronology as argument', quote: 'I telephoned again on the 17th', note: 'The dates do the persuading. No adjective is asked to carry the anger.' },
        { feature: 'Understated absurdity', quote: 'I received a garden hose.', note: 'Placed as a bare sentence, given no comment. The restraint is the joke.' },
        { feature: 'Remedy specified exactly', quote: '£14.99 and the return postage', note: 'A real complaint names the outcome it will accept.' },
        { feature: 'Detail that outlives the point', quote: 'still in its packaging in my hall', note: 'The hose is now a physical object in a real hallway.' }
      ] },

    { id: 'commit-log', register: 'Commit messages', title: 'Nine commits from one afternoon',
      context: 'Taken from a working branch, in order.',
      text:
"Fix off-by-one in pagination cursor\n\nCursor was pointing at the last item of the previous page rather than the first item of the next one, so every page after the first repeated a row. Adds a regression test with a page size of 1, which is where it's most visible.\n\n---\n\nRevert \"Fix off-by-one in pagination cursor\"\n\nBroke the export job, which relies on the old behaviour. Need to fix both together.\n\n---\n\nFix off-by-one in pagination cursor, and the export job that depended on it\n\n---\n\nwip\n\n---\n\nwip, don't merge\n\n---\n\nActually fix it this time\n\n---\n\nTidy up after the last three commits, sorry\n\n---\n\nAdd the test I said I'd added two commits ago\n\n---\n\nBump timeout 30s -> 90s\n\nThe export job on the largest tenant takes 71s in prod. 30 was always optimistic; I picked it because it was the number in the example config.",
      notes: [
        { feature: 'Failure recorded, not hidden', quote: 'Revert "Fix off-by-one in pagination cursor"', note: 'The history keeps the mistake. Generated changelogs describe only successful outcomes.' },
        { feature: 'Register collapse under pressure', quote: "wip, don't merge", note: 'Prose quality drops as the afternoon goes on. Model output has uniform polish throughout.' },
        { feature: 'Apology to future readers', quote: 'Tidy up after the last three commits, sorry', note: 'The writer addresses a colleague who does not exist yet.' },
        { feature: 'Reasoning about a magic number', quote: 'I picked it because it was the number in the example config', note: 'Honest attribution of an arbitrary decision.' }
      ] },

    { id: 'eulogy', register: 'Eulogy', title: 'For Eddie',
      context: 'Read aloud at a funeral, from paper, by his daughter.',
      text:
"Dad would have hated this. He'd have said it was a lot of fuss and then checked his watch.\n\nHe was not an easy man. I'm not going to stand here and say he was. He had a temper that arrived like weather and left just as fast, and he never once apologised in words — he apologised in chips, brought home wrapped in newspaper, set down on the table without comment.\n\nHe taught me to drive in a car park in Ilkeston. He shouted. I cried. I passed first time.\n\nWhat I want to say is that he showed up. Every match, every hospital appointment, the four-hour drive to Norwich when I split up with someone he'd never liked. He never said the right thing. He was always there to say the wrong one.\n\nI'd give a lot to hear him get it wrong again.",
      notes: [
        { feature: 'Refusal of the genre', quote: "He was not an easy man. I'm not going to stand here and say he was.", note: 'The eulogy names what a generated eulogy would smooth over.' },
        { feature: 'Abstraction cashed out in objects', quote: 'chips, brought home wrapped in newspaper', note: 'The claim about apology is proved with an object, not restated.' },
        { feature: 'Three-beat compression', quote: 'He shouted. I cried. I passed first time.', note: 'Human triads are unequal and end on a reversal; generated triads balance.' },
        { feature: 'Inverted final sentence', quote: 'to hear him get it wrong again', note: 'The closing line turns the essay’s complaint into its consolation.' }
      ] },

    { id: 'forum-post', register: 'Forum post', title: 'Anyone else had the P0430 come back after a cat replacement?',
      context: 'Posted to a car-repair board, unedited.',
      text:
"2009 Focus, 1.6 petrol, 130k. Threw a P0430 in January. Replaced the downstream sensor first because it was cheap, no change. Replaced the cat in February with an aftermarket one (the £180 one, not the £400 one, I know, I know) and the light went off for about 900 miles.\n\nIt's back. Same code.\n\nBefore anyone says it — yes I cleared the adaptations, yes the exhaust is tight, I smoke-tested it and there's no leak I can find upstream of the flange.\n\nMy suspicion is the cheap cat just isn't dense enough to fool the monitor once the engine's fully warm. But I'd rather be told I'm wrong than spend another £400 finding out.\n\nHappy to post photos of the flange if useful.",
      notes: [
        { feature: 'Specification dump', quote: '2009 Focus, 1.6 petrol, 130k.', note: 'A noun phrase with no verb, because the audience can parse it faster that way.' },
        { feature: 'Pre-empting the reply', quote: 'Before anyone says it', note: 'The writer models a specific hostile reader. Generated posts address a generic one.' },
        { feature: 'Self-mockery in parentheses', quote: 'I know, I know', note: 'An admission of a decision the writer already regrets.' },
        { feature: 'Preference for correction', quote: "I'd rather be told I'm wrong", note: 'The post states what would count as a useful answer.' }
      ] },

    { id: 'teacher-feedback', register: 'Marking feedback', title: 'Comments on a first-year essay',
      context: 'Written in the margin and at the end of a submitted essay.',
      text:
"Your third paragraph is the essay. Everything before it is you clearing your throat — the first page and a half could go and you would lose nothing but the word count.\n\nYou assert on p.4 that the reforms \"failed\". Failed against what? Their stated aim, the aim their critics assigned them, or the outcome you would have preferred? Pick one and say which. This is not pedantry; the whole disagreement in the literature sits in that gap.\n\nThe Hollis material is well handled and you clearly read it rather than reading about it. More of that.\n\nProofread. You have written \"principle\" for \"principal\" four times and it makes a careful argument look careless.\n\n64. Good, and annoying, because 70 was available.",
      notes: [
        { feature: 'Diagnosis before instruction', quote: 'Your third paragraph is the essay.', note: 'The strongest sentence comes first and the rest of the note explains it.' },
        { feature: 'Question stack', quote: 'Failed against what?', note: 'Three alternatives offered, then a demand. Generated feedback asks open questions and stops.' },
        { feature: 'Praise made falsifiable', quote: 'you clearly read it rather than reading about it', note: 'Specific enough that the student could dispute it.' },
        { feature: 'Grade with an emotion attached', quote: 'Good, and annoying', note: 'The marker’s own frustration is on the page.' }
      ] },

    { id: 'travel-note', register: 'Travel notebook', title: 'Ferry, second morning',
      context: 'Written in a notebook on a boat, in pencil.',
      text:
"Slept badly, four hours maybe, on a bench seat with my bag as a pillow. The engine noise gets into your teeth.\n\nBreakfast was an orange and a very bad coffee from a machine that took three attempts and my last coin. The woman behind me in the queue laughed at the machine, not at me, and then we both laughed at it, and that was the entire conversation because neither of us had a language in common.\n\nCoast on the left since about six. Low, brown, further away than I expected. I keep taking photographs of it and they are all the same photograph.\n\nDock at two, allegedly.",
      notes: [
        { feature: 'Physical unpleasantness reported flatly', quote: 'The engine noise gets into your teeth.', note: 'Sensory detail with no adjective doing the work of the verb.' },
        { feature: 'Careful social correction', quote: 'laughed at the machine, not at me', note: 'The writer clarifies a distinction that mattered to her and to nobody else.' },
        { feature: 'Observation about her own behaviour', quote: 'they are all the same photograph', note: 'Self-aware, deflating, and not built towards.' },
        { feature: 'Single-word scepticism', quote: 'allegedly', note: 'The whole attitude to the schedule sits in the last word.' }
      ] },

    { id: 'legal-note', register: 'Legal drafting note', title: 'On clause 14.2',
      context: 'A note from a solicitor to a client alongside a marked-up contract.',
      text:
"Clause 14.2 as drafted lets them terminate for convenience on thirty days' notice. You cannot. That asymmetry may be acceptable to you — it often is, on a first contract with a large counterparty — but you should be choosing it rather than discovering it in eighteen months.\n\nIf you want to push, the cheapest ask is a matching right for you after the first twelve months. In my experience that is granted about half the time and costs nothing to ask for.\n\nThe indemnity at 19 is uncapped. I would not sign this. Not \"I would negotiate it\" — I would not sign it. An uncapped indemnity on a contract worth £60,000 a year is not a commercial risk, it is an open question about your house.\n\nI have marked three other points in the document. They are drafting tidiness and I would not spend goodwill on them.",
      notes: [
        { feature: 'Two-word paragraph pivot', quote: 'You cannot.', note: 'Placed alone after a long sentence, so the contrast does the arguing.' },
        { feature: 'Priced advice', quote: 'costs nothing to ask for', note: 'The recommendation includes its own cost-benefit, briefly.' },
        { feature: 'Self-quotation to sharpen', quote: 'Not "I would negotiate it" — I would not sign it.', note: 'The writer corrects a weaker version of her own sentence in public.' },
        { feature: 'Explicit de-prioritisation', quote: 'I would not spend goodwill on them', note: 'Human advice ranks its own items. Generated advice presents them as equally weighted.' }
      ] },

    { id: 'fiction', register: 'Fiction', title: 'The last of the milk',
      context: 'Opening of a short story.',
      text:
"There was an inch of milk left and two of them, so Ivo made the tea weak and did not mention it.\n\nHis father sat where he always sat, at the end of the table nearest the door, in the chair with the mended leg. He had his coat on indoors again. That was the third day.\n\n\"You're up early,\" his father said, to a man who had not been to bed.\n\n\"Couldn't sleep.\"\n\n\"No.\"\n\nThe kettle ticked as it cooled. Outside, somebody was scraping a windscreen, and the sound came through the wall in bursts, like something being sawn badly.\n\nIvo put the cup down within his father's reach but not in front of him, which was a thing he had learned to do in the spring and had never once been thanked for.",
      notes: [
        { feature: 'Withheld information', quote: 'did not mention it', note: 'The reader is told an action was omitted, not what it means.' },
        { feature: 'Detail as signal', quote: 'He had his coat on indoors again. That was the third day.', note: 'A symptom is counted rather than diagnosed.' },
        { feature: 'Dialogue that refuses to explain', quote: '"No."', note: 'A one-word line answering a statement that was not a question.' },
        { feature: 'Deferred emotional weight', quote: 'had never once been thanked for', note: 'The paragraph’s meaning arrives in a subordinate clause at the very end.' }
      ] },

    { id: 'apology', register: 'Personal apology', title: 'About Saturday',
      context: 'Sent as a long message, then not followed up.',
      text:
"I've started this four times.\n\nI was wrong on Saturday, and I've spent since then trying to find a version where I was only a bit wrong, and there isn't one. You told me something in confidence in March and I repeated it in a room with six people in it because I wanted the story to land. That's the whole thing. There's no context that makes it better.\n\nI'm not going to explain why I did it, because the explanation is just me asking you to feel sorry for me, and that's not what you need this week.\n\nI'll do whatever's useful. If what's useful is nothing, or distance, I'll take that. I'd rather you were angry with me than polite.",
      notes: [
        { feature: 'Process admitted', quote: "I've started this four times.", note: 'The difficulty of writing is itself the first piece of evidence.' },
        { feature: 'The offence stated plainly', quote: 'I repeated it in a room with six people in it', note: 'Named without euphemism. Generated apologies describe categories of harm, not events.' },
        { feature: 'Refused move, named', quote: "I'm not going to explain why I did it", note: 'The writer declines a rhetorical move and says what it would have done.' },
        { feature: 'Costly offer', quote: "I'd rather you were angry with me than polite", note: 'The closing line asks for something that will hurt.' }
      ] },

    { id: 'release-notes', register: 'Release notes', title: 'v4.2.0',
      context: 'Published to a changelog by the maintainer of a small open-source library.',
      text:
"**Breaking:** `parse()` no longer accepts a bare string. Pass `{ source: str }`. This was flagged in 4.1 with a deprecation warning that, judging by the issue tracker, roughly nobody saw. Sorry. The codemod in `scripts/upgrade-4.2.js` handles the common cases.\n\n**Fixed:** timezone handling on dates before 1970, which has been quietly wrong since the first release. If you were parsing historical dates, your output has changed and it is now correct. Thanks to @ndl for the extremely patient bug report.\n\n**Fixed:** memory leak in the streaming reader when the consumer aborts mid-chunk.\n\n**Added:** `strict` option. Off by default. It will be on by default in 5.0.\n\nNo new features beyond that. Most of this cycle went on tests — coverage is up from 61% to 88%, which is less exciting than a feature and considerably more useful.",
      notes: [
        { feature: 'Fault acknowledged', quote: 'roughly nobody saw. Sorry.', note: 'The maintainer takes responsibility for a communication failure inside a technical document.' },
        { feature: 'Bug aged honestly', quote: 'quietly wrong since the first release', note: 'The duration of the mistake is volunteered.' },
        { feature: 'Credit by name', quote: 'Thanks to @ndl', note: 'Real documents point at real people.' },
        { feature: 'Anti-climax as the close', quote: 'less exciting than a feature and considerably more useful', note: 'Ends by lowering expectations. Marketing prose does the reverse.' }
      ] },

    { id: 'cover-letter', register: 'Cover letter', title: 'Application, assistant curator',
      context: 'Sent with a CV, second draft.',
      text:
"I am applying for the assistant curator post advertised on 2 June.\n\nI spent the last three years running the archive at Balfour House, which is a collection of about 9,000 items, no budget, and one part-time volunteer who is eighty-one and knows more than I do. In that time I catalogued 4,100 items, got the reading room open two days a week instead of by appointment, and doubled the number of school visits, mostly by ringing schools until they said yes.\n\nWhat I have not done is work with a collection this size or with a conservation team, and I would be learning that. I mention it because you will see it on my CV anyway.\n\nThe reason I want this particular post is the Rennick bequest. I wrote my dissertation on his Manchester period and have never seen the letters.\n\nI can be available from September.",
      notes: [
        { feature: 'Numbers instead of adjectives', quote: 'I catalogued 4,100 items', note: 'Achievement stated as a count that could be checked.' },
        { feature: 'Weakness volunteered', quote: 'What I have not done', note: 'Pre-empting the reader’s objection and explaining why it is being raised.' },
        { feature: 'Specific desire', quote: 'The reason I want this particular post is the Rennick bequest.', note: 'The one thing a generated letter cannot supply: an actual reason.' },
        { feature: 'Wry portrait of a colleague', quote: 'is eighty-one and knows more than I do', note: 'Affection smuggled into a professional document.' }
      ] },

    { id: 'sports', register: 'Match report', title: 'Second half undoes an hour of good work',
      context: 'Written for a club website by a supporter, unpaid, that evening.',
      text:
"For an hour this was comfortable. Then it was not, and the reasons are not complicated.\n\nWe went ahead on twelve through Okoye, who has now scored in four straight games and did nothing else all afternoon, which is fine, that is the arrangement with strikers.\n\nThe second goal should have come before half time. It did not, and you could feel the ground start to think about it.\n\nTheir equaliser was a mess — a short corner, a deflection off Bright's shin, and Marsh rooted. Nobody's fault, or everybody's. Six minutes later they were ahead, and this one was somebody's fault, and he knows.\n\nThree defeats in five now. It is not a crisis. It is also not nothing, and Saturday at Fleetwood has become the kind of fixture we would rather not have to talk about.",
      notes: [
        { feature: 'Structure stated then abandoned', quote: 'For an hour this was comfortable. Then it was not', note: 'Two clauses that set the whole shape of the report.' },
        { feature: 'Shared knowledge assumed', quote: 'that is the arrangement with strikers', note: 'A generalisation offered to readers already inside the argument.' },
        { feature: 'Blame withheld deliberately', quote: "this one was somebody's fault, and he knows", note: 'The name is available and pointedly not used.' },
        { feature: 'Double negative as judgement', quote: 'It is not a crisis. It is also not nothing', note: 'Calibration by subtraction, which is very hard to fake.' }
      ] },

    { id: 'meeting-notes', register: 'Meeting notes', title: 'Ops sync, 14 May',
      context: 'Typed live during a call and circulated without cleanup.',
      text:
"Present: KL, DM, Sof, me. Ravi joined late (audio issues, gave up, typed in chat).\n\n- Migration is going ahead on the 2nd. DM unhappy about the date, said so twice, agreed anyway.\n- Blocker is still the read-replica lag. Sof to get numbers by Friday. If it's over 90s we push a week.\n- KL raised the on-call rota. Nobody wants to own this. Parked AGAIN.\n- Budget: no news, which KL says means no.\n\nActions\nSof — replica lag numbers, Fri\nme — draft comms for the 2nd, Weds, send to DM first\nKL — chase budget, whenever\n\n(Didn't catch the last five minutes, dog.)",
      notes: [
        { feature: 'Initials, not names', quote: 'Present: KL, DM, Sof, me.', note: 'Compression for an audience of four. Nothing is explained to outsiders.' },
        { feature: 'Political fact recorded', quote: 'DM unhappy about the date, said so twice, agreed anyway', note: 'The note captures a social dynamic that no summary would.' },
        { feature: 'Frustration in typography', quote: 'Parked AGAIN.', note: 'Emphasis by capitals, one word, from someone typing fast.' },
        { feature: 'Gap in the record admitted', quote: "(Didn't catch the last five minutes, dog.)", note: 'The document reports its own incompleteness and the reason, in three words.' }
      ] },

    { id: 'howto', register: 'Practical instructions', title: 'Bleeding a radiator, for someone who has never done it',
      context: 'Written down for a housemate and left on the fridge.',
      text:
"You need the little square key (in the drawer with the batteries) and an old towel.\n\nTurn the heating OFF first and let it cool for an hour, otherwise you get scalded, and I am not exaggerating for effect.\n\nTowel under the valve at the top corner. Key on, turn slowly anticlockwise, no more than a quarter turn. You'll hear hissing. That's the point. When water comes out instead of air, close it — and close it firmly but do not gorilla it, the brass is soft and I have already stripped one.\n\nDo the downstairs ones first, then upstairs. I don't fully know why but two plumbers have told me the same thing.\n\nCheck the boiler pressure after. It should be between 1 and 1.5. If it's under 1, top it up with the grey filling loop under the boiler, thirty seconds at a time.",
      notes: [
        { feature: 'Object located, not just named', quote: 'in the drawer with the batteries', note: 'Instructions written for one household in one house.' },
        { feature: 'Warning defended', quote: 'I am not exaggerating for effect', note: 'The writer anticipates being ignored.' },
        { feature: 'Invented verb', quote: 'do not gorilla it', note: 'Improvised vocabulary. Model prose almost never coins a word.' },
        { feature: 'Ignorance stated with sourcing', quote: "I don't fully know why but two plumbers have told me the same thing", note: 'A rule kept, a reason missing, and both reported.' }
      ] },

    { id: 'opinion', register: 'Opinion column', title: 'The bus station is not the problem',
      context: 'A column in a regional paper, 900 words, excerpt.',
      text:
"Every eighteen months somebody proposes demolishing the bus station, and every eighteen months the proposal is described as bold.\n\nIt is not bold. It is the easiest available idea. The bus station is ugly, everyone agrees it is ugly, and agreeing about it costs a councillor nothing.\n\nWhat is actually wrong with the town centre is that eleven of the forty-two units on Fore Street are empty, and have been for longer than the pandemic can be blamed for. Six are owned by the same pension fund, which has no particular incentive to let them at achievable rents while the book value holds up.\n\nDemolishing a bus station does not touch that. It produces a rendering with trees in it, a consultation, and a four-year hole.\n\nI would rather have the ugly building and eleven fewer empty shops. I appreciate this is not a rousing slogan.",
      notes: [
        { feature: 'Pattern named from experience', quote: 'Every eighteen months', note: 'Authority claimed by having watched the same thing repeat.' },
        { feature: 'Adjective attacked directly', quote: 'It is not bold. It is the easiest available idea.', note: 'The column argues with a word rather than a position.' },
        { feature: 'Specific counter-fact', quote: 'eleven of the forty-two units on Fore Street', note: 'Countable, local, and checkable by any reader who walks down it.' },
        { feature: 'Self-deprecating exit', quote: 'this is not a rousing slogan', note: 'The writer concedes the rhetorical weakness of their own conclusion.' }
      ] },

    { id: 'postcard', register: 'Postcard', title: 'From Sligo',
      context: 'The whole text, constrained by the size of the card.',
      text:
"Rain, obviously. We walked to the strand anyway and Cormac lost a shoe to the mud, one shoe, still not found.\n\nFood better than expected. Bed worse.\n\nSaw the tower you told us about. You were right, and I'm not saying that often, so keep the card.\n\nBack Tuesday. Will need a bath and a week.\n\nM x",
      notes: [
        { feature: 'Extreme compression', quote: 'Food better than expected. Bed worse.', note: 'Six words carrying two full assessments, with the verb dropped from the second.' },
        { feature: 'Detail repeated for comedy', quote: 'one shoe, still not found', note: 'The repetition is the joke and would be edited out of formal prose.' },
        { feature: 'Running argument referenced', quote: "I'm not saying that often, so keep the card", note: 'Depends entirely on a relationship the reader already has.' }
      ] },

    { id: 'safety-brief', register: 'Safety briefing', title: 'Before you go on the roof',
      context: 'Read out to contractors at the start of a shift, from notes.',
      text:
"Three things and then you can go.\n\nOne. The northeast corner is fibre-cement, not steel, and it will not hold you. It looks identical from above. It is the corner nearest the extractor, and if you are not sure which corner I mean, ask me, and I will not think less of you.\n\nTwo. Wind is forecast at 30 mph gusting 45 after two o'clock. We come down at two. Not at half past when you have finished the run. At two.\n\nThree. If the alarm sounds, you go to the yard, not the car park, because the car park is downwind of the tank.\n\nThat is it. Water is in the van. It is going to be hot, drink more than you want to.",
      notes: [
        { feature: 'Structure declared and kept', quote: 'Three things and then you can go.', note: 'Spoken instruction gives the shape first so listeners can track progress.' },
        { feature: 'Face-saving offer', quote: 'I will not think less of you', note: 'The briefing manages ego because ego is the actual hazard.' },
        { feature: 'Anticipated non-compliance', quote: 'Not at half past when you have finished the run.', note: 'The rule is restated against the exact excuse the speaker expects.' },
        { feature: 'Reason attached to arbitrary rule', quote: 'the car park is downwind of the tank', note: 'Rules with reasons survive contact with a tired crew.' }
      ] },

    { id: 'listing', register: 'Marketplace listing', title: 'Upright piano, free to collector',
      context: 'Posted locally with four photographs.',
      text:
"Free. It has to go by the 30th because the new owners move in on the 1st.\n\nIt is a Chappell upright, about 1930s I think, and it has not been tuned since roughly 2014. Two keys stick (F above middle C, and the C below it). One castor is missing and is in the stool, along with some sheet music nobody in this family can read.\n\nIt is extremely heavy. It took four men to get it in and it is on the first floor with a turn in the stairs. Please do not tell me you can manage it with your brother. The last person who said that gave up in the hall.\n\nCollection only, obviously. Photos are honest, including the ring mark.",
      notes: [
        { feature: 'Deadline with a cause', quote: 'because the new owners move in on the 1st', note: 'Urgency explained instead of asserted.' },
        { feature: 'Faults itemised precisely', quote: 'F above middle C, and the C below it', note: 'A seller who names the faults this exactly is telling the truth about the rest.' },
        { feature: 'Prior experience as warning', quote: 'The last person who said that gave up in the hall.', note: 'The listing has a history with its own readers.' },
        { feature: 'Pre-empted objection', quote: 'Photos are honest, including the ring mark.', note: 'Points at a flaw the reader has not yet noticed.' }
      ] },

    { id: 'thank-you', register: 'Thank-you note', title: 'For the fortnight in March',
      context: 'Handwritten, sent after a stay.',
      text:
"Thank you for having me, and thank you more for not asking how I was every morning. I know that was deliberate.\n\nI have thought a lot about the evening we didn't talk and just listened to the rain on that ridiculous conservatory roof. It was the first hour in about four months when my head was quiet.\n\nI've taken the blue mug. I'm sorry. I'll bring it back in June and you can decide then whether you want it.\n\nGive my love to Peter and tell him the bird book was a hit — I have identified precisely two birds and been wrong about one.",
      notes: [
        { feature: 'Gratitude for an omission', quote: 'thank you more for not asking', note: 'Thanks something that did not happen, which requires shared knowledge of what nearly did.' },
        { feature: 'Confession folded in', quote: "I've taken the blue mug. I'm sorry.", note: 'Register shifts from serious to domestic in one line break.' },
        { feature: 'Self-scoring joke', quote: 'identified precisely two birds and been wrong about one', note: 'The count makes the joke; the phrasing undercuts the compliment it delivers.' }
      ] }
  ];

  var REGISTER_ORDER = CORPUS.map(function (s) { return s.register; })
    .filter(function (r, i, a) { return a.indexOf(r) === i; });

  HW.corpus = {
    samples: CORPUS,
    registers: REGISTER_ORDER,
    get: function (id) {
      for (var i = 0; i < CORPUS.length; i++) {
        if (CORPUS[i].id === id) return CORPUS[i];
      }
      return null;
    }
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
