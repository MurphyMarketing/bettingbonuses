/**
 * One-off, idempotent import of authoritative per-market state facts into the
 * regions table, matched by state name. Re-runnable (plain UPDATEs).
 *
 *   node scripts/seed-market-facts.mjs
 *
 * Sets the 8 per-market columns ({sportsbook,prediction,dfs,racing}_status +
 * _min_age) for every row. regulator / regulator_url are set ONLY when the cell
 * has a value (blank leaves the existing value untouched). Rows whose state name
 * doesn't match a region are reported and skipped (no regions are created).
 *
 * Authored as .mjs (not .ts) because tsx's esbuild is version-mismatched in this
 * environment; it uses the same raw Postgres connection the app uses.
 */
import fs from 'node:fs';
import postgres from 'postgres';

const CSV = `state,sportsbook_status,sportsbook_min_age,prediction_status,prediction_min_age,dfs_status,dfs_min_age,racing_status,racing_min_age,regulator_name,regulator_url
Alabama,illegal,,legal,18,legal,19,legal,18,,
Alaska,illegal,,legal,18,legal,18,illegal,,,
Arizona,legal,21,contested,18,legal,21,legal,18,Arizona Department of Gaming,
Arkansas,legal,21,legal,18,legal,18,legal,18,Arkansas Racing Commission,
California,illegal,,legal,18,legal,18,legal,18,California Gambling Control Commission,
Colorado,legal,21,legal,18,legal,18,legal,18,Colorado Division of Gaming,
Connecticut,legal,21,contested,18,legal,18,legal,18,CT Dept. of Consumer Protection – Gaming Division,
Delaware,legal,21,legal,18,legal,18,legal,18,Delaware Division of Gaming Enforcement,
District of Columbia,legal,21,legal,18,legal,18,legal,18,DC Office of Lottery and Gaming,
Florida,legal,21,legal,18,legal,18,legal,18,Florida Gaming Control Commission,
Georgia,illegal,,legal,18,legal,18,illegal,,,
Hawaii,illegal,,legal,18,illegal,,illegal,,,
Idaho,illegal,,legal,18,illegal,,legal,18,,
Illinois,legal,21,contested,18,legal,18,legal,18,Illinois Gaming Board,
Indiana,legal,21,legal,18,legal,18,legal,18,Indiana Gaming Commission,
Iowa,legal,21,legal,18,legal,21,legal,21,Iowa Racing and Gaming Commission,
Kansas,legal,21,legal,18,legal,18,legal,18,Kansas Racing and Gaming Commission,
Kentucky,legal,18,legal,18,legal,18,legal,18,Kentucky Horse Racing and Gaming Corporation,
Louisiana,legal,21,legal,18,unregulated,18,legal,18,Louisiana Gaming Control Board,
Maine,legal,21,legal,18,legal,18,legal,18,Maine Gambling Control Unit,
Maryland,legal,21,contested,18,legal,18,legal,18,Maryland Lottery and Gaming Control Agency,
Massachusetts,legal,21,contested,18,legal,21,legal,18,Massachusetts Gaming Commission,
Michigan,legal,21,contested,18,legal,18,legal,18,Michigan Gaming Control Board,
Minnesota,illegal,,contested,18,legal,18,legal,18,Minnesota Gambling Control Board,
Mississippi,retail_only,21,legal,18,illegal,,legal,18,Mississippi Gaming Commission,
Missouri,legal,21,legal,18,illegal,,legal,18,Missouri Gaming Commission,
Montana,retail_only,18,contested,18,illegal,,legal,18,Montana Lottery,
Nebraska,retail_only,21,legal,18,legal,19,legal,18,Nebraska Racing and Gaming Commission,
Nevada,legal,21,contested,18,illegal,,legal,21,Nevada Gaming Control Board,
New Hampshire,legal,18,legal,18,legal,18,legal,18,New Hampshire Lottery Commission,
New Jersey,legal,21,contested,18,illegal,,legal,18,New Jersey Division of Gaming Enforcement,https://www.nj.gov/oag/ge/
New Mexico,retail_only,21,legal,18,legal,18,legal,18,New Mexico Gaming Control Board,
New York,legal,21,contested,18,illegal,,legal,18,New York State Gaming Commission,https://www.gaming.ny.gov/
North Carolina,legal,21,legal,18,legal,18,legal,18,North Carolina State Lottery Commission,
North Dakota,retail_only,21,legal,18,legal,18,legal,18,North Dakota (tribal — no state commission),
Ohio,legal,21,contested,18,legal,18,legal,18,Ohio Casino Control Commission,
Oklahoma,illegal,,legal,18,legal,18,legal,18,,
Oregon,legal,21,legal,18,unregulated,18,legal,18,Oregon Lottery,
Pennsylvania,legal,21,legal,18,legal,18,legal,18,Pennsylvania Gaming Control Board,
Rhode Island,legal,18,legal,18,legal,18,legal,18,Rhode Island Lottery,
South Carolina,illegal,,legal,18,legal,18,illegal,,,
South Dakota,retail_only,21,legal,18,legal,18,legal,18,South Dakota Commission on Gaming,
Tennessee,legal,21,contested,18,illegal,,legal,18,Tennessee Sports Wagering Council,
Texas,illegal,,legal,18,legal,18,legal,18,Texas Racing Commission,
Utah,illegal,,legal,18,legal,18,illegal,,,
Vermont,legal,21,legal,18,legal,18,legal,18,Vermont Dept. of Liquor and Lottery,
Virginia,legal,21,legal,18,legal,18,legal,18,Virginia Lottery,
Washington,retail_only,21,legal,18,illegal,,legal,18,Washington State Gambling Commission,
West Virginia,legal,21,legal,18,legal,18,legal,18,West Virginia Lottery,
Wisconsin,not_yet_live,21,legal,18,legal,18,legal,18,Wisconsin Dept. of Administration – Division of Gaming,
Wyoming,legal,18,legal,18,legal,18,legal,18,Wyoming Gaming Commission,`;

