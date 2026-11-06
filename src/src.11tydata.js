/* Společné nastavení pro všechny stránky ve složce src/.
   Adresy jsou „čisté“ bez .html: rozvrh.njk → /rozvrh/ (soubor
   rozvrh/index.html, výchozí chování Eleventy). Odkazy uvnitř webu se
   píšou od kořene (/rozvrh/, /assets/…); předponu pro testovací kopii
   v podsložce (site.json → basePath) doplní HtmlBasePlugin v configu. */
export default {
  layout: "base.njk"
};
