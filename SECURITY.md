# Security Policy

## Reporting

Please do not publish exploitable vulnerability details in a public issue. Use GitHub private vulnerability reporting for this repository if available, or contact the maintainer privately through GitHub. Include affected commit/version, impact, and reproducible steps; omit real customer data and secrets.

## Implemented safeguards

- Bearer JWT verification pins HS256 and checks issuer, audience, subject, and role. Auth Service remains the identity source; protected cart/order queries scope by the verified user ID.
- Admin catalog/order changes require ADMIN authorization.
- Zod strict request validation, bounded JSON payloads, Helmet, CORS middleware, UUID validation, and a consistent error handler.
- PostgreSQL transaction for checkout and conditional stock decrement; order items preserve price/name snapshots. Cancellation restores reserved stock transactionally.
- Redis-backed global IP rate limiting; request IDs and structured logs support traceability.
- Payment provider credentials are not stored in client code. The current payment endpoint is explicitly mock-only.

## Operator guidance and limitations

Use HTTPS, unique high-entropy production secrets, private database/Redis network access, least-privilege credentials, backups, patched dependencies, and monitored logs. Configure CORS and `TRUST_PROXY` for the actual deployment topology. Never publish `.env`, JWT secrets, database URLs, or provider credentials.

The JWT is verified locally; this service does not call Auth Service on every request. A role change, account disablement, or logout therefore does not invalidate an already-issued access token before expiry. Global limiter failures are fail-open. No real payment gateway, webhook signature verification, PCI payment-data handling, or external email integration is implemented; do not accept card data through this API. There is no published release support window; only the current repository state is maintained.
