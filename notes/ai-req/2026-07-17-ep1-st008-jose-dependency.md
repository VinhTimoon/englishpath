# AI Request: EP1-ST008

## Category

dependency / security

## Summary

Approve adding `jose@6.2.3` as a production dependency of `apps/api` for standards-based
Supabase JWT signature and claims verification. The repository currently has no vetted
JWT verification package, and custom cryptography is explicitly forbidden.

## Evidence

- Package: `jose@6.2.3`, published through npm from `panva/jose`.
- Checked: 2026-07-17.
- License: MIT.
- Repository: `https://github.com/panva/jose`, approximately 7.6k stars when checked.
- Package characteristics: ESM, zero transitive runtime dependencies, supports local and
  remote JWKS plus JWT claim validation, and is compatible with the API's NodeNext setup.
- Registry integrity pin:
  `sha512-YYVDInQKFJfR/xa3ojUTl8c2KoTwiL1R5Wg9YCydwH0x0B9grbzlg5HC7mMjCtUJjbQ/YnGEZIhI5tCgfTb4Hw==`.
- `pnpm-lock.yaml`, `apps/api/package.json`, and repository search confirm the dependency
  is not currently installed.

## Attempts

- Reused the existing access ports, bearer parser, policy contracts, and identity
  repositories where possible.
- Checked current API dependencies for `jose`, `jsonwebtoken`, `passport-jwt`, and JWKS
  verification support; none is available.
- No package was installed and no custom signature implementation was attempted.

## Risk Assessment

- Supply-chain exposure is comparatively limited because the package has no runtime
  dependencies, but npm publisher/release compromise remains possible.
- Pinning the exact version and lockfile integrity prevents an unreviewed floating update.
- The implementation will allow-list expected algorithms and validate issuer, audience,
  expiry, not-before, and subject; decoded JWT role/email claims will not grant app roles.
- Tests will use generated local keys without Supabase credentials or network access.
- Future upgrades require a separate dependency review rather than an automatic major
  version change.

## Decision Needed

Approve or reject installation of exact dependency `jose@6.2.3` in `apps/api`. Approval
permits updating `apps/api/package.json` and `pnpm-lock.yaml` only within `EP1-ST008`.

## Impact

`EP1-ST008` cannot safely implement the production Supabase verifier until approved.
Other independent stories may continue on `dev`; auth UI and protected onboarding remain
blocked behind this API story.
