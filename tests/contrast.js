// Text contrast in every theme, light and dark, on the Home screen and an athletic director's Office.
// Every piece of text must reach WCAG AA (4.5:1, or 3:1 for large text). Run with: node tests/contrast.js
const { chromium } = require('playwright'); const path = require('path'); const out = { fail: [], checked: 0 };
(async()=>{const b=await chromium.launch();const p=await (await b.newContext({viewport:{width:1280,height:900}})).newPage();
await p.goto('file://' + (process.env.GAME || path.join(__dirname, '..', 'index.html')));await p.waitForTimeout(1200);await p.addStyleTag({content:'*,*::before,*::after{transition:none!important;animation:none!important}'});
const audit=()=>p.evaluate(()=>{
  const parse=c=>{const m=c.match(/rgba?\(([^)]+)\)/);if(!m)return null;const a=m[1].split(/[, /]+/).map(Number);return {r:a[0],g:a[1],b:a[2],a:a.length>3?a[3]:1}};
  const lum=c=>{const f=v=>{v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)};return .2126*f(c.r)+.7152*f(c.g)+.0722*f(c.b)};
  const over=(t,u)=>({r:t.r*t.a+u.r*(1-t.a),g:t.g*t.a+u.g*(1-t.a),b:t.b*t.a+u.b*(1-t.a),a:1});
  const bgOf=el=>{let stack=[];for(let e=el;e;e=e.parentElement){const s=getComputedStyle(e);if(s.backgroundImage&&s.backgroundImage!=='none')return null;const c=parse(s.backgroundColor);if(c&&c.a>0){stack.push(c);if(c.a>=1)break;}}let base={r:255,g:255,b:255,a:1};for(let i=stack.length-1;i>=0;i--)base=over(stack[i],base);return base};
  const bad={};let n=0;
  document.querySelectorAll('#hdr *, #tabs *, #view *').forEach(el=>{
    if(![...el.childNodes].some(x=>x.nodeType===3&&x.textContent.trim()))return;const s=getComputedStyle(el);if(s.visibility==='hidden'||s.display==='none'||+s.opacity<1)return;const r=el.getBoundingClientRect();if(!r.width||!r.height)return;
    if(el.disabled||el.closest('[disabled],[aria-hidden=true],.menu:not(.open),[hidden]'))return;
    const fg=parse(s.color),bg=bgOf(el);if(!fg||!bg)return;const f=over(fg,bg);const L1=lum(f),L2=lum(bg);const cr=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
    const px=parseFloat(s.fontSize),big=px>=24||(px>=18.66&&+s.fontWeight>=700);n++;
    if(cr<(big?3:4.5)){const k=(el.className&&typeof el.className==='string'?el.tagName.toLowerCase()+'.'+el.className.split(' ').slice(0,2).join('.'):el.tagName.toLowerCase())+' in '+(el.parentElement.className||el.parentElement.tagName).toString().split(' ')[0];if(!bad[k]||bad[k].cr>cr)bad[k]={cr:Math.round(cr*100)/100,px,txt:el.textContent.trim().slice(0,28),n:(bad[k]?bad[k].n:0)+1};else bad[k].n++;}
  });return {n,bad};});
const fn=['applyPrefs'];
for(const screen of ['home','office']){
  if(screen==='office')await p.evaluate(async()=>{await enterAD();newGame('normal',null,7,'MICH');appMode='ad';for(let i=0;i<5;i++)advance();applyTheme();ui.tab='office';render();});
  for(const skin of ['classic','broadcast','gazette','scoreboard','dashboard'])for(const mode of ['light','dark']){
    await p.evaluate(([s,m,f])=>{prefs.skin=s;prefs.mode=m;eval(f)();if(appMode==='ad')applyTheme();render();},[skin,mode,fn[0]]);await p.waitForTimeout(120);
    const a=await audit();out.checked+=a.n;Object.entries(a.bad).forEach(([k,v])=>out.fail.push(`${screen}, ${skin} ${mode}: ${v.cr}:1 at ${v.px}px, ${k} "${v.txt}"`));
  }}
await b.close();console.log(JSON.stringify(out));})();
