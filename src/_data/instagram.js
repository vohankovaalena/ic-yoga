/* Posledních 6 příspěvků z Instagramu @ic_yoga pro úvodní stránku.
   Stahují se při každém sestavení webu z JSON feedu služby Behold.so
   (adresa je v site.json → instagramFeed). GitHub Actions web přestaví
   každé ráno, takže se nové příspěvky objeví nejpozději druhý den.

   Když feed chybí nebo neodpovídá, sestavení nespadne: vrátí se prázdný
   seznam a stránka ukáže pevné fotky ze studia. */
import { readFileSync } from "node:fs";

const site = JSON.parse(
  readFileSync(new URL("./site.json", import.meta.url), "utf8")
);
const POCET = 6;
const TIMEOUT = 20000;

function popis(text = "") {
  const t = text.replace(/#[\p{L}\d_]+/gu, "").replace(/\s+/g, " ").trim();
  if (!t) return "Příspěvek IC Yoga na Instagramu";
  return t.length <= 120 ? t : t.slice(0, t.lastIndexOf(" ", 120)) + "…";
}

export default async function () {
  if (!site.instagramFeed) return [];
  try {
    const res = await fetch(site.instagramFeed, { signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    /* Nový formát Behold má příspěvky v data.posts, starší je rovnou pole. */
    const posty = Array.isArray(data) ? data : data.posts || [];
    return posty.slice(0, POCET).map((p) => ({
      odkaz: p.permalink,
      obrazek: p.sizes?.small?.mediaUrl || p.thumbnailUrl || p.mediaUrl,
      obrazek2x: p.sizes?.medium?.mediaUrl || "",
      popis: popis(p.prunedCaption || p.caption)
    })).filter((p) => p.odkaz && p.obrazek);
  } catch (err) {
    console.warn(`[instagram] feed se nepodařilo stáhnout: ${err.message}`);
    return [];
  }
}
