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

require.extensions['.css']=()=>{};

const {WeatherHero}=require('../components/weather/weather-hero.tsx');
const base={isFarm:false,naming:false,locating:false,error:'',onLocate:()=>{},onChange:()=>{}};
test('weather banner shows the detected settlement and region, with no mock location',()=>{
 const render=location=>renderToStaticMarkup(React.createElement(WeatherHero,{...base,isCurrent:true,location}));
 const village=render({kind:'coordinates',label:'Krapa, Ashanti, Ghana',village:'Krapa',district:'Ejisu Municipal District',region:'Ashanti',latitude:6.7,longitude:-1.4});
 assert.match(village,/Current Location/);assert.match(village,/>Krapa</);assert.match(village,/Ashanti Region/);assert.match(village,/Village: Krapa/);
 const city=render({kind:'coordinates',label:'Tamale, Northern, Ghana',city:'Tamale',region:'Northern'});
 assert.match(city,/>Tamale</);assert.match(city,/Northern Region/);assert.doesNotMatch(city,/Ejisu|Ashanti/);
 const unknown=render({kind:'coordinates',label:'Your current location',latitude:0,longitude:0});
 assert.match(unknown,/Position detected/);assert.match(unknown,/Not available yet/);assert.doesNotMatch(unknown,/Ejisu|Ashanti|Accra/);
 const fallback=renderToStaticMarkup(React.createElement(WeatherHero,{...base,location:{kind:'place',label:'Ashanti, Ghana',region:'Ashanti'}}));
 assert.match(fallback,/Forecast location/);assert.doesNotMatch(fallback,/Current Location/);
 const approximate=render({kind:'coordinates',label:'Your current location',city:'Accra',region:'Greater Accra',accuracyMetres:50000});assert.match(approximate,/Approximate location/);assert.match(approximate,/Greater Accra Region/);assert.doesNotMatch(approximate,/>Accra</);
});

function runtime(){
 const slots=[],effects=[];let cursor=0;
 const changed=(a,b)=>!a||a.length!==b.length||a.some((x,i)=>x!==b[i]);
 const react={...React,useId:()=> 'test-id',useRef:(v)=>{const i=cursor++;slots[i]??={value:{current:v}};return slots[i].value;},useState:(v)=>{const i=cursor++;slots[i]??={value:typeof v==='function'?v():v};return[slots[i].value,n=>{slots[i].value=typeof n==='function'?n(slots[i].value):n;}];},useEffect:(fn,deps)=>{const i=cursor++;if(!slots[i]||changed(slots[i].deps,deps)){slots[i]?.cleanup?.();slots[i]={deps};effects.push(()=>slots[i].cleanup=fn());}}};
 return {react,clear:()=>{slots.length=0;effects.length=0;cursor=0;},render:fn=>{cursor=0;const tree=fn();while(effects.length)effects.shift()();return tree;}};
}
function find(node,test){if(!node||typeof node!=='object')return null;if(test(node))return node;for(const child of React.Children.toArray(node.props?.children)){const found=find(child,test);if(found)return found;}return null;}
function page(mocks){return load('components/weather/weather-page.tsx',{
 '@/components/weather/weather-hero':{WeatherHero:()=>null},
 '@/store/profile-store':{useProfileStore:select=>select({userId:'qa',profile:{region:'Ashanti'}})},
 '@/hooks/use-location-weather':{useLocationWeather:()=>({state:{status:'loading'},loading:()=>{},retry:()=>{}})},
 ...mocks,
});}
test('a manually selected region wins over a late automatic GPS response',async()=>{
 const h=runtime();let resolve;const saved=[];
 const {WeatherPage}=page({react:h.react,'@/services/storage':{sessionStore:{get:(_k,f)=>f,set:(...args)=>saved.push(args)}},
 '@/lib/market/weather-location':{...require('../lib/market/weather-location.ts'),requestInitialWeatherLocation:()=>new Promise(r=>{resolve=r;})},
 });
 const render=()=>h.render(()=>{const entry=WeatherPage();return entry.type(entry.props);});
 const picker=find(render(),n=>n.type?.name==='LocationPicker');
 picker.props.onChoose({kind:'place',region:'Northern',label:'Northern, Ghana'});
 resolve({kind:'coordinates',label:'Your current location',latitude:6.7,longitude:-1.4});await Promise.resolve();
 const hero=find(render(),n=>Object.hasOwn(n.props??{},'isCurrent'));
 assert.equal(hero.props.location.region,'Northern');assert.equal(saved.length,1);
});


