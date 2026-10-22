/* IC Yoga Březnice – jeden skript bez závislostí.
   Každý blok hledá své prvky přes data-* atributy a když na stránce nejsou,
   nic nedělá. Web funguje i bez JavaScriptu, skript ho jen vylepšuje. */

/* Nastavení formulářů. Když je accessKey prázdný, formuláře se odešlou
   přes e-mailového klienta návštěvníka (mailto:) – nic se nerozbije.
   Klíč zdarma: https://web3forms.com (zadat e-mail Ivy, klíč přijde e-mailem). */
const SITE = {
  formEndpoint: "https://api.web3forms.com/submit",
  accessKey: "",
  email: "ivaceradska@seznam.cz"
};

/* Animace při scrollu: oddělovače s mandalou a samostatně stojící fotky
   se objeví, až na ně návštěvník doscroluje. Fotky v galerii jdou postupně. */
(function initAnimace() {
  const prvky = document.querySelectorAll(".oddelovac, .split__foto, .omne-uvod__foto, .detail__foto, .galerie > picture, .prose img");
  if (!prvky.length || !("IntersectionObserver" in window)) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const pozorovatel = new IntersectionObserver((zaznamy) => {
    zaznamy.forEach((z) => {
      if (!z.isIntersecting) return;
      z.target.dataset.animace = "videt";
      pozorovatel.unobserve(z.target);
    });
  }, { threshold: 0.2 });
  prvky.forEach((p) => {
    if (p.parentElement.classList.contains("galerie")) {
      p.style.transitionDelay = `${[...p.parentElement.children].indexOf(p) * 0.15}s`;
    }
    p.dataset.animace = "";
    pozorovatel.observe(p);
  });
})();

(function initNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (!toggle || !nav) return;
  const desktop = window.matchMedia("(min-width: 1240px)");
  const rodice = nav.querySelectorAll("[data-submenu]");

  const zavriPodmenu = (krome) => {
    rodice.forEach((b) => { if (b !== krome) b.setAttribute("aria-expanded", "false"); });
  };
  const nastavMenu = (otevrit) => {
    toggle.setAttribute("aria-expanded", String(otevrit));
    nav.dataset.open = String(otevrit);
    if (!otevrit) zavriPodmenu();
  };

  toggle.addEventListener("click", () => nastavMenu(toggle.getAttribute("aria-expanded") !== "true"));

  rodice.forEach((b) => {
    b.addEventListener("click", () => {
      const otevrit = b.getAttribute("aria-expanded") !== "true";
      zavriPodmenu(b);
      b.setAttribute("aria-expanded", String(otevrit));
    });
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const otevreny = nav.querySelector('[data-submenu][aria-expanded="true"]');
    if (otevreny) { zavriPodmenu(); otevreny.focus(); return; }
    if (toggle.getAttribute("aria-expanded") === "true") { nastavMenu(false); toggle.focus(); }
  });

  document.addEventListener("click", (e) => {
    if (!nav.contains(e.target) && !toggle.contains(e.target)) {
      zavriPodmenu();
      if (!desktop.matches) nastavMenu(false);
    }
  });

  /* Odkaz na kotvu na stejné stránce (např. #newsletter) menu zavře, aby se stránka posunula. */
  nav.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", () => nastavMenu(false));
  });

  /* Na desktopu se podmenu zavře, když z něj odejde fokus klávesnice. */
  nav.querySelectorAll(".nav__item--rodic").forEach((li) => {
    li.addEventListener("focusout", (e) => {
      if (desktop.matches && !li.contains(e.relatedTarget)) zavriPodmenu();
    });
  });

  desktop.addEventListener("change", () => nastavMenu(false));
})();

