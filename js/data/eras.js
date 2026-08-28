/* Canonical era registry — every record in the archive carries one of these ids. */
window.DB = window.DB || {};

DB.eras = [
  { id: "predebut", name: "Pre-Debut", years: "1997–2016", color: "#8f8f8f",
    desc: "Buriram, We Zaa Cool, the 2010 audition, five trainee years, Ringa Linga." },
  { id: "debut", name: "Debut", years: "2016–2017", color: "#ff6fa5",
    desc: "Square One to As If It's Your Last — the maknae the cameras found first." },
  { id: "iya", name: "In Your Area", years: "2018–2019", color: "#ff4d4d",
    desc: "DDU-DU DDU-DU, Kill This Love, the first world tour, Coachella 2019." },
  { id: "thealbum", name: "The Album", years: "2020", color: "#9db8d2",
    desc: "How You Like That, Ice Cream, the first full album in a year without stages." },
  { id: "lalisa", name: "Lalisa", years: "2021", color: "#C8B273",
    desc: "The solo rupture — throne, gold, Money, and a Guinness plaque." },
  { id: "bornpink", name: "Born Pink", years: "2022–2023", color: "#FF2D7B",
    desc: "Pink Venom, Shut Down, a stadium world tour, Coachella headline, Crazy Horse." },
  { id: "lloud", name: "LLOUD", years: "2024", color: "#d43c2f",
    desc: "Independence: her own company, RCA, Rockstar, the VMAs, Victoria's Secret." },
  { id: "alterego", name: "Alter Ego", years: "2024–2025", color: "#8e7cc3",
    desc: "Five personas, a Billboard 200 top-ten album, The White Lotus, the Oscars stage." },
  { id: "deadline", name: "Deadline", years: "2025–2026", color: "#59b0ff",
    desc: "The group's stadium return — Goyang to Wembley to Kai Tak." },
  { id: "pressplay", name: "Press Play", years: "2026–", color: "#F4F1EA",
    desc: "Bad Angel, Goals, a World Cup ceremony, Sawadika, and a Las Vegas residency." },
];

DB.eraById = {};
DB.eras.forEach(function (e) { DB.eraById[e.id] = e; });

/* Timeline / record category colors */
DB.categories = {
  origin:    { name: "Origin",    color: "#8f8f8f" },
  group:     { name: "BLACKPINK", color: "#FF2D7B" },
  solo:      { name: "Solo",      color: "#C8B273" },
  fashion:   { name: "Fashion",   color: "#F4F1EA" },
  acting:    { name: "Acting",    color: "#8e7cc3" },
  brand:     { name: "Brand",     color: "#A7A7A7" },
  live:      { name: "Live",      color: "#E03131" },
  milestone: { name: "Milestone", color: "#ffffff" },
};
