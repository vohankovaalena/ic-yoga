export default function (eleventyConfig) {
  /* Statické soubory projdou beze změny: assets/css, assets/js, assets/img,
     assets/ikony a assets/fonts. Cesty ve stylopisu i v HTML tak zůstávají platné. */
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  /* Při úpravě stylů nebo skriptu se prohlížeč obnoví i bez přestavby. */
  eleventyConfig.addWatchTarget("src/assets/css/");
  eleventyConfig.addWatchTarget("src/assets/js/");

  /* Datum česky: 2026-11-06 → „6. 11. 2026“. */
  eleventyConfig.addFilter("datumCz", (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
  });

  /* Strojové datum pro <time datetime> a sitemapu. */
  eleventyConfig.addFilter("datumIso", (value) => {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
  });

  /* Bezpečné vložení dat do JSON-LD uvnitř <script>. */
  eleventyConfig.addFilter("jsonld", (value) =>
    JSON.stringify(value).replace(/</g, "\\u003c")
  );

  /* Prvních n položek pole (bezpečně i pro prázdná data). */
  eleventyConfig.addFilter("prvnich", (pole, n) => (pole || []).slice(0, n));

  /* Časté dotazy → strukturovaná data FAQPage. */
  eleventyConfig.addFilter("faqSchema", (faq) => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.otazka,
      acceptedAnswer: { "@type": "Answer", text: f.odpoved }
    }))
  }));

  /* Lekce → strukturovaná data Course s týdenním rozvrhem + drobečky. */
  const DNY = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  eleventyConfig.addFilter("lekceSchema", (l, site) => {
    const url = `${site.url}/${l.slug}.html`;
    const instance = {
      "@type": "CourseInstance",
      courseMode: "onsite",
      location: {
        "@type": "Place",
        name: site.misto,
        address: `${site.ulice}, ${site.psc} ${site.obec}`
      },
      instructor: { "@type": "Person", "@id": `${site.url}/#iva`, name: site.lektorka }
    };
    if (l.rozvrh.length) {
      instance.courseSchedule = l.rozvrh.map((t) => ({
        "@type": "Schedule",
        repeatFrequency: "P1W",
        byDay: `https://schema.org/${DNY[t.den]}`,
        startTime: t.od,
        endTime: t.do
      }));
    }
    return {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Course",
          name: l.nazev,
          description: l.obsah.join(" "),
          url,
          image: `${site.url}/assets/img/${l.foto}.jpg`,
          inLanguage: "cs",
          audience: { "@type": "Audience", audienceType: l.proKoho },
          provider: { "@type": "Organization", "@id": `${site.url}/#studio`, name: site.name, url: `${site.url}/` },
          hasCourseInstance: instance
        },
        {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Domů", item: `${site.url}/` },
            { "@type": "ListItem", position: 2, name: "Lekce", item: `${site.url}/lekce.html` },
            { "@type": "ListItem", position: 3, name: l.nazev, item: url }
          ]
        }
      ]
    };
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
}
