# Naming

A name is a promise about what a value holds or what a function does. When the name doesn't keep
that promise, a reader has to open the implementation (or hover for a type) to find out --
exactly the lookup a good name exists to save them from.

## Names should carry meaning without a lookup

**Before:**

```ts
const d = new Date();
const flag = user.age >= 18;
const arr = items.filter((i) => i.active);
```

None of these tell a reader anything beyond "some date," "some boolean," "some filtered list" --
information the type already provides, without the meaning the name should be adding.

**After:**

```ts
const createdAt = new Date();
const isAdult = user.age >= 18;
const activeItems = items.filter((item) => item.active);
```

## Booleans should read like yes/no questions

A boolean named like a noun forces a reader to guess which state is `true`.

**Before:**

```ts
const status = user.subscription !== null; // does `true` mean subscribed, or something else?
```

**After:**

```ts
const isSubscribed = user.subscription !== null;
```

`is`, `has`, `should`, `can` prefixes make the two states unambiguous at every call site
(`if (isSubscribed)` reads as a sentence; `if (status)` doesn't).

## A function's name shouldn't hide a side effect

If a name describes only part of what a function does, callers who trust the name miss the rest.

**Before:**

```ts
function getUser(id: string): User {
  logAccess(id); // a side effect the name gives no hint of
  return db.find(id);
}
```

Someone calling `getUser` in a hot loop, expecting a pure lookup, unknowingly logs on every call.

**After (name reflects the full behavior):**

```ts
function getUserAndLogAccess(id: string): User {
  logAccess(id);
  return db.find(id);
}
```

**Or, better, separate the concerns so the common case stays pure:**

```ts
function getUser(id: string): User {
  return db.find(id);
}

// caller decides explicitly when access logging is actually needed
const user = getUser(id);
logAccess(id);
```

## Disambiguate near-duplicate names by what they actually do

A trailing number is a name that gave up.

**Before:**

```ts
function handleClick() {
  /* saves the form */
}
function handleClick2() {
  /* deletes the item */
}
```

**After:**

```ts
function handleSaveClick() {
  /* saves the form */
}
function handleDeleteClick() {
  /* deletes the item */
}
```

If two names are hard to tell apart even after this treatment, that's often a sign the two things
they represent are actually the same concept with a minor variation, not two genuinely distinct
ones -- worth a second look at whether one of them should exist at all.
