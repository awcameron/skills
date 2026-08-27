# Function design

A function's job is to make its caller's code and its own body both easy to read. Nested
conditionals, long parameter lists, and boolean parameters all fail that job in the same way: they
force a reader to hold more state in their head than the function's name promised.

## Guard clauses over nested conditionals

Each level of nesting is something a reader has to keep track of while reading everything inside
it. Inverting a condition and returning early collapses that stack immediately.

**Before:**

```ts
function processOrder(order: Order) {
  if (order.isValid) {
    if (order.items.length > 0) {
      if (!order.isCancelled) {
        // the actual logic, three indents deep
        return shipOrder(order);
      }
    }
  }
  return null;
}
```

**After:**

```ts
function processOrder(order: Order) {
  if (!order.isValid) return null;
  if (order.items.length === 0) return null;
  if (order.isCancelled) return null;

  return shipOrder(order);
}
```

The real logic now sits at the top level, and each guard reads as a single, independent
precondition instead of a nested puzzle.

## Boolean parameters make call sites unreadable

A boolean argument means nothing at the call site without opening the function's signature --
and a reader skimming a diff or a call site rarely does that.

**Before:**

```ts
function createUser(name: string, sendWelcomeEmail: boolean) {
  /* ... */
}

createUser('Ada', true); // true what? true that she wants an email? true she IS the email?
```

**After (options object -- self-documenting at the call site):**

```ts
function createUser(name: string, options: { sendWelcomeEmail: boolean }) {
  /* ... */
}

createUser('Ada', { sendWelcomeEmail: true });
```

**Or, if the two paths genuinely diverge in behavior, not just one flag's worth:**

```ts
function createUser(name: string) {
  /* ... */
}
function createUserAndSendWelcomeEmail(name: string) {
  const user = createUser(name);
  sendWelcomeEmail(user);
  return user;
}
```

Prefer the options object when it's really one function with a minor variation; prefer splitting
into two named functions when the flag is actually selecting between two different behaviors that
happen to share some steps.

## Data clumps become parameter objects

When the same group of parameters keeps traveling together across a function's call sites,
that's usually a concept that wants its own type, not four-or-five separate arguments a caller
has to get in the right order.

**Before:**

```ts
function drawRectangle(x: number, y: number, width: number, height: number, color: string) {
  /* ... */
}

drawRectangle(10, 20, 100, 50, 'blue'); // is this x, y or y, x? no way to tell from the call
```

**After:**

```ts
interface Rectangle {
  position: { x: number; y: number };
  size: { width: number; height: number };
  color: string;
}

function drawRectangle(rectangle: Rectangle) {
  /* ... */
}

drawRectangle({ position: { x: 10, y: 20 }, size: { width: 100, height: 50 }, color: 'blue' });
```

Longer at the call site, but now every value is unambiguous without cross-referencing the
signature, and a future fifth property (e.g. `borderWidth`) extends one type instead of adding
another positional argument everyone has to remember the order of.

## Small functions, but not fragmented past the point of context

The flip side worth naming: splitting a function into many tiny pieces can make the *overall*
logic harder to follow if a reader now has to jump across five one-line functions to reconstruct
what used to be a single readable sequence. The goal is a function that does one coherent thing at
one level of abstraction -- not the smallest possible function by line count. If extracting a
helper means the caller now needs the helper's implementation open in another tab to understand
what's happening, the split cost more than it saved.
