# Architecture

## Runtime flow

```text
Browser / API client
  → Express 5 (Helmet, CORS, request ID/logging, JSON, global Redis limit)
    → route + Zod validation + Auth Service JWT / ADMIN authorization
      → module controller → service → repository (Prisma)
        → PostgreSQL (catalog, carts, orders, payments, inventory movements)
    └─ Redis (shared API rate-limit counter)
```

The API is a modular monolith: category, product, cart, and order modules run in one Node.js process. `GET /health` checks PostgreSQL and Redis. Docker Compose runs the API with both dependencies; migrations are applied before startup.

## Modules and data model

```text
Category 1 ── * Product 1 ── * CartItem
                         ├── * OrderItem ── * Order (many items)
                         └── * InventoryMovement
Order 1 ── 0..1 Payment
```

- **Catalog:** categories and products; inactive records are hidden by default and deactivated rather than physically deleted.
- **Cart:** keyed by Auth Service `userId`, unique per `(userId, productId)`.
- **Checkout:** snapshots product name and price into `OrderItem`, creates order/payment records, clears the cart, and records stock reservations.
- **Inventory:** movements record `PURCHASE`, `RESERVATION`, `RELEASE`, or `ADJUSTMENT`.
- **Payment:** currently uses a mock flow. The schema has payment-method enum values for future providers, but no live gateway integration is implemented.

## Checkout consistency

Checkout uses a Prisma transaction. For each cart item, it conditionally decrements stock only when the product is active and the available stock is at least the requested quantity. A failed conditional update aborts the transaction, so partial stock deductions/order creation do not commit. Cancellation restores stock and records `RELEASE` movements in a transaction. This prevents overselling at the row-update boundary, though high-contention load still depends on PostgreSQL transaction behavior and should be tested under production-like concurrency.

## Identity and authorization

The service does not copy the Auth Service user table. It verifies HS256 bearer JWTs locally with the shared `JWT_ACCESS_SECRET`, issuer, and audience, then uses `sub` as the cart/order owner and `role` for admin routes. This keeps services decoupled but requires identical signing configuration and secure secret distribution.

## Trade-offs and current scope

- Prisma and PostgreSQL transactions provide a straightforward consistency boundary; Redis is not the source of truth for commerce data.
- Global rate-limit failures are fail-open with a warning, preserving API availability but temporarily removing that protection if Redis is down.
- Payment is a mock confirmation endpoint, not a real processor; refunds, webhook verification, and payment reconciliation are not implemented.
- There is no separate queue/worker or frontend in this repository; external email and fulfillment are out of scope.
