const hex=h=>{h=h.replace('#','');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16))};
const lin=c=>{c/=255;return c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4};
const L=h=>{const[r,g,b]=hex(h);return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)};
const CR=(a,b)=>{const[x,y]=[L(a),L(b)].sort((m,n)=>n-m);return (x+0.05)/(y+0.05)};
const f=n=>n.toFixed(2);
const toHsl=h=>{let[r,g,b]=hex(h).map(v=>v/255);const mx=Math.max(r,g,b),mn=Math.min(r,g,b);let hh=0,s=0,l=(mx+mn)/2;const d=mx-mn;
 if(d){s=l>0.5?d/(2-mx-mn):d/(mx+mn);hh=mx===r?((g-b)/d+(g<b?6:0)):mx===g?((b-r)/d+2):((r-g)/d+4);hh/=6}return[hh,s,l]};
const toHex=([h,s,l])=>{const q=l<0.5?l*(1+s):l+s-l*s,p=2*l-q;const c=t=>{t=(t+1)%1;return t<1/6?p+(q-p)*6*t:t<1/2?q:t<2/3?p+(q-p)*(2/3-t)*6:p};
 return '#'+[c(h+1/3),c(h),c(h-1/3)].map(v=>Math.round(v*255).toString(16).padStart(2,'0')).join('').toUpperCase()};
const fit=(src,bg,t,dir)=>{let[h,s,l]=toHsl(src);for(let i=0;i<300;i++){const c=toHex([h,s,l]);if(CR(c,bg)>=t)return c;l+=dir*0.004;if(l<0||l>1)break}return null};

const LC='#F7F6F8', LS='#FFFFFF', DC='#0F1211', DS='#161A18';
const sem={damage:'#D9534A',heal:'#4FA97A',injured:'#8FA85E',bloodied:'#D4A03C',conc:'#9887C9',steel:'#6E8FA8'};

console.log('token            LIGHT      on#FFF on#F7F6F8 | DARK       on#161A18 on#0F1211');
const row=(n,l,d)=>console.log(`${n.padEnd(16)} ${l}  ${f(CR(l,LS)).padStart(5)}  ${f(CR(l,LC)).padStart(6)} | ${d}   ${f(CR(d,DS)).padStart(6)}  ${f(CR(d,DC)).padStart(6)}`);

// text-safe on BOTH grounds: light = darken until 4.5 on canvas(worst), dark = lighten until 4.5 on surface
for(const[k,v] of Object.entries(sem)){
  const light=fit(v,LC,4.5,-1);
  const dark =CR(v,DS)>=4.5? v : fit(v,DS,4.5,+1);
  row(k,light,dark);
}
console.log('---');
row('ink',       '#2D2D2D','#E8EDE9');
row('ink-dim',   fit('#6B7280',LC,4.5,-1), '#A7B1AC');
row('gold-ink',  fit('#C89F3D',LC,4.5,-1), '#C9A227');
console.log('---  non-text 3:1 (underlines, borders, bar fills)');
const g3=fit('#C89F3D',LC,3.0,-1);
console.log(`gold-edge        ${g3}  ${f(CR(g3,LS))}  ${f(CR(g3,LC))} | #C9A227    ${f(CR('#C9A227',DS))}  ${f(CR('#C9A227',DC))}`);
console.log(`gold fill as drawn #C89F3D vs canvas: ${f(CR('#C89F3D',LC))}:1  -> ${CR('#C89F3D',LC)>=3?'ok':'FAILS 3:1 as a bare indicator'}`);
console.log(`#6B7280 on #F7F6F8 as drawn: ${f(CR('#6B7280',LC))}:1 -> ${CR('#6B7280',LC)>=4.5?'ok':'FAILS 4.5:1 (marginal)'}`);
console.log(`V1 damage #D9534A on its own dark surface: ${f(CR('#D9534A',DS))}:1 -> ${CR('#D9534A',DS)>=4.5?'ok':'FAILS 4.5:1 (marginal, shipped)'}`);
