const DAY = 86400000;
const formatters = new Map();
function formatter(zone) {
  if (!formatters.has(zone)) formatters.set(zone, new Intl.DateTimeFormat('en-GB', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }));
  return formatters.get(zone);
}
function localStamp(ms, zone) {
  const p = Object.fromEntries(formatter(zone).formatToParts(ms).map(x => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
}
// Known 2026 rule changes, verified against IANA NEWS (2026e), 19 Oct 2026.
// This is a bounded stale-data check, not a bundled timezone database or certification.
const knownRules = new Map([
  ['America/Vancouver', ['2026-11-01', -420]], ['Canada/Pacific', ['2026-11-01', -420]],
  ['America/Edmonton', ['2026-11-01', -360]], ['Canada/Mountain', ['2026-11-01', -360]],
  ['America/Yellowknife', ['2026-11-01', -360]], ['America/Inuvik', ['2026-11-01', -360]],
  ['America/Winnipeg', ['2026-11-01', -300]], ['Canada/Central', ['2026-11-01', -300]],
  ['Africa/Casablanca', ['2026-09-20', 0]], ['Africa/El_Aaiun', ['2026-09-20', 0]]
]);
const ruleChecks = new Map();
export function timezoneRuleCheck(zone) {
  zone = formatter(zone).resolvedOptions().timeZone;
  if (!knownRules.has(zone)) return null;
  if (!ruleChecks.has(zone)) {
    const [effective, expectedMinutes] = knownRules.get(zone);
    const probe = Date.parse('2026-12-01T12:00:00Z');
    const actualMinutes = (localStamp(probe, zone) - probe) / 60000;
    ruleChecks.set(zone, {effective, expectedMinutes, actualMinutes,
      matches: actualMinutes === expectedMinutes});
  }
  return ruleChecks.get(zone);
}
function assertTimezoneRules(date, zone) {
  const check = timezoneRuleCheck(zone);
  if (check && date >= check.effective && !check.matches) {
    throw new Error(`Outdated timezone rules for ${zone}: this runtime fails a known 2026 rule check. Update its timezone data or use an updated runtime. No report is generated for affected dates. These checks cover selected changes only; other zones are not certified.`);
  }
}
export function possibleInstants(date, time, zone) {
  const naive = Date.parse(`${date}T${time}:00Z`);
  if (!Number.isFinite(naive)) throw new Error('Choose a valid date and time.');
  assertTimezoneRules(date, zone);
  const offsets = new Set();
  // Sample both sides of modern timezone transitions, including half-hour shifts.
  for (let h = -36; h <= 36; h += 6) {
    const probe = naive + h * 3600000;
    offsets.add(localStamp(probe, zone) - probe);
  }
  return [...offsets].map(offset => naive - offset)
    .filter(ms => localStamp(ms, zone) === naive).sort((a, b) => a - b);
}
export function inspect({zone, time, start, days = 370, weekday = 'all'}) {
  formatter(zone).format(0);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Enter a time from 00:00 to 23:59.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || start < '2020-01-01' || start > '2098-12-31') throw new Error('Choose a start date between 2020 and 2098.');
  const begin = Date.parse(start + 'T00:00:00Z');
  if (!Number.isFinite(begin) || new Date(begin).toISOString().slice(0,10) !== start) throw new Error('Choose a real calendar date.');
  if (!Number.isInteger(days) || days < 1 || days > 400) throw new Error('Check between 1 and 400 days.');
  if (weekday !== 'all' && !/^[0-6]$/.test(String(weekday))) throw new Error('Choose a valid weekday.');
  const rows = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(begin + i * DAY);
    if (weekday !== 'all' && day.getUTCDay() !== Number(weekday)) continue;
    const date = day.toISOString().slice(0,10);
    const instants = possibleInstants(date, time, zone);
    rows.push({date, time, instants: instants.map(ms => new Date(ms).toISOString()),
      status: instants.length === 0 ? 'missing' : instants.length > 1 ? 'repeated' : 'once'});
  }
  return rows;
}
