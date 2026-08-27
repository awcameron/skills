# Error handling

The shape of an error should match how the caller needs to react to it. If a caller has to branch
on *what kind* of failure happened, that kind needs to be a real, checkable type -- not something
inferred by matching against a message string. And if a failure genuinely doesn't need handling
in a given catch, silently swallowing it should be a stated decision, not an oversight that looks
identical to one.

## Stop branching on error message strings

A thrown error's `.message` is meant for humans reading logs, not for code to parse. Matching
against it breaks the moment the wording changes, and gives the reader no compile-time signal
about what failure modes actually exist.

**Before:**

```ts
try {
  await saveUser(user);
} catch (e) {
  if (e.message.includes('duplicate')) {
    showError('That email is already registered.');
  } else if (e.message.includes('invalid')) {
    showError('Please check the form fields.');
  } else {
    showError('Something went wrong.');
  }
}
```

**After:**

```ts
type SaveUserError =
  | { type: 'DUPLICATE_EMAIL' }
  | { type: 'INVALID_FIELD'; field: string };

const result = await saveUser(user); // Result<User, SaveUserError>

if (!result.ok) {
  switch (result.error.type) {
    case 'DUPLICATE_EMAIL':
      showError('That email is already registered.');
      break;
    case 'INVALID_FIELD':
      showError(`Please check ${result.error.field}.`);
      break;
  }
}
```

Now the set of possible failures is a real type the compiler checks, not a set of substrings
someone has to keep in sync with whatever text `saveUser` happens to throw.

## Exhaustiveness: let the compiler catch a missed case

Once failures are a closed set of variants, use a `never` check so adding a new variant without
updating every switch over it becomes a compile error instead of a silent gap.

**Before:**

```ts
function statusLabel(status: 'pending' | 'active' | 'archived'): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'active':
      return 'Active';
    // 'archived' quietly falls through to `undefined` -- no error, no warning
  }
}
```

**After:**

```ts
function statusLabel(status: 'pending' | 'active' | 'archived'): string {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'active':
      return 'Active';
    case 'archived':
      return 'Archived';
    default: {
      const exhaustiveCheck: never = status;
      throw new Error(`Unhandled status: ${exhaustiveCheck}`);
    }
  }
}
```

If a fourth status is ever added to the union, this function fails to compile until it's handled
here too -- the mistake is caught at the definition site, not discovered later as a UI bug.

## Never let a `catch` swallow silently

An empty `catch` block looks identical whether the original author decided "this failure truly
doesn't matter" or simply hadn't gotten around to handling it yet. Nothing in the code
distinguishes those two very different situations.

**Before:**

```ts
try {
  await sendAnalyticsPing(event);
} catch {
  // ignore
}
```

**After (if it's genuinely fine to lose this failure):**

```ts
try {
  await sendAnalyticsPing(event);
} catch (error) {
  // Analytics pings are best-effort -- losing one has no user-facing
  // impact, but still log it so a systemic outage is visible in metrics.
  logger.warn('Analytics ping failed', error);
}
```

**Or, if it's not actually fine, let it propagate** rather than deciding by omission:

```ts
await sendAnalyticsPing(event); // let a real failure surface, don't hide it
```

Either outcome is fine -- what isn't fine is a bare `catch {}` that makes "I decided this doesn't
matter" indistinguishable from "I forgot to handle this."

## Reserve `throw` for the truly exceptional or a framework boundary

`Result`/discriminated-union returns suit *expected* failure modes a caller is meant to branch on
(not found, validation failed, conflict). Exceptions still make sense for genuinely exceptional
conditions (a broken invariant, a bug) and at framework boundaries that are exception-based by
design (e.g. an HTTP framework that converts a thrown exception into a response). Mixing the two
per call site rather than per layer -- some calls in a function returning `Result`, others
throwing, with no clear line between them -- is what makes a codebase's error handling
unpredictable to read.

A concrete, common example of this exact choice: Zod's `schema.parse(input)` throws on invalid
input, while `schema.safeParse(input)` returns `{ success: true, data }` or `{ success: false,
error }`. Validation failure is almost always an *expected* outcome a caller branches on, not an
exceptional one -- so application code calling a schema directly (a handler, a test, a frontend
form) should reach for `safeParse`, reserving `parse` for the cases where something upstream (a
framework's own validation pipe) is already exception-based by design and a thrown `ZodError` is
exactly what that boundary expects.
