---
title: "PostgreSQL 与 JSONB：关系型数据库的实力，加上文档的灵活性"
description: PostgreSQL 不是 MongoDB 的替代品——它更胜一筹。学会使用 JSONB、GIN 索引、提取函数和查询操作符，兼得两者之长。
pubDatetime: 2026-01-22T10:00:00Z
tags:
  - postgresql
  - databases
  - backend
  - sql
draft: false
---

当 PostgreSQL 对 JSON 文档有了完善的支持之后，"SQL 还是 NoSQL？"这个问题就不再重要了。借助 `JSONB`，你可以在同一个数据库里，该用严格 schema 的地方用严格 schema，该灵活的地方享受文档式的灵活。

## `JSON` vs `JSONB`：一律使用 JSONB

```sql
-- JSON: stores literal text as is
-- JSONB: stores in processed binary format

-- Advantages of JSONB:
-- ✓ Supports GIN indexes (ultra-fast queries)
-- ✓ Removes redundant whitespace and duplicate keys
-- ✓ Containment operators: @>, <@
-- ✗ Slightly slower on write (parsing)
-- ✗ Does not preserve key order or spaces

CREATE TABLE events (
  id         BIGSERIAL PRIMARY KEY,
  type       TEXT NOT NULL,
  timestamp  TIMESTAMPTZ DEFAULT NOW(),
  payload    JSONB NOT NULL,             -- [!code highlight]
  metadata   JSONB DEFAULT '{}'::JSONB
);
```

## 基本的插入与查询

```sql
-- Insert an event with flexible payload
INSERT INTO events (type, payload) VALUES
  ('user.register', '{"name": "Ana Garcia", "plan": "pro", "country": "MX"}'),
  ('payment.completed', '{"amount": 99.99, "currency": "USD", "method": "card"}'),
  ('error.api',        '{"code": 429, "endpoint": "/api/v2/items", "ip": "10.0.0.1"}');

-- Field extraction: ->> operator
SELECT payload->>'name' AS name
FROM events
WHERE type = 'user.register';

-- Nested extraction
SELECT payload->'address'->>'city' AS city
FROM events
WHERE type = 'user.register';

-- Filter by value inside JSON
SELECT * FROM events
WHERE type = 'payment.completed'
  AND (payload->>'amount')::NUMERIC > 50;
```

## GIN 索引：以 SQL 的速度查询 JSON

```sql
-- GIN index over the entire JSONB column
CREATE INDEX idx_events_payload ON events USING GIN (payload);  -- [!code highlight]

-- Index on a specific key (more efficient)
CREATE INDEX idx_events_payment_type ON events
  USING GIN ((payload->'method'));

-- Now these queries use the index:
SELECT * FROM events
WHERE payload @> '{"plan": "pro"}';      -- contains this object

SELECT * FROM events
WHERE payload ? 'code';                -- has this key
```

## 包含操作符

```sql
-- @>  "contains"
SELECT * FROM events
WHERE payload @> '{"currency": "USD", "method": "card"}';

-- <@  "is contained in"
SELECT '{"a": 1}'::JSONB <@ '{"a": 1, "b": 2}'::JSONB;  -- true

-- ?   "has the key"
SELECT * FROM events WHERE payload ? 'code';

-- ?|  "has any of the keys"
SELECT * FROM events WHERE payload ?| ARRAY['name', 'email'];

-- ?&  "has all the keys"
SELECT * FROM events WHERE payload ?& ARRAY['amount', 'currency'];
```

## `jsonb_set` 与局部更新

相比纯文档方案的一大优势：更新某个字段时，不必重写整个文档。

```sql
-- Update a field inside JSONB
UPDATE events
SET payload = jsonb_set(payload, '{plan}', '"enterprise"')  -- [!code highlight]
WHERE type = 'user.register'
  AND payload->>'name' = 'Ana Garcia';

-- Remove a key
UPDATE events
SET payload = payload - 'ip'
WHERE type = 'error.api';

-- Add an entry to an array inside JSONB
UPDATE events
SET payload = jsonb_insert(payload, '{tags, -1}', '"urgent"')
WHERE type = 'error.api';
```

## 聚合函数：`jsonb_agg` 与 `jsonb_object_agg`

```sql
-- Group payments by currency as JSON array
SELECT
  payload->>'currency' AS currency,
  COUNT(*)           AS total_payments,
  jsonb_agg(payload) AS detail          -- [!code highlight]
FROM events
WHERE type = 'payment.completed'
GROUP BY currency;

-- Build an object from rows
SELECT jsonb_object_agg(type, COUNT(*))  -- [!code highlight]
FROM events
GROUP BY 1;
```

## 混合 schema：两全其美

```sql
CREATE TABLE products (
  id          BIGSERIAL PRIMARY KEY,
  sku         TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL,
  category    TEXT NOT NULL,
  -- Structured fields ↑ for JOIN, B-tree indexes, constraints
  attributes  JSONB DEFAULT '{}',
  -- Flexible attributes ↓ according to product category
  CHECK (price > 0)
);

-- Electronics: { "voltage": 220, "warranty_months": 24 }
-- Clothing:    { "sizes": ["S","M","L"], "material": "cotton" }
-- Books:       { "isbn": "...", "pages": 320 }

-- Query that takes advantage of both columns
SELECT name, attributes->>'warranty_months' AS warranty
FROM products
WHERE category = 'electronics'
  AND (attributes->>'warranty_months')::INT >= 12
  AND price < 500;
```

> 对关键字段来说，JSONB 并不能替代带类型的列。原则是：如果某个字段会频繁用于 JOIN、`WHERE` 或 `ORDER BY`——就把它建成列；如果是多变的元数据、很少被查询——就放进 JSONB。
