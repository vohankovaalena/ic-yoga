/* Práce s HTML obsahem příspěvků z WordPressu. Používá ho sestavení webu
   (src/_data/wp.js).
   Je mimo src/_data, protože Eleventy by z pojmenovaných exportů udělal data. */
import { parseHTML } from "linkedom";

export const dokument = (html = "") =>
  parseHTML(`<!doctype html><html><body>${html}</body></html>`).document;

/* HTML → čistý text (s dekódovanými entitami). Za konec bloku přidá
   mezeru, aby se slova ze sousedních odstavců neslepila. */
export const naText = (html = "") =>
  dokument(html.replace(/<\/(p|h\d|li|div)>|<br\s*\/?>/gi, "$& ")).body
    .textContent.replace(/\s+/g, " ").trim();

export function zkrat(text, max = 200) {
  const t = text.replace(/\s*\[…\]\s*$/, "").trim();
  return t.length <= max ? t : t.slice(0, t.lastIndexOf(" ", max)) + "…";
}

/* YouTube videa z obsahu (blok Vložit/Embed, odkaz, nebo nastavení videa
   v Elementoru, kde jsou lomítka zapsaná jako \/). Vrací ID bez duplicit. */
const YOUTUBE = /(?:youtube(?:-nocookie)?\.com\\?\/(?:embed\\?\/|watch\?v=|shorts\\?\/)|youtu\.be\\?\/)([\w-]{11})/g;
export const youtubeVsechna = (html = "") => [...new Set([...html.matchAll(YOUTUBE)].map((m) => m[1]))];
export const youtube = (html) => youtubeVsechna(html)[0] || null;

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

/* Odstraní odstavce a nadpisy bez textu (a bez obrázku či videa). */
export function bezPrazdnych(koren) {
  koren.querySelectorAll("p, h1, h2, h3, h4, h5, h6").forEach((el) => {
    if (!el.textContent.replace(/ /g, " ").trim() && !el.querySelector("img, iframe, .video")) el.remove();
  });
  return koren;
}

/* Vrací kořenový element s vyčištěným obsahem (pro další úpravy). */
export function vycistiDom(html) {
  const koren = dokument(html).body;
  const doc = koren.ownerDocument;

  /* Video widget Elementoru má odkaz jen v nastavení (data-settings),
     samotné video se vkládá až skriptem. Nahradí se odkazem v odstavci. */
  koren.querySelectorAll("[data-settings*='youtube']").forEach((el) => {
    const odstavce = youtubeVsechna(el.getAttribute("data-settings")).map((id) => {
      const p = doc.createElement("p");
      p.textContent = `https://youtu.be/${id}`;
      return p;
    });
    el.replaceWith(...odstavce);
  });

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
  /* Zalomení řádku mezi bloky (pozůstatek editoru) jen dělá mezery. */
  [...koren.children].filter((el) => el.tagName === "BR").forEach((el) => el.remove());
  bezPrazdnych(koren);
  koren.querySelectorAll("img").forEach((el) => { el.setAttribute("loading", "lazy"); el.setAttribute("decoding", "async"); });
  koren.querySelectorAll("iframe").forEach((el) => { el.textContent = ""; el.setAttribute("loading", "lazy"); });
  return koren;
}

/* Video z YouTube (vložený iframe nebo odstavec jen s odkazem) → přehrávač
   jako na stránce Videa: náhled a tlačítko, YouTube se načte až po kliknutí
   (main.js, [data-video]). Žádné cookies třetích stran předem. */
export function videa(koren, nazev = "Video") {
  const doc = koren.ownerDocument;
  const prehravac = (id) => {
    const div = doc.createElement("div");
    div.setAttribute("class", "video");
    div.setAttribute("data-video", id);
    div.setAttribute("data-title", nazev);
    div.innerHTML = `<img src="https://i.ytimg.com/vi/${id}/hqdefault.jpg" alt="" loading="lazy" decoding="async" width="480" height="360">`
      + `<button class="video__play" type="button"><span><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4l15 8-15 8z"/></svg></span>`
      + `<span class="visually-hidden">Přehrát video: ${nazev.replace(/[<&"]/g, "")}</span></button>`;
    return div;
  };

  /* Stejné video vložené v článku dvakrát (stává se v Elementoru) jen jednou. */
  const videne = new Set();
  const prehravace = (ids) => ids.filter((id) => !videne.has(id) && videne.add(id)).map(prehravac);

  for (const iframe of koren.querySelectorAll("iframe")) {
    const ids = youtubeVsechna(iframe.getAttribute("src"));
    if (ids.length) iframe.replaceWith(...prehravace(ids));
  }
  for (const p of koren.querySelectorAll("p")) {
    if (p.querySelector("img, iframe")) continue;
    const odkazy = [...p.querySelectorAll("a")].map((a) => a.getAttribute("href")).join(" ");
    const ids = youtubeVsechna(`${p.textContent} ${odkazy}`);
    const zbytek = p.textContent.replace(/https?:\/\/\S+/g, "").trim();
    if (ids.length && !zbytek) p.replaceWith(...prehravace(ids));
  }
  return koren;
}

/* Prvek, který obsahuje jen fotku (img, odkaz s fotkou, odstavec s fotkou). */
const jenFotka = (el) =>
  el.nodeType === 1 && (el.tagName === "IMG" || (el.children.length === 1 && el.textContent.trim() === "" && jenFotka(el.children[0])));
const mezera = (u) => (u.nodeType === 3 && !u.textContent.trim()) || (u.nodeType === 1 && u.tagName === "BR");

/* Víc fotek za sebou → mřížka (styl .galerie), jinak by šly pod sebou.
   Fotka v mřížce je oříznutá, odkaz ukáže celou. 2 nebo 4 fotky do dvou
   sloupců, ať v mřížce nezůstane díra. */
export function galerie(koren) {
  const doc = koren.ownerDocument;
  /* WordPress dává fotky vložené za sebou do jednoho odstavce s <br>. */
  koren.querySelectorAll("p").forEach((p) => {
    const uzly = [...p.childNodes];
    if (uzly.filter((u) => !mezera(u)).length >= 2 && uzly.every((u) => mezera(u) || jenFotka(u))) p.replaceWith(...uzly);
  });

  for (const rodic of [koren, ...koren.querySelectorAll("figure, blockquote, li")]) {
    let skupina = [];
    const uzavri = () => {
      const fotky = skupina.filter((u) => !mezera(u));
      if (fotky.length >= 2) {
        const mrizka = doc.createElement("div");
        mrizka.setAttribute("class", fotky.length === 2 || fotky.length === 4 ? "galerie galerie--2" : "galerie");
        fotky[0].before(mrizka);
        for (const u of skupina) {
          const img = !mezera(u) && (u.tagName === "IMG" ? u : u.querySelector("img"));
          if (img) {
            const a = doc.createElement("a");
            a.setAttribute("href", img.getAttribute("src"));
            a.append(img);
            mrizka.append(a);
          }
          if (u !== img) u.remove();
        }
      }
      skupina = [];
    };
    for (const u of [...rodic.childNodes]) {
      if (mezera(u) || jenFotka(u)) skupina.push(u);
      else uzavri();
    }
    uzavri();
  }
  return koren;
}

export const naHtml = (koren) => koren.innerHTML.replace(/\n\s*\n+/g, "\n").trim();

/* Obsah příspěvku z nového WordPressu pro šablony webu. */
export const vycisti = (html, nazev) => naHtml(galerie(videa(vycistiDom(html), nazev)));
