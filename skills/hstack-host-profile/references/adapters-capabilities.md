# Adapters and Capabilities

Profiles declare:

- repository adapter: `github` or `gitlab`;
- CI adapter: `github-actions`, `gitlab-ci`, `external`, or `none`;
- framework conventions that create dynamic entrypoints;
- deployment providers and the source from which exact runtime identity must be obtained;
- capability policy for `read`, `edit`, `push`, `merge`, `deploy`, `delete`, and `public-disclose`;
- concurrency limits per owner, worktree, and named lane;
- evidence TTL and invalidation triggers.

Capability policies are `allowed`, `requires-explicit-authorization`, or `disabled`. They describe the profile boundary, not current authorization. `public-disclose` should default to disabled for proprietary or unknown source boundaries.

Default branches come from the repository adapter when available; profile base branches are fallbacks and additional protected integration branches, not assumptions about every host.
