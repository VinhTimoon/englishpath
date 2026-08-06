# EP1-ST042 Supabase Browser SDK Approval

## Request

Approve exact dependency `@supabase/supabase-js@2.110.7` for `apps/web` so the auth
gateway can use supported Supabase browser session, refresh, logout, signup, password
login, and recovery behavior.

## Review

- Registry check date: 2026-07-17.
- License: MIT.
- Repository: `https://github.com/supabase/supabase-js`, package directory
  `packages/core/supabase-js`.
- Exact first-party package family: auth, PostgREST, storage, realtime, and functions
  packages at `2.110.7`.
- Risk: broader dependency surface than auth-only usage and browser session persistence.
- Mitigation: exact pin plus lockfile integrity, only public Supabase URL/publishable key
  in browser environment, no service-role key, and all application authorization remains
  backend-owned.

## Status

Approved by owner on 2026-08-06. The exact dependency `@supabase/supabase-js@2.110.7`
is authorized for `apps/web`; the lockfile must retain the exact version and browser
configuration may contain only the public Supabase URL and publishable key. The local
auth adapter remains the credential-free test path, and no service-role key or backend
authorization boundary may move into the browser.
