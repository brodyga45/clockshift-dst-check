#!/usr/bin/env node
import {inspect} from './engine.mjs';
import {pathToFileURL} from 'node:url';
const help=`Clockshift — missing and repeated local times in daily/weekly schedules

Usage:
  node cli.mjs --timezone Europe/Belgrade --at 02:30 --start 2026-10-19

Options:
  --timezone IANA_ZONE   Required; e.g. America/New_York
  --at HH:MM             Required local time (24-hour clock)
  --start YYYY-MM-DD     Required first local calendar date (2020–2098)
  --days N               1–400 calendar days, default 370
  --weekday all|0..6     Default all; Sunday=0, Monday=1, ... Saturday=6
  --format text|json|csv Default text
  --help                Show this message

This finds clock-time ambiguity, not a scheduler's execution policy.
Uses Node's timezone database. No network access, telemetry or dependencies.
`;
export function parseArgs(args) {
  const allowed = new Set(['timezone','at','start','days','weekday','format']);
  const values={days:'370',weekday:'all',format:'text'};
  for(let i=0;i<args.length;i++) {
    if(args[i]==='--help')return {help:true};
    if(!args[i].startsWith('--')||!allowed.has(args[i].slice(2)))throw new Error(`Unknown option: ${args[i]}`);
    const key=args[i].slice(2), value=args[++i];
    if(value===undefined||value.startsWith('--'))throw new Error(`Missing value for --${key}`);
    values[key]=value;
  }
  for(const key of ['timezone','at','start'])if(!values[key])throw new Error(`Required option: --${key}`);
  if(!['text','json','csv'].includes(values.format))throw new Error('--format must be text, json or csv.');
  return {config:{zone:values.timezone,time:values.at,start:values.start,days:Number(values.days),weekday:values.weekday},format:values.format};
}
export function outputReport(config,rows,format) {
  if(format==='json')return JSON.stringify({schedule:config,timezone_database:process.versions.tz??'runtime-provided',scope:'Clock-time matches, not scheduler executions',rows},null,2)+'\n';
  if(format==='csv') {
    const quote=v=>'"'+String(v??'').replaceAll('"','""')+'"';
    const cells=[['timezone','local_date','local_time','status','utc_candidate_1','utc_candidate_2'],...rows.map(r=>[config.zone,r.date,r.time,r.status,r.instants[0],r.instants[1]])];
    return cells.map(row=>row.map(quote).join(',')).join('\r\n')+'\r\n';
  }
  const edge=rows.filter(r=>r.status!=='once');
  return [`${config.zone} at ${config.time}: ${rows.length} scheduled dates, ${edge.length} clock-time edge cases.`,...edge.map(r=>`${r.date} ${r.time} ${r.status.toUpperCase()}${r.instants.length?' → '+r.instants.join(' / '):' → no matching UTC instant'}`),'Clock-time matches only. Verify your scheduler’s gap/overlap behavior.',''].join('\n');
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
  try{const parsed=parseArgs(process.argv.slice(2));if(parsed.help)process.stdout.write(help);else process.stdout.write(outputReport(parsed.config,inspect(parsed.config),parsed.format));}
  catch(e){process.stderr.write(`Clockshift: ${e.message}\nUse --help for usage.\n`);process.exitCode=1;}
}
