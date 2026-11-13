# Life Compass inside Angel AI

**Status:** Opt-in, experimental decision-support mode. Not a clinical product, medical device, emergency service, therapy replacement or independently validated psychological assessment.

Route: `/angel/life-compass`. Angel's existing chat UI, consent flow, request validation, provider selection, deterministic 911/988 notices, client-only transcript lifecycle and opt-in local planning context remain in effect. Conversations are not newly persisted or transmitted elsewhere by this integration. The user's words still go to the configured upstream AI provider for responses; the existing Angel disclosure explains that route.

## Implemented

- Distinct Life Compass route and visible entry point from `/angel`.
- Explicit `mode: "life-compass"` in a validated Angel API request. Existing Angel mode is unchanged.
- Separate, reviewable evidence-aware reasoning protocol, with facts / interpretations / alternative hypotheses / unknowns.
- Conditional scenario analysis, next-action recommendations, assumption checks and no invented probabilities.
- Reasoning-tier routing for non-resource queries, existing resource tools for explicit resource requests.
- Automated regression tests for mode, boundaries, safety notices, UI entry, and route selection.

## Not implemented / no false promises

- No independent literature search or automated citation verification. Two verified public sources in the prompt (NIMH and NICE) support only general framing. The model must not imply it checked specialized research.
- No patient diagnosis, clinical treatment, validated outcome probabilities or therapist replacement.
- No cloud or on-device decision ledger, synchronized memory, background monitoring, monitoring of the user or automatic third-party action.
- No local/offline language model unless separately provisioned.
- No deployment until privacy/clinical review and explicit approval.

## Licensing

NarcoGuard remains MIT for its preexisting code and generic Angel adapters. `lib/life-compass.ts` is an independently authored component provided under **PolyForm Noncommercial 1.0.0**, as marked by its SPDX identifier and the terms in [LICENSE](./LICENSE). Other rights and existing third-party licenses are not withdrawn. A future stand-alone public-benefit repository should contain the reusable core with the same license, attribution, tests and independently reviewed constitution. Avoid copying user conversations or private personal history into that repository.

## Sources used for framing

- National Institute of Mental Health, [Psychotherapies](https://www.nimh.nih.gov/health/topics/psychotherapies) (CBT and related methods; not AI efficacy).
- NICE, [Shared decision making NG197](https://www.nice.org.uk/guidance/ng197/chapter/recommendations) (person-centered options and uncertainty; not individual outcome prediction).
