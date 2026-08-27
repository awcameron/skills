# Immutability

Mutation is a hidden dependency: when a function or class changes a value in place, every other
piece of code holding a reference to that same value is affected too, silently, wherever it
happens to be at the time. Immutable-by-default makes data flow traceable -- a value only
changes where it's reassigned or a new value is produced, never somewhere buried inside a
function call a reader would have to open to find out.

## `const` by default

Reaching for `let` to avoid a conditional expression creates a window where the variable's value
is temporarily "wrong" before a later branch corrects it.

**Before:**

```ts
let discount = 0.1;
if (user.isPremium) {
  discount = 0.2;
}
```

Anyone reading `let discount = 0.1` in isolation doesn't yet know it might change two lines
later -- they have to keep reading to find out if this value is final.

**After:**

```ts
const discount = user.isPremium ? 0.2 : 0.1;
```

One assignment, no intermediate state, and `const` itself tells a reader this value is settled
the moment they see it. Reserve `let` for cases with a genuine reason to reassign (an
accumulator in a loop, a value that really is reset under some condition later).

## `readonly` on fields that shouldn't change after construction

Without `readonly`, "this field never changes after construction" is only a convention -- nothing
stops a caller from breaking it.

**Before:**

```ts
class User {
  id: string;
  email: string;

  constructor(id: string, email: string) {
    this.id = id;
    this.email = email;
  }
}

function corrupt(user: User) {
  user.id = 'hacked'; // compiles fine -- nothing marks this as a mistake
}
```

**After:**

```ts
class User {
  readonly id: string;
  readonly email: string;

  constructor(id: string, email: string) {
    this.id = id;
    this.email = email;
  }
}
```

Now `user.id = 'hacked'` is a compile error. The invariant "identity doesn't change after
construction" is enforced by the type system instead of hoped for by convention.

## Don't mutate function parameters -- return a new value instead

A function that mutates an argument it was passed changes something the caller still holds a
reference to, with nothing at the call site hinting that it happened.

**Before:**

```ts
function addTax(cart: Cart, rate: number): void {
  cart.total += cart.total * rate; // the caller's own object silently changes
}

addTax(cart, 0.08);
console.log(cart.total); // changed -- but the call site gave no indication it would
```

**After:**

```ts
function withTax(cart: Cart, rate: number): Cart {
  return { ...cart, total: cart.total + cart.total * rate };
}

const taxedCart = withTax(cart, 0.08);
```

`const taxedCart = withTax(cart, 0.08)` makes it visible at the call site that a new value comes
out; `cart` itself, which some other part of the program might still be holding onto, is
untouched.

## Prefer non-mutating array/object operations for derived data

Building a filtered/transformed result by mutating the input in place ties the result's
correctness to loop-direction details that are easy to get wrong, and mutates something the
caller may not expect to lose.

**Before:**

```ts
function withoutInactiveUsers(users: User[]): User[] {
  for (let i = 0; i < users.length; i++) {
    if (!users[i].active) {
      users.splice(i, 1); // mutates the caller's array *and* skips the next
                            // element -- removing index i shifts everything
                            // after it down by one, so the loop's next i
                            // skips right past whatever just slid into place
    }
  }
  return users;
}
```

Two inactive users in a row, and only the first one actually gets removed -- the second slides
into the just-vacated index and the loop has already moved past it.

**After:**

```ts
function withoutInactiveUsers(users: User[]): User[] {
  return users.filter((user) => user.active);
}
```

Same result, correctly, every time -- and the caller's original array is untouched. `filter`
sidesteps the mutate-while-iterating hazard entirely rather than requiring the iteration
direction to be gotten right (looping backward would also fix the skip, but still mutates the
caller's array, which is the actual problem this section is about).

## `readonly` at API boundaries: make "won't mutate this" a type-level promise

A comment saying a function won't modify what's passed in is only as reliable as whoever reads
it. The type system can enforce the same promise instead.

**Before:**

```ts
function printReceipt(items: Item[]) {
  // nothing here stops a future edit from doing this by accident:
  items.push({ name: 'Service fee', price: 2.5 });
}
```

**After:**

```ts
function printReceipt(items: readonly Item[]) {
  // items.push(...) is now a compile error -- the signature itself
  // guarantees this function can't mutate what the caller passed in
}
```

## When mutation is genuinely fine

This is about mutation that's *visible outside* the scope that owns the value -- a function
parameter, a shared object, a field another part of the program holds a reference to. Mutating a
local value entirely inside the function that created it (building up an array in a loop before
returning it, for instance) isn't what this is warning about, and forcing every local loop into a
`reduce` chain to avoid `push` on a variable nothing outside the function can see is optimizing
for a rule instead of the actual risk immutability is meant to guard against.
