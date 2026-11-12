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

test('a successful saved reply ends typing and permits another question',async()=>{
 const asked=[],credits=[];
 const {useChatStore}=load('store/chat-store.ts',{
  '@/lib/read-only':{assertWritable:()=>{}},
  '@/store/subscription-store':{useSubscriptionStore:{getState:()=>({userId:'farmer',assertFeature:()=>{},applyCredits:n=>credits.push(n)})}},
  '@/services/ai.service':{aiService:{ask:async question=>{asked.push(question);return {result:{title:'Saved answer'},creditsRemaining:7,messages:[{id:'u'+asked.length,role:'user',content:question,createdAt:'2026-11-12T10:00:00Z'},{id:'a'+asked.length,role:'ai',content:{title:'Saved answer'},createdAt:'2026-11-12T10:00:00Z'}]};}}},
 });
 useChatStore.setState({userId:'farmer',status:'ready',messages:[],isTyping:false});
 await useChatStore.getState().sendMessage('Plan my crops');
 assert.equal(useChatStore.getState().isTyping,false);
 assert.equal(useChatStore.getState().messages.length,2);
 await useChatStore.getState().sendMessage('What records should I keep?');
 assert.equal(asked.length,2);assert.equal(useChatStore.getState().messages.length,4);
 assert.deepEqual(credits,[7,7]);
});

test('a late assistant response never enters another farmer session',async()=>{
 let resolve;
 const {useChatStore}=load('store/chat-store.ts',{
  '@/lib/read-only':{assertWritable:()=>{}},
  '@/store/subscription-store':{useSubscriptionStore:{getState:()=>({userId:'one',assertFeature:()=>{},applyCredits:()=>{}})}},
  '@/services/ai.service':{aiService:{ask:()=>new Promise(r=>{resolve=r;})}},
 });
 useChatStore.setState({userId:'one',status:'ready',messages:[],isTyping:false});
 const pending=useChatStore.getState().sendMessage('Private question');
 useChatStore.setState({userId:'two',messages:[],isTyping:false});
 resolve({result:{title:'Private answer'},creditsRemaining:5,messages:[]});await pending;
 assert.deepEqual(useChatStore.getState().messages,[]);assert.equal(useChatStore.getState().isTyping,false);
});

test('topic cards ask real questions and the greeting uses the signed-in name',()=>{
 const questions=[];
 const {HelpTopics}=load('components/assistant/help-topics.tsx',{'@/hooks/use-ask':{useAsk:()=>({ask:q=>questions.push(q),disabled:false})}});
 const html=renderToStaticMarkup(React.createElement(HelpTopics));
 for(const title of ['Plan a crop','Manage pests','Farm finances','Loan readiness'])assert.match(html,new RegExp(title));
 const {AssistantHero}=load('components/assistant/assistant-hero.tsx',{'@/store/profile-store':{useProfileStore:select=>select({profile:{name:'Ama Farmer'}})}});
 const hero=renderToStaticMarkup(React.createElement(AssistantHero));assert.match(hero,/Hello, Ama!/);assert.doesNotMatch(hero,/Hello, Empty!/);
});

test('the farm sidebar uses saved counts and never treats unavailable records as an empty farm',()=>{
 const farm={status:'ready',records:[],momo:[{verificationStatus:'verified'}]};
 const {AssistantSidebar}=load('components/assistant/assistant-sidebar.tsx',{
  '@/hooks/use-ask':{useAsk:()=>({ask:()=>{},disabled:false})},
  '@/hooks/use-farm-stats':{useFarmStats:()=>({recordCount:0})},
  '@/store/farm-store':{useFarmStore:select=>select(farm)},
  '@/store/platform-store':{usePlatformStore:select=>select({flags:{loans:true,yieldPredictor:true,cropDoctor:true}})},
 });
 const view=()=>renderToStaticMarkup(React.createElement(AssistantSidebar));
 assert.match(view(),/0 records/);assert.match(view(),/1 transaction/);assert.match(view(),/1 \(100%\)/);assert.match(view(),/Get started with your records/);
 farm.status='error';const failed=view().replace(/<[^>]*>/g,'');assert.match(failed,/could not be loaded/);assert.doesNotMatch(failed,/0 records|1 transaction|100%/);
});
