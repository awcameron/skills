# Class design

`class` is a tool for state, identity, and polymorphism. When none of those are actually needed,
a class adds ceremony (instantiation, `this` binding, a constructor to maintain) without buying
anything a plain function or object literal wouldn't already provide.

## Stateless logic doesn't need a class

**Before:**

```ts
class PriceCalculator {
  calculate(items: Item[]): number {
    return items.reduce((sum, item) => sum + item.price, 0);
  }
}

const total = new PriceCalculator().calculate(items);
```

There's no state between calls, no subclass ever overrides `calculate`, and nothing is ever
injected into this class. It's a function wearing a class as a costume.

**After:**

```ts
function calculateTotal(items: Item[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

const total = calculateTotal(items);
```

Reach for a class instead when there's real per-instance state to hold, a constructor that
genuinely wires dependencies (e.g. framework dependency injection), or multiple implementations of
the same interface that callers need to swap.

## God classes: split by responsibility

A class that accumulates unrelated responsibilities becomes something no single change can be
made to safely -- every edit risks breaking a feature that has nothing to do with what you're
touching.

**Before:**

```ts
class UserManager {
  createUser(data: UserInput) {
    /* validation, persistence */
  }
  sendWelcomeEmail(user: User) {
    /* email templating, SMTP */
  }
  validatePassword(password: string) {
    /* password rules */
  }
  generateActivityReport(userId: string) {
    /* report formatting, aggregation */
  }
  logAuditEvent(event: AuditEvent) {
    /* audit persistence */
  }
}
```

Five unrelated reasons to change this one file: a password policy update touches the same class
as an email template tweak.

**After:**

```ts
class UserRepository {
  createUser(data: UserInput) {
    /* validation, persistence */
  }
}

class WelcomeEmailService {
  send(user: User) {
    /* email templating, SMTP */
  }
}

class PasswordValidator {
  validate(password: string) {
    /* password rules */
  }
}

class ActivityReportGenerator {
  generate(userId: string) {
    /* report formatting, aggregation */
  }
}

class AuditLogger {
  log(event: AuditEvent) {
    /* audit persistence */
  }
}
```

Each class now has exactly one reason to change, and each can be tested, mocked, or replaced
independently of the others.

## Keep constructors thin

A constructor that does real work (transforms data, makes a network call, has meaningful
branching) makes object construction itself something that can fail or take time in ways that
aren't obvious from `new Thing(...)` at the call site.

**Before:**

```ts
class ReportGenerator {
  private processedData: ProcessedData;

  constructor(private rawData: RawData) {
    this.processedData = expensiveTransform(rawData); // runs at construction time
  }
}
```

Anyone writing `new ReportGenerator(data)` has no signal that this line does real, possibly slow
or throwing, work.

**After:**

```ts
class ReportGenerator {
  constructor(private rawData: RawData) {}

  generate(): ProcessedData {
    return expensiveTransform(this.rawData);
  }
}
```

Construction is now just assignment -- cheap, predictable, and impossible to get wrong by
accident. The real work happens at an explicit call site (`generator.generate()`) where a reader
expects it.

## Inject dependencies, don't reach for them internally

A class that creates its own dependencies with `new` (or pulls one from a singleton/import) has
hardwired a specific implementation into itself -- nothing outside the class can substitute a
different one, including a fake in a test.

**Before:**

```ts
class OrderNotifier {
  private emailClient = new SmtpEmailClient(); // always this one, no way to substitute

  notify(order: Order) {
    this.emailClient.send(order.customerEmail, `Order ${order.id} shipped`);
  }
}
```

A test for `notify()` has no way to avoid talking to a real (or real-shaped) SMTP client, and
switching providers later means editing `OrderNotifier` itself rather than the code that
constructs it.

**After:**

```ts
interface EmailClient {
  send(to: string, message: string): void;
}

class OrderNotifier {
  constructor(private emailClient: EmailClient) {}

  notify(order: Order) {
    this.emailClient.send(order.customerEmail, `Order ${order.id} shipped`);
  }
}

const notifier = new OrderNotifier(new SmtpEmailClient());
```

Now a test passes `new OrderNotifier(fakeEmailClient)`, and switching from SMTP to some other
provider is a one-line change at the construction call site -- `OrderNotifier` itself doesn't
change at all. This is the same "keep constructors thin" principle above, extended: a
constructor should receive what it needs, not manufacture it.

This is plain constructor injection -- no framework, decorator, or DI container required, and
deliberately so, since those are a separate, framework-specific layer (NestJS's `@Injectable()`,
InversifyJS, tsyringe, and similar) that automates *wiring up* constructors like this one at
scale. The pattern above is what makes that automation possible in the first place; reach for an
actual DI framework's own conventions once wiring by hand gets unwieldy, not before.

## Prefer composition over deep inheritance

An inheritance chain more than one or two levels deep usually means a subclass is overriding or
ignoring most of what it inherits (a "refused bequest") rather than genuinely extending it. If a
`PremiumUser` needs different behavior than `User` in three unrelated ways, three composed
strategies/services usually age better than a subclass silently overriding three separate methods
that a future reader has to hunt down across the hierarchy.
