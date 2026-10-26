/* Obsah, který Iva dál spravuje ve WordPressu: kurzy, pobyty, videa a blog.
   Při každém sestavení webu se stáhne z RSS kanálů WordPressu (adresa
   je v site.json → wpUrl). GitHub Actions web přestaví každé ráno.

   Když WordPress neodpovídá, sestavení nespadne: sekce zůstanou prázdné
   a stránky místo výpisu ukážou odkaz na WordPress. */
import { readFileSync } from "node:fs";

const nacti = (soubor) =>
  JSON.parse(readFileSync(new URL(soubor, import.meta.url), "utf8"));

const site = nacti("./site.json");
/* Rozdělení článků blogu: blog.json vyjmenovává adresy (poslední část URL)
   zážitků z cest a skrytých článků, všechno ostatní patří do „O józe“. */
const blog = nacti("./blog.json");
const WP = site.wpUrl.replace(/\/$/, "");
const TIMEOUT = 20000;

/* Parametr navíc obejde případnou cache WordPressu, takže se nový
   pobyt načte hned po zveřejnění. Jen u adres bez jiných parametrů:
   u ?paged=2 by WordPress s dalším parametrem přesměrovával dokola. */
const BEZ_CACHE = `v=${Date.now()}`;

async function stahni(url) {
  try {
    const res = await fetch(url.includes("?") ? url : `${url}?${BEZ_CACHE}`, {
      headers: { "User-Agent": "ic-yoga-web (Eleventy build)" },
      signal: AbortSignal.timeout(TIMEOUT)
    });
    if (!res.ok) return "";
    return await res.text();
  } catch (err) {
    console.warn(`[wp] ${url} se nepodařilo stáhnout: ${err.message}`);
    return "";
  }
}

const ENTITY = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", ndash: "–", mdash: "—" };
function dekoduj(s = "") {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITY[n.toLowerCase()] ?? m);
}
const bezTagu = (s = "") => dekoduj(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const znacka = (xml, tag) => (xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)) || [])[1] || "";

function zkrat(text, max = 200) {
  const t = text.replace(/\s*\[…\]\s*$|\s*\[\.\.\.\]\s*$/, "").trim();
  if (t.length <= max) return t;
  return t.slice(0, t.lastIndexOf(" ", max)) + "…";
}

/* Z výpisové stránky WordPressu vytáhne náhledový obrázek ke každému odkazu
   (RSS obrázky neobsahuje). */
function nahledy(html) {
  const mapa = {};
  for (const blok of html.split(/<article\b/).slice(1)) {
    const odkaz = (blok.match(/href="(https?:\/\/[^"]+)"/) || [])[1];
    const img = blok.match(/<img\b[^>]*>/);
    if (!odkaz || !img) continue;
    const src = (img[0].match(/\s(?:data-src|src)="([^"]+)"/) || [])[1];
    if (src && !src.startsWith("data:")) mapa[odkaz] = src;
  }
  return mapa;
}

function polozky(xml) {
  return (xml.match(/<item>[\s\S]*?<\/item>/g) || []).map((it) => {
    const obsah = dekoduj(znacka(it, "content:encoded"));
    const youtube = (obsah.match(/(?:youtube(?:-nocookie)?\.com\\?\/(?:embed\\?\/|watch\?v=)|youtu\.be\\?\/)([\w-]{11})/) || [])[1] || "";
    return {
      nazev: bezTagu(znacka(it, "title")),
      odkaz: bezTagu(znacka(it, "link")),
      datum: new Date(bezTagu(znacka(it, "pubDate"))).toISOString(),
      perex: zkrat(bezTagu(znacka(it, "description"))),
      youtube
    };
  });
}

async function sekce(typ, archiv, stranek = 1) {
  const kanaly = await Promise.all(
    Array.from({ length: stranek }, (_, i) =>
      stahni(`${WP}${typ ? `/${typ}` : ""}/feed/${i ? `?paged=${i + 1}` : ""}`)
    )
  );
  const archivy = await Promise.all(
    Array.from({ length: stranek }, (_, i) =>
      stahni(`${WP}/${archiv}/${i ? `page/${i + 1}/` : ""}`)
    )
  );
  const obrazky = Object.assign({}, ...archivy.map(nahledy));
  const videne = new Set();
  return kanaly
    .flatMap(polozky)
    .filter((p) => p.odkaz && !videne.has(p.odkaz) && videne.add(p.odkaz))
    .map((p) => ({ ...p, obrazek: obrazky[p.odkaz] || "" }));
}

export default async function () {
  const [kurzy, pobyty, videa, clanky] = await Promise.all([
    sekce("kurzy", "kurzy"),
    sekce("pobyty", "pobyty"),
    sekce("videa", "videa", 3),
    sekce("", "blog", 3)
  ]);
  console.log(
    `[wp] kurzy ${kurzy.length}, pobyty ${pobyty.length}, videa ${videa.length}, články ${clanky.length}`
  );
  const adresa = (p) => new URL(p.odkaz).pathname.split("/").filter(Boolean).pop();
  const viditelne = clanky.filter((p) => !blog.skryte.includes(adresa(p)));
  return {
    url: WP,
    kurzy,
    pobyty,
    videa,
    clanky,
    oJoze: viditelne.filter((p) => !blog.zazitkyZCest.includes(adresa(p))),
    zazitkyZCest: viditelne.filter((p) => blog.zazitkyZCest.includes(adresa(p)))
  };
}
