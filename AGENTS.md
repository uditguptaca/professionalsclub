<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Design law (from the 2026-08 UI/UX audit — keep these true)

- Orange **text** uses `var(--text-accent)`; `--primary-600` is for fills,
  borders and icons only (3.5:1 as text — fails AA). Fills carrying a white
  label use `--primary-700`. Small green text: `var(--success-600)`; small
  amber text: `var(--accent-700)`.
- On dark sections, muted copy is `var(--gray-300)` or `rgba(255,255,255,0.8)`,
  never `--text-muted` (a light-background token).
- Never build CSS by appending alpha digits to a var() string (`${color}20`)
  — it's invalid and React drops it silently. Use `rgba()`.
- Destructive confirmations go through `useConfirm()` from
  `src/components/portal/confirm.tsx`, never `window.confirm/alert/prompt`
  (the WebView captions those "localhost says…").
- Full-page loading uses `<PortalLoading />` (skeleton), not a centred spinner;
  spinners are for buttons and row-level refreshes only.
- Failures must be surfaced inline (`role="alert"`, class `community-error`),
  never `console.error` alone, and never by clearing what the user typed.
- Every input needs a programmatic label (`htmlFor`+`id`, or `aria-label`).
- `matrimony_profiles.gender` stores `'Male'/'Female'` — compare with
  `?.toLowerCase()`, and case-insensitively in SQL.
- Site-wide community figures come from `src/lib/site-stats.ts` only.
