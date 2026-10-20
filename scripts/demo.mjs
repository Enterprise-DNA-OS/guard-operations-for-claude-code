#!/usr/bin/env node
// npm run demo: a temporary database with the fictional guarding firm, three real command runs, then cleaned up.
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { seed } from './seed.mjs';

const temp = mkdtempSync(path.join(os.tmpdir(), 'guarding-demo-'));
process.env.DATA_DIR = path.join(temp, 'db');
process.env.DATABASE_URL = '';
process.env.OUTPUT_DIR = path.join(temp, 'out');
try {
  const db = await getDb();
  try { await migrate(db); await seed(db); } finally { await db.close(); }
  for (const cmd of [['attention'], ['compliance'], ['cover', 'S-1050']]) {
    console.log(`\n> node scripts/guarding.mjs ${cmd.join(' ')}`);
    const r = spawnSync(process.execPath, ['scripts/guarding.mjs', ...cmd], { cwd: REPO_ROOT, env: process.env, encoding: 'utf8' });
    process.stdout.write(r.stdout);
    if (r.status !== 0) throw Error(r.stderr);
  }
  console.log('\nDemo PASS. Temporary fictional database removed.');
} finally {
  rmSync(temp, { recursive: true, force: true });
}