(function initHero() {
  /* Nekonečný carousel na úvodní stránce.
     Plynulost: hýbe se jen transform pásu (CSS transition na grafické kartě),
     fotky se před prvním posunem dekódují a na konci pásu jsou kopie prvních
     snímků – po dojetí na kopii se pás bez animace vrátí na začátek, takže
     přeskok není vidět. Časovač se pozastaví při najetí na text/ovládání,
     při fokusu, v neaktivní záložce a tlačítkem pauzy (WCAG 2.2.2). */
  const hero = document.querySelector("[data-hero]");
  const pas = hero && hero.querySelector("[data-hero-pas]");
  if (!pas || pas.children.length < 2) return;

  const snimky = [...pas.children];
  const N = snimky.length;
  const citaty = [...hero.querySelectorAll("[data-hero-citat]")];
  const tecky = [...hero.querySelectorAll("[data-hero-tecka]")];
  const ovladani = hero.querySelector("[data-hero-ovladani]");
  const pauzaBtn = hero.querySelector("[data-hero-pauza]");
  const pauzaText = hero.querySelector("[data-hero-pauza-text]");
  const styl = getComputedStyle(hero);
  const INTERVAL = parseFloat(styl.getPropertyValue("--interval")) || 6500;

  /* Kopie prvních dvou snímků na konec: při přejezdu z poslední fotky na
     první je vpravo vidět i náhled další, proto dvě. */
  snimky.slice(0, 2).forEach((s) => {
    const kopie = s.cloneNode(true);
    kopie.classList.remove("is-aktivni");
    kopie.setAttribute("aria-hidden", "true");
    kopie.removeAttribute("aria-label");
    kopie.querySelectorAll("img").forEach((img) => { img.alt = ""; img.removeAttribute("fetchpriority"); });
    pas.appendChild(kopie);
  });
  const vse = [...pas.children];

  let index = 0;
  let krok = 0;
  let jede = false;
  let casovac = null;
  let zbyva = INTERVAL;
  let startCasu = 0;
  const duvodyPauzy = new Set();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) duvodyPauzy.add("uzivatel");

  const zmer = () => { krok = vse[1].offsetLeft - vse[0].offsetLeft; };
  const posun = () => { pas.style.transform = `translate3d(${-index * krok}px, 0, 0)`; };
  /* Změna bez animace (návrat z kopie, změna velikosti okna): vypne
     všechny přechody v pásu včetně ztmavení, aby skok nebyl vidět. */
  const bezAnimace = (zmena) => {
    pas.classList.add("bez-prechodu");
    zmena();
    pas.offsetWidth;
    pas.classList.remove("bez-prechodu");
  };

  const oznac = () => {
    const i = ((index % N) + N) % N;
    vse.forEach((s, j) => s.classList.toggle("is-aktivni", j === index));
    snimky.forEach((s, j) => s.setAttribute("aria-hidden", String(j !== i)));
    citaty.forEach((c, j) => {
      c.classList.toggle("is-aktivni", j === i);
      c.setAttribute("aria-hidden", String(j !== i));
    });
    tecky.forEach((t, j) => {
      t.classList.toggle("is-aktivni", j === i);
      if (j === i) t.setAttribute("aria-current", "true"); else t.removeAttribute("aria-current");
    });
  };

  /* Časovač s pamětí zbývajícího času, aby seděl s průběhovou čárou. */
  const zastavCasovac = () => {
    if (casovac) { clearTimeout(casovac); casovac = null; zbyva -= performance.now() - startCasu; }
  };
  const spustCasovac = () => {
    if (casovac || jede || duvodyPauzy.size) return;
    startCasu = performance.now();
    casovac = setTimeout(() => { casovac = null; jdi(index + 1); }, Math.max(zbyva, 0));
  };
  const obnovStav = () => {
    hero.classList.toggle("is-pozastaveno", duvodyPauzy.size > 0);
    hero.classList.toggle("is-zastaveno", duvodyPauzy.has("uzivatel"));
    if (duvodyPauzy.size) zastavCasovac(); else spustCasovac();
  };
  const pauza = (duvod, ano) => {
    if (ano) duvodyPauzy.add(duvod); else duvodyPauzy.delete(duvod);
    obnovStav();
  };

  const dojeto = () => {
    if (!jede) return;
    jede = false;
    if (index >= N) bezAnimace(() => { index -= N; posun(); oznac(); });
    zbyva = INTERVAL;
    spustCasovac();
  };

  function jdi(cil) {
    if (jede) return;
    zastavCasovac();
    if (cil < 0) {
      /* Dozadu z první fotky: nejdřív neviditelně na její kopii na konci. */
      bezAnimace(() => { index = N; posun(); oznac(); });
      cil = N - 1;
    }
    jede = true;
    index = cil;
    oznac();
    posun();
    /* Pojistka, kdyby transitionend nepřišel (např. omezený pohyb). */
    setTimeout(dojeto, (parseFloat(styl.getPropertyValue("--prejezd")) || 1600) + 200);
  }

  pas.addEventListener("transitionend", (e) => {
    if (e.target === pas && e.propertyName === "transform") dojeto();
  });

  hero.querySelector("[data-hero-dalsi]").addEventListener("click", () => jdi(index + 1));
  hero.querySelector("[data-hero-predchozi]").addEventListener("click", () => jdi(index - 1));
  tecky.forEach((t, j) => t.addEventListener("click", () => { if (j !== index % N) jdi(j); }));
  pauzaBtn.addEventListener("click", () => {
    const zastavit = !duvodyPauzy.has("uzivatel");
    pauza("uzivatel", zastavit);
    pauzaBtn.setAttribute("aria-pressed", String(zastavit));
    pauzaText.textContent = zastavit ? "Spustit prezentaci" : "Pozastavit prezentaci";
  });

  hero.querySelectorAll("[data-hero-zona]").forEach((zona) => {
    zona.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") pauza("mys", true); });
    zona.addEventListener("pointerleave", () => pauza("mys", false));
  });
  hero.addEventListener("focusin", () => pauza("fokus", true));
  hero.addEventListener("focusout", (e) => { if (!hero.contains(e.relatedTarget)) pauza("fokus", false); });
  document.addEventListener("visibilitychange", () => pauza("skryto", document.hidden));

  new ResizeObserver(() => bezAnimace(() => { zmer(); posun(); })).observe(hero);

  if (duvodyPauzy.has("uzivatel")) {
    pauzaBtn.setAttribute("aria-pressed", "true");
    pauzaText.textContent = "Spustit prezentaci";
  }
  zmer();
  ovladani.hidden = false;

  /* Start až po dekódování fotek – během přejezdu se pak nic nenačítá. */
  const fotky = vse.map((s) => s.querySelector("img"));
  Promise.all(fotky.map((img) => (img.decode ? img.decode().catch(() => {}) : Promise.resolve())))
    .then(() => { oznac(); obnovStav(); });
})();

