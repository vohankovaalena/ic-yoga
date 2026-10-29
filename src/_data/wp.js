/* Obsah, který Iva spravuje ve WordPressu: blog, kurzy/akce, pobyty a videa.
   Jsou to běžné příspěvky rozdělené do rubrik. Při každém sestavení webu
   se stáhnou z WordPress REST API (adresa je v site.json → wpUrl). Web se
   přestaví po každé změně ve WP (plugin wordpress/ic-yoga-aktualizace-webu.php)
   a pojistkou každé ráno.

   Když WordPress neodpovídá, sestavení na GitHubu selže (web zůstane
   v předchozí verzi). Lokálně nespadne: sekce zůstanou prázdné a stránky
   ukážou náhradní text. */
import { readFileSync } from "node:fs";
import { parseHTML } from "linkedom";

const nacti = (soubor) =>
  JSON.parse(readFileSync(new URL(soubor, import.meta.url), "utf8"));

const site = nacti("./site.json");
/* Rozdělení článků blogu: blog.json vyjmenovává adresy (slug) zážitků
   z cest a skrytých článků, všechno ostatní patří do „O józe“. */
const blog = nacti("./blog.json");
const API = `${site.wpUrl.replace(/\/$/, "")}/wp-json/wp/v2`;
const TIMEOUT = 20000;

/* Rubriky ve WP (slug) → sekce webu. U každé: předpona stránek detailu
   (kurz-….html) a kam vede drobečková navigace. Videa detail nemají. */
const RUBRIKY = {
  blog: { slug: "blog", stranka: "clanek", sekce: { nazev: "Blog", odkaz: "blog.html" } },
  kurzy: { slug: "kurzy_akce", stranka: "kurz", sekce: { nazev: "Kurzy a akce", odkaz: "kurzy.html" } },
  pobyty: { slug: "pobyty", stranka: "pobyt", sekce: { nazev: "Pobyty", odkaz: "pobyty.html" } },
  videa: { slug: "videa" }
};

/* Všechny položky z adresy API, po stránkách po 100 (víc API nevrátí). */
async function stahni(cesta) {
  const polozky = [];
  for (let strana = 1, stran = 1; strana <= stran; strana++) {
    const res = await fetch(`${API}/${cesta}&per_page=100&page=${strana}`, {
      headers: { "User-Agent": "ic-yoga-web (Eleventy build)" },
      signal: AbortSignal.timeout(TIMEOUT)
    });
    if (!res.ok) throw new Error(`${cesta} → HTTP ${res.status}`);
    stran = Number(res.headers.get("X-WP-TotalPages")) || 1;
    polozky.push(...(await res.json()));
  }
  return polozky;
}

/* Úvodní obrázky příspěvků: id → { medium, full, alt }.
   Ve výpisu stačí střední velikost (768 px), menší obrázek WP nezmenšuje. */
async function obrazky(prispevky) {
  const ids = [...new Set(prispevky.map((p) => p.featured_media).filter(Boolean))];
  const mapa = {};
  for (let i = 0; i < ids.length; i += 100) {
    const media = await stahni(`media?include=${ids.slice(i, i + 100)}&_fields=id,source_url,alt_text,media_details`);
    for (const m of media) {
      mapa[m.id] = {
        full: m.source_url,
        medium: m.media_details?.sizes?.medium_large?.source_url || m.source_url,
        alt: m.alt_text
      };
    }
  }
  return mapa;
}

const dokument = (html = "") =>
  parseHTML(`<!doctype html><html><body>${html}</body></html>`).document;

/* HTML → čistý text (s dekódovanými entitami). Za konec bloku přidá
   mezeru, aby se slova ze sousedních odstavců neslepila. */
const naText = (html = "") =>
  dokument(html.replace(/<\/(p|h\d|li|div)>|<br\s*\/?>/gi, "$& ")).body
    .textContent.replace(/\s+/g, " ").trim();

