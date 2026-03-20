import pg from "pg";
const SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS episodes (
  id UUID PRIMARY KEY,
  timestamp BIGINT NOT NULL,
  actors TEXT[] NOT NULL,
  actions TEXT[] NOT NULL,
  context JSONB DEFAULT '{}',
  outcome TEXT,
  embedding vector(1536),
  importance REAL DEFAULT 0.5,
  summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_episodes_timestamp ON episodes (timestamp);
CREATE INDEX IF NOT EXISTS idx_episodes_actors ON episodes USING GIN (actors);
CREATE INDEX IF NOT EXISTS idx_episodes_embedding ON episodes USING ivfflat (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS knowledge_triples (
  id UUID PRIMARY KEY,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  confidence REAL DEFAULT 1.0,
  source TEXT,
  embedding vector(1536),
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  version INT DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_knowledge_triples_subject ON knowledge_triples (subject);
CREATE INDEX IF NOT EXISTS idx_knowledge_triples_embedding ON knowledge_triples USING ivfflat (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS procedures (
  id UUID PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  steps TEXT[] NOT NULL,
  preconditions TEXT[] DEFAULT '{}',
  postconditions TEXT[] DEFAULT '{}',
  success_rate REAL DEFAULT 0,
  execution_count INT DEFAULT 0,
  last_used BIGINT,
  embedding vector(1536),
  tags TEXT[] DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_procedures_name ON procedures (name);
CREATE INDEX IF NOT EXISTS idx_procedures_tags ON procedures USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_procedures_embedding ON procedures USING ivfflat (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS caller_profiles (
  caller_id TEXT PRIMARY KEY,
  profile JSONB NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS caller_sessions (
  caller_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  context JSONB NOT NULL,
  PRIMARY KEY (caller_id, session_id)
);
`;
export function createPgPool(databaseUrl) {
    return new pg.Pool({
        connectionString: databaseUrl,
        max: 10,
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 5_000,
    });
}
export async function runMigrations(pool) {
    await pool.query(SCHEMA_SQL);
}
//# sourceMappingURL=pg-pool.js.map