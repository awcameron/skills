---
name: ts-best-practices
description: Staff-Engineer-level best practices for writing and reviewing TypeScript and JavaScript functions and classes -- the judgment calls a linter or formatter can't enforce, like comment discipline, type-casting discipline, function and class design, error-handling shape, promise/async handling, naming, immutability, import organization, type narrowing/discriminated unions, and enum/interface-vs-type design. Use this whenever writing new TS/JS code, reviewing or refactoring existing code, or when the user asks things like "clean this up," "is this idiomatic," "review this for best practices," "does this look right," or describes a function/class as messy or hard to follow -- even if they don't name a specific practice or use the word "style."
---

# Idiomatic TypeScript/JavaScript

A linter and a formatter already handle whitespace, semicolons, quote style, and import order.
What they can't tell you is whether a function is doing too much, whether a cast is hiding a real
bug, whether a comment is explaining something worth explaining, or whether a class exists because
the domain needed one or because reaching for `class` felt like the "proper" way to organize code.
This skill is about that second layer -- the judgment calls a senior reviewer makes that no tool
config catches.

## How to use this

**Writing new code**: apply these as defaults while you write, the same way you'd apply
formatting rules without thinking about them. You shouldn't need to stop and consult a reference
file for every function -- the principles below should start to feel like instinct.

**Reviewing or refactoring existing code**: treat the categories below as lenses, not a checklist
to run top-to-bottom against every single function. Skim the code, notice which lenses actually
apply (a 5-line pure function doesn't need the class-design lens; a class with no branching
doesn't need the error-handling lens), and open the matching reference file only for those.
Forcing every category onto every piece of code produces noise, not signal -- exactly the kind of
review a junior engineer gives and a Staff Engineer doesn't.

**When flagging something**: point at the concrete failure mode, not just the rule name. "This
comment restates the code below it" is useful; "violates comment best practices" is not. Every
reference file below is built around before/after pairs for exactly this reason -- borrow their
shape when explaining a finding.

## Principles over rules

Every practice below is a default, not an absolute. A Staff Engineer's actual value in review
isn't reciting these rules -- it's knowing when the real exception applies and saying so
explicitly, rather than either blindly enforcing the rule or blindly ignoring it. If you find
yourself about to write "always" or "never" while applying one of these, pause and ask whether
this specific case is the exception, and if so, say why in a comment or review note rather than
silently deviating or silently complying.

## Reference files

| File | Check this when... |
|---|---|
| [`comments.md`](references/comments.md) | A comment exists -- is it explaining WHY (worth keeping) or WHAT (the code already says it)? |
| [`casting.md`](references/casting.md) | You see `as`, `as unknown as`, or `!` -- is a cast hiding a real type mismatch instead of resolving one? |
| [`functions.md`](references/functions.md) | A function has nested conditionals, more than ~3 parameters, or a boolean parameter at a call site. |
| [`classes.md`](references/classes.md) | A `class` is being reached for -- does this logic actually need state, identity, or polymorphism? |
| [`error-handling.md`](references/error-handling.md) | Code branches on an error's *kind* (message-string matching, multiple `catch` conditions) or swallows a `catch` silently. |
| [`async.md`](references/async.md) | A `Promise`-returning call isn't awaited, an `async` function never awaits anything, or awaits run one after another with no data dependency between them. |
| [`naming.md`](references/naming.md) | A name needs its type or implementation read to understand what it holds or does. |
| [`immutability.md`](references/immutability.md) | Something reassigns with `let` where `const` would do, mutates a function's argument, or mutates an array/object another part of the program still holds a reference to. |
| [`imports-modules.md`](references/imports-modules.md) | A barrel/index file uses `export *`, import order looks arbitrary, or a module reaches for a default export. |
| [`narrowing.md`](references/narrowing.md) | A shape has optional fields that are never all present together, or the same runtime type check is repeated inline instead of named. |
| [`type-design.md`](references/type-design.md) | A numeric/string `enum` is being declared, or the same object shape is duplicated across `interface` and `type` with no extension or union involved. |

Each file is short and self-contained -- read the one that matches what you're looking at, not
all of them up front.

## Adapting this to a specific repo

This skill is deliberately general-purpose -- no framework or house-style assumptions baked in.
Most repos have their own more specific instantiation of some of these principles (a documented
`Result<T,E>` error-handling convention, a specific DI pattern, an explicit-barrel-exports rule
for a shared package). When a repo has its own style guide or convention doc, that more specific,
actually-adopted convention wins over this skill's general version -- treat a conflict as a
signal to check which one the codebase actually follows, not as two equally valid options.