(function initYear() {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();

(function initRecenzePas() {
  /* Nekonečný pás recenzí na stránce O mně.
     Skupina karet je zdvojená (kopie je aria-hidden), takže smyčka navazuje
     bez skoku. Posun řídí requestAnimationFrame. Zastaví se při najetí myší,
     fokusu, tažení prstem a tlačítkem pauzy (WCAG 2.2.2); při „omezit pohyb“
     se sám nerozjede. Šipky posunou o jednu kartu. */
  const pas = document.querySelector("[data-recenze-pas]");
  const stopa = pas && pas.querySelector("[data-pas-stopa]");
  if (!stopa) return;
  const skupina = stopa.querySelector("[data-pas-skupina]");
  const pauzaBtn = pas.querySelector("[data-pas-pauza]");
  const pauzaText = pas.querySelector("[data-pas-pauza-text]");
  const RYCHLOST = 28;   // px za sekundu
  const POSUN_MS = 450;  // délka posunu šipkou

  const kopie = skupina.cloneNode(true);
  kopie.setAttribute("aria-hidden", "true");
  stopa.appendChild(kopie);

  let delkaSmycky = 0;
  let offset = 0;        // neomezený, zobrazuje se modulo délka smyčky
  let animace = null;
  let posledni = 0;
  const duvodyPauzy = new Set();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) duvodyPauzy.add("uzivatel");

  const vykresli = () => {
    const x = delkaSmycky ? ((offset % delkaSmycky) + delkaSmycky) % delkaSmycky : 0;
    stopa.style.transform = `translate3d(${-x}px, 0, 0)`;
  };
  const zmer = () => { delkaSmycky = skupina.getBoundingClientRect().width; vykresli(); };

  const posun = (smer) => {
    const krok = skupina.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(skupina).columnGap);
    if (!krok) return;
    const zaklad = animace ? animace.cil : offset;
    animace = { od: offset, cil: (Math.round(zaklad / krok) + smer) * krok, start: null };
  };

  const snimek = (cas) => {
    /* Strop kroku, aby pás po návratu do záložky neposkočil. */
    const dt = posledni ? Math.min((cas - posledni) / 1000, 0.1) : 0;
    posledni = cas;
    if (animace) {
      if (animace.start === null) animace.start = cas;
      const t = Math.min(1, (cas - animace.start) / POSUN_MS);
      offset = animace.od + (animace.cil - animace.od) * (1 - Math.pow(1 - t, 3));
      if (t >= 1) animace = null;
      vykresli();
    } else if (!duvodyPauzy.size) {
      offset += RYCHLOST * dt;
      vykresli();
    }
    requestAnimationFrame(snimek);
  };

  const pauza = (duvod, ano) => {
    if (ano) duvodyPauzy.add(duvod); else duvodyPauzy.delete(duvod);
    pas.classList.toggle("is-zastaveno", duvodyPauzy.has("uzivatel"));
  };

  pas.querySelector("[data-pas-predchozi]").addEventListener("click", () => posun(-1));
  pas.querySelector("[data-pas-dalsi]").addEventListener("click", () => posun(1));
  pauzaBtn.addEventListener("click", () => {
    const zastavit = !duvodyPauzy.has("uzivatel");
    pauza("uzivatel", zastavit);
    pauzaBtn.setAttribute("aria-pressed", String(zastavit));
    pauzaText.textContent = zastavit ? "Spustit posun" : "Pozastavit posun";
  });

  pas.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") pauza("mys", true); });
  pas.addEventListener("pointerleave", () => pauza("mys", false));
  pas.addEventListener("focusin", () => pauza("fokus", true));
  pas.addEventListener("focusout", (e) => { if (!pas.contains(e.relatedTarget)) pauza("fokus", false); });

  /* Tažení prstem na mobilu; svislé gesto nechá stránce. */
  let startX = 0;
  let startY = 0;
  let startOffset = 0;
  let vodorovne = false;
  stopa.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    startOffset = offset;
    vodorovne = false;
    animace = null;
    pauza("tazeni", true);
  }, { passive: true });
  stopa.addEventListener("touchmove", (e) => {
    if (!duvodyPauzy.has("tazeni")) return;
    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    if (!vodorovne) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) <= Math.abs(dy)) { pauza("tazeni", false); return; }
      vodorovne = true;
    }
    offset = startOffset - dx;
    vykresli();
  }, { passive: true });
  const konecTazeni = () => pauza("tazeni", false);
  stopa.addEventListener("touchend", konecTazeni);
  stopa.addEventListener("touchcancel", konecTazeni);

  new ResizeObserver(zmer).observe(skupina);

  if (duvodyPauzy.has("uzivatel")) {
    pas.classList.add("is-zastaveno");
    pauzaBtn.setAttribute("aria-pressed", "true");
    pauzaText.textContent = "Spustit posun";
  }
  pas.classList.add("is-aktivni");
  pas.querySelector("[data-pas-ovladani]").hidden = false;
  zmer();
  requestAnimationFrame(snimek);
})();

