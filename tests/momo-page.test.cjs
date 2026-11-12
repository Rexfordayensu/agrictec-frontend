/* eslint-disable @typescript-eslint/no-require-imports -- Existing TypeScript Node test convention. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = path.resolve(__dirname, '..');
const original = Module._resolveFilename;
Module._resolveFilename = function (name, ...args) { return original.call(this, name.startsWith('@/') ? path.join(root, name.slice(2)) : name, ...args); };
function code(file) { return ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }, fileName: file }).outputText; }
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (m, f) => m._compile(code(f), f);
function load(relative, mocks) { const file=path.join(root,relative), m=new Module(file,module);m.require=(name)=>Object.hasOwn(mocks,name)?mocks[name]:require(name.startsWith('.')?path.resolve(path.dirname(file),name):name);m._compile(code(file),file);return m.exports; }
const flow = { in:'0.00', out:'0.00', net:'0.00', count:0, countIn:0, countOut:0 };
const empty = { currency:'GHS', asOf:'2026-11-12', allTime:{...flow,moved:'0.00',verified:0,verifiedShare:'0.00'}, thisMonth:{...flow,month:'2026-11'},lastMonth:{...flow,month:'2026-10'},changeOnLastMonth:{in:null,out:null},monthly:[],networks:['MTN','Telecel','AirtelTigo'].map(network=>({network,amount:'0.00',count:0,amountShare:'0.00',countShare:'0.00'})),untagged:{amount:'0.00',count:0},mainNetwork:null,byStatus:{} };

test('the MoMo mockup uses server zeros and never inserts its sample figures or network',()=>{
 const {MomoOverview}=load('components/momo/momo-overview.tsx',{'@/hooks/use-momo-summary':{useMomoSummary:()=>({status:'ready',summary:empty})}});
 const html=renderToStaticMarkup(React.createElement(MomoOverview));
 for(const label of ['MoMo Wallet','This Month','Total Received','Total Sent','Total Transactions','Verified Transactions','Main Network','MoMo Cash Flow Trend','Transaction Sources']) assert.match(html,new RegExp(label));
 assert.match(html,/GHS 0.00/);assert.match(html,/No network recorded yet/);assert.doesNotMatch(html,/GHS 100.00|Mohammed Awal/);
});

test('missing-network amounts remain a separate source slice and API failure does not become zero',()=>{
 let donut;
 const summary={...empty,allTime:{...empty.allTime,in:'0.30',out:'0.10',net:'0.20',moved:'0.40',count:2,countIn:1,countOut:1},networks:empty.networks.map(n=>({...n,amount:n.network==='MTN'?'0.10':'0.00'})),untagged:{amount:'0.30',count:1}};
 const {MomoOverview}=load('components/momo/momo-overview.tsx',{
  '@/hooks/use-momo-summary':{useMomoSummary:()=>({status:'ready',summary})},
  '@/components/charts/doughnut-chart':{DoughnutChart:(props)=>{donut=props;return React.createElement('span',null,'Chart');}},
 });
 const html=renderToStaticMarkup(React.createElement(MomoOverview));
 assert.match(html,/GHS 0.20/);assert.match(html,/without a network/);
 assert.deepEqual(donut.labels,['MTN','Telecel','AirtelTigo','Not provided']);assert.deepEqual(donut.data,[0.1,0,0,0.3]);
 const failed=load('components/momo/momo-overview.tsx',{'@/hooks/use-momo-summary':{useMomoSummary:()=>({status:'error',summary:null,error:'Server unavailable',retry:()=>{}})}});
 const error=renderToStaticMarkup(React.createElement(failed.MomoOverview));assert.match(error,/Server unavailable/);assert.doesNotMatch(error,/GHS 0.00/);
});

test('MoMo PDF export sends the visible network, type and search filters to its own API',async()=>{
 const state=[],calls=[];let cursor=0;
 const react={...React,useState:(initial)=>{const i=cursor++;if(!(i in state))state[i]=initial;return[state[i],v=>{state[i]=v;}];},useMemo:fn=>fn()};
 const transaction={id:'own',userId:'farmer',direction:'out',counterparty:'Supplier',amount:12.34,network:'MTN',date:'2026-11-12',createdAt:'2026-11-12T00:00:00Z',verificationStatus:'self_reported'};
 const {MomoTransactions}=load('components/momo/momo-transactions.tsx',{
  react,'@/hooks/use-debounce':{useDebounce:v=>v},
  '@/store/farm-store':{useFarmStore:select=>select({momo:[transaction],status:'ready',userId:'farmer'})},
  '@/store/modal-store':{useModalStore:select=>select({openModal:()=>{}})},
  '@/services/momo.service':{momoService:{statement:async filters=>{calls.push(filters);return new Blob(['%PDF']);}}},
  '@/lib/loans/application-status':{saveBlob:()=>{}},
 });
 const render=()=>{cursor=0;return MomoTransactions();};
 function find(node,check){if(!node||typeof node!=='object')return null;if(check(node))return node;for(const child of React.Children.toArray(node.props?.children)){const match=find(child,check);if(match)return match;}return null;}
 find(render(),n=>n.props?.['aria-label']==='Network').props.onChange({target:{value:'MTN'}});
 find(render(),n=>n.props?.['aria-label']==='Type').props.onChange({target:{value:'out'}});
 find(render(),n=>n.type==='input'&&n.props.type==='search').props.onChange({target:{value:'GHS 12.34'}});
 const button=find(render(),n=>n.props?.children==='Download Statement (PDF)');assert.equal(button.props.disabled,false);button.props.onClick();
 await new Promise(setImmediate);
 assert.deepEqual(calls,[{period:'all',network:'MTN',direction:'out',status:undefined,query:'GHS 12.34',newest_first:true}]);
});

test('live MoMo totals refresh while visible and clear on changed records or failed requests',async()=>{
 const beforeWindow=global.window,beforeDocument=global.document;
 const listeners={},slots=[],queue=[],requests=[];let cursor=0,interval,intervalMs;
 global.window={setInterval:(fn,ms)=>{interval=fn;intervalMs=ms;return 1;},clearInterval:()=>{},addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener:()=>{}};
 global.document={visibilityState:'visible',addEventListener:(name,fn)=>{listeners[name]=fn;},removeEventListener:()=>{}};
 const different=(a,b)=>!a||a.some((x,i)=>x!==b[i]);
 const react={useState:(initial)=>{const i=cursor++;slots[i]??={value:initial};return[slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v;}];},useMemo:(fn,deps)=>{const i=cursor++;if(!slots[i]||different(slots[i].deps,deps))slots[i]={value:fn(),deps};return slots[i].value;},useEffect:(fn,deps)=>{const i=cursor++;if(!slots[i]||different(slots[i].deps,deps)){slots[i]?.cleanup?.();slots[i]={deps};queue.push(()=>{slots[i].cleanup=fn();});}}};
 const farm={momo:[]};
 try{
  const {useMomoSummary}=load('hooks/use-momo-summary.ts',{react,'@/store/farm-store':{useFarmStore:select=>select(farm)},'@/services/momo.service':{momoService:{summary:signal=>new Promise((resolve,reject)=>requests.push({resolve,reject,signal}))}}});
  const render=()=>{cursor=0;const result=useMomoSummary();while(queue.length)queue.shift()();return result;};
  assert.equal(render().summary,null);requests[0].resolve(empty);await Promise.resolve();assert.equal(render().summary,empty);assert.equal(intervalMs,30000);
  document.visibilityState='hidden';interval();assert.equal(requests.length,1);
  document.visibilityState='visible';interval();assert.equal(requests.length,2);
  requests[1].reject(new Error('Offline'));await Promise.resolve();assert.equal(render().status,'error');assert.equal(render().summary,null);
  listeners.focus();requests[2].resolve(empty);await Promise.resolve();assert.equal(render().status,'ready');
  farm.momo=[{id:'new'}];assert.equal(render().summary,null);assert.equal(requests[2].signal.aborted,true);
 }finally{global.window=beforeWindow;global.document=beforeDocument;}
});
