import {timezoneRuleCheck} from './engine.mjs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const cli=new URL('./cli.mjs',import.meta.url);
const run=args=>spawnSync(process.execPath,[fileURLToPath(cli),...args],{encoding:'utf8'});
const base=['--timezone','Europe/Belgrade','--at','02:30','--start','2026-10-19'];
let r=run([...base,'--format','json']);assert.equal(r.status,0,r.stderr);const report=JSON.parse(r.stdout);assert.equal(report.rows.length,370);assert.deepEqual(report.rows.find(x=>x.date==='2026-10-25').instants,['2026-10-25T00:30:00.000Z','2026-10-25T01:30:00.000Z']);
r=run([...base,'--days','7','--format','csv']);assert.equal(r.status,0,r.stderr);const lines=r.stdout.trim().split('\r\n');assert.equal(lines.length,8);assert.ok(lines.every(line=>line.split(',').length===6));assert.ok(lines[7].includes('2026-10-25T01:30:00.000Z'));
r=run([...base,'--weekday','0']);assert.equal(r.status,0,r.stderr);assert.ok(r.stdout.includes('52 scheduled dates'));
for(const args of [[],[...base,'--format','yaml'],[...base,'--days'],[...base,'--timezone','bogus'],[...base,'--unknown','x']]){r=run(args);assert.equal(r.status,1);assert.equal(r.stdout,'');assert.ok(r.stderr.startsWith('Clockshift:'));}
assert.equal(run(['--help']).status,0);
console.log('CLI JSON, CSV columns/UTC candidates, weekday filtering and error-path checks passed.');

if (!timezoneRuleCheck('America/Vancouver').matches) {
  for (const format of ['text','json','csv']) {
    const failed=run(['--timezone','America/Vancouver','--at','01:30','--start','2026-11-01','--days','1','--format',format]);
    assert.equal(failed.status,1);assert.equal(failed.stdout,'');
    assert.match(failed.stderr,/Outdated timezone rules for America\/Vancouver/);
  }
}
console.log('CLI refuses affected text/JSON/CSV reports on stale data.');
