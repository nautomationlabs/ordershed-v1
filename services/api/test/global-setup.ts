/** Recreates the `ordershed_test` database and applies all migrations before the test run. */
import pg from 'pg';
import { migrate } from '../src/db/migrate.js';
import { TEST_DB, TEST_OWNER_URL, ADMIN_URL } from './helpers.js';

export default async function setup() {
  const admin = new pg.Client({ connectionString: ADMIN_URL });
  await admin.connect();
  await admin.query(`drop database if exists ${TEST_DB} with (force)`);
  await admin.query(`create database ${TEST_DB}`);
  await admin.end();
  await migrate(TEST_OWNER_URL, 'app_dev_only', () => {});
}
