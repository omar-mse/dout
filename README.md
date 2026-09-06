# Me Too

Students ask their professor anonymously. Classmates tap **Me too**. The count breaks pluralistic ignorance: the private belief that you are the only one who did not get it.

Built for GDC RIT Dubai DesignAthon 2026. Static site, no backend: doubts and Me too counts live in the browser's local storage, seeded with a demo lecture.

## Pages

- `index.html` – landing
- `feed.html` – the live doubt grid (ask, Me too, filters)
- `problem.html` – the required **Problem & Solution** page
- `professor.html` – password-gated professor dashboard

Demo password for the dashboard: `professor` (also shown under the password box). Change it in `js/professor.js` (`DEMO_PASSWORD`).

The course, lecture and professor display name are set in one place: `meta()` in `js/store.js`. The professor name is what students see above a written reply, so change it there rather than in the feed.

Theme picker (five heat palettes + dark mode) is in the nav; choices are saved per browser.

## Publish on GitHub Pages

1. Create a GitHub repository and upload every file and folder here (`index.html`, `feed.html`, `problem.html`, `professor.html`, `css/`, `js/`).
2. In the repository, open **Settings → Pages**, choose **Deploy from a branch**, pick `main` and `/ (root)`, save. The site appears at `https://<your-username>.github.io/<repo-name>/`.

## Run locally

Open `index.html` directly, or serve the folder:

```
python -m http.server 8000
```

then visit `http://localhost:8000/`.
