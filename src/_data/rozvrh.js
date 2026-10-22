/* Rozvrh se nepíše ručně: skládá se z polí "rozvrh" v lekce.json.
   Změna času lekce = úprava jednoho řádku v lekce.json. */
import { readFileSync } from "node:fs";

const lekce = JSON.parse(
  readFileSync(new URL("./lekce.json", import.meta.url), "utf8")
);

const DNY = ["Pondělí", "Úterý", "Středa", "Čtvrtek", "Pátek", "Sobota", "Neděle"];
const DNY_SCHEMA = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const terminy = lekce.flatMap((l) =>
  l.rozvrh.map((t) => ({
    ...t,
    slug: l.slug,
    nazev: l.nazev,
    barva: l.barva,
    cas: `${t.od.replace(":", ".")}–${t.do.replace(":", ".")}`
  }))
);

const dny = DNY.map((nazev, i) => ({
  cislo: i + 1,
  nazev,
  schema: DNY_SCHEMA[i],
  lekce: terminy
    .filter((t) => t.den === i + 1)
    .sort((a, b) => a.od.localeCompare(b.od))
}));

/* Řádky tabulky po hodinách: lekce patří do hodiny, ve které začíná. */
const hodiny = [...new Set(terminy.map((t) => Number(t.od.slice(0, 2))))].sort((a, b) => a - b);
const radky = hodiny.map((h) => ({
  hodina: `${h}.00`,
  bunky: dny.map((d) => d.lekce.filter((t) => Number(t.od.slice(0, 2)) === h))
}));

export default {
  dny,
  dnySLekcemi: dny.filter((d) => d.lekce.length),
  radky,
  terminy
};
