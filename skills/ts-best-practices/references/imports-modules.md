# Imports and module organization

A module's imports and exports are its public contract with the rest of the codebase. Most import
*ordering* is handled by a tool once one's configured (`eslint-plugin-simple-import-sort`,
`perfectionist`, or similar) -- the judgment calls worth making by hand are about what a barrel
file exposes, how modules depend on each other, and what belongs together in one module, not what
order the lines appear in.

## `export *` silently expands what's public

A wildcard re-export means every name in the source file becomes part of the barrel's public API
automatically -- including a helper someone adds later intending to keep it internal to that one
file.

**Before:**

```ts
// utils/index.ts
export * from './formatDate';
export * from './parseCsv';
```

Six months later, someone adds a small private helper inside `formatDate.ts` for their own use
within that file. With `export *`, it's now importable from `utils` by anything in the codebase --
silently, with no diff to `index.ts` itself signaling that the public surface just grew.

**After:**

```ts
// utils/index.ts
export { formatDate } from './formatDate';
export { parseCsv } from './parseCsv';
```

Now the barrel file itself is the definition of what's public. Adding an internal helper inside
`formatDate.ts` is a no-op for every consumer; exposing something new requires a visible, deliberate
edit to this file. This matters most for modules with any side effects (registration, subscriptions,
DI) where an accidentally-exposed internal is a correctness risk, not just an API-surface nit --
for a purely side-effect-free, rarely-changing utility file, the risk is lower, but the explicit
form still costs nothing and stays consistent.

## Group imports by origin, and let a tool enforce it

Manually-ordered imports drift over time as lines get added and removed; a config-driven sort
keeps them consistent without anyone thinking about it on every edit.

**Before:**

```ts
import { useState } from 'react';
import { formatDate } from '../utils/formatDate';
import axios from 'axios';
import { Button } from './Button';
```

**After (external packages, then internal, blank line between -- exactly what a sort plugin
enforces automatically once configured):**

```ts
import axios from 'axios';
import { useState } from 'react';

import { formatDate } from '../utils/formatDate';
import { Button } from './Button';
```

If a project has an import-sort rule configured, don't hand-order imports against it -- let
`--fix` handle it, and spend the review attention on whether the imports themselves make sense
(is this module reaching into another module's internals it shouldn't?), not their line order.

## Watch for circular dependencies from over-centralized barrels

Two modules importing from each other -- directly or through a shared barrel -- creates a
dependency cycle. It doesn't always fail loudly: a cycle where each module only reaches for the
other *inside a function body* often works fine, because by the time that function actually runs,
both modules have finished loading. It's a cycle where one module needs the other's value
*immediately*, while it's still being evaluated, that genuinely breaks -- and which side of that
line a change falls on isn't obvious from the import statements alone.

**Before:**

```ts
// a.ts
import { b } from './b';
export const a = b + 1; // reads `b` immediately, while this module is evaluating

// b.ts
import { a } from './a';
export const b = a + 1; // reads `a` immediately too
```

Whichever of these two modules happens to be evaluated first will, at the line reading the
other's export, find it not yet initialized -- a `ReferenceError` under strict ESM semantics, or
`undefined` propagating silently into `a + 1`/`b + 1` under CommonJS's looser interop. Which
module "happens to be evaluated first" depends on import order elsewhere in the program, so this
can work by accident for a long time before an unrelated change in import order surfaces it.

**After:**

```ts
// shared.ts
export const base = 1;

// a.ts
import { base } from './shared';
export const a = base + 1;

// b.ts
import { base } from './shared';
export const b = base + 1;
```

Extracting the piece both modules actually depend on into a third module (or restructuring so the
dependency is genuinely one-directional) resolves the cycle instead of relying on both modules'
own load order, and function-body deferral, to keep saving it.

## Prefer named exports -- a default export's name is a fiction

A default export has no fixed name of its own; every importer picks whatever name it wants, and
nothing keeps those names consistent with each other or with the file that defines it.

**Before:**

```ts
// formatDate.ts
export default function formatDate(date: Date): string { /* ... */ }

// consumer.ts
import formatToday from './formatDate'; // any name compiles -- typos and drift both go unflagged
```

A rename of the source function doesn't propagate anywhere; every importer's chosen name is
independent of it. An automated rename tool also can't reliably rename a default export's local
name across the codebase the way it can a named one, because there's no shared identifier to
search for.

**After:**

```ts
// formatDate.ts
export function formatDate(date: Date): string { /* ... */ }

// consumer.ts
import { formatDate } from './formatDate';
```

Now every importer uses the same name, a rename tool can update every call site in one pass, and a
typo'd import name is a compile error instead of a silently different local binding. Reach for a
default export only where the ecosystem specifically expects one (a framework's page/route file
convention, e.g. Next.js's `pages/`), not as the default choice for an ordinary module.

## Split a module by what changes together

`classes.md` covers the god class. Most TypeScript has no class to grow that big: the same problem
shows up as a module of plain functions that collects one job after another, because each new
function was easiest to put next to the types it uses. Line count is a symptom, not the test. The
test is whether unrelated changes keep landing in the same file, and whether changing one job
means loading all the others to see what it touches.

**Before:**

```ts
// report.ts: about 600 lines
export const ReportFile = z.strictObject({ /* the saved file's schema */ });
export function scoreRow(row: Row): Score { /* scoring rules */ }
export function totals(rows: Row[]): Totals { /* aggregation */ }
export function migrate(old: ReportFile): ReportFile { /* upgrading old saved files */ }
export function toMarkdown(file: ReportFile): string { /* table rendering */ }
```

Changing a column header means opening the scoring rules. Almost every other module imports
`report.ts`, so it also tends to be the file that closes an import cycle (see above).

**After:**

```ts
// report/schema.ts    ReportFile and its types: what's saved
// report/scoring.ts   scoreRow, totals: the rules
// report/migrate.ts   migrate: reading old files
// report/markdown.ts  toMarkdown: presentation
```

Each file changes for one reason. Callers import from the file they need (`./report/markdown`),
not through a new `report/index.ts` barrel, so the split doesn't recreate one big public surface
(see `export *` above).

Before splitting, inline any helper used only once, so the real seams show. Split along the
responsibilities that appear, not into generic `utils.ts` and `helpers.ts` files. And don't split
a file just for being long: a module that's mostly data, such as a list of fixtures, can stay long,
and one coherent job in 400 lines beats the same job spread over five files (see `functions.md`,
"Small functions, but not fragmented past the point of context").
