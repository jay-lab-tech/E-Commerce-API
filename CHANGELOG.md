# Changelog

Notable changes are recorded here using Keep a Changelog conventions. Entries remain unreleased until a version is tagged.

## [Unreleased]

### Added
- Modular Express/TypeScript API for category/product catalog, user cart, checkout, order history, and admin order management.
- PostgreSQL/Prisma schema for catalog, cart, orders, mock payments, and inventory movements.
- Auth Service JWT verification, RBAC, Redis rate limiting, Docker Compose, OpenAPI docs, and integration coverage for checkout and stock lifecycle.

### Security
- Checkout uses a database transaction and conditional stock decrement; protected user data is scoped by JWT subject.
