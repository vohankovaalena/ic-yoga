/* Přesměrování starých adres WordPressu na nové stránky, aby nezmizely
   pozice ve vyhledávačích ani odkazy z jiných webů.
   GitHub Pages neumí serverové přesměrování (301), proto se pro každou
   starou adresu vyrobí malá stránka /stara-adresa/index.html, která
   prohlížeč i vyhledávač pošle dál (meta refresh + canonical).

   Až bude WordPress na vlastní subdoméně (site.json → wpUrl), přidají se
   automaticky i přesměrování článků, kurzů, pobytů a videí. */
import { readFileSync } from "node:fs";

const nacti = (soubor) =>
  JSON.parse(readFileSync(new URL(soubor, import.meta.url), "utf8"));

const site = nacti("./site.json");
const lekce = nacti("./lekce.json");
const pozice = nacti("./pozice.json");

const staticke = [
  ["o-mne", "o-mne.html"],
  ["o-mne/vzdelani", "o-mne.html#vzdelani"],
  ["nase-lekce", "lekce.html"],
  ["rozvrh-lekci", "rozvrh.html"],
  ["cenik", "cenik.html"],
  ["nase-studio", "studio.html"],
  ["kontakt", "kontakt.html"],
  ["videa", "videa.html"],
  ["o-joze", "abeceda-pozic.html"],
  ["kurzy", "kurzy.html"],
  ["pobyty", "pobyty.html"],
  ["akce", "kurzy.html"],
  ["abeceda-pozic", "abeceda-pozic.html"],
  ["newsletter", "index.html#newsletter"],
  ["stranky", "index.html"],
  ...lekce.map((l) => [l.stary, `${l.slug}.html`]),
  ...pozice.map((p) => [`abeceda-pozic/${p.stary}`, `${p.slug}.html`])
];

/* Relativní cesta ze /a/b/ zpět do kořene: "../../". */
const doKorene = (cesta) => "../".repeat(cesta.split("/").length);

export default async function () {
  const polozky = staticke.map(([z, na]) => ({
    z,
    na: doKorene(z) + na,
    kanonicka: `${site.url}/${na.split("#")[0]}`
  }));

  const wpUrl = site.wpUrl.replace(/\/$/, "");
  if (wpUrl !== site.url) {
    /* WordPress už neběží na hlavní doméně: staré adresy obsahu z WP
       (blog, články, kurzy, pobyty, videa) pošleme na novou adresu. */
    const wp = await (await import("./wp.js")).default();
    const obsah = [...wp.clanky, ...wp.kurzy, ...wp.pobyty, ...wp.videa];
    const cesty = new Set(["blog"]);
    for (const p of obsah) {
      const cesta = new URL(p.odkaz).pathname.replace(/^\/|\/$/g, "");
      if (cesta) cesty.add(cesta);
    }
    for (const cesta of cesty) {
      polozky.push({ z: cesta, na: `${wpUrl}/${cesta}/`, kanonicka: `${wpUrl}/${cesta}/` });
    }
  }
  return polozky;
}
