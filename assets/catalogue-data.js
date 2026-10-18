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
window.WB_DESIGNS = [
  { code: "WB-0105", name: "Copper Current", gen: "waves", seed: 31, palette: ["#2A1E17", "#4A3226", "#B86B3C", "#E3A15E", "#F3D3A3"], spaces: ["cafe", "hotel", "office"], styles: ["abstract"], colours: ["earth", "warm", "dark"], orient: "wide", tags: ["flow", "luxury", "lounge", "bronze", "gold"], pop: 7, added: "2026-08" },
  { code: "WB-0107", name: "Monstera Shade", gen: "leaves", seed: 3, palette: ["#E8EFE4", "#2E6B45", "#3F8A5A", "#1A5C35"], spaces: ["living", "cafe", "hotel", "bedroom"], styles: ["nature"], colours: ["green"], orient: "wide", tags: ["leaf", "leaves", "tropical", "jungle", "plant", "botanical", "patta", "ele", "green wall"], pop: 10, added: "2026-09" },
  { code: "WB-0109", name: "Banana Leaf Café", gen: "leaves", seed: 52, palette: ["#F4EBD6", "#6E9E3C", "#8DB255", "#4D7A2B"], spaces: ["cafe", "kids", "living"], styles: ["nature"], colours: ["green", "warm"], orient: "square", tags: ["leaf", "kerala", "south indian", "restaurant", "bale ele"], pop: 6, added: "2026-10" },
  { code: "WB-0111", name: "Marigold Mandala", gen: "mandala", seed: 9, palette: ["#FFF3DC", "#FBE3B5", "#E8962E", "#C2410C", "#7A1F1F"], spaces: ["pooja", "living", "hotel"], styles: ["devotional", "folk"], colours: ["warm"], orient: "square", tags: ["mandala", "festive", "marigold", "genda", "chendu hoovu", "diwali", "rangoli", "kolam"], pop: 9, added: "2026-10" },
  { code: "WB-0119", name: "Prism Grid", gen: "geometric", seed: 14, palette: ["#1A5C35", "#3DD6A0", "#1B7C8A", "#1450A3", "#F2F2EE"], spaces: ["office", "cafe", "kids"], styles: ["geometric", "abstract"], colours: ["green", "blue"], orient: "wide", tags: ["pattern", "modern", "corporate", "startup", "triangles", "bold"], pop: 8, added: "2026-09" },
  { code: "WB-0120", name: "Terracotta Tiles", gen: "geometric", seed: 23, palette: ["#C2603A", "#E8B48A", "#F5E6D3", "#7A3B22", "#3E5C4C"], spaces: ["cafe", "living", "hotel"], styles: ["geometric"], colours: ["earth", "warm"], orient: "wide", tags: ["tiles", "athangudi", "pattern", "mediterranean", "restaurant", "kitchen"], pop: 8, added: "2026-08" },
  { code: "WB-0123", name: "Starry Kodachadri", gen: "stars", seed: 16, palette: ["#0B1430", "#283D74", "#F4E9C9", "#0F1A2E"], spaces: ["bedroom", "kids", "hotel"], styles: ["nature"], colours: ["blue", "dark"], orient: "wide", tags: ["night sky", "stars", "moon", "chand", "chandra", "taare", "nakshatra", "bedroom ceiling"], pop: 9, added: "2026-09" },
  { code: "WB-0124", name: "Space Explorers", gen: "stars", seed: 28, opts: { planets: true }, palette: ["#0C1233", "#2A1E5C", "#F2994A", "#56CCF2", "#BB6BD9"], spaces: ["kids"], styles: ["kids"], colours: ["dark", "blue"], orient: "wide", tags: ["space", "planets", "rocket", "astronaut", "boys", "galaxy", "solar system", "school", "play school"], pop: 10, added: "2026-10" },
  { code: "WB-0130", name: "Boho Arches", gen: "arches", seed: 18, palette: ["#F4E9DC", "#D98E5F", "#E8C9A8", "#8FAE8B", "#C26A4A"], spaces: ["kids", "bedroom", "cafe"], styles: ["kids", "minimal"], colours: ["earth", "pastel"], orient: "wide", tags: ["rainbow", "boho", "nursery", "arches", "sun", "kids room"], pop: 9, added: "2026-09" },
  { code: "WB-0135", name: "Healing Greens", gen: "mountains", seed: 70, palette: ["#E9F3EC", "#F7FBF8", "#9CC9AD", "#5FA37C", "#FFFFFF"], spaces: ["clinic", "office", "bedroom"], styles: ["nature", "minimal"], colours: ["green", "pastel"], orient: "wide", tags: ["hospital", "clinic", "calm", "wellness", "waiting room", "dental"], pop: 8, added: "2026-10" },
];

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
