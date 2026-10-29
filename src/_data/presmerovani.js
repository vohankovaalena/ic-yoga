/* Přesměrování starých adres WordPressu na nové stránky, aby nezmizely
   pozice ve vyhledávačích ani odkazy z jiných webů.
   GitHub Pages neumí serverové přesměrování (301), proto se pro každou
   starou adresu vyrobí malá stránka /stara-adresa/index.html, která
   prohlížeč i vyhledávač pošle dál (meta refresh + canonical).

   Staré adresy obsahu z WordPressu se skládají podle schématu původního
   webu (/kurzy/slug/, /pobyty/slug/, /videa/slug/, články /rok/měsíc/den/slug/).
   Platí pro příspěvky, které se do nového WP přenesly se stejným slugem a datem. */
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
  ["blog", "blog.html"],
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

  const wp = await (await import("./wp.js")).default();
  for (const p of [...wp.detaily, ...wp.videa]) {
    const z = p.typ === "blog" ? `${p.datum.slice(0, 10).replaceAll("-", "/")}/${p.slug}` : `${p.typ}/${p.slug}`;
    const na = p.url || "videa.html";
    polozky.push({ z, na: doKorene(z) + na, kanonicka: `${site.url}/${na}` });
  }
  return polozky;
}
