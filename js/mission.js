/* =========================================================================
   依頼(問題文)を短く読みやすくする
     ・行の間を詰め、文字を少し小さくする
     ・「接点に使う部品」「コイルに使う部品」を1行ずつ書く
       (入力=ボタン・スイッチ・センサは接点に、出力=ランプ・モーターはコイルに)
   ========================================================================= */
(function(){
  'use strict';

  // 「起動ボタン(押している間だけ)」→「起動ボタン」
  function role(desc){
    return String(desc || '').split(/[((]/)[0].trim();
  }

  function partName(st, x){
    const n = showName(st, x.a) || x.name;
    const r = role(x.desc);
    if(!r || r === n){
      return esc(n);
    }
    return `${esc(r)}<small>${esc(n)}</small>`;
  }

  function partsHTML(st){
    const P = prep(st);
    const ins = P.io.filter(x=>kindOf(x.a) === 'I');
    const outs = P.io.filter(x=>kindOf(x.a) === 'Q');
    const fbs = ['TON', 'TOF', 'CTU', 'CTD'].filter(k=>P.palette.includes(k));
    let h = '<div class="mparts">';
    if(ins.length){
      h += `<div><b class="pc">接点</b>${ins.map(x=>partName(st, x)).join('・')}</div>`;
    }
    if(outs.length){
      h += `<div><b class="pq">コイル</b>${outs.map(x=>partName(st, x)).join('・')}</div>`;
    }
    if(fbs.length){
      h += `<div><b class="pf">命令</b>${fbs.join('・')}</div>`;
    }
    h += '</div>';
    return h;
  }

  const baseMissionHTML = missionHTML;
  missionHTML = function(st){
    const h = baseMissionHTML(st);
    if(!st.steps){
      return h;
    }
    const parts = partsHTML(st);
    // 「正解の動きを見る」の前に入れる(なければ最後に)
    const at = h.indexOf('<div class="demo-row">');
    if(at < 0){
      return h + parts;
    }
    return h.slice(0, at) + parts + h.slice(at);
  };

  const css = document.createElement('style');
  css.textContent = [
    // 依頼の欄を詰める
    '.mission{padding:6px 10px}',
    '.mission .mgoal{font-size:14.5px;line-height:1.4}',
    '.mission .msteps{gap:2px;margin-top:4px;font-size:13px}',
    '.mission .msteps li{padding:2px 7px;line-height:1.4;border-radius:6px}',
    '.mission .mtip{font-size:11.5px;margin-top:3px;line-height:1.4}',
    '.mission .demo-row{margin-top:4px}',
    '.mission .demo-row span{display:none}',
    '.mission .demo-btn{font-size:12px;padding:4px 12px}',
    // 使う部品の行
    '.mparts{margin-top:4px;display:flex;flex-direction:column;gap:2px;font-size:12.5px;font-weight:700;color:#24305e}',
    '.mparts div{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 6px}',
    '.mparts b{font-size:10.5px;color:#fff;border-radius:4px;padding:0 6px;margin-right:2px}',
    '.mparts b.pc{background:#1f9a5a}',
    '.mparts b.pq{background:#2c63c2}',
    '.mparts b.pf{background:#6f48d4}',
    '.mparts small{font-size:10px;color:#fff;background:#24305e;border-radius:5px;padding:0 4px;margin-left:2px}',
  ].join('\n');
  document.head.appendChild(css);
})();
