# Type narrowing and discriminated unions

Modeling a value's possible states as a discriminated union, then narrowing on the discriminant,
lets the compiler verify every state is actually handled. Modeling the same states as a loose
shape with optional fields pushes that verification onto the reader instead, at every call site.

## Optional fields that are never all present together should be a union, not one loose shape

**Before:**

```ts
interface FetchState {
  loading: boolean;
  data?: User;
  error?: Error;
}
```

Nothing here stops `{ loading: true, data: someUser, error: someError }` from type-checking, even
though "loading and also has both a result and an error" can never actually happen. Every consumer
has to remember the real (undocumented) rules about which fields can coexist.

**After:**

```ts
type FetchState =
  | { status: 'loading' }
  | { status: 'success'; data: User }
  | { status: 'error'; error: Error };
```

Now the impossible combinations don't type-check at all -- there's no `data` to read while
`status` is `'loading'`, because that variant doesn't have one.

## Narrow with the discriminant, not a chain of optional-field checks

**Before:**

```ts
function render(state: FetchState) {
  if (state.data) {
    return renderUser(state.data);
  } else if (state.error) {
    return renderError(state.error);
  } else {
    return renderSpinner();
  }
}
```

This compiles against the loose shape above, but it's inferring the state from which fields
happen to be truthy -- a state with both `data` and `error` set silently renders the data and
ignores the error, with nothing flagging that as a contradiction.

**After:**

```ts
function render(state: FetchState) {
  switch (state.status) {
    case 'loading':
      return renderSpinner();
    case 'success':
      return renderUser(state.data);
    case 'error':
      return renderError(state.error);
  }
}
```

Each `case` narrows `state` to exactly the variant with that `status`, so `state.data` is only
reachable where it's actually guaranteed to exist -- TypeScript enforces that, not convention. Add
a `default` with an exhaustiveness check (`const check: never = state`) if the union might grow
later and a missed case should be a compile error, not a silent gap (see `error-handling.md`'s
exhaustiveness section for the same pattern applied to error variants specifically).

## User-defined type guards: name the check, don't repeat it

Repeating the same runtime check inline every time a value needs narrowing is easy to get subtly
wrong in one of the copies, and doesn't give the check a name a reader can trust.

**Before:**

```ts
function processItem(item: Book | Movie) {
  if ('author' in item && 'pageCount' in item) {
    console.log(item.author); // works, but re-derived here and everywhere else this runs
  }
}
```

**After:**

```ts
function isBook(item: Book | Movie): item is Book {
  return 'author' in item && 'pageCount' in item;
}

function processItem(item: Book | Movie) {
  if (isBook(item)) {
    console.log(item.author); // narrowed via the named, reusable check
  }
}
```

The `item is Book` return type is what makes this a *type guard*, not just a boolean-returning
function -- calling `isBook(item)` narrows `item`'s type inside the `if` block the same way
`typeof`/`instanceof` do natively. Reach for one whenever the same non-trivial narrowing condition
would otherwise be copy-pasted across more than one call site.

## Don't reach for a cast when narrowing would do

A cast asserts a type without checking it; narrowing (via the discriminant, `typeof`,
`instanceof`, or a type guard) verifies it and lets the compiler prove the assertion true at that
point in the code. If a value's real type is already knowable from something already in scope --
a discriminant field, a runtime check -- casting past that check instead of narrowing on it is
covered in more depth in `casting.md`; the fix here and there is the same: check, don't assert.