(function initVideo() {
  document.querySelectorAll("[data-video]").forEach((video) => {
    const tlacitko = video.querySelector("button");
    if (!tlacitko) return;
    tlacitko.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = `https://www.youtube-nocookie.com/embed/${video.dataset.video}?autoplay=1&rel=0`;
      iframe.title = video.dataset.title || "Video";
      iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      iframe.allowFullscreen = true;
      video.replaceChildren(iframe);
      iframe.focus();
    });
  });
})();

(function initForms() {
  const ZPRAVY = {
    valueMissing: "Toto pole je potřeba vyplnit.",
    typeMismatch: "Zadejte prosím platný e-mail, například jana@seznam.cz.",
    checkbox: "Bez souhlasu vám bohužel nemůžeme odpovědět."
  };

  const chybaPole = (pole) => {
    if (pole.validity.valid) return "";
    if (pole.type === "checkbox") return ZPRAVY.checkbox;
    if (pole.validity.typeMismatch) return ZPRAVY.typeMismatch;
    return ZPRAVY.valueMissing;
  };

  const ukazChybu = (pole) => {
    const box = pole.closest(".field");
    const text = box && box.querySelector(".field__error");
    const chyba = chybaPole(pole);
    pole.setAttribute("aria-invalid", chyba ? "true" : "false");
    if (text) { text.textContent = chyba; text.hidden = !chyba; }
    return !chyba;
  };

  document.querySelectorAll("[data-form]").forEach((form) => {
    const stav = form.querySelector(".form__status");
    const pole = [...form.querySelectorAll("input[required], textarea[required]")];
    const nastavStav = (text, typ = "ok") => {
      if (!stav) return;
      stav.textContent = text;
      stav.dataset.stav = typ;
    };

    pole.forEach((p) => {
      p.addEventListener("blur", () => { if (p.getAttribute("aria-invalid") === "true") ukazChybu(p); });
      p.addEventListener("change", () => { if (p.getAttribute("aria-invalid") === "true") ukazChybu(p); });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const neplatna = pole.filter((p) => !ukazChybu(p));
      if (neplatna.length) {
        nastavStav("Formulář obsahuje chyby, zkontrolujte prosím označená pole.", "chyba");
        neplatna[0].focus();
        return;
      }
      if (form.querySelector('[name="botcheck"]')?.checked) return;

      const data = new FormData(form);
      data.delete("botcheck");
      const predmet = data.get("subject") || "Zpráva z webu IC Yoga";

      if (!SITE.formEndpoint || !SITE.accessKey) {
        const telo = [...data.entries()]
          .filter(([k]) => k !== "subject")
          .map(([k, v]) => `${k === "souhlas" ? "Souhlas se zpracováním údajů" : k}: ${v === "on" ? "ano" : v}`)
          .join("\n");
        window.location.href = `mailto:${SITE.email}?subject=${encodeURIComponent(predmet)}&body=${encodeURIComponent(telo)}`;
        nastavStav("Otevřeli jsme váš e-mailový program s připravenou zprávou. Stačí ji odeslat.");
        return;
      }

      data.append("access_key", SITE.accessKey);
      data.append("from_name", "Web IC Yoga");
      const tlacitko = form.querySelector('[type="submit"]');
      tlacitko.disabled = true;
      nastavStav("Odesílám…");
      try {
        const res = await fetch(SITE.formEndpoint, { method: "POST", body: data, headers: { Accept: "application/json" } });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || json.success === false) throw new Error(json.message || res.status);
        form.reset();
        pole.forEach((p) => p.removeAttribute("aria-invalid"));
        nastavStav(form.dataset.form === "newsletter"
          ? "Děkuji, jste přihlášeni k odběru novinek."
          : "Děkuji za zprávu, ozvu se vám co nejdříve. Iva");
      } catch (err) {
        nastavStav(`Zprávu se nepodařilo odeslat. Napište mi prosím přímo na ${SITE.email} nebo zavolejte na 605 724 977.`, "chyba");
      } finally {
        tlacitko.disabled = false;
      }
    });
  });
})();

