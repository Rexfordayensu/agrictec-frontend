import { THEME_COLORS } from '@/lib/theme-colors';

/** First-paint launch cover for installed apps. It stays until the destination has restored
 * the session and rendered a ready or recoverable-error screen. Client-side page changes keep
 * their normal loaders; only a new document starts this animation. ?splash=1 previews it. */

const MARK = `<svg viewBox="0 0 120 120" class="splash-mark" aria-hidden="true" focusable="false">
<defs><linearGradient id="splash-leaf" x1="18" y1="102" x2="102" y2="18" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#059669"/><stop offset="1" stop-color="#34d399"/></linearGradient>
<mask id="splash-cut" maskUnits="userSpaceOnUse" x="0" y="0" width="120" height="120">
<rect width="120" height="120" fill="#fff"/>
<polyline points="34.5,85.5 45.2,65 66.4,63.5 85.5,28.9" fill="none" stroke="#000" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="34.5" cy="85.5" r="10.5" fill="#000"/></mask></defs>
<path d="M18 102C18 52 52 18 102 18C102 68 68 102 18 102Z" fill="url(#splash-leaf)" mask="url(#splash-cut)"/>
<circle cx="34.5" cy="85.5" r="6.5" fill="#f5c451"/></svg>`;

const MARKUP = `<div class="splash-stage"><span class="splash-glow"></span><span class="splash-orbit"></span>${MARK}</div>
<p class="splash-name"><span>Agri</span><span class="splash-name-accent">Ctec</span></p>
<p class="splash-sub">DIGITAL IDENTITY</p>
<p class="splash-tagline">Growing farms. Building financial futures.</p>
<p id="splash-status" class="splash-status" aria-live="polite"></p>
<button id="splash-retry" class="splash-retry" type="button" hidden>Reload app</button>`;

/** Runs as the page is parsed, before the first paint. */
const SCRIPT = `(function(){try{
var el=document.getElementById('agrictec-splash');if(!el)return;
var force=/[?&]splash=1\\b/.test(location.search);
var installed=matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
if(!installed&&!force)return;
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var root=document.documentElement;
var metas=[].slice.call(document.querySelectorAll('meta[name="theme-color"]'));
metas.forEach(function(m){m.content='#0a0e1a';});
el.setAttribute('data-state','show');
root.setAttribute('data-launch-active','');
var done=false,minElapsed=false,minTimer,slowTimer,retryTimer;
var observer=new MutationObserver(check);
function finish(){if(done)return;done=true;observer.disconnect();
clearTimeout(minTimer);clearTimeout(slowTimer);clearTimeout(retryTimer);
el.setAttribute('data-state','leave');
root.removeAttribute('data-launch-active');
setTimeout(function(){el.setAttribute('data-state','gone');el.setAttribute('aria-busy','false');
var light=root.getAttribute('data-theme')==='light';
metas.forEach(function(m){m.content=light?'${THEME_COLORS.light}':'${THEME_COLORS.dark}';});
},reduce?120:550);}
function check(){if(minElapsed&&document.querySelector('[data-launch-ready]')&&!document.querySelector('[data-launch-pending]'))finish();}
observer.observe(root,{childList:true,subtree:true,attributes:true,attributeFilter:['data-launch-ready','data-launch-pending']});
minTimer=setTimeout(function(){minElapsed=true;check();},reduce?200:1800);
slowTimer=setTimeout(function(){var status=document.getElementById('splash-status');if(status)status.textContent='Preparing your account. Please wait...';},8000);
retryTimer=setTimeout(function(){var status=document.getElementById('splash-status');if(status)status.textContent='This is taking longer than usual. Check your connection or reload the app.';var retry=document.getElementById('splash-retry');if(retry)retry.hidden=false;},30000);
var retry=document.getElementById('splash-retry');if(retry)retry.addEventListener('click',function(){location.reload();});
// Skip the decorative delay only; a tap must never expose the startup loader.
el.addEventListener('click',function(){minElapsed=true;check();});
}catch(e){var root=document.documentElement;root.removeAttribute('data-launch-active');var el=document.getElementById('agrictec-splash');if(el)el.setAttribute('data-state','gone');}})();`;

export function LaunchSplash() {
  return (
    <>
      <div
        id="agrictec-splash"
        role="status"
        aria-label="Opening AgriCtec"
        aria-busy="true"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: MARKUP }}
      />
      <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
    </>
  );
}
