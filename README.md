# WallBliss Studio website

Live site: https://www.wallbliss.in (served by GitHub Pages from the `main` branch; the old address https://kollaanil.github.io/wallbliss-site/ redirects to it).

| Page | What it does |
|---|---|
| `index.html` | Home: hero video, wall stories, real before/after, how it works, FAQs, contact |
| `catalogue.html` | Search and filter designs, preview on a wall, shortlist to WhatsApp |
| `projects.html` | Finished walls (appears as projects are published from the admin) |
| `admin.html` | Team admin (Anil, Manasa). Not linked in menus; marked noindex |

## Updating the site from the admin

1. Open `/admin.html`, pick your name.
2. Add or edit designs, projects, reviews or settings. These are **drafts on that device**.
3. Press **Publish** (bottom of the screen). The admin commits everything to this repo in one go:
   uploaded photos go to `assets/uploads/`, the data goes to `assets/published.js`.
4. GitHub Pages rebuilds in 1–2 minutes. Pages always fetch the latest content file (refreshed every minute), so changes show within ~2–3 minutes.
5. Two editors are safe: before publishing, the admin reads what is live now. If the other person published in the
   meantime, both sets of changes are combined. If you both changed the same item, the message names it and your
   version is used.

**Publishing key (once per device):** a GitHub fine-grained token with access to only this
repository and the permission *Contents: Read and write*. Create it at
GitHub → Settings → Developer settings → Fine-grained tokens. The admin keeps it in that
browser only. Remove it from Settings in the admin if a device is lost, and revoke it on GitHub.

## Uploading designs (admin → Designs → + Add design)

- Up to 10 photos at a time. Each is trimmed (plain borders), resized to 1600 px, watermarked
  (template v1 in `assets/watermark.js`: diagonal "WallBliss Studio" + corner badge with logo and code).
- Code is suggested (next free WB-0000) and can be changed; duplicates are blocked.
- Tags are mandatory (2+), hidden from customers, used by search. With the AI key, Claude fills in
  name, tags, rooms, style and multilingual search words (usually 5–10 s per photo, with a live timer;
  gives up after 45 s). "Fill in myself" skips it for one photo, "Fill all in myself" for all.
- Style: pick from the list (Traditional, Devotional, 3D, Artistic, …) or type your own; typed styles
  become catalogue filters and search words. There is no colour field.
- **Saving publishes automatically** for designs, projects, reviews and FAQs (new, edit, delete, show/hide, order). Only Settings changes wait for the Publish button. Several quick
  changes go in one commit. If the device has no publishing key yet, it asks for it once.
  The first real upload retires the sample designs.

**AI tagging key (once per device):** console.anthropic.com → API keys → create key; set a monthly
spend limit under Billing. Paste it in admin → Settings → AI tagging key. Stored on that device only.

## Adding a project (admin → Projects → + New project)

1. Add the before and after photos. They are kept whole (never cropped), only scaled to 2000 px on the longest side.
   The after photo sets the shape; a before photo of a different shape is fitted inside it with plain edges.
2. Fill in locality, space, design and size. You get **three titles and three "What we did" stories** to pick from:
   written by Claude Haiku 5.5 from both photos when the AI key is added on that device, otherwise ready-made wording
   for the room. Tap one, edit it if you like, or press ✨ New suggestions. Your own edits are never overwritten.
   The AI also sees your last 8 published titles and stories as house-style examples, so it learns your taste
   from what you actually publish (the API itself has no memory).
3. Save draft, then press **Publish** at the bottom of the admin to put it on the website.

## FAQs (admin → FAQs)

The questions on the home page come from the admin, not the code. Edit the wording, add or delete
questions, change the order with the arrows, or switch one off. Press **Publish** and the home page
updates in 1–2 minutes, including the FAQ data Google reads for search results.

- Answers are plain text. A blank line starts a new paragraph; `[link words](catalogue.html)` or `[link words](https://…)` makes a link.
- The list written in `index.html` is only a fallback for the rare visitor whose browser blocks scripts. Keep it roughly in step if you change an answer a lot.
- Two editors can change different questions at the same time; Publish keeps both changes.

## Search

`assets/search.js` + `assets/search-lexicon.js`: runs in the visitor's browser. Understands English,
Hindi, Kannada and Telugu words (Roman and native script), typos, phrases ("seven horses", "pooja room")
and broad words ("god" → Krishna, Ganesha, Surya…). To teach it a new word, add it to the right line of
`search-lexicon.js`. Each design's AI search words are searched too.

## Analytics (searches, clicks, WhatsApp taps)

Every search (including ones with no results), filter, design opened, heart, "on your wall" try and
WhatsApp tap is recorded by `WB.track` in `assets/site.js`. To see these for **all visitors**:

1. analytics.google.com → Admin → Create property "WallBliss" → Web stream for the site URL.
2. Copy the Measurement ID (`G-…`) into `assets/site.js` → `ga4Id`.
3. In GA4 → Reports → Engagement → Events you will see `search`, `search_no_results` (with `search_term`),
   `design_open` (with `code`), `whatsapp_tap` (with `where`) and the rest, plus `lead_source` from `?src=` links.

There is no visitor-numbers page in the admin; use GA4 for views, searches and WhatsApp taps.

## Google sign-in

1. console.cloud.google.com → create project "WallBliss" → APIs & Services → OAuth consent screen
   (External, app name WallBliss Admin, your email) → add test users anilkolla@gmail.com and manasa.doradla@gmail.com.
2. Credentials → Create credentials → OAuth client ID → Web application →
   Authorised JavaScript origins: `https://kollaanil.github.io` (later also `https://www.wallbliss.in`).
3. Copy the Client ID into `assets/admin-config.js` → `googleClientId`.
Allowed emails are listed in the same file.

After one sign-in the admin stays signed in on that device for 30 days (tap the avatar → Sign out to end it).
Google One Tap offers "Continue as …" with the account already in the browser; the normal button stays as a fallback.

## Domain: www.wallbliss.in

- Bought at Spaceship. DNS: `CNAME www → kollaanil.github.io`, and `A @` → 185.199.108.153 / .109.153 / .110.153 / .111.153
  (so `wallbliss.in` without www also works and redirects to www).
- The `CNAME` file in this repo holds the custom domain. Don't delete it.
- Repo Settings → Pages: custom domain `www.wallbliss.in`, Enforce HTTPS ticked.
- Google sign-in for the admin needs `https://www.wallbliss.in` in the OAuth client's Authorised JavaScript origins.
## Notes

- `assets/catalogue-data.js` holds the built-in sample designs (drawn by `assets/art.js`). Replace them with real photos from the admin.
- Hero and "Look closer" videos live in `assets/video/` (WebM for Android/Chrome, MP4 for iPhone). Posters show first; videos load after the page and are skipped on data saver.
- Analytics: paste GA4 and Microsoft Clarity snippets where each page says `<!-- Analytics -->`.
