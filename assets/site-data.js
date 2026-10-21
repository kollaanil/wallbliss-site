/* Reviews and finished projects.
   Only add real ones. Google penalises, and customers notice, invented reviews.

   REVIEWS — copy the customer's words from Google / WhatsApp (with permission).
   { quote: "…", name: "Priya R.", place: "Whitefield", type: "2BHK living room", stars: 5 }

   PROJECTS — one entry per finished job. Each project becomes a card on projects.html
   and a line in the page's structured data, which is what Google and AI assistants read.
   {
     slug: "whitefield-living-room-warli",     // unique, lowercase-with-dashes
     title: "Warli mural for a Whitefield living room",
     locality: "Whitefield",                    // Bengaluru area — this is what ranks locally
     space: "Living room",                      // Living room | Bedroom | Kids room | Office | Café | Hotel | Clinic
     size: "10′ × 8′ (80 sq ft)",
     design: "WB-0137",                          // catalogue code, or "Custom"
     time: "3 hours on site",
     month: "2026-11",
     summary: "One or two sentences on the brief and the result.",
     before: "assets/projects/whitefield-before.jpg",
     after: "assets/projects/whitefield-after.jpg",
     quote: "Optional customer line"
   }
*/
window.WB_REVIEWS = [];
window.WB_PROJECTS = [];
