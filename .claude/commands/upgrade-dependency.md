---
description: Safely bump a dependency -- real changelog, real usage check, real test results
---

Invoke the skills:upgrade-dependency skill against: $ARGUMENTS

Discover the repo's own package manager, read the actual changelog/migration guide across the
whole version range being crossed, grep the repo for real usage of anything flagged as breaking,
apply the bump through the package manager's own mechanism (verifying an actual dedupe in a
workspace, not just a version-string change), run the repo's real test coverage, and apply only
the migration fixes confirmed as actually needed -- showing the diff first for anything beyond a
trivial, behavior-preserving change.
