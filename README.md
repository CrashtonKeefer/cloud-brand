# Cloud Studios Community Site

The public site is static HTML. On Vercel, `/admin` opens a password-protected editor for the three community cards. The editor stores names, invite codes, and logo paths in Neon Postgres; the public page loads saved cards from `/api/communities` and keeps its built-in cards as a fallback.

## Deploy to Vercel

1. Import this repository into Vercel.
2. Create a Neon Postgres database and add its connection string as `DATABASE_URL` in the Vercel project environment variables.
3. Add `ADMIN_PASSWORD` with a strong, unique password.
4. Add `ADMIN_SESSION_SECRET` with a randomly generated value. Generate one locally with `openssl rand -base64 48`; do not commit it or send it in chat.
5. Redeploy, then open `https://your-domain.example/admin` and sign in.

The first API request creates and seeds the community table. Configure the variables for every Vercel environment where the Admin panel should work.

## Run Locally

Install packages with `npm install`, copy `.env.example` to `.env.local`, and set the same three variables using your own Neon database and Admin credentials. Then run:

```sh
npm run dev
```

Open `http://localhost:4173` for the public page or `http://localhost:4173/admin` for the editor. The local server uses the same API handlers as Vercel.

Run `npm test` for input/session/API tests and `npm run check` for JavaScript syntax checks. Never commit `.env.local` or place database credentials in browser code.