/* Instagram na úvodní stránce: dlaždice ze sestavení webu se při otevření
   stránky nahradí aktuálními příspěvky z feedu Behold.so, takže nový příspěvek
   je vidět hned, ne až po ranní přestavbě. Když feed neodpoví, zůstane
   původní obsah. */
(function initInstagram() {
  const mrizka = document.querySelector("[data-instagram-feed]");
  if (!mrizka || !window.fetch) return;
  const popis = (text = "") => {
    const t = text.replace(/#[\p{L}\d_]+/gu, "").replace(/\s+/g, " ").trim();
    if (!t) return "Příspěvek IC Yoga na Instagramu";
    return t.length <= 120 ? t : t.slice(0, t.lastIndexOf(" ", 120)) + "…";
  };
  fetch(mrizka.dataset.instagramFeed)
    .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
    .then((data) => {
      const posty = (Array.isArray(data) ? data : data.posts || []).slice(0, mrizka.children.length || 6);
      const polozky = posty.map((p) => {
        const maly = p.sizes?.small?.mediaUrl || p.thumbnailUrl || p.mediaUrl;
        if (!p.permalink || !maly) return null;
        const li = document.createElement("li");
        const a = Object.assign(document.createElement("a"), { href: p.permalink, rel: "noopener", target: "_blank" });
        const img = Object.assign(document.createElement("img"), {
          src: maly,
          alt: `${popis(p.prunedCaption || p.caption)} – zobrazit na Instagramu`,
          width: 400, height: 400, loading: "lazy", decoding: "async"
        });
        const velky = p.sizes?.medium?.mediaUrl;
        if (velky) {
          img.srcset = `${maly} 400w, ${velky} 700w`;
          img.sizes = "(max-width: 860px) 33vw, 200px";
        }
        a.append(img);
        li.append(a);
        return li;
      }).filter(Boolean);
      if (polozky.length) mrizka.replaceChildren(...polozky);
    })
    .catch(() => {});
})();
