# API Reference

Local base URL: `http://localhost:3001`. Interactive docs are served at `/docs`; the OpenAPI 3.0 contract is [`docs/openapi.yaml`](docs/openapi.yaml).

## Conventions and authentication

Send JSON with `Content-Type: application/json`. Successful payloads use `data`; paginated responses also include `meta`. Errors use `{ "error": { "code": "...", "message": "...", "details": [] } }`. Protected requests require `Authorization: Bearer <Auth-Service-access-token>`. The token must be HS256 and match configured issuer/audience; admin routes require `role: ADMIN`. IDs are UUIDs unless noted.

All `/api/*` requests share a Redis IP limit of 120 requests per 60 seconds. A `429` response includes `Retry-After` and rate-limit headers. Redis limiter errors fail open. `GET /health` is not rate limited.

## Routes

| Method | Path | Access | Summary |
|---|---|---|---|
| GET | `/health` | Public | PostgreSQL/Redis status |
| GET | `/api/categories?search=&page=1&limit=20` | Public | List categories |
| GET | `/api/categories/:slug` | Public | Category details |
| POST | `/api/categories` | Admin | Create category `{name, slug?}` |
| PUT | `/api/categories/:id` | Admin | Update category fields |
| DELETE | `/api/categories/:id` | Admin | Deactivate category |
| GET | `/api/products?search=&category=&minPrice=&maxPrice=&page=1&limit=20` | Public | Filter/list products |
| GET | `/api/products/:slug` | Public | Product details |
| POST | `/api/products` | Admin | Create product |
| PUT | `/api/products/:id` | Admin | Update product fields |
| DELETE | `/api/products/:id` | Admin | Deactivate product |
| GET | `/api/cart` | Bearer | Read current user's cart |
| POST | `/api/cart/items` | Bearer | Add `{productId, quantity}` |
| PATCH | `/api/cart/items/:productId` | Bearer | Replace `{quantity}` |
| DELETE | `/api/cart/items/:productId` | Bearer | Remove cart line |
| DELETE | `/api/cart` | Bearer | Empty cart |
| POST | `/api/orders` | Bearer | Checkout `{shippingAddress}` |
| GET | `/api/orders?page=1&limit=20` | Bearer | Current user's orders |
| GET | `/api/orders/:id` | Bearer | Read owned order |
| POST | `/api/orders/:id/pay` | Bearer | Confirm mock payment |
| GET | `/api/admin/orders?status=&page=1&limit=20` | Admin | List/filter all orders |
| PATCH | `/api/admin/orders/:id/status` | Admin | Update order status |

## Request rules

- Category name: 2–80 chars; optional slug is lowercase alphanumeric/hyphen format. Pagination limit 1–100, default 20.
- Product requires UUID `categoryId`, name 2–160 chars, decimal-string `price` with at most two fractional digits; stock is a nonnegative integer (default 0). Optional slug, description (max 5000), and URL image. Filters support search/category/minPrice/maxPrice and pagination.
- Cart quantity is integer 1–99.
- Checkout `shippingAddress` is 10–1000 characters. Checkout rejects empty carts, inactive products, or insufficient stock and snapshots product name/price in the order.
- Order statuses: `PENDING`, `PAID`, `PROCESSING`, `SHIPPED`, `COMPLETED`, `CANCELLED`. Admin status updates must follow the state machine enforced by the service.

## Response and common errors

Successful create endpoints generally return `201 {data: ...}`; reads/updates return `200 {data: ...}`. Checkout commonly returns an order with items, totals, status and payment state. Lists return `data` arrays plus pagination metadata.

`400` validation or empty cart; `401` missing/invalid token; `403` non-admin; `404` missing/inactive resource or order not owned by caller; `409` insufficient stock, invalid payment state, or invalid order transition; `429` global limit; `503` health check reports dependency degradation. Check the OpenAPI contract and handlers for exact response fields.

### Checkout and mock payment example

```http
POST /api/orders
Authorization: Bearer <access-token>
Content-Type: application/json

{"shippingAddress":"123 Example Street, Jakarta"}
```

The created order starts `PENDING`. Call `POST /api/orders/:id/pay` as the same user to exercise the local mock payment; this does not charge a real payment method.
