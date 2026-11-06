/* Přesměrování starých adres WordPressu na nové stránky, aby nezmizely
   pozice ve vyhledávačích ani odkazy z jiných webů.
   GitHub Pages neumí serverové přesměrování (301), proto se pro každou
   starou adresu vyrobí malá stránka /stara-adresa/ (index.html), která
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

/* [stará adresa, nová adresa]. Nové adresy jsou od kořene webu. */
const staticke = [
  ["o-mne/vzdelani", "/o-mne/#vzdelani"],
  ["nase-lekce", "/lekce/"],
  ["rozvrh-lekci", "/rozvrh/"],
  ["nase-studio", "/studio/"],
  ["o-joze", "/abeceda-pozic/"],
  ["akce", "/kurzy/"],
  ["newsletter", "/#newsletter"],
  ["stranky", "/"],
  ...lekce.map((l) => [l.stary, `/${l.slug}/`]),
  ...pozice.map((p) => [`abeceda-pozic/${p.stary}`, `/${p.slug}/`])
];

/* Relativní cesta ze /a/b/ zpět do kořene: "../../". Relativní odkaz
   funguje i v testovací kopii v podsložce (basePath). */
const doKorene = (cesta) => "../".repeat(cesta.split("/").length);

const polozka = (z, na) => ({
  z,
  cil: na,
  na: doKorene(z) + na.slice(1),
  kanonicka: site.url + na.split("#")[0]
});

export default async function () {
  const polozky = staticke.map(([z, na]) => polozka(z, na));

  const wp = await (await import("./wp.js")).default();
  for (const p of [...wp.detaily, ...wp.videa]) {
    const z = p.typ === "blog" ? `${p.datum.slice(0, 10).replaceAll("-", "/")}/${p.slug}` : `${p.typ}/${p.slug}`;
    polozky.push(polozka(z, p.url || "/videa/"));
  }

  /* Stará adresa, která je zároveň novou (/kontakt/, /cenik/, /o-mne/…),
     přesměrování nepotřebuje – stránka na ní rovnou je. */
  return polozky.filter((r) => `/${r.z}/` !== r.cil);
}
