# pre-text-playgroud

Small playground repo for experimenting with [`@chenglou/pretext`](https://github.com/chenglou/pretext) in a local web app.

## What it does

- Gives you a local browser page with a text input and a live stage.
- Uses `pretext` to lay the pasted text out line by line inside that stage.
- Animates a little SVG dog across the lines and clips them away like it is eating the page.

## Getting started

```bash
npm install
npm run build
npm run serve
```

Then open `http://localhost:4173`.

## Notes

- The repo name intentionally matches your requested spelling: `pre-text-playgroud`.
- This version is intentionally not an extension anymore.
- Normal web apps cannot reliably take over arbitrary third-party pages, so this app gives you a local stage where you can paste text from any URL and still experiment with the layout and animation.
- `pretext` is doing the multiline layout work here; the dog animation uses the resulting line widths to decide how the chewing should progress.
