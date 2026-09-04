# Event/Message Schema Evolution

An event or message schema (Kafka, SQS/SNS, RabbitMQ, webhooks) is harder to roll back than an API
response, and worth treating with more caution than the general additive-change discipline in
`references/additive-api-event-changes.md`. An API response is regenerated fresh on every request --
fix the code, the next request gets the fix. An event, once published, is already sitting in a
topic/queue and may already have been read and processed by every consumer that was subscribed at
the time. There is no equivalent of "redeploy and it's fixed" for an event that already went out
with the wrong shape.

## Backward and forward compatibility, defined for events specifically

- **Backward compatible**: a consumer using the *new* schema can still correctly read an event
  produced under the *old* schema (needed because old events already sit in the log/queue, or a
  producer that hasn't upgraded yet is still emitting the old shape).
- **Forward compatible**: a consumer still using the *old* schema can read an event produced under
  the *new* schema without crashing (needed because, during rollout, a producer may upgrade before
  every consumer has).
- **Full compatibility** requires both simultaneously -- generally the target for a schema shared by
  multiple independently-deployed consumers, since there's no way to guarantee which side upgrades
  first.

## If this repo uses a schema registry (Confluent/Avro, Protobuf, JSON Schema)

Most registries let you configure a compatibility mode per subject/topic (`BACKWARD`, `FORWARD`,
`FULL`, or `NONE`) and will reject a schema registration that violates it -- this is a real
enforcement mechanism, not just a convention, so check what mode is actually configured before
assuming a change is safe. If the mode is `NONE` or unset, there's no automatic protection and this
discipline has to be applied by hand. Within whichever mode applies, the same additive rules as an
API hold:

- Add new fields as optional, with a default.
- Never remove a field that's still `BACKWARD` (or `FULL`)-compatible-required, without going
  through a deprecation window first.
- Never change a field's type or reuse a field number/name (Protobuf especially -- a reused field
  number silently deserializes as the *wrong* value, since Protobuf identifies fields by number, not
  name; treat a removed field number as permanently retired, not reusable, and mark it explicitly
  `reserved` if the schema language supports it).

## If there's no registry (plain JSON over a queue, webhooks)

The same rules apply without automatic enforcement, so they matter more, not less, since nothing
will reject a breaking change before it ships:

- Add new fields as optional; consumers should already be built to ignore unknown fields rather than
  fail on extras (verify this is actually true of every consumer -- a strict JSON schema validator
  configured to reject unknown properties needs updating too, or it becomes the thing that breaks).
- Never remove or repurpose a field a consumer might read, for the same "confirm actual usage first"
  reason as an API field.
- Consider an explicit `schemaVersion`/`eventVersion` field on the message itself if this repo
  doesn't already have one -- it turns "does this consumer support the shape it just received" from
  a guess into an explicit check the consumer's own code can make.

## Consumer-group rollout order matters

When multiple independently-deployed services consume the same topic, the order they upgrade in is
not automatically safe just because each individual change is additive -- if a downstream consumer
depends on a new field a producer hasn't started sending yet, deploying the consumer first means it
processes events missing the field it expects. Where there's a dependency direction (producer must
add a field before a consumer can rely on it; a consumer must be able to ignore a field before a
producer starts sending it), deploy in that order deliberately rather than assuming order doesn't
matter because Kafka/SQS itself doesn't enforce one.

## Common mistakes to avoid

- Treating a bad event schema like a bad API response that can be "fixed by redeploying" -- events
  already published under the old shape are permanent; a fix only affects events produced after the
  fix ships, and every already-published event under the old shape still needs to be readable by
  whatever eventually processes it.
- Reusing a Protobuf field number (or, more generally, any positional/numeric field identity) after
  removing a field -- causes silent misinterpretation, not a visible error, in whichever consumer
  reads it as the new meaning.
- Assuming every consumer already ignores unknown fields without checking -- a strict schema
  validator or a language's default struct-decoding behavior (e.g. some strict deserializers reject
  unrecognized keys by default) can turn an additive change into a breaking one for that specific
  consumer.
- Deploying a producer and a dependent consumer in the wrong order relative to which one needs the
  new field to exist first.
