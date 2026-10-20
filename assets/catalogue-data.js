/* WallBliss design catalogue.
   HOW TO ADD YOUR REAL DESIGNS
   - Put the image in /assets/designs/ (JPG or WebP, ~1200px wide, under 250 KB).
   - Add an entry below with img: "assets/designs/WB-0142.jpg".
   - Keep the code unique; it is what customers send on WhatsApp and what your quotes refer to.
   - Entries without `img` show a SAMPLE artwork drawn by the browser. Replace them before launch.

   Fields
   code      unique design code (WB-NNNN)
   name      short display name
   spaces    living | bedroom | kids | pooja | office | cafe | hotel | clinic
   styles    nature | abstract | geometric | folk | devotional | kids | minimal | texture3d
   colours   green | blue | earth | warm | mono | pastel | dark
   orient    wide | tall | square   (best wall shape)
   tags      extra search words, any language (English, Hindi, Kannada…)
   pop       popularity 1–10 (sorts "Popular")
   added     YYYY-MM (sorts "Newest")
   gen/palette/seed  only used for SAMPLE artwork
*/
window.WB_DESIGNS = [];   // every design now comes from the admin (assets/published.js); the drawn samples are gone

/* Search synonyms: a word on the left also matches every word on the right. */
window.WB_SYNONYMS = {
  god: ["devotional", "pooja", "puja", "temple", "lotus", "mandala", "bhagwan", "devaru", "spiritual"],
  devaru: ["devotional", "pooja", "lotus", "mandala", "god"], bhagwan: ["devotional", "pooja", "lotus", "mandala", "god"], mandir: ["pooja", "devotional"],
  ganesha: ["devotional", "pooja", "god", "lotus", "mandala"], ganesh: ["devotional", "pooja", "god"],
  krishna: ["devotional", "pooja", "god", "lotus"], lakshmi: ["devotional", "lotus", "pooja"],
  buddha: ["devotional", "meditation", "lotus", "mandala", "calm"],
  kids: ["kids", "nursery", "children", "playroom", "space", "rainbow"], children: ["kids"], baby: ["kids", "nursery", "pastel"],
  nature: ["nature", "leaves", "mountain", "forest", "sea"], green: ["green", "leaves", "jungle"], forest: ["jungle", "leaves", "nature"],
  sea: ["waves", "ocean", "beach", "water"], beach: ["sea", "waves"], ocean: ["sea", "waves"],
  flower: ["lotus", "marigold", "floral"], floral: ["lotus", "marigold", "leaves"], hoovu: ["flower", "lotus", "marigold"], phool: ["flower", "lotus", "marigold"],
  office: ["office", "corporate", "modern", "reception"], corporate: ["office"], startup: ["office", "geometric"],
  restaurant: ["cafe", "restaurant"], cafe: ["cafe", "restaurant"], hotel: ["hotel", "lobby", "luxury"],
  hospital: ["clinic", "hospital", "wellness"], clinic: ["clinic", "hospital"],
  "3d": ["texture3d", "texture"], texture: ["texture3d", "terrazzo"],
  traditional: ["folk", "warli", "mandala", "devotional"], ethnic: ["folk", "warli"], indian: ["folk", "warli", "mandala", "devotional"],
  modern: ["geometric", "minimal", "abstract"], simple: ["minimal"], black: ["mono"], white: ["mono", "minimal"], grey: ["mono"], gray: ["mono"],
  blue: ["blue"], gold: ["warm", "earth"], brown: ["earth"], pink: ["pastel", "blush"]
};
