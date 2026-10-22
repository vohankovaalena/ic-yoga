/* Společné nastavení pro všechny stránky ve složce src/.
   Díky permalinku zůstávají adresy ve tvaru /rozvrh.html, takže
   odkazy uvnitř webu nepotřebují žádnou úpravu. */
export default {
  layout: "base.njk",
  permalink: (data) => `${data.page.filePathStem}.html`
};
