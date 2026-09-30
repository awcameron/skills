---
name: upgrade-dependency
description: >-
  Bump a dependency the repo already uses to a target or latest version through the repo's own
  package manager -- reading release notes across the whole version range, checking which breaking
  changes the code actually touches, and running the tests. Use when the user asks to "upgrade X",
  "bump this dependency", "update to the latest version", "is it safe to upgrade", or to update an
  outdated or vulnerable package. Not for adding a new dependency.
allowed-tools: [Read, Grep, Glob, Edit, WebFetch, Bash(git diff:*), Bash(git log:*), Bash(git show:*), Bash(gh release list:*), Bash(gh release view:*), Bash(npm outdated:*), Bash(npm view:*), Bash(npm install:*), Bash(npm dedupe:*), Bash(npm ls:*), Bash(yarn upgrade:*), Bash(yarn add:*), Bash(yarn info:*), Bash(yarn dedupe:*), Bash(pnpm update:*), Bash(pnpm add:*), Bash(pnpm outdated:*), Bash(pip list:*), Bash(pip install:*), Bash(poetry show:*), Bash(poetry add:*), Bash(cargo update:*), Bash(cargo outdated:*), Bash(go get:*), Bash(go list:*), Bash(mvn versions:display-dependency-updates:*), Bash(mvn versions:use-latest-releases:*), Bash(mvn versions:set-property:*), Bash(mvn dependency:tree:*), Bash(./gradlew dependencies:*), Bash(./gradlew dependencyUpdates:*), Bash(npm test:*), Bash(npm run test:*), Bash(pnpm test:*), Bash(pnpm run test:*), Bash(yarn test:*), Bash(yarn run test:*), Bash(npx vitest:*), Bash(npx jest:*), Bash(pytest:*), Bash(python -m pytest:*), Bash(cargo test:*), Bash(go test:*), Bash(mvn test:*), Bash(./gradlew test:*)]
---

# Upgrade Dependency

This skill bumps one already-in-use dependency, grounded in what the version jump actually
changes -- not "bump and see what breaks."

## Step 1: Determine the target and discover the repo's own package manager

Which package, its currently-installed version, and the target (a named version, or
"latest"/"outdated" if the user didn't say). Confirm the manager from what's actually present --
usually a lockfile (`package-lock.json`/`yarn.lock`/`pnpm-lock.yaml`, `poetry.lock`, `Cargo.lock`,
`go.sum`), but **not every ecosystem has one by convention**: Maven resolves from `pom.xml` alone
with no lockfile at all, and Gradle's dependency locking (`gradle.lockfile`) is opt-in and often
absent even in a real Gradle project. For those, key discovery off the manifest/build file itself
(`pom.xml`, `build.gradle`/`build.gradle.kts`, `settings.gradle[.kts]`) rather than expecting a
lockfile to confirm it.

**When more than one version of the same package is already live** (e.g. one workspace pinned to
an old major while a transitive dependency elsewhere already pulled in a newer one), "upgrade to
vN" means the actual latest vN release, not whatever version happens to already be present
somewhere in the tree -- check the registry (`npm outdated`/`npm view`, etc.), don't just match
what a transitive dependency happened to land on.

Before treating anything as in scope, check whether the repo documents an area as legacy or
off-limits (an `AGENTS.md`/`CONTRIBUTING.md` boundary, a deprecated package slated for removal) --
a monorepo with a quarantined legacy sibling is common, and that boundary applies here too.

## Step 2: Read the actual changelog across the whole range being crossed

Not just the newest entry -- every major crossed on the way from current to target.

**Don't read the locally installed copy's changelog.** Before the bump, what's on disk
(`node_modules/<pkg>/CHANGELOG.md`, a vendored or site-packages copy) is the *current* version, so
its changelog stops exactly where the range you need begins. Read notes that reach the target:

1. **Find the source repo** from the registry's metadata, not a guess -- e.g.
   `npm view <pkg> repository.url`, the PyPI/crates.io/RubyGems project page's source link, or a
   Go module path.
2. **Release notes for every version in the range** -- for a GitHub-hosted package,
   `gh release list -R <owner>/<repo>` to see which tags fall between current and target, then
   `gh release view <tag> -R <owner>/<repo>` for each major (and any minor whose notes mention a
   breaking change or deprecation).
3. **The changelog/migration guide as of the target tag**, when release notes are thin or just
   point to it -- fetch the file at that tag
   (`https://raw.githubusercontent.com/<owner>/<repo>/<tag>/CHANGELOG.md`, or the project's
   hosted migration guide) with `WebFetch`.

If none of these reach the target version, say so in the report rather than treating an empty
read as "no breaking changes."

## Step 3: Extract concrete breaking-change items from that range

A renamed export, a changed default, a removed API, a new required config, a changed CLI flag, a
stricter validation rule. Skip anything that's just a feature addition or internal refactor with
no surface change.

## Step 4: Grep the repo for real usage of each flagged item

A breaking change the repo's code never touches is noise here, not a risk. Only what Step 3 flags
*and* Step 4 confirms is actually used gets carried into Step 7.

## Step 5: Apply the bump through the package manager's own mechanism

`npm install pkg@version`, `poetry add pkg@version`, `cargo update -p pkg --precise version`, etc.
-- never by hand-editing a version string and leaving the lockfile stale.

**Maven and Gradle don't have a single "install this version" command** the way npm/poetry/cargo
do -- the version lives directly in the manifest. Use `mvn versions:set-property`/`mvn
versions:use-latest-releases -Dincludes=<pkg>` where the plugin's already in the build, or edit the
`<version>`/property in `pom.xml` directly; for Gradle, edit the version in `build.gradle[.kts]` or
its version catalog (`gradle/libs.versions.toml`) if the repo uses one. Either way this is still
"the manager's own mechanism" in spirit: the source of truth for the version, not a copy of it.

**Installing the version and actually deduplicating a workspace tree are different outcomes.** In
a monorepo, a plain install can leave several copies of the same package nested under different
consumers even after the direct dependents are bumped -- if the goal is one shared copy (or if
duplication was the whole reason for the upgrade), run the package manager's own dedupe (`npm
dedupe`, `yarn dedupe`, etc.) and verify with something like `npm ls <pkg>` that there's actually
one copy left, not just that the package.json version strings changed.

## Step 6: Run the repo's own test suite and separate real breakage from noise

Not just whatever the default `test` script runs -- check whether the repo's own docs call out
additional checks that a green default pipeline doesn't cover (a smoke test proving the app
actually boots, an e2e suite against a real dependency) and treat those as part of "the test
suite" if the repo's own history explains why they exist separately.

A flaky test or an already-broken suite isn't this bump's fault -- confirm by checking whether the
same failure exists before the bump too, if there's any doubt.

## Step 7: Apply the specific migration fix for anything confirmed as actually hit

Judge the gate by blast radius, not edit count. The same mechanical change applied identically at
twenty call sites is still trivial if it's a pure syntax rename with no behavior change; the same
edit applied once is not trivial if it changes what a shared/public contract actually accepts or
rejects. Anything that touches validation behavior, a public interface, or a decision with more
than one reasonable answer (e.g. "loosen back to the old behavior" vs. "adopt the new, stricter
one") needs the diff shown and confirmation waited on -- a real stop, not a note-and-proceed.

## Step 8: Report

What was bumped (from -> to), which breaking changes applied to this repo and how they were
handled, which didn't apply and why, and the real test results.
