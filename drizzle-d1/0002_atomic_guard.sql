-- Infrastructure assertion, not a business counter. A failed assertion aborts the whole D1 batch.
CREATE TABLE d1_atomic_guard (id INTEGER NOT NULL PRIMARY KEY CHECK(id=1), ok INTEGER NOT NULL CHECK(ok=1)) STRICT;
