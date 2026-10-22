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

  /* Na desktopu se podmenu zavře, když z něj odejde fokus klávesnice. */
  nav.querySelectorAll(".nav__item--rodic").forEach((li) => {
    li.addEventListener("focusout", (e) => {
      if (desktop.matches && !li.contains(e.relatedTarget)) zavriPodmenu();
    });
  });

  desktop.addEventListener("change", () => nastavMenu(false));
})();

(function initYear() {
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });
})();

(function initCarousel() {
  document.querySelectorAll("[data-carousel]").forEach((ram) => {
    const polozky = [...ram.querySelectorAll("[data-carousel-item]")];
    const ovladani = ram.querySelector("[data-carousel-controls]");
    const stav = ram.querySelector("[data-carousel-status]");
    if (polozky.length < 2 || !ovladani) return;
    let aktualni = 0;

    const ukaz = (index) => {
      aktualni = (index + polozky.length) % polozky.length;
      polozky.forEach((p, i) => { p.hidden = i !== aktualni; });
      if (stav) stav.textContent = `${aktualni + 1} / ${polozky.length}`;
    };

    ram.classList.add("is-carousel");
    ovladani.hidden = false;
    ram.querySelector("[data-carousel-prev]").addEventListener("click", () => ukaz(aktualni - 1));
    ram.querySelector("[data-carousel-next]").addEventListener("click", () => ukaz(aktualni + 1));
    ukaz(0);
  });
})();

(function initMap() {
  document.querySelectorAll("[data-map]").forEach((mapa) => {
    const tlacitko = mapa.querySelector("[data-map-load]");
    if (!tlacitko) return;
    tlacitko.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.src = mapa.dataset.map;
      iframe.title = "Mapa: Muscle Factory Březnice, Rožmitálská 144";
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      mapa.replaceChildren(iframe);
      iframe.focus();
    });
  });
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