function zkrat(text, max = 200) {
  const t = text.replace(/\s*\[…\]\s*$/, "").trim();
  return t.length <= max ? t : t.slice(0, t.lastIndexOf(" ", max)) + "…";
}

/* Obsah z editoru WP: ponechá jen základní značky textu, odkazy, obrázky
   a iframy (YouTube, přihlašovací Google Formuláře). Třídy a styly WP pryč. */
const POVOLENE = new Set(["H1", "H2", "H3", "H4", "H5", "H6", "P", "UL", "OL", "LI", "A", "STRONG", "EM", "B", "I", "BR", "IMG", "IFRAME", "FIGURE", "FIGCAPTION", "BLOCKQUOTE"]);
const ZAHODIT = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "SVG", "FORM", "BUTTON", "INPUT", "SELECT", "TEXTAREA"]);
const ATRIBUTY = {
  A: ["href", "target", "rel"],
  IMG: ["src", "alt", "width", "height"],
  IFRAME: ["src", "width", "height", "title", "allow", "allowfullscreen"]
};
const BEZPECNE = { href: /^(https?:|mailto:|tel:|#)/i, src: /^https:/i };

function vycisti(html) {
  const koren = dokument(html).body;
  (function projdi(uzel) {
    for (const el of [...uzel.childNodes]) {
      if (el.nodeType === 3) continue; // text
      if (el.nodeType !== 1 || ZAHODIT.has(el.tagName.toUpperCase())) { el.remove(); continue; }
      projdi(el);
      if (!POVOLENE.has(el.tagName)) { el.replaceWith(...el.childNodes); continue; }
      const nechat = ATRIBUTY[el.tagName] || [];
      for (const { name, value } of [...el.attributes]) {
        if (!nechat.includes(name) || (BEZPECNE[name] && !BEZPECNE[name].test(value.trim()))) el.removeAttribute(name);
      }
      if (el.tagName === "A" && el.getAttribute("target")) el.setAttribute("rel", "noopener");
    }
  })(koren);

  koren.querySelectorAll("img:not([src]), iframe:not([src])").forEach((el) => el.remove());
  koren.querySelectorAll("p, h1, h2, h3, h4, h5, h6").forEach((el) => {
    if (!el.textContent.replace(/ /g, " ").trim() && !el.querySelector("img, iframe")) el.remove();
  });
  koren.querySelectorAll("img").forEach((el) => { el.setAttribute("loading", "lazy"); el.setAttribute("decoding", "async"); });
  koren.querySelectorAll("iframe").forEach((el) => { el.textContent = ""; el.setAttribute("loading", "lazy"); });
  return koren.innerHTML.replace(/\n\s*\n+/g, "\n").trim();
}

/* Datum, čas a cena kurzu jsou jen v textu titulku a obsahu
   (date je datum zveřejnění příspěvku, ne konání akce). */
function kurz(titulek, text) {
  const d = titulek.match(/(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
  const t = titulek.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
  const c = `${titulek} ${text}`.match(/Cena:\s*([\d\s]+),-\s*Kč/);
  return {
    datum: d ? `${d[3]}-${d[2].padStart(2, "0")}-${d[1].padStart(2, "0")}` : null,
    od: t ? t[1].padStart(5, "0") : null,
    do: t ? t[2].padStart(5, "0") : null,
    cena: c ? parseInt(c[1].replace(/\s/g, ""), 10) : null
  };
}

/* Odkaz na přihlášku: první vložený Google Formulář, bez ?embedded=true. */
function prihlaska(html) {
  const src = (html.match(/<iframe[^>]+src="(https:\/\/docs\.google\.com\/forms[^"]+)"/) || [])[1];
  if (!src) return null;
  const url = new URL(src.replace(/&amp;/g, "&"));
  url.searchParams.delete("embedded");
  return url.toString();
}

/* YouTube video z obsahu (blok Vložit/Embed nebo odkaz). */
const youtube = (html) =>
  (html.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/) || [])[1] || null;

/* Adresa detailu s předponou rubriky (kurz-…), ale bez zdvojení (pobyt-pobyt-…). */
const adresa = (predpona, slug) => (slug.startsWith(`${predpona}-`) ? slug : `${predpona}-${slug}`);

/* Příspěvek z API → jednotný tvar, se kterým pracují šablony. */
function polozka(typ, p, obrazek) {
  const nazev = naText(p.title.rendered);
  const html = p.content.rendered;
  const zaklad = {
    typ, slug: p.slug, nazev, datum: p.date, upraveno: p.modified,
    obrazek: obrazek && { ...obrazek, alt: obrazek.alt || nazev }
  };

  if (typ === "videa") {
    const id = youtube(html);
    return { ...zaklad, youtube: id, obrazek: zaklad.obrazek || (id && { medium: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` }) };
  }

  return {
    ...zaklad,
    url: `${adresa(RUBRIKY[typ].stranka, p.slug)}.html`,
    sekce: RUBRIKY[typ].sekce,
    perex: zkrat(naText(p.excerpt.rendered)),
    obsah: vycisti(html),
    kurz: typ === "kurzy" ? kurz(nazev, naText(html)) : null,
    prihlaska: prihlaska(html)
  };
}

/* Stáhne rubriky a jejich příspěvky (jedním dotazem) a roztřídí je.
   Příspěvek ve více rubrikách se objeví v každé z nich. */
async function nactiRubriky() {
  const rubriky = await stahni(`categories?slug=${Object.values(RUBRIKY).map((r) => r.slug)}&_fields=id,slug`);
  const idRubriky = Object.fromEntries(rubriky.map((r) => [r.slug, r.id]));
  for (const { slug } of Object.values(RUBRIKY)) {
    if (!idRubriky[slug]) console.warn(`[wp] ve WordPressu chybí rubrika „${slug}“`);
  }

  const prispevky = await stahni(`posts?categories=${rubriky.map((r) => r.id)}&_fields=id,slug,date,modified,title,excerpt,content,featured_media,categories`);
  const fotky = await obrazky(prispevky);
  return Object.fromEntries(Object.entries(RUBRIKY).map(([typ, { slug }]) => [
    typ,
    prispevky
      .filter((p) => p.categories.includes(idRubriky[slug]))
      .map((p) => polozka(typ, p, fotky[p.featured_media]))
  ]));
}

/* Kurzy podle data konání, bez data na konec. */
const podleTerminu = (a, b) => (a.kurz.datum || "9999").localeCompare(b.kurz.datum || "9999");

export default async function () {
  let rubriky;
  try {
    rubriky = await nactiRubriky();
  } catch (err) {
    /* Na GitHubu sestavení raději selže: zůstane online předchozí verze
       webu, místo aby se nasadila s prázdnými sekcemi. */
    if (process.env.CI) throw new Error(`[wp] obsah z WordPressu se nepodařilo stáhnout: ${err.message}`);
    console.warn(`[wp] obsah z WordPressu se nepodařilo stáhnout: ${err.message}`);
    rubriky = { blog: [], kurzy: [], pobyty: [], videa: [] };
  }
  const { blog: clanky, kurzy, pobyty, videa } = rubriky;
  kurzy.sort(podleTerminu);
  console.log(`[wp] články ${clanky.length}, kurzy ${kurzy.length}, pobyty ${pobyty.length}, videa ${videa.length}`);

  const viditelne = clanky.filter((p) => !blog.skryte.includes(p.slug));
  return {
    kurzy,
    pobyty,
    /* Video bez odkazu na YouTube nemá co přehrát. */
    videa: videa.filter((v) => v.youtube),
    oJoze: viditelne.filter((p) => !blog.zazitkyZCest.includes(p.slug)),
    zazitkyZCest: viditelne.filter((p) => blog.zazitkyZCest.includes(p.slug)),
    /* Všechno, co má vlastní stránku detailu (wp-detail.njk). */
    detaily: [...viditelne, ...kurzy, ...pobyty]
  };
}
