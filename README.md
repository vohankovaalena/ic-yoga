# IC Yoga Březnice – web

Statický web studia IC Yoga (lektorka Iva Ceradská). Stavěný na stejné kostře
jako web Šárky Fekoňové (`../SarkaFekonova/ARCHITEKTURA.md`): Eleventy 3,
Nunjucks šablony, jeden ručně psaný `style.css`, jeden `main.js`, nasazení
na GitHub Pages přes GitHub Actions. Design je převzatý z původního webu
ic-yoga.cz (šablona Hatha): Cormorant Garamond + Lato, oranžová, krémová
textura papíru, svislé linky s mandalou.

**Spuštění lokálně tlačítkem:**
- ve VS Code: panel *Run and Debug* → zelené tlačítko **Spustit web** (nebo F5), web se sám otevře v prohlížeči,
- nebo ve Finderu dvojklik na **`spustit-web.command`** (zastavení = zavřít okno Terminálu).

Z příkazové řádky:

```bash
npm install
npm start        # vývojový server na http://localhost:8080
npm run build    # výstup do _site/
```

Testovací verze: https://vohankovaalena.github.io/ic-yoga/ (nasazuje se při každém pushi do `main`).

## Kde se co upravuje

| Co | Soubor |
| --- | --- |
| Kontakty, adresa, sociální sítě, adresa WordPressu | `src/_data/site.json` |
| Lekce (texty, fotky, **časy v rozvrhu**) | `src/_data/lekce.json` – rozvrh se z nich skládá sám (`rozvrh.js`) |
| Ceník | `src/_data/cenik.json` |
| Recenze | `src/_data/recenze.json` |
| Časté dotazy (+ strukturovaná data FAQ) | `src/_data/faq.json` |
| Abeceda pozic | `src/_data/pozice.json` |
| Menu | `src/_data/nav.json` (`vlevo` / `vpravo` od loga, `deti` = podmenu) |
| Staré adresy → nové | `src/_data/presmerovani.js` |
| Formuláře (klíč Web3Forms) | `src/assets/js/main.js` → `SITE.accessKey` |
| Vzhled | `src/assets/css/style.css` (tokeny barev nahoře v bloku 2) |

Každá stránka = jeden `.njk` v `src/`, název souboru = adresa (`rozvrh.njk` →
`rozvrh.html`). Detaily lekcí a pozic se generují z dat (`lekce-detail.njk`,
`pozice-detail.njk`) – nová lekce = nový záznam v `lekce.json`.

Fotky: `src/assets/img/` vždy dvojice `.webp` + `.jpg` s popisným názvem.
Rozměry pro šablony jsou v `src/_data/obrazky.json` (po přidání fotky doplnit).
V šabloně: `{{ obrazek("nazev-souboru", "Popis, co je na fotce") }}`.

## Napojení na WordPress

Kurzy, pobyty, videa a blog Iva dál spravuje ve WordPressu. Při každém
sestavení je `src/_data/wp.js` stáhne z RSS (`/kurzy/feed/`, `/pobyty/feed/`,
`/videa/feed/`, `/feed/`) a náhledové obrázky z výpisových stránek.
Když WordPress neodpovídá, build nespadne – sekce jen ukážou odkaz na WP.

**Kdy se změna z WordPressu objeví na webu:**
- **hned (do ~2 minut)** po zveřejnění / úpravě / smazání – zařídí to plugin
  `wordpress/ic-yoga-aktualizace-webu.zip`, který pošle GitHubu signál
  (`repository_dispatch` → workflow se spustí),
- ručně: ve WordPressu *Nastavení → Aktualizace webu → Aktualizovat web teď*,
  nebo na GitHubu *Actions → Nasazení na GitHub Pages → Run workflow*,
- pojistka: každé ráno v 6:00 se web přestaví vždy.

### Instalace pluginu (jednou)

1. **Token na GitHubu:** github.com → vpravo nahoře profil → *Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → Generate new token*.
   - Token name: `WordPress ic-yoga`, Expiration: 1 rok (pak vytvořit nový),
   - Repository access: *Only select repositories* → `ic-yoga`,
   - Permissions → Repository permissions → **Contents: Read and write**,
   - *Generate token* a token zkopírovat (zobrazí se jen jednou).
2. **Plugin do WordPressu:** *Pluginy → Instalace pluginů → Nahrát plugin* →
   `wordpress/ic-yoga-aktualizace-webu.zip` → Instalovat → Aktivovat.
3. *Nastavení → Aktualizace webu* → vložit token → Uložit → kliknout
   **Aktualizovat web teď**. Má se objevit „Hotovo“ a na GitHubu v záložce
   Actions nový běh.

Token lze místo nastavení dát i do `wp-config.php`:
`define('IC_YOGA_GITHUB_TOKEN', 'github_pat_…');`

