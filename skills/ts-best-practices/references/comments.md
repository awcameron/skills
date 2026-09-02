# Comments: WHY, not WHAT

A comment that restates what the code already says costs a reader time twice: once to read the
comment, once to notice it added nothing. A comment that explains a hidden constraint, a subtle
invariant, or the reason behind a non-obvious choice saves a future reader from re-deriving
something you already figured out. The test for any comment: if you deleted it, would a careful
reader be confused, or would they lose nothing?

## Restating WHAT the code does

The most common failure. If a well-named variable or function already says what's happening,
narrating it again is pure noise.

**Before:**

```ts
// increment the retry counter by one
retryCount += 1;

// loop through all the users and send each one an email
for (const user of users) {
  sendEmail(user);
}
```

**After:**

```ts
retryCount += 1;

for (const user of users) {
  sendEmail(user);
}
```

Nothing was lost. The names already carried the meaning the comments were repeating.

## A genuinely useful WHY comment

**Before (no comment, but there should be one):**

```ts
async function fetchExchangeRate(currency: string): Promise<number> {
  return withRetry(() => api.getRate(currency), { attempts: 2 });
}
```

A reader has no way to know *why* this one call gets a retry wrapper when nothing else in the
file does -- did someone just get nervous, or is there a real reason?

**After:**

```ts
// The rates provider intermittently returns 502s under its own load (see
// their status page's SLA notes) -- not a bug in this client, and a single
// retry resolves it in practice.
async function fetchExchangeRate(currency: string): Promise<number> {
  return withRetry(() => api.getRate(currency), { attempts: 2 });
}
```

This is worth the words: it tells the next person not to "simplify" this away, and explains a
fact (an upstream provider's known behavior) that isn't visible anywhere in the code itself.

## Padded comments: keep the WHY, cut the narration

A comment can be *directionally* correct -- explaining a real WHY -- and still be twice as long
as it needs to be. Long comments don't just cost reading time; they bury the actual point in
narrative setup.

**Before:**

```ts
// This function needs to check whether the user is allowed to perform this
// action. We look at their role and compare it against the list of allowed
// roles for this action. If they're not allowed, we throw an error. This is
// important because otherwise anyone could call this endpoint and do
// whatever they want, which would be a security problem. So we check first,
// before doing anything else.
function assertCanPerform(user: User, action: Action) {
  if (!action.allowedRoles.includes(user.role)) {
    throw new ForbiddenError();
  }
}
```

Almost none of this needs to be said -- the function name, parameter names, and three-line body
already say "check permission, throw if not allowed." The comment is explaining WHAT at length,
which is the one thing a comment should least be used for.

**After:**

```ts
function assertCanPerform(user: User, action: Action) {
  if (!action.allowedRoles.includes(user.role)) {
    throw new ForbiddenError();
  }
}
```

If there *is* a real WHY here (e.g., "checked here rather than in a shared guard because this
action's rules differ per-tenant"), say only that -- one or two sentences, not a paragraph
re-deriving the obvious parts.

## Comments that will rot

A comment tied to a specific ticket, PR, or "the current fix" is accurate today and stale the
moment that context is forgotten -- worse, a stale reference actively misleads a future reader
who goes looking for context that no longer exists or no longer means what it used to.

**Before:**

```ts
// Fixed in TICKET-4521, see PR #892 for the full discussion
const MAX_RETRIES = 2;
```

**After:**

```ts
// 2 retries: the third attempt in testing never succeeded when the first two
// didn't, so a higher number only delays the eventual failure.
const MAX_RETRIES = 2;
```

Same information density, but the comment explains a fact about the *system* that stays true
regardless of which ticket tracker the team uses next year. If the ticket number is genuinely
useful for archaeology, put it in the commit message, not the code -- commit history doesn't need
to be re-read every time someone opens the file.

**ADRs are the exception to "drop the reference."** An Architectural Decision Record is a
permanent, versioned document that lives in the repo indefinitely -- it doesn't get closed the way
a ticket does. Referencing one (`// per ADR 0009, ...`) is no different from citing a spec; it's
durable, not a rot risk, and worth doing whenever a comment is explaining a decision that has a
fuller writeup elsewhere.

**A ticket/epic reference is fine too, but only as a supplement to a real explanation, never a
substitute for one.** The rule above ("drop TICKET-4521, keep the fact") is the right *default*
for a codebase with no established convention otherwise -- but if a project deliberately keeps
ticket references in comments, the way to do it safely is to always pair the reference with a
self-contained explanation in the same comment, so the comment still works even if the ticket
becomes unfindable someday:

```ts
// Bad: a bare pointer -- useless the moment TICKET-4521 is unfindable
// see TICKET-4521 for why

// Good: the reasoning is in the comment itself; TICKET-4521 is a bonus
// pointer to the original discussion, not a required lookup
// resolveCallerOrg (TICKET-4521): some routes carry no :orgId in the URL,
// so this derives the caller's own org and rejects outright (403) a
// caller with no membership anywhere.
```

## TSDoc, and tagged comments

Everything above applies whether a comment is a plain `// ...` line or inside a `/** ... */`
block -- the WHY-not-WHAT bar doesn't change based on which syntax holds it. In a TypeScript
codebase that block syntax is TSDoc, not JSDoc -- JSDoc-the-term is reserved for plain `.js` files,
which don't carry this kind of documentation regardless. This file doesn't prescribe TSDoc itself:
reach for it for every exported class (a short summary of its role), for a complex public function
or an important exported type, or when a construct genuinely crosses an audience boundary (a
published package, or a shared-types package consumed by more than one app in a monorepo) -- check
whether the repo has its own style guide for the full split and worked examples before improvising
one. For everyday application code, a line comment is correct, not a lesser choice.

One exception worth knowing before you default to a line comment: a repository interface
(`I*Repository`) gets per-method TSDoc even when it's internal and single-implementation -- the
interface itself is the DI seam, not an application-layer DTO only one call site touches. If the
repo has a style guide, check it for a worked example before improvising the shape.

Some style guides also document a short tag vocabulary (`SAFETY:`, `HACK:`, `FIXME:`,
`TODO(ticket):`) for marking specific comment categories consistently -- `SAFETY:` for a cast
justification (see `casting.md`), `HACK:` for a temporary workaround, and so on. A tag is a
prefix on a real explanation, never a substitute for one.
