# Vels Tech Billing - Web App (PWA)

This is a full installable Web App.

## Features
- Installable on Mobile & Desktop (PWA)
- Offline support
- GST Billing (CGST/SGST/IGST)
- Works as native app

## Run Locally

Requirements: Node.js and a running MongoDB instance.

1. Create the local environment files if they do not already exist:

   ```powershell
   if (!(Test-Path .env)) { Copy-Item .env.example .env }
   if (!(Test-Path server\.env)) { Copy-Item server\.env.example server\.env }
   ```

2. In `server\.env`, set `MONGODB_URI` to your MongoDB connection string and replace
   `JWT_SECRET` with a long, private random value. Never use the example secret in
   production. The backend reads configuration from `server\.env`.
3. Install frontend and backend dependencies:

   ```powershell
   npm install
   npm --prefix server install
   ```

4. Start the backend in one terminal:

   ```powershell
   npm run dev:server
   ```

5. Start the frontend in another terminal:

   ```powershell
   npm run dev
   ```

   Open the Vite URL shown in the terminal (port 5176 by default). The frontend
   reads `VITE_API_URL` from the root `.env`; restart Vite after changing it.

For mobile testing, set `VITE_API_URL` to your computer's LAN address, for example
`http://192.168.1.20:5000`, and add the frontend origin (for example
`http://192.168.1.20:5176`) to `CORS_ORIGIN` in `server\.env`. Run Vite with
`npm run dev -- --host 0.0.0.0` so other devices on the LAN can reach it.

## Build for Web Hosting
npm run build
-> dist folder will be created. Upload dist to any hosting.

## Free Hosting Options (1-click):
1. Vercel: vercel.com -> Import this folder -> Deploy
2. Netlify: netlify.com -> Drag & drop dist folder
3. GitHub Pages: Push to GitHub, enable Pages

## PWA Install
When hosted on HTTPS, users can click 'Add to Home Screen' and use it like an app.

The backend health endpoint is available at `http://localhost:5000/api/health`.

### Vercel production API

The Express backend is exposed as a Vercel serverless API under `/api/*`.
Production builds use the same origin when `VITE_API_URL` is not set. In the
Vercel project's **Production** Environment Variables, configure:

- `VITE_API_URL` — the public production origin, e.g.
  `https://vels-tech-billing-app.vercel.app`
- `MONGODB_URI` — the existing MongoDB Atlas connection string (sensitive)
- `JWT_SECRET` — a randomly generated secret of at least 32 bytes (sensitive)
- `CORS_ORIGIN` — the production frontend origin; Vercel deployment and project
  production URLs are also allowed automatically

Store `MONGODB_URI` and `JWT_SECRET` as sensitive Vercel variables; never use a
`VITE_` prefix for secrets. Redeploy after adding or changing environment
variables. Verify `/api/health` returns successfully and test valid and invalid
registered accounts against `/api/auth/login`.