const ALLOWED = new Set(['legal', 'not_yet_live', 'illegal', 'unregulated', 'contested', 'retail_only']);

const env = fs.readFileSync('.env.local', 'utf8');
const m = env.match(/^DIRECT_URL="?([^"\n]+)"?/m);
if (!m) { console.error('DIRECT_URL not found in .env.local'); process.exit(1); }
const sql = postgres(m[1], { prepare: false, max: 1 });

const age = (v) => {
  const s = (v ?? '').trim();
  if (!s) return null;
  const n = Number.parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
};

const lines = CSV.trim().split('\n').slice(1); // drop header
const updated = [];
const unmatched = [];
const badStatus = [];

for (const line of lines) {
  const f = line.split(',');
  if (f.length !== 11) { console.error(`! malformed row (${f.length} cols): ${line}`); continue; }
  const r = {
    state: f[0].trim(),
    ss: f[1].trim(), ssa: age(f[2]),
    ps: f[3].trim(), psa: age(f[4]),
    ds: f[5].trim(), dsa: age(f[6]),
    rs: f[7].trim(), rsa: age(f[8]),
    regName: f[9].trim(),
    regUrl: f[10].trim(),
  };
  for (const [k, v] of [['sportsbook', r.ss], ['prediction', r.ps], ['dfs', r.ds], ['racing', r.rs]]) {
    if (!ALLOWED.has(v)) badStatus.push(`${r.state}/${k}=${v}`);
  }

  const res = await sql`
    update regions set
      sportsbook_status  = ${r.ss}::market_legal_status,
      sportsbook_min_age = ${r.ssa},
      prediction_status  = ${r.ps}::market_legal_status,
      prediction_min_age = ${r.psa},
      dfs_status         = ${r.ds}::market_legal_status,
      dfs_min_age        = ${r.dsa},
      racing_status      = ${r.rs}::market_legal_status,
      racing_min_age     = ${r.rsa},
      updated_at         = now()
    where name = ${r.state}
  `;
  if (res.count === 0) { unmatched.push(r.state); continue; }
  updated.push(r.state);

  // Regulator name/url: only when present (don't wipe existing values).
  if (r.regName) await sql`update regions set regulator = ${r.regName}, updated_at = now() where name = ${r.state}`;
  if (r.regUrl) await sql`update regions set regulator_url = ${r.regUrl}, updated_at = now() where name = ${r.state}`;
}

console.log(`rows in CSV: ${lines.length}`);
console.log(`regions updated: ${updated.length}`);
console.log(`unmatched (skipped): ${unmatched.length ? unmatched.join(', ') : 'none'}`);
console.log(`invalid status values: ${badStatus.length ? badStatus.join(', ') : 'none'}`);

await sql.end();
