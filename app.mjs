import {inspect} from './engine.mjs';
const $ = id => document.getElementById(id);
let rows = [], config;
const fields = ['zone','time','start','days','weekday'];
const params = new URLSearchParams(location.hash.slice(1));
$('start').value = new Date().toLocaleDateString('en-CA');
if (!/^\d{4}-\d{2}-\d{2}$/.test($('start').value)) $('start').value = new Date().toISOString().slice(0,10);
for (const key of fields) if (params.has(key)) $(key).value = params.get(key);
try { for (const zone of Intl.supportedValuesOf('timeZone')) { const o = document.createElement('option');o.value = zone;$('zones').append(o); } } catch {}
function node(tag, text, cls) {const e = document.createElement(tag);e.textContent = text;if(cls)e.className=cls;return e;}
function render() {
  $('error').textContent='';
  try {
    config=Object.fromEntries(fields.map(k=>[k,$(k).value]));config.days=Number(config.days);
    rows=inspect(config);
    const anomalies=rows.filter(r=>r.status!=='once');
    $('summary').textContent=anomalies.length ? `${anomalies.length} clock-time edge case${anomalies.length===1?'':'s'} in ${rows.length} scheduled dates.` : `Each of ${rows.length} scheduled dates has one matching instant.`;
    $('findings').replaceChildren();
    if(!anomalies.length)$('findings').append(node('p','No missing or repeated time in this range. This checks the clock, not whether your job will execute.','ok'));
    for(const r of anomalies){const box=node('div','',`finding ${r.status}`);box.append(node('h3',`${r.date} · ${r.time} · ${r.status==='missing'?'Missing local time':'Repeated local time'}`));box.append(node('p',r.status==='missing'?'The clock skips this time. Check your scheduler’s gap policy.':'Two UTC instants match this local time. Check your scheduler’s overlap policy.'));for(const i of r.instants)box.append(node('p',i.replace('.000Z',' UTC')));$('findings').append(box);}
    $('findings').append(node('p',`${config.zone} · ${config.start} through ${new Date(Date.parse(config.start+'T00:00:00Z')+(config.days-1)*86400000).toISOString().slice(0,10)} · browser timezone rules`,'muted'));
    const table=document.createElement('table'), head=document.createElement('tr');head.append(node('th','Local date / time'),node('th','Matching UTC instants'));table.append(head);
    for(const r of rows.slice(0,7)){const tr=document.createElement('tr');tr.append(node('td',`${r.date} ${r.time}`),node('td',r.instants.length?r.instants.map(i=>i.replace('.000Z','Z')).join(' / '):'No matching instant'));table.append(tr);}$('upcoming').replaceChildren(table);
    $('csv').disabled=false;$('share').disabled=false;
  }catch(e){rows=[];$('summary').textContent='Check your schedule settings.';$('error').textContent=e instanceof RangeError?'Choose a timezone from the list, such as Europe/Belgrade.':e.message;$('findings').replaceChildren();$('upcoming').replaceChildren();$('csv').disabled=true;$('share').disabled=true;}
}
$('checker').addEventListener('submit',e=>{e.preventDefault();render();});
for(const b of document.querySelectorAll('[data-example]'))b.addEventListener('click',()=>{const [z,t,s]=b.dataset.example.split('|');$('zone').value=z;$('time').value=t;$('start').value=s;$('days').value='370';$('weekday').value='all';render();});
$('csv').addEventListener('click',()=>{if(!rows.length)return;const quote=v=>'"'+String(v).replaceAll('"','""')+'"';const lines=[['timezone','local_date','local_time','status','utc_candidate_1','utc_candidate_2'],...rows.map(r=>[config.zone,r.date,r.time,r.status,...r.instants])];const url=URL.createObjectURL(new Blob([lines.map(r=>r.map(quote).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='clockshift-schedule.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
$('share').addEventListener('click',async()=>{const hash=new URLSearchParams(config).toString();history.replaceState(null,'','#'+hash);try{await navigator.clipboard.writeText(location.href);$('copy-status').textContent='Link copied. Your settings are in the URL fragment.';}catch{$('copy-status').textContent='Copy the link from your address bar.';}});
render();
