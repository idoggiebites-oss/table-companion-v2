const cands = [
 ['⚔','U+2694','attack / weapon'],['🗡','U+1F5E1','dagger'],['🛡','U+1F6E1','armour class'],
 ['⚙','U+2699','settings'],['🎲','U+1F3B2','roll'],['⚡','U+26A1','lightning damage'],
 ['🔥','U+1F525','fire damage'],['❄','U+2744','cold damage'],['☠','U+2620','death / poison'],
 ['❤','U+2764','hit points'],['☀','U+2600','bright light'],['🌙','U+1F319','dim light'],
 ['✦','U+2726','spell'],['✧','U+2727','spell (open)'],['★','U+2605','star'],['☆','U+2606','star (open)'],
 ['✓','U+2713','check'],['✔','U+2714','heavy check'],['✕','U+2715','close'],['✖','U+2716','heavy close'],
 ['✚','U+271A','add (heavy greek)'],['＋','U+FF0B','add (fullwidth)'],['−','U+2212','minus'],
 ['⬢','U+2B22','hex'],['◆','U+25C6','diamond'],['▲','U+25B2','triangle'],['●','U+25CF','disc'],
 ['◦','U+25E6','ring'],['·','U+00B7','middot'],['—','U+2014','em dash'],['›','U+203A','chevron'],
 ['↑','U+2191','up'],['↓','U+2193','down'],['⌃','U+2303','caret'],['⏱','U+23F1','timer'],
 ['👁','U+1F441','disclosure / seen'],['🕯','U+1F56F','lamplight'],['⚑','U+2691','flag'],['⚐','U+2690','flag (open)'],
];
const P=s=>({emoji:/\p{Emoji}/u.test(s),pres:/\p{Emoji_Presentation}/u.test(s),pict:/\p{Extended_Pictographic}/u.test(s)});
let bad=[],ok=[],forced=[];
for(const [ch,cp,use] of cands){
  const p=P(ch);
  const verdict = p.pres ? 'ALWAYS EMOJI' : p.emoji ? 'emoji-capable' : 'text only';
  (p.pres?forced:p.emoji?bad:ok).push([ch,cp,use,verdict]);
}
const row=([ch,cp,use,v])=>console.log(`  ${ch}  ${cp.padEnd(8)} ${v.padEnd(14)} ${use}`);
console.log('=== ALWAYS renders as colour emoji (VS-15 does NOT reliably help) ===');forced.forEach(row);
console.log('\n=== emoji-capable: text by default, but platforms override (needs VS-15) ===');bad.forEach(row);
console.log('\n=== safe text glyphs ===');ok.forEach(row);
console.log(`\ncounts: forced ${forced.length} · capable ${bad.length} · safe ${ok.length} of ${cands.length}`);
// does VS-15 change the property?
console.log(`\nVS-15 check: '⚔︎' still matches \\p{Emoji}? ${/\p{Emoji}/u.test('⚔︎')}  (property is per-codepoint; the selector is a render hint only)`);
