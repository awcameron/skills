# Validation: parse once at the boundary, then trust the type

`casting.md` covers validating too little: a cast standing in for a check that never happened.
This file covers the opposite failure: validating the same data again and again, deeper in the
code, after it already became a trusted type. Every extra parse tells the reader the data might be
malformed here, when it can't be, and hides which check is the one that actually protects the
program.

The question to ask at each parse: did this data just arrive from outside the program, or did this
program already produce it, or check it, a few calls ago?

## Parse untrusted input once, into a domain type

Untrusted means anything the program didn't produce itself: request bodies, environment variables,
files, queue payloads, third-party API responses, model output. Parse it where it enters, into a
type the rest of the code can rely on.

**Before:**

```ts
app.post('/orders', async (req, res) => {
  const items = req.body.items as OrderItem[];
  await placeOrder(req.body.customerId, items);
});

async function placeOrder(customerId: unknown, items: OrderItem[]) {
  if (typeof customerId !== 'string') throw new Error('bad customer');
  for (const item of items) {
    if (!Number.isInteger(item.quantity)) throw new Error('bad quantity');
  }
  // ...
}
```

The cast skips the check at the boundary. Then `placeOrder` re-checks pieces of it by hand, and so
does every other function that receives the same data, each one checking a slightly different
subset.

**After:**

```ts
const OrderRequest = z.strictObject({
  customerId: z.string().min(1),
  items: z.array(z.strictObject({ sku: z.string(), quantity: z.int().positive() })).min(1),
});
type OrderRequest = z.infer<typeof OrderRequest>;

app.post('/orders', async (req, res) => {
  const parsed = OrderRequest.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: z.prettifyError(parsed.error) });
  await placeOrder(parsed.data);
});

async function placeOrder(order: OrderRequest) {
  // No checks here: the type already says what the parse proved.
}
```

One schema, one parse, one place that turns bad input into a clear error. Everything after the
handler takes `OrderRequest`, not `unknown`.

## Don't re-validate what your own code produced

The subtler case is re-parsing a value that came out of your own function. It usually happens
because that function was typed `unknown` for one caller's sake, and every other caller paid for
it.

**Before:**

```ts
// Returns `unknown` because the checkout page serializes the result as JSON.
function quote(order: OrderRequest): unknown {
  return { subtotal: sumCents(order.items), tax: taxCents(order) };
}

function invoice(order: OrderRequest) {
  const q = Quote.parse(quote(order)); // our own function, parsed as if it came off the network
  // ...
}
```

`quote` already knows exactly what it returns. The parse in `invoice` can never fail unless
`quote` has a bug, and a schema check is a poor way to find that bug.

**After:**

```ts
function quote(order: OrderRequest): Quote {
  return { subtotal: sumCents(order.items), tax: taxCents(order) };
}

function invoice(order: OrderRequest) {
  const q = quote(order); // typed; nothing to re-check
  // ...
}
```

The caller that serializes can still call `JSON.stringify(quote(order))`. When one function
serves both an untrusted caller and a trusted one (the same tool called by a model and by your own
code, say), give the trusted path its own typed entry point rather than making it parse output the
untrusted path needed as `unknown`.

## When re-parsing is right: say why

Some parses of already-typed data are deliberate. Keep them, and leave a comment saying which kind
each one is, so the next reader doesn't delete it as redundant:

- **A parse that strips fields.** Parsing a value through a schema that leaves out sensitive fields
  (an email address, a phone number) before it reaches a log, a third-party service or a model.
  The point is what's dropped, not what's checked. The TypeScript type alone can't promise that,
  because a wider object is assignable to a narrower type.
- **An invariant check on a function's own output.** A function whose output has a rule the type
  can't express (amounts are non-negative integer cents, shares add up to the total) may parse its
  own result before returning it. That turns a broken invariant into an error at the source,
  instead of a wrong number three modules later.
- **Data that crossed a boundary and came back.** A value you wrote to disk, a cache or a queue
  and read back is untrusted again, even though your program produced it. Something else could
  have changed it in between.

**Before:**

```ts
function forAnalytics(user: User): AnalyticsUser {
  return AnalyticsUser.parse(user);
}
```

**After:**

```ts
// z.object, not z.strictObject: it drops keys it doesn't list, where strictObject would reject them.
const AnalyticsUser = z.object({ id: z.string(), plan: z.enum(['free', 'pro']) });

function forAnalytics(user: User): AnalyticsUser {
  // Strips email and phone: AnalyticsUser leaves them out, and the analytics vendor must never get them.
  return AnalyticsUser.parse(user);
}
```

Same parse. The comment is what keeps a well-meaning cleanup from deleting the one parse that
protects users' contact details.
