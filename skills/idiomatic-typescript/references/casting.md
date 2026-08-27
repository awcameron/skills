# Type casting: a last resort, not a first instinct

A cast (`as X`, `as unknown as X`, or the non-null assertion `!`) tells the compiler "trust me,
stop checking this." Every cast is a place where the type system's guarantees quietly end. The
question to ask before writing one: does this cast resolve a real mismatch between two types that
are actually compatible, or does it silence an error that's correctly telling you something is
wrong?

## Prefer restructuring over casting

If a cast is needed to make an expression type-check, that's often a sign the code should be
restructured, not that the cast is the fix.

**Before:**

```ts
// `status` is a plain number; HttpStatus.INTERNAL_SERVER_ERROR is a
// specific enum member -- comparing them directly is flagged as unsafe,
// so a cast seems like the fix:
if (status >= (HttpStatus.INTERNAL_SERVER_ERROR as number)) {
  // ...
}
```

This actually trips a *second* lint rule in most TypeScript-ESLint configs
(`no-unnecessary-type-assertion`), because the cast doesn't change anything meaningful. That
contradiction is a signal the cast is the wrong tool here, not that a different cast is needed.

**After:**

```ts
// Plain numeric literal, not the HttpStatus enum member -- comparing a
// `number` against that enum directly trips no-unsafe-enum-comparison,
// and casting it to fix that then trips no-unnecessary-type-assertion.
if (status >= 500) {
  // ...
}
```

The comment carries the reasoning; the code no longer fights the type system at all.

## `as unknown as X`: a real escape hatch, used narrowly

Going through `unknown` bypasses TypeScript's "these types don't overlap enough to be a mistake"
check entirely -- it can assert literally anything is anything. That's occasionally the right
tool (a test mock that only implements the handful of members actually exercised, not a full real
interface), but it should wrap the smallest possible expression and never be reached for to route
around a mismatch you don't understand.

**Before (legitimate use):**

```ts
// SAFETY: ArgumentsHost is a large real interface; this test mock only needs
// these two methods, and the cast is scoped to exactly this object, nothing wider.
const fakeHost = {
  switchToHttp: () => ({ getResponse: () => ({ status: statusMock }) }),
} as unknown as ArgumentsHost;
```

This is fine: `ArgumentsHost` is a large real interface, the test only needs these two methods,
and the cast is scoped to exactly the mock object, nothing wider. The `SAFETY:` prefix (see
`.github/STYLEGUIDE.md`'s tag matrix) makes this kind of justification greppable across the
codebase -- but the tag is never a substitute for the explanation itself; an unjustified cast
with `// SAFETY: see above` and no actual reasoning fails this file's bar just as much as an
uncommented one.

**Before (not legitimate -- silencing a real mismatch):**

```ts
function getDiscount(user: unknown): number {
  return (user as unknown as { discountRate: number }).discountRate;
}
```

Here the cast is standing in for validation that never happened. If `user` really might not have
`discountRate`, this throws at runtime with no useful error; if it always does, `user` shouldn't
have been typed `unknown` in the first place.

**After:**

```ts
function getDiscount(user: { discountRate: number }): number {
  return user.discountRate;
}
```

Fix the input type at the boundary (or validate it there) instead of asserting past the gap
deeper in the code.

## Non-null assertion (`!`): don't use it to skip a check you need

`!` tells the compiler a value is never `null`/`undefined` here -- it doesn't make that true at
runtime. Using it in place of a real check just moves the failure from a clear type error to a
runtime crash somewhere else.

**Before:**

```ts
function getUser(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

const user = getUser(currentId)!;
console.log(user.name); // crashes with a cryptic message if the user was never found
```

**After:**

```ts
const user = getUser(currentId);
if (!user) {
  throw new Error(`No user found for id ${currentId}`);
}
console.log(user.name);
```

Same runtime behavior when the user genuinely doesn't exist, but now it fails with a message that
says what actually went wrong, at the point where the assumption was made -- not three lines
later at whatever happens to dereference the value first.

## `as const`: safe, and not really "casting" in the risky sense

Unlike the assertions above, `as const` only *narrows* a type -- it can't lie to the compiler the
way `as X` or `!` can. Reach for it whenever a literal needs to stay a literal instead of widening
to its general type (usually to satisfy a discriminated union).

**Before:**

```ts
const errorType = 'NOT_FOUND'; // widens to `string`
dispatch({ type: errorType }); // error: `string` isn't assignable to the union
```

**After:**

```ts
const errorType = 'NOT_FOUND' as const; // stays the literal type `'NOT_FOUND'`
dispatch({ type: errorType });
```

This is the safe end of the casting spectrum -- use it freely, and don't lump it in with the
riskier assertions above when reviewing.

## `satisfies`: check conformance without widening or asserting

`as X` never checks anything -- it just tells the compiler to assume the type. An explicit type
annotation checks, but widens every value to that type's general shape, even when a more specific
inferred type would be more useful downstream. `satisfies` does both at once: it verifies the
value actually conforms to a type, and keeps the narrower type TypeScript would have inferred
without the annotation.

**Before (explicit annotation -- checks, but widens):**

```ts
interface RouteConfig {
  path: string;
  method: 'GET' | 'POST';
}

const routes: Record<string, RouteConfig> = {
  users: { path: '/users', method: 'GET' },
  createUser: { path: '/users', method: 'POST' },
};

routes.users.method; // typed as 'GET' | 'POST' -- even though this entry is always 'GET'
```

**Before (`as` -- keeps the narrow type, but checks nothing):**

```ts
const routes = {
  users: { path: '/users', method: 'GET' },
  createUser: { path: '/users', method: 'POST' },
} as Record<string, RouteConfig>;
// a typo like method: 'GRT' here would compile without complaint -- `as` never verified it
```

**After:**

```ts
const routes = {
  users: { path: '/users', method: 'GET' },
  createUser: { path: '/users', method: 'POST' },
} satisfies Record<string, RouteConfig>;

routes.users.method; // typed as the literal 'GET', not the wider union -- and a typo'd
                      // method value here would still be a real compile error
```

Like `as const`, this belongs on the safe end of the spectrum -- it can't lie to the compiler,
it only confirms and preserves. Reach for it whenever an explicit annotation would be the
instinct but something downstream wants the more specific inferred type.
