# Imports and module organization

A module's imports and exports are its public contract with the rest of the codebase. Most import
*ordering* is handled by a tool once one's configured (`eslint-plugin-simple-import-sort`,
`perfectionist`, or similar) -- the judgment calls worth making by hand are about what a barrel
file exposes and how modules depend on each other, not what order the lines appear in.

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
