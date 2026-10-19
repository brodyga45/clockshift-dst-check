import assert from 'node:assert/strict';
import {inspect,possibleInstants,timezoneRuleCheck} from './engine.mjs';
assert.deepEqual(possibleInstants('2026-10-25','02:30','Europe/Belgrade').map(x=>new Date(x).toISOString()),['2026-10-25T00:30:00.000Z','2026-10-25T01:30:00.000Z']);
assert.deepEqual(possibleInstants('2027-03-28','02:30','Europe/Belgrade'),[]);
assert.equal(possibleInstants('2027-03-14','02:30','America/New_York').length,0);
assert.equal(possibleInstants('2026-11-01','01:30','America/New_York').length,2);
assert.equal(possibleInstants('2026-10-04','02:15','Australia/Lord_Howe').length,0);
const lh=possibleInstants('2027-04-04','01:45','Australia/Lord_Howe');assert.equal(lh.length,2);assert.equal(lh[1]-lh[0],1800000);
assert.equal(possibleInstants('2026-10-25','02:30','Asia/Kolkata').length,1);
assert.equal(possibleInstants('2026-10-25','00:00','UTC').length,1);
const r=inspect({zone:'Europe/Belgrade',time:'02:30',start:'2026-10-19'});assert.equal(r.length,370);assert.equal(r.filter(x=>x.status!=='once').length,2);
assert.equal(inspect({zone:'Europe/Belgrade',time:'02:30',start:'2026-10-19',days:7,weekday:'0'}).length,1);
for(const config of [{start:'2026-02-30'},{days:401},{time:'25:00'},{weekday:'7'},{zone:'invalid'}])assert.throws(()=>inspect({zone:'UTC',time:'09:00',start:'2026-10-19',...config}));
console.log('17 clock-transition, calendar, filtering and validation checks passed.');

// Regression: stale runtime data must not export an abolished clock change.
const known = [['America/Vancouver',-420],['America/Edmonton',-360],
  ['America/Inuvik',-360],['America/Winnipeg',-300],['Africa/Casablanca',0],['Africa/El_Aaiun',0]];
for (const [zone, expected] of known) {
  const check = timezoneRuleCheck(zone);
  assert.equal(check.expectedMinutes, expected);
  assert.equal(check.matches, check.actualMinutes === expected);
  assert.equal(possibleInstants('2026-01-15','12:00',zone).length,1);
  if (!check.matches) {
    assert.throws(()=>possibleInstants('2026-12-01','01:30',zone),/Outdated timezone rules/);
    assert.throws(()=>inspect({zone,time:'01:30',start:'2026-10-31',days:32}),/Outdated timezone rules/);
  } else {
    assert.equal(possibleInstants('2026-12-01','01:30',zone).length,1);
  }
}
assert.deepEqual(timezoneRuleCheck('america/vancouver'),timezoneRuleCheck('America/Vancouver'));
assert.deepEqual(timezoneRuleCheck('Canada/Pacific'),timezoneRuleCheck('America/Vancouver'));
assert.equal(timezoneRuleCheck('America/New_York'),null);
console.log('Known-rule rejection, historical-date, current-data and alias regressions passed.');

// Synthetic up-to-date Vancouver runtime: exercise the successful path and
// round-trip candidate calculation without installing or claiming a newer ICU.
const OriginalFormatter = Intl.DateTimeFormat;
try {
  Intl.DateTimeFormat = function(locale, options) {
    if (options?.timeZone === 'America/Vancouver') {
      const utc = new OriginalFormatter(locale, {...options, timeZone:'UTC'});
      return {resolvedOptions:()=>({...utc.resolvedOptions(),timeZone:'America/Vancouver'}),
        format:ms=>utc.format(Number(ms)-420*60000),
        formatToParts:ms=>utc.formatToParts(Number(ms)-420*60000)};
    }
    return new OriginalFormatter(locale, options);
  };
  const fresh = await import('./engine.mjs?synthetic-current-data');
  assert.equal(fresh.timezoneRuleCheck('America/Vancouver').matches,true);
  assert.deepEqual(fresh.possibleInstants('2026-11-01','01:30','America/Vancouver')
    .map(ms=>new Date(ms).toISOString()),['2026-11-01T08:30:00.000Z']);
} finally { Intl.DateTimeFormat = OriginalFormatter; }
console.log('Synthetic current-data Vancouver report passes with one UTC candidate.');
