import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * Used only by the TypeORM CLI (migration:run / migration:generate) — the
 * running Nest app configures its own connection in app.module.ts.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'zipmart',
  password: process.env.DB_PASSWORD ?? 'zipmart',
  database: process.env.DB_NAME ?? 'zipmart',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
});
