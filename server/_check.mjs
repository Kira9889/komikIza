import 'dotenv/config';
import pg from 'pg';
const { Client } = pg;
const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
try {
  await c.connect();
  const r = await c.query(`select c.id, c.name, c.pages, m.title
    from chapters c
    join manga m on m.id = c.manga_id
    where c.pages is not null and jsonb_array_length(c.pages) > 0
    order by m.title, c.sort_order
    limit 5`);
  for (const row of r.rows) {
    console.log(`\n${row.title} — ${row.name} (${row.id})`);
    console.log('  pages:', JSON.stringify(row.pages));
  }
  const r2 = await c.query(`select c.id, c.name, c.pages from chapters c
    where c.pages is not null and jsonb_array_length(c.pages) > 0
    order by c.sort_order desc limit 3`);
  console.log('\n--- Latest chapters with pages:');
  for (const row of r2.rows) {
    console.log(`${row.name}:`, JSON.stringify(row.pages));
  }
} catch (e) {
  console.error('ERR', e.message);
  process.exit(1);
} finally {
  await c.end();
}