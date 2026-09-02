# NutriPanda Dashboard

One dashboard deployment supports two roles:

- `admin` can use every dashboard section.
- `blog_editor` is sent to `/dashboard/blog`, sees only Blog navigation, and is
  authorized only for role-scoped blog APIs.

The website/API owns authentication, signed sessions, rate limiting, and every
server-side authorization check. The full admin manages blog editor emails and
passwords from **Blog Access**; salted password hashes and session versions are
stored in Supabase. Hiding dashboard links is not the security boundary.

## Local development

Create `.env.local` from `.env.example`, then run the website/API and dashboard
in separate terminals:

```bash
# In nutri-panda (website and API)
npm run dev

# In nutri-panda-dashboard
npm run dev
```

The website/API runs at `http://localhost:3002` and this dashboard runs at
`http://localhost:3000`.

## Login flow

1. Everyone opens `http://localhost:3000` (or the production dashboard URL).
2. The admin enters `ADMIN_PASSWORD`; the email may be left blank for backward
   compatibility, or may match `ADMIN_EMAIL` when configured.
3. The admin opens **Blog Access** and creates an editor email/password.
4. A blog editor enters those assigned credentials on the same login page.
5. The website/API creates a signed, HTTP-only session containing the role and
   current database session version.
6. Admins land on `/dashboard`; blog editors land on `/dashboard/blog`.
7. The API rejects a blog editor who manually calls orders, products, coupons,
   inventory, shipping, or generic product-upload endpoints.

Deleting an editor immediately revokes their access. Resetting their password
also invalidates all existing sessions for that editor.

Configure account credentials, `DASHBOARD_SESSION_SECRET`, `RATE_LIMIT_SECRET`,
`ORDER_ACCESS_SECRET`, and `ADMIN_DASHBOARD_URL` on the website/API deployment.
See `DASHBOARD_ACCESS.md` in that repository for the complete setup and required
Supabase migrations.

## Production

Set the existing dashboard deployment to the public website/API origin:

```env
NEXT_PUBLIC_API_URL=https://nutripanda.in
```

Use an `admin.nutripanda.in`-style custom domain for the same dashboard
deployment when possible. Keeping both apps under the same parent site improves
credentialed-cookie compatibility; it does not require a second deployment.

Before releasing, run:

```bash
npm run lint
npx tsc --noEmit
npm run build
```
