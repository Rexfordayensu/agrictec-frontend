import { THEME_COLORS } from '@/lib/theme-colors';

/**
 * The installed app's launch splash. After the phone's own static launch screen (the manifest's
 * navy and icon), the official AgriCtec mark (components/layout/agrictec-mark.tsx, unchanged)
 * fades in and settles, a soft green glow rises behind it and a light sweeps once around it;
 * "AgriCtec", "DIGITAL IDENTITY" and the tagline follow; then it fades into the app.
 *
 * Plain HTML, CSS (app/globals.css, "Launch splash") and a tiny inline script, all in the
 * first HTML: it covers the screen from the first paint (no white flash, nothing to download)
 * and the app loads underneath. It shows only in the installed app (standalone display), once
 * per launch (sessionStorage), never on page changes; a tap skips it; reduced motion shows it
 * still and briefly. `?splash=1` previews it in a browser tab.
 */

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
<p class="splash-tagline">Growing farms. Building financial futures.</p>`;

/** Runs as the page is parsed, before the first paint. */
const SCRIPT = `(function(){try{
var el=document.getElementById('agrictec-splash');if(!el)return;
var force=/[?&]splash=1\\b/.test(location.search);
var installed=matchMedia('(display-mode: standalone)').matches||matchMedia('(display-mode: fullscreen)').matches||navigator.standalone===true;
if(!installed&&!force)return;
try{if(sessionStorage.getItem('agrictec:splash')&&!force)return;sessionStorage.setItem('agrictec:splash','1');}catch(e){}
var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var metas=[].slice.call(document.querySelectorAll('meta[name="theme-color"]'));
metas.forEach(function(m){m.content='#0a0e1a';});
el.setAttribute('data-state','show');
var done=false;
function finish(){if(done)return;done=true;el.setAttribute('data-state','leave');
setTimeout(function(){el.setAttribute('data-state','gone');
var light=document.documentElement.getAttribute('data-theme')==='light';
metas.forEach(function(m){m.content=light?'${THEME_COLORS.light}':'${THEME_COLORS.dark}';});
},reduce?150:450);}
setTimeout(finish,reduce?900:2600);
el.addEventListener('click',finish);
}catch(e){}})();`;

export function LaunchSplash() {
  return (
    <>
      <div
        id="agrictec-splash"
        aria-hidden="true"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: MARKUP }}
      />
      <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
    </>
  );
}
