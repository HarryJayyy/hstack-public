# HStack Repository Instructions

HStack is open-source software licensed under the MIT License. Repository visibility changes,
release publication, and package publication still require explicit owner authorization. Do not
copy source from researched upstream projects without a concrete need and license review.

## Development

- Support Node.js 20 or newer with no runtime dependencies unless a dependency is clearly justified.
- Keep the six skills composable; do not turn `hstack-mode` into a duplicate of every specialist skill.
- Use `apply_patch` for source edits.
- Add or update deterministic tests for router, profile, inventory, or fingerprint behavior.
- Before pushing, run `npm test`, `npm run validate`, `npm run package:plugin`, the plugin validator
  against both the source root and `dist/hstack`, and all six skill validators in both locations.
- Never make inventory perform fetch, checkout, stash, prune, merge, push, or deletion.
- Preserve `PASS`, `VIOLATION`, `INCOMPLETE`, `STALE`, and `UNKNOWN` as distinct machine states.
- Treat capability declarations as profile boundaries, never task authorization.
- Public handoffs must be redacted for secrets and private absolute paths before any separately authorized disclosure.
- HStack may add stricter controls to an external host, but it must never weaken or claim to replace that host's mandatory process.

## Source boundary

Do not vendor third-party source without explicit owner authorization, a concrete need, and license
review. Portable HStack skills, profiles, examples, and manuals must not contain host-project-specific
policy, identifiers, secrets, or source. HStack's MIT license applies only to HStack; using it in a
host repository does not change that repository's license or disclosure boundary.
