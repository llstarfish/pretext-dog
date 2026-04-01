# Hungry Hungry Doggo

A timed word-eating browser game built with [Next.js](https://nextjs.org) and [`@chenglou/pretext`](https://github.com/chenglou/pretext).

Control a dog as it races across lines of text, chomping words before the clock runs out. Compete for a spot on the global leaderboard.

## How to play

1. Enter your name on the start screen and hit **Play**.
2. Move fast to eat words — the dog devours text as it runs.
3. **Left-click** to bark. **Right-click** to poop (resets your size).
4. You have **30 seconds**. Eat as many characters as you can!
5. When time's up your score is saved and the leaderboard appears.

## Getting started

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

### Environment variables

The leaderboard uses [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres). Set `POSTGRES_URL` (or the variables provided by Vercel) to enable score persistence. Without a database the app still runs — the leaderboard will just be empty.

## Tech stack

- **Next.js 15** (App Router)
- **React 19**
- **@chenglou/pretext** — multiline text layout powering the word positions
- **Canvas** — dog animation and rendering
- **@vercel/postgres** — leaderboard storage

## Credits

In-game article text from [*"Agency is Eating the World"*](https://giansegato.com/essays/agency-is-eating-the-world) by Gianluca Segato.
