# Type design: enums, unions, and interface vs. type

TypeScript usually offers more than one way to declare the same shape. The differences aren't
cosmetic -- each option trades away something (exhaustiveness safety, structural flexibility,
serialization behavior) for something else, and the right default depends on which trade-off the
situation actually calls for.

## Numeric enums accept values that were never declared

**Before:**

```ts
enum Status {
  Pending,
  Active,
  Archived,
}

function setStatus(status: Status) {
  /* ... */
}

setStatus(99); // compiles -- TypeScript numeric enums are not a closed set at the type level
```

A numeric enum is really just a set of named numbers; nothing stops any other number of the same
type from being passed in. String enums close that particular gap, but bring their own friction
(a runtime object has to exist, and refactoring an enum member's name is a breaking change for
anything that serialized the enum by name across a boundary).

**After (string literal union -- closed, and needs no runtime object):**

```ts
type Status = 'pending' | 'active' | 'archived';

function setStatus(status: Status) {
  /* ... */
}

setStatus('shipped'); // error: not assignable to Status
```

This is closed at the type level (only the three listed strings are valid), serializes as plain
strings with no enum-object indirection, and needs nothing imported at runtime to use. Reach for
an actual `enum` only when something genuinely needs the runtime object it produces (iterating all
members, or a framework that specifically expects one) -- most "a value is one of these known
options" cases are better served by a literal union.

## A related option: `as const` objects, when you want both a value and its keys

**Before (duplicating the same list in a type and a value):**

```ts
type Status = 'pending' | 'active' | 'archived';

const STATUS_LABELS: Record<Status, string> = {
  pending: 'Pending',
  active: 'Active',
  archived: 'Archived',
};
```

Nothing keeps `Status` and the keys of `STATUS_LABELS` in sync if one changes without the other --
they're two separate sources of truth for the same set of values.

**After:**

```ts
const STATUS = {
  pending: 'pending',
  active: 'active',
  archived: 'archived',
} as const;

type Status = (typeof STATUS)[keyof typeof STATUS];
```

The type is derived from the value (or vice versa, depending which one is more natural to author
first) instead of duplicated by hand -- adding a member in one place is a compile error everywhere
that assumed the old set was exhaustive, rather than a silent drift.

## `interface` for object shapes callers extend or implement; `type` for everything else

Both declare object shapes, and for a plain, never-extended object shape it genuinely doesn't
matter which is used -- this is about the cases where it does.

**Reach for `interface` when the shape is meant to be extended or implemented:**

```ts
interface EmailClient {
  send(to: string, message: string): void;
}

interface HighPriorityEmailClient extends EmailClient {
  sendUrgent(to: string, message: string): void;
}
```

Declaration merging (multiple `interface EmailClient { ... }` blocks combining into one) is also
`interface`-only -- relevant for augmenting a third-party library's types, rare otherwise.

**Reach for `type` for unions, tuples, mapped/conditional types, or anything that isn't a plain
extensible object shape:**

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
type Point = [x: number, y: number];
```

None of these can be expressed as an `interface` at all -- `type` is the only option, not a style
preference.

**The unnecessary case worth flagging in review:** a codebase mixing both for identical plain
object shapes with no real reason (some flat DTOs declared `interface`, others `type`, no
extension or union involved anywhere) is inconsistency worth pointing out, even though either
would technically work -- pick one as the team default for the plain-shape case and save the
other for where it's actually required.
