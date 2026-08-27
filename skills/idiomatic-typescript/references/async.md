# Async and Promises

A `Promise` that's created but never awaited, caught, or explicitly discarded is a silent risk:
if it rejects, that rejection either crashes the process (Node's default for unhandled
rejections) or vanishes, depending on the runtime -- neither is something you want to discover in
production. The fix is almost never to add complex error-handling machinery; it's to make the
intent (awaited, or deliberately not) visible at the call site.

## Floating promises: make the intent explicit

**Before:**

```ts
function onSaveDraftClick() {
  saveDraft(); // returns a Promise; nothing here awaits, catches, or discards it
}
```

A reader (and a linter, if one is configured to catch this) can't tell whether this was
intentional fire-and-forget or a forgotten `await`.

**After (fire-and-forget really is the intent):**

```ts
function onSaveDraftClick() {
  void saveDraft(); // explicit: not awaiting is deliberate, not an oversight
}
```

**After (the caller actually needs to know if it failed):**

```ts
async function onSaveDraftClick() {
  await saveDraft();
}
```

The `void` operator costs nothing at runtime -- it's purely a signal to the reader and the type
checker that this was a decision, not an accident.

## Don't mark a function `async` if it never awaits anything

An `async` function that has no `await` inside it still returns a `Promise` -- it just wraps a
synchronous value in one for no reason, adding a microtask tick and forcing every caller to
`await` or `.then()` a value that was always available immediately.

**Before:**

```ts
async function getConfigValue(key: string): Promise<string> {
  return CONFIG[key]; // synchronous the whole way through
}
```

**After:**

```ts
function getConfigValue(key: string): string {
  return CONFIG[key];
}
```

The one legitimate exception: the function needs to satisfy an interface/contract that requires
returning a `Promise` (e.g. implementing an async interface where other implementations really do
await something). If that's the reason, say so -- `// async to satisfy the FooProvider interface,
this implementation happens to be synchronous` -- so a future reader doesn't "simplify" it away
and break the interface.

## Independent awaits: don't serialize what doesn't depend on each other

Sequential `await`s run one after another even when neither result depends on the other, adding
pure waiting time with no benefit.

**Before:**

```ts
const user = await fetchUser(id);
const posts = await fetchPosts(id); // doesn't use `user` at all
```

This takes as long as both calls added together, for no reason.

**After:**

```ts
const [user, posts] = await Promise.all([fetchUser(id), fetchPosts(id)]);
```

Now both requests run concurrently, and the total wait is whichever one is slower, not the sum of
both. Only serialize awaits when a later call genuinely needs the result of an earlier one.
