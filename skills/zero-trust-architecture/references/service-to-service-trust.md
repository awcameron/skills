# Service-to-Service Trust: "Inside the Network" Is Not a Credential

This is where the term "Zero Trust" originated as an industry practice: the traditional model drew
one hard perimeter around a network and trusted everything inside it by default — any service that
could reach another service on the internal network was assumed legitimate. That assumption is
exactly what this skill's core principles reject when applied at the request layer, and it applies
just as much between services as it does between a browser and an API.

## Network position proves nothing

A request arriving from inside a VPC, a Kubernetes cluster, or a docker-compose network tells a
receiving service *where the packet came from*, not *who sent it or on whose authority*. Anything
that can reach the network segment — a compromised neighboring service, a misconfigured job, an
attacker who's pivoted from one weaker service to a stronger one — can originate a request that looks
identical to a legitimate internal caller unless something explicitly verifies identity.

Concretely, this means: an internal-only endpoint with no auth check "because only our own services
can reach it" has exactly the same shape of gap as a public endpoint with no auth check — the blast
radius from a single compromised or misconfigured service is just larger, because a whole network
segment now has that endpoint's access.

## Discover this repo's actual mechanism, then use it consistently

Check what this repo already does for service-to-service calls before assuming a pattern — common
mechanisms, roughly in order of how much infrastructure they require:

- **mTLS** (mutual TLS) — both sides present a certificate, verified against a shared CA. Common in a
  service mesh (Istio, Linkerd) or an API gateway that terminates and re-issues internal calls.
  Verification happens at the transport layer, so the application code doesn't have to check
  anything explicitly — which also means it's easy to assume it's happening when it isn't; confirm
  the mesh/gateway config actually enforces it rather than just making it available.
- **Signed, short-lived service tokens** — one service mints a token (often a JWT) scoped to a
  specific downstream service and a short TTL, verified by the receiver the same way a user token
  would be. This is the same "verify the credential locally" pattern from
  `references/authz-guard-chain.md`, applied to a service identity instead of a user identity.
- **A shared secret / static API key per caller** — simpler to set up, weaker in practice: a leaked
  key doesn't expire on its own and usually isn't scoped as narrowly as a short-lived token. Workable
  for a small number of trusted internal callers if that's genuinely what this repo already does, but
  worth flagging as a step below the two mechanisms above if a repo is choosing one from scratch.
- **Nothing** — some repos genuinely have no service-to-service auth yet, relying entirely on network
  segmentation. That's worth surfacing explicitly as a gap rather than treated as an already-solved
  problem, the same way a missing database-layer backstop is worth surfacing in
  `references/tenant-isolation-backstop.md`.

Whichever mechanism a repo already has, the same "don't reinvent a second helper under a different
name" rule from the top-level `SKILL.md` applies here too — a new internal integration should use the
existing mechanism, not introduce a second way for services to trust each other.

## Propagating the original caller's identity, not just service identity

A service-to-service call often needs to answer two different questions, not one: "is the calling
*service* legitimate" (service-to-service trust, this file) and "on whose behalf is it acting"
(the original end user or tenant). Verifying the caller service is not the same as verifying the
end-user context — a legitimate service calling with no user context attached should not implicitly
inherit whatever access the calling service itself has.

Where a downstream call needs to preserve *who the original request was for* — a service calling
another service to fulfill one user's request — propagate that as an explicit, verifiable claim
(e.g. carried inside the same signed service token, or as a separate verified header), not as a
plain field the downstream service takes on faith. The downstream service still needs to apply its
own object-level (BOLA) check against that propagated identity — see
`references/authz-guard-chain.md` — rather than assuming the calling service already did.

## Common mistakes to avoid

- Skipping auth on an endpoint because "only our own services can reach it" — network reachability
  is not identity verification.
- Assuming mTLS or a service mesh is enforcing verification without confirming the actual mesh/gateway
  configuration does so — it's easy for this to be available but not actually required.
- Using a long-lived, unscoped shared secret for service auth without checking whether this repo has
  (or should have) a narrower, expiring alternative already in place.
- Treating "the calling service is verified" as equivalent to "the end user this call is acting on
  behalf of is verified" — propagate and re-check the original caller's identity explicitly instead
  of letting a service inherit trust it wasn't given.
