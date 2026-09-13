# dout

Students ask their professor anonymously. Classmates tap **Me too**. The count breaks pluralistic
ignorance: the private belief that you are the only one who did not get it.

Live at **[dout.me](https://dout.me)**.

Static site — no build step, no backend. Plain HTML, one stylesheet, nine vanilla JS modules, and
one vendored library: GSAP 3.15.0 with ScrollTrigger (`js/vendor/`), used by the landing page only. Doubts and Me too counts live in the visitor's own browser (`localStorage`), seeded with
a demo lecture so a first visit lands on full boards rather than empty ones. Nothing syncs between
devices or people yet; the feed says so on the board itself.

## Pages

| Page | What |
|---|---|
| `index.html` | Landing. First visit gets a seven-step tour, skippable from the first frame. |
| `feed.html` | Subject picker, then one subject's board: ask, Me too, and the most/newest/answered filters. |
| `problem.html` | The Problem & Solution write-up and the research behind it. |
| `professor.html` | Professor dashboard: doubts ranked by Me too, replies, next-class agenda. |

## The professor dashboard

**There is no password.** Pick a subject on the gate and it opens; a line under the button says so
and says why. Every doubt in this build lives in the visitor's own browser, so there is nothing to
authenticate against, and a lock that stops nobody would claim a protection this does not have. A
real deployment puts the university's sign-in in that spot.

The session remembers the one subject that was opened rather than a blanket "logged in", so the
dashboard can only ever show that class. **Lock & switch subject** clears it.

Subjects, course codes and professor display names all come from one place: `SUBJECTS` at the top of
`js/store.js`. The professor name is what students see above a written reply, so change it there
rather than in the feed. Each dashboard also has a **Reset demo data** button, which restores that
one subject's seeded doubts and leaves the other four alone.

## Layout

| Path | What |
|---|---|
| `css/styles.css` | The whole design system; tokens in `:root`. |
| `js/store.js` | localStorage state, normalisation, heat and size derivation. |
| `js/theme.js` | Palette and dark mode. Loaded synchronously in `<head>` so the theme never flashes. |
| `js/ui.js` | Shared nav, theme popover, toast, scroll reveal. |
| `js/landing.js` · `js/feed.js` · `js/professor.js` | One per page. |
| `js/cursor.js` | The pointer: the favicon's yellow-in-black square following a fine pointer. Touch, reduced motion and text fields keep the system cursor. |
| `js/hero.js` · `js/story.js` | Landing only: the hero's load-in and the scroll-driven story after it. Both are additions to a finished page — no JS, reduced motion or a hidden tab gets the same page, still. |
| `js/vendor/` | GSAP 3.15.0 and ScrollTrigger, unmodified, under GreenSock's standard licence. |
| `js/stickers.js` | Drag-and-drop sticker layer behind the page (landing and feed only). |
| `js/tour.js` | The first-visit tour (landing only). |
| `img/stickers/` | The stickers themselves. Add a file here and list its name in `SHEET` in `js/stickers.js`. |
| `fonts/` | Self-hosted Archivo and Space Mono, SIL Open Font License 1.1 (see `fonts/OFL.txt`). |

Theme picker (five heat palettes plus dark mode) is in the nav, and every choice is saved per
browser — as are stickers, the tour's "seen" flag, and the boards themselves.

## Run locally

Open `index.html` directly, or serve the folder:

```
python -m http.server 8000
```

then visit `http://localhost:8000/`. Both paths work: nothing here uses `fetch`, so the site runs
from `file://` as well as over HTTP.

To see the site as a first-time visitor again, clear the keys under `dout.` and `metoo.` in
localStorage (DevTools → Application → Local Storage), or just open a private window.

## Publish on GitHub Pages

Everything that ships is committed: the four HTML pages, `css/`, `js/`, `img/` and `fonts/`. In the
repository, open **Settings → Pages**, choose **Deploy from a branch**, pick `main` and `/ (root)`,
and save. Nothing is live until `main` is pushed.
