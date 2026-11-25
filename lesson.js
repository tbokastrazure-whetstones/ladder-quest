/* =========================================================================
   基礎講座:チュートリアルの前に、ラダー図のしくみを手で動かしながら知る
     1 PLCってなに?  2 ラダー図は電気の通り道  3 a接点とb接点
     4 直列と並列  5 問題の読み方
   初めて遊ぶ人には、チュートリアルの前に自動で出す(設定からいつでも開ける)
   ========================================================================= */
(function(){
  'use strict';

  /* ---------- 小さなラダー図の絵 ----------
     1行のラング:左の線 → 接点(いくつか)→ コイル → 右の線
     each part: {type:'a'|'b', label, on}。電気が通る区間を緑で光らせる */

  function contactShape(x, part){
    const cls = part.closed ? 'lc on' : 'lc';
    let s = `<g class="${cls}">`;
    s += `<line x1="${x}" y1="18" x2="${x}" y2="42"/><line x1="${x + 16}" y1="18" x2="${x + 16}" y2="42"/>`;
    if(part.type === 'b'){
      s += `<line x1="${x - 4}" y1="40" x2="${x + 20}" y2="20"/>`;
    }
    s += `<text x="${x + 8}" y="12" text-anchor="middle">${part.label}</text>`;
    s += '</g>';
    return s;
  }

  // 1本のラング(直列)。parts を左から並べる。closed が全部 true なら電気が届く
  function seriesRung(parts, lamp){
    const W = 300;
    const y = 30;
    let x = 14;
    let s = `<svg class="lsvg" viewBox="0 0 ${W} 60">`;
    s += `<line class="rail" x1="6" y1="4" x2="6" y2="56"/><line class="rail" x1="${W - 6}" y1="4" x2="${W - 6}" y2="56"/>`;
    let powered = true;
    let xs = 6;
    parts.forEach((p, i)=>{
      const cx = 40 + i * 60;
      s += `<line class="lw ${powered ? 'on' : ''}" x1="${xs}" y1="${y}" x2="${cx}" y2="${y}"/>`;
      s += contactShape(cx, p);
      powered = powered && p.closed;
      xs = cx + 16;
      x = cx;
    });
    const coilX = W - 70;
    s += `<line class="lw ${powered ? 'on' : ''}" x1="${xs}" y1="${y}" x2="${coilX - 12}" y2="${y}"/>`;
    s += `<g class="lcoil ${powered ? 'on' : ''}"><path d="M${coilX - 6} 18 Q${coilX - 14} 30 ${coilX - 6} 42"/><path d="M${coilX + 6} 18 Q${coilX + 14} 30 ${coilX + 6} 42"/>`;
    s += `<text x="${coilX}" y="12" text-anchor="middle">${lamp}</text></g>`;
    s += `<line class="lw ${powered ? 'on' : ''}" x1="${coilX + 12}" y1="${y}" x2="${W - 6}" y2="${y}"/>`;
    s += '</svg>';
    return {svg:s, powered};
  }

  // 並列:上の行と下の行に1つずつ接点。どちらかが通れば届く
  function parallelRung(top, bottom, lamp){
    const W = 300;
    const powered = top.closed || bottom.closed;
    let s = `<svg class="lsvg" viewBox="0 0 ${W} 96">`;
    s += `<line class="rail" x1="6" y1="4" x2="6" y2="92"/><line class="rail" x1="${W - 6}" y1="4" x2="${W - 6}" y2="92"/>`;
    s += `<line class="lw on" x1="6" y1="30" x2="60" y2="30"/>`;
    s += `<line class="lw on" x1="6" y1="70" x2="60" y2="70"/>`;
    s += contactShape(60, top).replace(/y1="18"/g, 'y1="18"');
    s += `<g transform="translate(0 40)">${contactShape(60, bottom)}</g>`;
    s += `<line class="lw ${top.closed ? 'on' : ''}" x1="76" y1="30" x2="130" y2="30"/>`;
    s += `<line class="lw ${bottom.closed ? 'on' : ''}" x1="76" y1="70" x2="130" y2="70"/>`;
    s += `<line class="lw ${powered ? 'on' : ''}" x1="130" y1="30" x2="130" y2="70"/>`;
    const coilX = W - 70;
    s += `<line class="lw ${powered ? 'on' : ''}" x1="130" y1="30" x2="${coilX - 12}" y2="30"/>`;
    s += `<g class="lcoil ${powered ? 'on' : ''}"><path d="M${coilX - 6} 18 Q${coilX - 14} 30 ${coilX - 6} 42"/><path d="M${coilX + 6} 18 Q${coilX + 14} 30 ${coilX + 6} 42"/>`;
    s += `<text x="${coilX}" y="12" text-anchor="middle">${lamp}</text></g>`;
    s += `<line class="lw ${powered ? 'on' : ''}" x1="${coilX + 12}" y1="30" x2="${W - 6}" y2="30"/>`;
    s += '</svg>';
    return {svg:s, powered};
  }

  function lampHTML(label, on){
    return `<div class="llamp ${on ? 'on' : ''}"><i></i><span>${label}</span></div>`;
  }

  function buttonHTML(key, label, on){
    return `<button type="button" class="lbtn ${on ? 'on' : ''}" data-lkey="${key}"><i></i><span>${label}<small>${on ? '押している' : '離している'}</small></span></button>`;
  }

  /* ---------- 5枚のカード ---------- */

  const CARDS = [
    {
      title:'PLCってなに?',
      body:()=>`<div class="lflow"><div class="lbox in">入力<small>ボタン・センサ</small></div><div class="larr">→</div>`
        + `<div class="lbox plc">PLC<small>決まりどおりに考える</small></div><div class="larr">→</div>`
        + `<div class="lbox out">出力<small>ランプ・モーター</small></div></div>`
        + '<p>工場の機械は、<b>PLC</b>という小さなコンピュータが動かしています。PLCは、<b>入力</b>(ボタンが押されたか、センサが反応したか)を見て、決められたとおりに<b>出力</b>(ランプをつける、モーターを回す)を動かします。</p>'
        + '<p>その「決まり」を、電気の通り道の絵で書いたものが<b>ラダー図</b>です。このゲームでは、ラダー図を組んで機械を動かします。</p>',
    },
    {
      title:'ラダー図は電気の通り道',
      body:(s)=>{
        const r = seriesRung([{type:'a', label:'ボタン1', closed:s.b1}], 'ランプ1');
        return '<p>左の縦線から、右の縦線まで<b>電気が届くと</b>、右端のコイルにつないだ機械(ランプ)が動きます。途中の<b>接点</b>が閉じていないと、電気はそこで止まります。</p>'
          + r.svg
          + `<div class="lplay">${buttonHTML('b1', 'ボタン1', s.b1)}${lampHTML('ランプ1', r.powered)}</div>`
          + '<p class="lnote">ボタン1をタップして、押した状態・離した状態を切り替えてみよう。電気が通る線が<b class="lg">緑</b>に光ります。</p>';
      },
    },
    {
      title:'a接点とb接点',
      body:(s)=>{
        const ra = seriesRung([{type:'a', label:'ボタン1', closed:s.b1}], 'ランプ1');
        const rb = seriesRung([{type:'b', label:'ボタン1', closed:!s.b1}], 'ランプ2');
        return '<p><b>a接点</b>は「押すと通る」、<b>b接点</b>は「押すと切れる」接点です。同じボタン1で、2本のラングを比べてみよう。</p>'
          + `<div class="lcap">a接点 ─┤├─</div>${ra.svg}`
          + `<div class="lcap">b接点 ─┤/├─</div>${rb.svg}`
          + `<div class="lplay">${buttonHTML('b1', 'ボタン1', s.b1)}${lampHTML('ランプ1', ra.powered)}${lampHTML('ランプ2', rb.powered)}</div>`
          + '<p class="lnote">ふだん(離している)は、b接点のランプ2がついていて、押すと入れ替わります。</p>';
      },
    },
    {
      title:'直列と並列',
      body:(s)=>{
        const rs = seriesRung([{type:'a', label:'ボタン1', closed:s.b1}, {type:'a', label:'ボタン2', closed:s.b2}], 'ランプ1');
        const rp = parallelRung({type:'a', label:'ボタン1', closed:s.b1}, {type:'a', label:'ボタン2', closed:s.b2}, 'ランプ2');
        return '<p>接点を<b>横に並べる(直列)</b>と「どちらも押したとき」、<b>縦に並べる(並列)</b>と「どちらかを押したとき」に電気が届きます。</p>'
          + `<div class="lcap">直列(AND:かつ)</div>${rs.svg}`
          + `<div class="lcap">並列(OR:または)</div>${rp.svg}`
          + `<div class="lplay">${buttonHTML('b1', 'ボタン1', s.b1)}${buttonHTML('b2', 'ボタン2', s.b2)}${lampHTML('ランプ1', rs.powered)}${lampHTML('ランプ2', rp.powered)}</div>`;
      },
    },
    {
      title:'問題の読み方',
      body:()=>'<p>ステージの「おしごと」は、こう読みます。</p>'
        + '<div class="lex"><span class="hx-do">ボタン1を押している間</span><span class="hx-arr">→</span><span class="hx-res">ランプ1がつく</span></div>'
        + '<p><b>→ の左</b>が、あなたが機械に<b>すること</b>。<b>→ の右</b>が、そのとき機械が<b>どうなればいいか</b>。この表のとおりに動くラダー図を組めばクリアです。</p>'
        + '<ol class="lsteps"><li>「▶ 正解の動きを見る」で、正しい動きを見る</li><li>下の部品を選んで、マスに置く</li><li>機械のボタンを押して試す</li><li>「判定」で、いろいろな押し方を自動で確かめる</li></ol>'
        + '<p class="lnote">次のチュートリアルで、実際に1つ組んでみよう。</p>',
    },
  ];

  /* ---------- 講座の画面 ---------- */

  function showLesson(onDone){
    const state = {i:0, b1:false, b2:false};
    const d = document.createElement('div');
    d.className = 'lesson';
    document.body.appendChild(d);

    function draw(){
      const c = CARDS[state.i];
      const last = state.i === CARDS.length - 1;
      d.innerHTML = `<div class="lcard">`
        + `<div class="lhead"><span class="lno">基礎講座 ${state.i + 1}/${CARDS.length}</span><button type="button" class="lskip" data-lgo="skip">とばす</button></div>`
        + `<h2>${c.title}</h2>`
        + `<div class="lbody">${c.body(state)}</div>`
        + `<div class="ldots">${CARDS.map((_, k)=>`<i class="${k === state.i ? 'on' : ''}"></i>`).join('')}</div>`
        + `<div class="lacts">${state.i > 0 ? '<button type="button" class="btn" data-lgo="back">もどる</button>' : '<span></span>'}`
        + `<button type="button" class="btn primary" data-lgo="next">${last ? (onDone ? 'チュートリアルへ' : 'おわる') : 'つぎへ'}</button></div>`
        + '</div>';
    }

    function close(){
      d.remove();
      if(onDone){
        onDone();
      }
    }

    d.addEventListener('click', e=>{
      const k = e.target.closest('[data-lkey]');
      if(k){
        state[k.dataset.lkey] = !state[k.dataset.lkey];
        SFX.play('press');
        draw();
        return;
      }
      const g = e.target.closest('[data-lgo]');
      if(!g){
        return;
      }
      const go = g.dataset.lgo;
      if(go === 'skip'){
        close();
        return;
      }
      if(go === 'back'){
        state.i = Math.max(0, state.i - 1);
      }
      if(go === 'next'){
        if(state.i === CARDS.length - 1){
          close();
          return;
        }
        state.i++;
      }
      state.b1 = false;
      state.b2 = false;
      SFX.play('click');
      draw();
    });

    draw();
  }
  window.showLesson = showLesson;

  /* ---------- 初めての人は、チュートリアルの前に自動で ---------- */

  const baseStartCoach = startCoach;
  startCoach = function(){
    if(G.save && !G.save.lessonDone){
      showLesson(()=>{
        G.save.lessonDone = true;
        persist();
        baseStartCoach();
      });
      return;
    }
    baseStartCoach();
  };

  /* ---------- 見た目 ---------- */

  const css = document.createElement('style');
  css.textContent = [
    '.lesson{position:fixed;inset:0;z-index:70;background:rgba(10,14,30,.6);display:flex;align-items:center;justify-content:center;padding:12px}',
    '.lcard{width:min(460px,100%);max-height:calc(100vh - 24px);overflow-y:auto;background:#fff;border-radius:16px;padding:14px 16px;box-shadow:0 14px 40px rgba(0,0,0,.35)}',
    '.lhead{display:flex;justify-content:space-between;align-items:center}',
    '.lno{font-size:11.5px;font-weight:900;color:#8a6212;letter-spacing:.06em}',
    '.lskip{border:0;background:none;color:var(--sub);font-size:12px;cursor:pointer}',
    '.lcard h2{margin:4px 0 8px;font-size:19px;color:#24305e}',
    '.lbody p{font-size:14px;line-height:1.7;margin:6px 0}',
    '.lnote{font-size:12.5px!important;color:#4f5873}',
    '.lg{color:#22b573}',
    '.lflow{display:flex;align-items:center;gap:6px;margin:6px 0 10px}',
    '.lbox{flex:1;text-align:center;border-radius:10px;padding:8px 4px;font-weight:900;font-size:14px;color:#fff;display:flex;flex-direction:column;gap:2px}',
    '.lbox small{font-size:10.5px;font-weight:700;opacity:.85}',
    '.lbox.in{background:#1f9a5a}.lbox.plc{background:#24305e}.lbox.out{background:#2c63c2}',
    '.larr{font-weight:900;color:#b88a14}',
    '.lsvg{width:100%;height:auto;display:block;background:#f6f7fb;border-radius:10px;margin:4px 0}',
    '.lsvg line,.lsvg path{stroke:#9aa3b5;stroke-width:3;fill:none;stroke-linecap:round}',
    '.lsvg .rail{stroke:#22b573;stroke-width:4}',
    '.lsvg .lw.on,.lsvg .lc.on line,.lsvg .lcoil.on path{stroke:#22b573}',
    '.lsvg text{font-size:11px;font-weight:800;fill:#24305e;stroke:none}',
    '.lcap{font-size:12px;font-weight:900;color:#24305e;margin-top:6px}',
    '.lplay{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap;margin:8px 0}',
    '.lbtn{display:flex;align-items:center;gap:6px;border:0;background:#f1f3f8;border-radius:12px;padding:6px 10px;cursor:pointer;font-weight:800;color:#24305e}',
    '.lbtn i{width:30px;height:30px;border-radius:50%;background:#22b573;box-shadow:0 4px 0 #157a4b;transition:transform .05s,box-shadow .05s}',
    '.lbtn.on i{transform:translateY(3px);box-shadow:0 1px 0 #157a4b}',
    '.lbtn span{display:flex;flex-direction:column;font-size:13px;text-align:left}',
    '.lbtn small{font-size:10px;color:var(--sub)}',
    '.llamp{display:flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;font-weight:800;color:#24305e}',
    '.llamp i{width:30px;height:30px;border-radius:50%;background:#cfd5e0;transition:background .25s,box-shadow .35s}',
    '.llamp.on i{background:#ffd84d;box-shadow:0 0 16px 4px rgba(255,200,40,.7)}',
    '.lex{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;background:#f6f7fb;border-radius:10px;padding:8px;font-weight:800;font-size:14px}',
    '.lsteps{padding-left:20px;font-size:13.5px;line-height:1.7;margin:6px 0}',
    '.ldots{display:flex;gap:6px;justify-content:center;margin:10px 0 4px}',
    '.ldots i{width:7px;height:7px;border-radius:50%;background:#d9dee8}',
    '.ldots i.on{background:#24305e}',
    '.lacts{display:flex;justify-content:space-between;gap:8px;margin-top:6px}',
  ].join('\n');
  document.head.appendChild(css);
})();