## Spuštění na doméně ic-yoga.cz (zatím neprovedeno)

1. ✅ Repozitář `vohankovaalena/ic-yoga`, GitHub Pages ze zdroje GitHub Actions.
2. ✅ Testovací verze na `https://vohankovaalena.github.io/ic-yoga/`. Je schovaná před
   vyhledávači (`site.json` → `"indexovat": false` = noindex + `Disallow` v robots.txt),
   aby nevznikl duplicitní obsah se starým webem.
   **Při spuštění na doméně přepnout `"indexovat": true` a `"basePath": "/"`.**
3. Přesunout WordPress na subdoménu, např. `blog.ic-yoga.cz` (u hostingu + v nastavení WP
   změnit adresu webu), sjednotit vzhled blogu s novým webem.
4. V `site.json` změnit `wpUrl` na novou adresu WP → automaticky se vygenerují
   přesměrování starých adres článků, kurzů, pobytů a videí.
5. Přidat soubor `src/CNAME` s `ic-yoga.cz` (+ passthrough v configu), u DNS nastavit
   záznamy pro GitHub Pages, v Pages zapnout „Enforce HTTPS“. E-mail se nemění.
6. Google Search Console + Seznam Webmaster: ověřit doménu, odeslat `sitemap.xml`.
7. Zkontrolovat / založit Google Business Profile, Mapy.cz a Firmy.cz se stejným
   názvem, adresou a telefonem jako v `site.json`.

## Opravy chyb ze starého webu

| # | Chyba | Stav |
| --- | --- | --- |
| 1 | Hero bez CTA | ✅ tlačítka „Rozvrh lekcí“ a „Jak se zapsat“ |
| 2 | Není vidět, jak se zapsat | ✅ sekce „Jak se zapsat“ na úvodu i u rozvrhu, tlačítko v hlavičce |
| 3 | Chybí pro koho / kolik / jak začít | ✅ detail každé lekce (pro koho, kdy, cena), FAQ |
| 4 | Zmatená struktura | ✅ nová struktura stránek a menu |
| 5 | Duplicitní recenze (Lenka Ž. 3×) | ✅ 13 unikátních recenzí v `recenze.json` |
| 6 | Rozvrh nečitelný po najetí myší, WCAG | ✅ skutečná tabulka, bez hover efektů, kontrast AA, na mobilu seznam |
| 7, 19 | Odkazy na nove.ic-yoga.cz | ✅ všechny lekce jsou na jednom webu (subdoménu je potřeba vypnout/přesměrovat u hostingu) |
| 8 | Prázdná stránka O józe | ✅ naplněná (text z článku „Co je jóga?“) |
| 9 | Nelogické menu | ✅ Rozvrh · Lekce · Kurzy a pobyty · [logo] · Studio · O mně · Inspirace · Kontakt |
| 10 | Title „IC Yoga“, chybí description | ✅ každá stránka má vlastní title s lokalitou a description |
| 11, 20 | Alt texty „a“, logo Bez-nazvu-2png.png | ✅ popisné alt texty, `ic-yoga-logo.png`, fotky s popisnými názvy |
| 13 | Newsletter bez GDPR | ✅ souhlas + stránka Ochrana osobních údajů |
| 14 | E-mail na seznam.cz | ⏳ rozhodnutí Ivy (stačí změnit `site.json`) |
| 15, 16 | Rozbitá / zanesená sitemapa | ✅ čistá `sitemap.xml` + `robots.txt` (jen skutečné stránky) |
| 17 | Chybí SEO plugin | ✅ není potřeba: title, description, canonical, Open Graph, strukturovaná data přímo v šablonách |
| 18 | H1 je citát | ✅ H1 „Jóga v Březnici pro dospělé, teenagery i děti“ |
| – | „No events available!“ | ✅ zmizelo (vlastní rozvrh) |
| – | Přístupnost (EAA) | ✅ axe-core bez nálezů (WCAG 2.1 AA), prohlášení o přístupnosti |
| – | Cookies třetích stran | ✅ fonty na webu, mapa a YouTube až po kliknutí, žádná analytika |

## Co ještě potřebuje dodat Iva

- **Klíč Web3Forms** (zdarma, web3forms.com) do `main.js` – do té doby formuláře
  otevřou e-mailového klienta návštěvníka (funguje, jen méně pohodlně).
- **IČO a sídlo** pro stránku Ochrana osobních údajů (`site.json` → `ico`, `sidlo`).
- Ověřit odpovědi v `faq.json` (hlavně „Co si mám vzít s sebou“ – podložky?).
- Ověřit, že ceník a rozvrh jsou aktuální.
- Lekce **SM systém** byla jen na nove.ic-yoga.cz – pokud ji Iva dál nabízí,
  přidat záznam do `lekce.json`.
