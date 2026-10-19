# Clockshift

[Use the free browser tool](https://clockshift-dst-check.brodyga45.chatgpt.site). The root directory contains both the browser implementation and Node.js CLI. Serve it with any static file server, for example `python3 -m http.server 8000`, then open `http://localhost:8000`.

Check whether a daily or weekly **local clock time** is missing or repeated as the clocks change. Scan up to 400 calendar days and export every date with its matching UTC instants.

For example, `02:30 Europe/Belgrade` occurs twice on 25 October 2026 and never occurs on 28 March 2027. A cron expression alone doesn't tell you what your scheduler does in either case.

## Try it locally

Requires Node.js 18 or newer with the relevant IANA timezone data. No packages, signup, API keys or network requests are needed to run it.

```sh
node cli.mjs --timezone Europe/Belgrade --at 02:30 --start 2026-10-19
```

Expected report:

```text
Europe/Belgrade at 02:30: 370 scheduled dates, 2 clock-time edge cases.
2026-10-25 02:30 REPEATED → 2026-10-25T00:30:00.000Z / 2026-10-25T01:30:00.000Z
2027-03-28 02:30 MISSING → no matching UTC instant
```

Export a complete report:

```sh
node cli.mjs --timezone America/New_York --at 01:30 --start 2026-10-19 --format csv > schedule.csv
node cli.mjs --timezone Australia/Lord_Howe --at 01:45 --start 2027-04-01 --days 7 --format json
node cli.mjs --timezone Europe/Belgrade --at 02:30 --start 2026-10-19 --weekday 0
node cli.mjs --help
```

The start date is a local calendar date in the selected zone. `--days` is the number of calendar days inspected, including the start date. `--weekday` filters those dates: 0 is Sunday, 1 is Monday, and so on. The default is every day.

## What it tells you

- **Missing:** no UTC instant matches the selected local date/time.
- **Repeated:** two UTC instants match; both are included, even for half-hour clock changes.
- **Once:** exactly one instant matches.

This checks local time ambiguity. It does **not** simulate your scheduler or predict whether a job executes. Engines may skip, shift or deduplicate a transition. Fixed elapsed-time intervals are outside this tool's scope. Timezone rules come from your runtime and may change; keep it updated and verify important schedules against your deployed engine. Known 2026 changes for Vancouver, Edmonton, Inuvik, Winnipeg, Casablanca and El Aaiun are checked against a fixed December 2026 offset probe. If that probe fails, affected dates are rejected instead of exporting an obsolete forecast. These limited checks do not certify other zones or replace a current timezone database. See [IANA timezone NEWS](https://data.iana.org/time-zones/tzdb/NEWS), checked 19 October 2026.

The algorithm samples nearby offsets on both sides of modern transitions and verifies each candidate by formatting it back into the selected timezone. Supported start dates are 2020–2098. This is not a historical timezone archive.

## Check it

```sh
node test.mjs
node test-cli.mjs
```

Regression examples cover European and US gaps/overlaps, Lord Howe half-hour transitions, UTC, India, invalid dates and weekday filtering. They are synthetic test inputs, not production executions or customer evidence.

## Feedback

When reporting a problem to the maintainer, include your timezone, local time, date range, Node version and the output you expected. Use synthetic examples; do not share workflow exports, access tokens or customer data. A concrete report of a schedule problem this helped you find is especially useful.

## References

- [n8n Schedule Trigger: timezone settings and publishing](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.scheduletrigger/)
- [Intl.DateTimeFormat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat)

MIT licensed. This project is independent of n8n and all monitoring vendors.

This is an early experiment with no measured external audience or paid sponsor. We are exploring one clearly labelled, fixed-fee sponsorship from a relevant developer service. No affiliate commissions or telemetry are included in this code. An inquiry is not a sponsorship agreement.
