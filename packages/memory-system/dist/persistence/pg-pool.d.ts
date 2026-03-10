import pg from "pg";
export declare function createPgPool(databaseUrl: string): pg.Pool;
export declare function runMigrations(pool: pg.Pool): Promise<void>;
//# sourceMappingURL=pg-pool.d.ts.map