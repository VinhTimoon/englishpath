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

Awaiting owner approval. Do not install until approved. The local auth adapter keeps the
vertical slice testable without credentials while this request is pending.
