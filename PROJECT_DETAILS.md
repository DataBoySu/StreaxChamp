You are not designing anything new.

You are explaining the architecture that is already implemented in this project.

Provide a complete technical breakdown of the current system.

Do not summarize. Do not simplify.

Explain:

Firestore schema

Collections

Documents

Indexes

Transaction usage

Batched writes

Consistency guarantees

Caching layer

Where it exists

TTL logic

Invalidation strategy

Cache stampede prevention

Memory constraints

Leaderboard system

Score write flow

Rank calculation

Tie-breaking

Anti-score-inflation protection

Atomicity guarantees

Deterministic quiz engine

Seed derivation

Question selection algorithm

Integrity enforcement

Replay protection

Streak multiplier math

Rate limiting

Strategy (token bucket, sliding window, etc.)

Storage location

Burst handling

Abuse prevention

Autonomous processes

Intervals

Scheduled jobs

Cleanup logic

Leaderboard recalculation

Cache warmup

Anti-cheat mechanisms

Client tamper protection

Server-side validation

Duplicate submission handling

IP/device tracking if any

Determinism guarantees

What ensures same inputs → same outputs

What is non-deterministic

Failure modes

Failure scenarios

Firestore outage

Partial writes

Cache poisoning

Race conditions

Scalability ceiling

Where this system breaks

Current bottlenecks

Be precise. Show actual control flow.