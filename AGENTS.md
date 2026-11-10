<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cloud Agent

- Install dependencies with `npm ci`. The Next.js app runs with `npm run dev` on port 3000.
- The published site is the static pages at the repo root (`index.html`, `escrow.html`, `instant.html`, `user-guide.html`). On boot they are served on port 8080.
- Open the Next app at `http://localhost:3000` or `http://127.0.0.1:3000`. `next.config.ts` allows `127.0.0.1` so dev assets are not blocked.
- `npm run lint` fails on existing issues in `src/app/page.tsx` and `vendor/ethers-6.11.1.umd.min.js`. `npx tsc --noEmit` and `npm run build` succeed.