test('manual town selection uses search-result coordinates and never silently uses the region centre',async()=>{
 const h=runtime(),queries=[],chosen=[];
 const {WeatherPage}=page({react:h.react,'@/services/storage':{sessionStore:{get:(_k,f)=>f,set:()=>{}}},
 '@/lib/market/weather-location':{...require('../lib/market/weather-location.ts'),requestInitialWeatherLocation:()=>Promise.resolve(null)},
 '@/services/geocoding.service':{geocodingService:{searchPlaces:async q=>{queries.push(q);return [{id:'real',name:'Krapa',detail:'Ejisu Municipal District, Ashanti Region',lat:6.7186,lng:-1.4867}];}}},
 });
 const view=h.render(()=>{const e=WeatherPage();return e.type(e.props);});
 const Picker=find(view,n=>n.type?.name==='LocationPicker').type;
 h.clear();const props={open:true,onClose:()=>{},farm:null,current:{kind:'place',region:'Ashanti',label:'Ashanti'},onChoose:x=>chosen.push(x)};
 const render=()=>h.render(()=>Picker(props));
 find(render(),n=>n.props?.placeholder==='e.g. Accra, Kumasi, Tamale').props.onChange({target:{value:'Krapa'}});
 find(render(),n=>n.type==='form').props.onSubmit({preventDefault(){}});await new Promise(setImmediate);
 assert.deepEqual(queries,['Krapa, Ashanti Region']);assert.equal(chosen.length,0,'The farmer confirms which matching place');
 const results=find(render(),n=>n.props?.['aria-label']==='Matching places');
 find(results,n=>n.type==='button').props.onClick();
 assert.equal(chosen[0].kind,'coordinates');assert.equal(chosen[0].latitude,6.7186);assert.equal(chosen[0].longitude,-1.4867);
});

test('denied current-location access keeps the selected area and exposes a manual fallback',async()=>{
 const h=runtime();
 const {WeatherPage}=page({react:h.react,'@/services/storage':{sessionStore:{get:(_k,f)=>f,set:()=>{}}},
 '@/lib/market/weather-location':{...require('../lib/market/weather-location.ts'),requestInitialWeatherLocation:()=>Promise.resolve(null),requestWeatherLocation:async()=>{throw new Error('Location permission was denied.');}},
 });
 const render=()=>h.render(()=>{const e=WeatherPage();return e.type(e.props);});
 find(render(),n=>Object.hasOwn(n.props??{},'isCurrent')).props.onLocate();await new Promise(setImmediate);
 const hero=find(render(),n=>Object.hasOwn(n.props??{},'isCurrent'));
 assert.match(hero.props.error,/denied.*Choose your town or region/);assert.equal(hero.props.location.region,'Ashanti');assert.equal(hero.props.locating,false);
});

test('weather refreshes while visible and never displays a previous location after a switch',async()=>{
 const beforeWindow=global.window,beforeDocument=global.document;
 let tick,ms;const listeners={},requests=[];const h=runtime();
 global.window={setInterval:(fn,time)=>{tick=fn;ms=time;return 1;},clearInterval:()=>{},addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener:()=>{}};
 global.document={visibilityState:'visible',addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener:()=>{}};
 try {
  const {useLocationWeather}=load('hooks/use-location-weather.ts',{react:h.react,'@/services/weather.service':{weatherService:{getForecast:(location,options)=>new Promise((resolve,reject)=>requests.push({location,options,resolve,reject}))}}});
  let location={kind:'place',region:'Ashanti',label:'Ashanti'};
  const render=()=>h.render(()=>useLocationWeather(location));
  render();requests[0].resolve({status:'ready',data:{provider:'Open-Meteo'}});await Promise.resolve();assert.equal(render().state.status,'ready');assert.equal(ms,900000);
  document.visibilityState='hidden';tick();assert.equal(requests.length,1);
  document.visibilityState='visible';listeners.focus();assert.equal(requests.length,2);
  location={kind:'place',region:'Northern',label:'Northern'};assert.equal(render().state.status,'loading');assert.equal(requests[1].options.signal.aborted,true);
  requests[2].reject(new Error('Weather offline'));await new Promise(setImmediate);assert.equal(render().state.status,'error');
 }finally{global.window=beforeWindow;global.document=beforeDocument;}
});
