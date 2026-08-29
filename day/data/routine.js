/*
 * routine.js — the day itself.
 *
 * One record per block. The scheduler in js/schedule.js reads nothing but this,
 * so changing the day means editing this file and nothing else.
 *
 * Fields
 *   minutes     nominal length
 *   min         shortest acceptable length (elastic blocks only)
 *   elastic     stretch to fill the time up to `finishBy` instead of running
 *               for a fixed length
 *   after       ids that must finish first
 *   startWithin {of, minutes} — start no later than this long after `of` ends
 *   notBefore   'HH:MM', or {sun:'sunset', offset} — cannot start earlier
 *   finishBy    'HH:MM', or {sun:'sunset', offset} — must be over by then
 *   hard        a missed `finishBy` is a conflict rather than a nudge
 *   sooner      earlier is better; the plan scores how much earlier it got
 *   when        'pray' | 'walk' | 'out' — only present when that option is on
 */
(function (root) {
  'use strict';

  var DAY = (root.DAY = root.DAY || {});

  DAY.routine = {
    /* Everything hangs off this; the app lets you move it. */
    defaults: {
      wake: '07:00',
      midday: 'both',      // 'pray' | 'walk' | 'both'
      goingOut: false,
      workoutMinutes: 30,
      lat: 40.7128,
      lng: -74.006,
      place: 'New York'
    },

    blocks: [
      {
        id: 'wake',
        label: 'Wake up',
        note: 'The one time everything else is measured from.',
        minutes: 0,
        kind: 'anchor',
        anchor: 'wake'
      },
      {
        id: 'ready',
        label: 'Get ready',
        note: 'Out of bed and into the day. Starts within half an hour of waking — that half hour is the whole rule.',
        minutes: 30,
        after: ['wake'],
        startWithin: { of: 'wake', minutes: 30 },
        hard: true,
        kind: 'routine'
      },
      {
        id: 'pray',
        label: 'Pray',
        note: 'Done by two in the afternoon. Not started by two — finished.',
        minutes: 20,
        after: ['ready'],
        finishBy: '14:00',
        hard: true,
        when: 'pray',
        kind: 'anchorpoint'
      },
      {
        id: 'walk',
        label: 'Walk',
        note: 'Outside, on the ground, before the light goes. Earlier is better than later.',
        minutes: 45,
        after: ['ready', 'pray'],
        finishBy: { sun: 'sunset', offset: 0 },
        hard: true,
        sooner: true,
        when: 'walk',
        kind: 'body'
      },
      {
        id: 'eat',
        label: 'Back home, eat',
        note: 'Come back, put something real on a plate.',
        minutes: 40,
        after: ['ready', 'pray', 'walk'],
        kind: 'routine'
      },
      {
        id: 'out',
        label: 'Out',
        note: 'The errand, the appointment, the somewhere-else. Off by default; switching it on eats the afternoon and the plan will say so.',
        minutes: 90,
        after: ['eat'],
        when: 'out',
        kind: 'routine'
      },
      {
        id: 'work',
        label: 'Work — code, ship, tweet',
        note: 'The long block. Runs from the plate to half six, whatever that leaves.',
        minutes: 240,
        min: 60,
        elastic: true,
        after: ['eat', 'out'],
        finishBy: '18:30',
        hard: true,
        kind: 'work'
      },
      {
        id: 'recite',
        label: 'Recite, read',
        note: 'Half six. Put the screen down.',
        minutes: 40,
        after: ['work'],
        notBefore: '18:30',
        kind: 'quiet'
      },
      {
        id: 'dusk',
        label: 'Read a little',
        note: 'After the sun is down. Short — it is a second sitting, not a second shift.',
        minutes: 25,
        after: ['recite'],
        notBefore: { sun: 'sunset', offset: 0 },
        kind: 'quiet'
      },
      {
        id: 'productive',
        label: 'Tweet, something productive',
        note: 'Loose block. Anything that counts as made rather than consumed.',
        minutes: 45,
        after: ['dusk'],
        kind: 'work'
      },
      {
        id: 'workout',
        label: 'Workout',
        note: 'Sit-ups, push-ups, dumbbells, a bit of weight. Thirty honest minutes, finished by 22:24.',
        minutes: 30,
        after: ['productive'],
        finishBy: '22:24',
        hard: true,
        kind: 'body',
        checklist: ['Sit-ups', 'Push-ups', 'Dumbbells', 'Weight']
      },
      {
        id: 'free',
        label: 'Free',
        note: 'Nothing is scheduled here on purpose. That is the point of the rest of it.',
        minutes: 60,
        min: 0,
        elastic: true,
        after: ['workout'],
        finishBy: '23:59',
        kind: 'free'
      }
    ]
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
