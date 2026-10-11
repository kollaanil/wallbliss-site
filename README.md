# WallBliss Studio website

Live site: https://kollaanil.github.io/wallbliss-site/ (served by GitHub Pages from the `main` branch).

| Page | What it does |
|---|---|
| `index.html` | Home: hero video, wall stories, real before/after, how it works, FAQs, contact |
| `catalogue.html` | Search and filter designs, preview on a wall, shortlist to WhatsApp |
| `projects.html` | Finished walls (appears as projects are published from the admin) |
| `wallpaper-vs-wall-printing.html` | Guide that answers "wallpaper or wall printing?" searches |
| `admin.html` | Team admin (Anil, Manasa). Not linked in menus; marked noindex |

## Updating the site from the admin

1. Open `/admin.html`, pick your name.
2. Add or edit designs, projects, reviews or settings. These are **drafts on that device**.
3. Press **Publish** (bottom of the screen). The admin commits everything to this repo in one go:
   uploaded photos go to `assets/uploads/`, the data goes to `assets/published.js`.
4. GitHub Pages rebuilds in 1–2 minutes. Browsers may keep the old version for up to 10 minutes.

**Publishing key (once per device):** a GitHub fine-grained token with access to only this
repository and the permission *Contents: Read and write*. Create it at
GitHub → Settings → Developer settings → Fine-grained tokens. The admin keeps it in that
browser only. Remove it from Settings in the admin if a device is lost, and revoke it on GitHub.

## Moving to wallbliss.in later

1. Replace `https://kollaanil.github.io/wallbliss-site` with `https://www.wallbliss.in` in all files.
2. Add a file `CNAME` containing `www.wallbliss.in`.
3. At the domain registrar: a `CNAME` record for `www` pointing to `kollaanil.github.io`.
4. Repo Settings → Pages → Custom domain → `www.wallbliss.in`, tick *Enforce HTTPS*.

## Notes

- `assets/catalogue-data.js` holds the built-in sample designs (drawn by `assets/art.js`). Replace them with real photos from the admin.
- Hero and "Look closer" videos live in `assets/video/` (WebM for Android/Chrome, MP4 for iPhone). Posters show first; videos load after the page and are skipped on data saver.
- Analytics: paste GA4 and Microsoft Clarity snippets where each page says `<!-- Analytics -->`.
