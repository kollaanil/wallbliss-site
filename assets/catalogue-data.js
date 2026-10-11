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
  { code: "WB-0101", name: "Misty Ridge", gen: "mountains", seed: 11, palette: ["#DCE9EE", "#F5EFE6", "#7FA3A9", "#3D6670", "#FFFFFF"], spaces: ["living", "bedroom", "hotel", "office"], styles: ["nature", "minimal"], colours: ["blue", "pastel"], orient: "wide", tags: ["mountain", "hills", "landscape", "calm", "pahad", "betta", "fog"], pop: 9, added: "2026-09" },
  { code: "WB-0102", name: "Western Ghats Dawn", gen: "mountains", seed: 27, palette: ["#F6C9A8", "#FBE6D2", "#3E7F5B", "#1A5C35", "#FFF4D6"], spaces: ["living", "hotel", "cafe"], styles: ["nature"], colours: ["green", "warm"], orient: "wide", tags: ["mountain", "sunrise", "forest", "karnataka", "coorg", "hills"], pop: 8, added: "2026-09" },
  { code: "WB-0103", name: "Blue Hour Peaks", gen: "mountains", seed: 5, palette: ["#1D2B4A", "#4C5F8C", "#7D8FB8", "#2C3B63", "#F2E6C9"], spaces: ["bedroom", "office", "hotel"], styles: ["nature", "minimal"], colours: ["blue", "dark"], orient: "wide", tags: ["mountain", "night", "moon", "evening"], pop: 6, added: "2026-08" },
  { code: "WB-0104", name: "Malabar Tide", gen: "waves", seed: 8, palette: ["#E8F4F3", "#CFE8E6", "#5FB7B0", "#1B7C8A", "#1450A3"], spaces: ["living", "bedroom", "clinic", "hotel"], styles: ["abstract", "nature"], colours: ["blue", "pastel"], orient: "wide", tags: ["sea", "ocean", "beach", "waves", "samudra", "kadal", "water", "calm"], pop: 9, added: "2026-09" },
  { code: "WB-0105", name: "Copper Current", gen: "waves", seed: 31, palette: ["#2A1E17", "#4A3226", "#B86B3C", "#E3A15E", "#F3D3A3"], spaces: ["cafe", "hotel", "office"], styles: ["abstract"], colours: ["earth", "warm", "dark"], orient: "wide", tags: ["flow", "luxury", "lounge", "bronze", "gold"], pop: 7, added: "2026-08" },
  { code: "WB-0106", name: "Lagoon Lines", gen: "waves", seed: 44, palette: ["#F7F6F2", "#E9F1EE", "#3DD6A0", "#1B7C8A", "#1A5C35"], spaces: ["office", "clinic", "kids"], styles: ["abstract", "minimal"], colours: ["green", "blue"], orient: "wide", tags: ["fresh", "calm", "hospital", "reception", "corporate"], pop: 7, added: "2026-10" },
  { code: "WB-0107", name: "Monstera Shade", gen: "leaves", seed: 3, palette: ["#E8EFE4", "#2E6B45", "#3F8A5A", "#1A5C35"], spaces: ["living", "cafe", "hotel", "bedroom"], styles: ["nature"], colours: ["green"], orient: "wide", tags: ["leaf", "leaves", "tropical", "jungle", "plant", "botanical", "patta", "ele", "green wall"], pop: 10, added: "2026-09" },
  { code: "WB-0108", name: "Night Jungle", gen: "leaves", seed: 19, palette: ["#0F1F18", "#1E4A35", "#2E6B45", "#4E8F6A"], spaces: ["cafe", "hotel", "bedroom"], styles: ["nature"], colours: ["green", "dark"], orient: "wide", tags: ["jungle", "forest", "tropical", "bar", "lounge", "moody", "kaadu"], pop: 8, added: "2026-08" },
  { code: "WB-0109", name: "Banana Leaf Café", gen: "leaves", seed: 52, palette: ["#F4EBD6", "#6E9E3C", "#8DB255", "#4D7A2B"], spaces: ["cafe", "kids", "living"], styles: ["nature"], colours: ["green", "warm"], orient: "square", tags: ["leaf", "kerala", "south indian", "restaurant", "bale ele"], pop: 6, added: "2026-10" },
  { code: "WB-0110", name: "Indigo Mandala", gen: "mandala", seed: 4, palette: ["#13234A", "#1F3A6E", "#3C64A8", "#E8C547", "#6E8FD1"], spaces: ["living", "pooja", "hotel"], styles: ["devotional", "geometric"], colours: ["blue", "dark"], orient: "square", tags: ["mandala", "spiritual", "meditation", "yoga", "rangoli", "kolam"], pop: 8, added: "2026-09" },
  { code: "WB-0111", name: "Marigold Mandala", gen: "mandala", seed: 9, palette: ["#FFF3DC", "#FBE3B5", "#E8962E", "#C2410C", "#7A1F1F"], spaces: ["pooja", "living", "hotel"], styles: ["devotional", "folk"], colours: ["warm"], orient: "square", tags: ["mandala", "festive", "marigold", "genda", "chendu hoovu", "diwali", "rangoli", "kolam"], pop: 9, added: "2026-10" },
  { code: "WB-0112", name: "Sage Mandala", gen: "mandala", seed: 15, palette: ["#EEF2EA", "#DDE6D7", "#8FAE8B", "#5F8A68", "#FFFFFF"], spaces: ["bedroom", "clinic", "pooja"], styles: ["devotional", "minimal"], colours: ["green", "pastel"], orient: "square", tags: ["mandala", "calm", "yoga", "spa", "wellness"], pop: 6, added: "2026-08" },
  { code: "WB-0113", name: "Sacred Lotus", gen: "lotus", seed: 2, palette: ["#2A1638", "#5A2D5E", "#F2A7B8", "#E06C8C", "rgba(255,214,140,.35)"], spaces: ["pooja", "living"], styles: ["devotional"], colours: ["warm", "dark"], orient: "square", tags: ["lotus", "kamal", "tavare", "god", "bhagwan", "devaru", "pooja", "puja", "temple", "lakshmi", "spiritual"], pop: 9, added: "2026-09" },
  { code: "WB-0114", name: "Dawn Lotus", gen: "lotus", seed: 6, palette: ["#FDE7D7", "#F9F1E7", "#F6B3A6", "#E07A6B", "rgba(255,240,200,.6)"], spaces: ["pooja", "bedroom", "clinic"], styles: ["devotional", "minimal"], colours: ["pastel", "warm"], orient: "tall", tags: ["lotus", "kamal", "tavare", "pooja", "puja", "god", "temple", "peace"], pop: 7, added: "2026-10" },
  { code: "WB-0115", name: "Lotus Pond", gen: "lotus", seed: 12, palette: ["#0F3B3A", "#1B7C8A", "#F7C6D0", "#E890A6", "rgba(232,197,71,.3)"], spaces: ["pooja", "hotel", "living"], styles: ["devotional", "nature"], colours: ["green", "blue"], orient: "wide", tags: ["lotus", "pond", "water", "kamal", "temple", "lobby"], pop: 6, added: "2026-08" },
  { code: "WB-0116", name: "Warli Harvest Dance", gen: "warli", seed: 7, palette: ["#8A3B1F", "#F6EBDD"], spaces: ["living", "cafe", "hotel"], styles: ["folk"], colours: ["earth", "warm"], orient: "wide", tags: ["warli", "tribal", "indian art", "folk", "village", "dance", "ethnic", "maharashtra"], pop: 10, added: "2026-09" },
  { code: "WB-0117", name: "Warli on Indigo", gen: "warli", seed: 21, palette: ["#1D2E57", "#EDE6D6"], spaces: ["living", "office", "hotel"], styles: ["folk"], colours: ["blue", "dark"], orient: "wide", tags: ["warli", "tribal", "folk", "ethnic", "indian art"], pop: 7, added: "2026-08" },
  { code: "WB-0118", name: "Warli Sage", gen: "warli", seed: 33, palette: ["#5F7A63", "#F3EFE6"], spaces: ["cafe", "living", "kids"], styles: ["folk"], colours: ["green", "earth"], orient: "wide", tags: ["warli", "folk", "village", "trees"], pop: 6, added: "2026-10" },
  { code: "WB-0119", name: "Prism Grid", gen: "geometric", seed: 14, palette: ["#1A5C35", "#3DD6A0", "#1B7C8A", "#1450A3", "#F2F2EE"], spaces: ["office", "cafe", "kids"], styles: ["geometric", "abstract"], colours: ["green", "blue"], orient: "wide", tags: ["pattern", "modern", "corporate", "startup", "triangles", "bold"], pop: 8, added: "2026-09" },
  { code: "WB-0120", name: "Terracotta Tiles", gen: "geometric", seed: 23, palette: ["#C2603A", "#E8B48A", "#F5E6D3", "#7A3B22", "#3E5C4C"], spaces: ["cafe", "living", "hotel"], styles: ["geometric"], colours: ["earth", "warm"], orient: "wide", tags: ["tiles", "athangudi", "pattern", "mediterranean", "restaurant", "kitchen"], pop: 8, added: "2026-08" },
  { code: "WB-0121", name: "Monochrome Shapes", gen: "geometric", seed: 41, palette: ["#111111", "#3A3A3A", "#BDBDBD", "#F2F2F2"], spaces: ["office", "cafe", "bedroom"], styles: ["geometric", "minimal"], colours: ["mono"], orient: "square", tags: ["black and white", "modern", "minimal", "pattern", "gym"], pop: 6, added: "2026-10" },
  { code: "WB-0122", name: "Pastel Blocks", gen: "geometric", seed: 57, palette: ["#F7D6D0", "#CFE3E0", "#F3E6B5", "#D7D3EE", "#FFFFFF"], spaces: ["kids", "bedroom", "clinic"], styles: ["geometric", "kids"], colours: ["pastel"], orient: "wide", tags: ["nursery", "girls", "soft", "pattern", "playroom"], pop: 7, added: "2026-09" },
  { code: "WB-0123", name: "Starry Kodachadri", gen: "stars", seed: 16, palette: ["#0B1430", "#283D74", "#F4E9C9", "#0F1A2E"], spaces: ["bedroom", "kids", "hotel"], styles: ["nature"], colours: ["blue", "dark"], orient: "wide", tags: ["night sky", "stars", "moon", "chand", "chandra", "taare", "nakshatra", "bedroom ceiling"], pop: 9, added: "2026-09" },
  { code: "WB-0124", name: "Space Explorers", gen: "stars", seed: 28, opts: { planets: true }, palette: ["#0C1233", "#2A1E5C", "#F2994A", "#56CCF2", "#BB6BD9"], spaces: ["kids"], styles: ["kids"], colours: ["dark", "blue"], orient: "wide", tags: ["space", "planets", "rocket", "astronaut", "boys", "galaxy", "solar system", "school", "play school"], pop: 10, added: "2026-10" },
  { code: "WB-0125", name: "Little Planets", gen: "stars", seed: 39, opts: { planets: true }, palette: ["#24315E", "#3E5A8A", "#F6C177", "#EB8C8C", "#9ED9C0"], spaces: ["kids", "clinic"], styles: ["kids"], colours: ["blue", "pastel"], orient: "square", tags: ["space", "planets", "nursery", "kids", "paediatric", "pediatric", "hospital"], pop: 8, added: "2026-09" },
  { code: "WB-0126", name: "Thar Dunes", gen: "dunes", seed: 10, palette: ["#F7C59F", "#FDE8D0", "#D98E5F", "#B5653B", "#FFF6E0"], spaces: ["living", "hotel", "office"], styles: ["nature", "minimal"], colours: ["earth", "warm"], orient: "wide", tags: ["desert", "sand", "rajasthan", "boho", "warm", "sunset"], pop: 7, added: "2026-08" },
  { code: "WB-0127", name: "Rose Dunes", gen: "dunes", seed: 24, palette: ["#F3D7D3", "#FBEDE9", "#D9A0A0", "#B87878", "#FFFFFF"], spaces: ["bedroom", "clinic", "living"], styles: ["minimal", "abstract"], colours: ["pastel", "warm"], orient: "wide", tags: ["boho", "soft", "blush", "calm", "minimal"], pop: 7, added: "2026-10" },
  { code: "WB-0128", name: "Kadapa Terrazzo", gen: "terrazzo", seed: 13, palette: ["#EFEBE4", "#1A5C35", "#C2603A", "#2C2C2C", "#B8B0A2", "#E8C547"], spaces: ["cafe", "office", "living"], styles: ["texture3d", "minimal"], colours: ["mono", "earth"], orient: "wide", tags: ["terrazzo", "stone", "texture", "3d", "chips", "mosaic"], pop: 7, added: "2026-09" },
  { code: "WB-0129", name: "Blush Terrazzo", gen: "terrazzo", seed: 37, palette: ["#F6E8E3", "#E3A99B", "#7FA3A9", "#F0C987", "#C9C1B8"], spaces: ["cafe", "bedroom", "clinic"], styles: ["texture3d", "minimal"], colours: ["pastel"], orient: "square", tags: ["terrazzo", "texture", "3d", "salon", "boutique"], pop: 6, added: "2026-10" },
  { code: "WB-0130", name: "Boho Arches", gen: "arches", seed: 18, palette: ["#F4E9DC", "#D98E5F", "#E8C9A8", "#8FAE8B", "#C26A4A"], spaces: ["kids", "bedroom", "cafe"], styles: ["kids", "minimal"], colours: ["earth", "pastel"], orient: "wide", tags: ["rainbow", "boho", "nursery", "arches", "sun", "kids room"], pop: 9, added: "2026-09" },
  { code: "WB-0131", name: "Rainbow Hills", gen: "arches", seed: 42, palette: ["#EAF4F4", "#F28C8C", "#F6C177", "#9ED9C0", "#7DB3E8"], spaces: ["kids", "clinic"], styles: ["kids"], colours: ["pastel"], orient: "wide", tags: ["rainbow", "colourful", "play school", "daycare", "paediatric", "kids"], pop: 8, added: "2026-10" },
  { code: "WB-0132", name: "Coastal Arches", gen: "arches", seed: 55, palette: ["#EAF2F5", "#1B7C8A", "#7FC3C6", "#1450A3", "#F3E6C9"], spaces: ["office", "cafe", "bedroom"], styles: ["minimal", "geometric"], colours: ["blue"], orient: "wide", tags: ["modern", "arches", "calm", "reception"], pop: 5, added: "2026-08" },
  { code: "WB-0133", name: "Silver Ripple", gen: "waves", seed: 61, palette: ["#F2F2F0", "#E2E2DE", "#B9B9B4", "#8B8B86", "#4A4A47"], spaces: ["office", "hotel", "bedroom"], styles: ["texture3d", "abstract", "minimal"], colours: ["mono"], orient: "wide", tags: ["3d", "texture", "grey", "luxury", "corporate", "lobby"], pop: 7, added: "2026-10" },
  { code: "WB-0134", name: "Sandalwood Forest", gen: "leaves", seed: 64, palette: ["#E9DCC6", "#9C7A4E", "#B89462", "#6E5235"], spaces: ["living", "hotel", "pooja"], styles: ["nature", "texture3d"], colours: ["earth", "warm"], orient: "tall", tags: ["leaves", "wood", "sandalwood", "gandha", "chandan", "warm", "texture"], pop: 6, added: "2026-09" },
  { code: "WB-0135", name: "Healing Greens", gen: "mountains", seed: 70, palette: ["#E9F3EC", "#F7FBF8", "#9CC9AD", "#5FA37C", "#FFFFFF"], spaces: ["clinic", "office", "bedroom"], styles: ["nature", "minimal"], colours: ["green", "pastel"], orient: "wide", tags: ["hospital", "clinic", "calm", "wellness", "waiting room", "dental"], pop: 8, added: "2026-10" },
  { code: "WB-0136", name: "Ganga Ghat Evening", gen: "waves", seed: 73, palette: ["#F6B26B", "#FBD9A7", "#C9643A", "#7A3B22", "#3A1E14"], spaces: ["pooja", "living", "hotel"], styles: ["devotional", "abstract"], colours: ["warm", "earth"], orient: "wide", tags: ["river", "ganga", "aarti", "sunset", "spiritual", "varanasi", "god"], pop: 7, added: "2026-10" }
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
