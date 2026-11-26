/* =========================================================================
   はじめての人向け:問題の意味を「見て」分かるようにする
     ・「▶ 正解の動きを見る」:お手本の回路で機械を動かして見せる(回路の中身は隠す)
     ・「問題の読み方」:おしごとの横の「?」から開く説明
   ========================================================================= */
(function(){
  'use strict';

  /* ---------- おしごとの欄にボタンを足す ---------- */

  const baseMissionHTML = missionHTML;
  missionHTML = function(st){
    let h = baseMissionHTML(st);
    // 「依頼」の札の横に「?」(問題の読み方)
    h = h.replace('<span class="chip">依頼</span>', '<span class="chip">依頼</span><button type="button" class="howto" data-howto="1" aria-label="問題の読み方">?</button>');
    if(st.tests && st.tests.length){
      h += '<div class="demo-row"><button type="button" class="demo-btn" data-demo="1">▶ 正解の動きを見る</button><span>お手本の回路で、機械がどう動けば正解かを見られます</span></div>';
    }
    return h;
  };

  document.addEventListener('click', e=>{
    const t = e.target.closest && e.target.closest('[data-demo],[data-howto],[data-demo-stop]');
    if(!t){
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    if(t.dataset.demo){
      startDemo();
    }
    if(t.dataset.howto){
      showHowTo();
    }
    if(t.dataset.demoStop){
      stopDemo();
    }
  }, true);

  /* ---------- 正解の動きを見る ----------
     判定のテストを1つずつ、お手本の回路で動かす。テストの操作(ボタンを押す・離す)も自動で行う。
     その間、ラダー図は隠す(答えは見せない) */

  function startDemo(){
    const st = G.stage;
    if(!st || G.demo){
      return;
    }
    if(G.replay){
      stopReplay();
    }
    const P = prep(st);
    G.demo = {saved:clone(G.prog), timers:[], bar:null};
    document.body.classList.add('demo-on');

    const bar = document.createElement('div');
    bar.className = 'demo-bar';
    document.body.appendChild(bar);
    G.demo.bar = bar;

    SFX.play('scan');
    // 縦向きのスマホでは機械がラダー図の下にあるので、機械の欄が見えるところまで動かす
    const m = document.getElementById('machine');
    if(m){
      m.scrollIntoView({block:'center', behavior:reduced() ? 'auto' : 'smooth'});
    }
    playTest(st, P, 0);
  }

  function playTest(st, P, i){
    const D = G.demo;
    if(!D){
      return;
    }
    if(i >= P.tests.length){
      finishDemo();
      return;
    }
    const test = P.tests[i];
    const end = Math.max(...test.steps.map(s=>s.t));

    // お手本の回路で、機械を最初の状態から動かす
    G.prog = clone(P.answer);
    resetRun();
    G.latch = new Set();
    startRun();

    showStep(i, P.tests.length, test.name, '');
    const lines = opsLines(st, test.steps);
    for(const s of test.steps){
      D.timers.push(setTimeout(()=>{
        for(const [a, v] of Object.entries(s.in)){
          setIn(a, v);
        }
        const line = lines.find(l=>l.t === s.t);
        if(line){
          showStep(i, P.tests.length, test.name, line.text);
        }
      }, s.t));
    }
    D.timers.push(setTimeout(()=>playTest(st, P, i + 1), end + 900));
  }

  // 「0.2秒:ボタン1を押す」のような1行ずつの説明(押してすぐ離すは1行にまとめる)
  function opsLines(st, steps){
    const html = opsTimeline(st, steps, Infinity);
    const box = document.createElement('div');
    box.innerHTML = html;
    return [...box.children].map(div=>{
      const text = div.textContent;
      const sec = parseFloat(text);
      return {t:Math.round(sec * 1000), text};
    });
  }

  function showStep(i, n, name, op){
    const D = G.demo;
    if(!D){
      return;
    }
    D.bar.innerHTML = `<div class="db-h"><b>お手本 ${i + 1}/${n}</b><span>${esc(name)}</span></div>`
      + `<div class="db-op">${op ? esc(op) : '(機械を見ていてね)'}</div>`
      + '<button class="btn small" data-demo-stop="1">やめる</button>';
  }

  function finishDemo(){
    const D = G.demo;
    if(!D){
      return;
    }
    D.bar.innerHTML = '<div class="db-h"><b>お手本はここまで</b></div><div class="db-op">この動きになるように、ラダー図を組んでみよう</div><button class="btn small primary" data-demo-stop="1">組んでみる</button>';
  }

  function stopDemo(){
    const D = G.demo;
    if(!D){
      return;
    }
    D.timers.forEach(t=>clearTimeout(t));
    D.bar.remove();
    G.prog = D.saved;
    G.demo = null;
    document.body.classList.remove('demo-on');
    if(G.stage){
      resetRun();
      startRun();
      renderEditor();
    }
  }

  // お手本の間は、ラダー図の光(答えの形)を出さない
  const baseUpdateLadderVis = updateLadderVis;
  updateLadderVis = function(){
    if(G.demo){
      return;
    }
    baseUpdateLadderVis();
  };

  // お手本の間に作りかけを保存するときは、お手本ではなく自分の回路を保存する(答えが残らないように)
  const baseSaveDraft = saveDraft;
  saveDraft = function(){
    if(G.demo && G.stage){
      G.save.drafts[G.stage.id] = G.demo.saved;
      persist();
      return;
    }
    baseSaveDraft();
  };

  // ステージやマップへ移るときは、お手本を片付ける
  const baseShowMap = showMap;
  showMap = function(pro){
    if(G.demo){
      stopDemo();
    }
    baseShowMap(pro);
  };
  const baseOpenStage = openStage;
  openStage = function(st){
    if(G.demo){
      stopDemo();
    }
    baseOpenStage(st);
  };
  const baseJudge = judge;
  judge = function(){
    if(G.demo){
      stopDemo();
    }
    baseJudge();
  };

  /* ---------- 問題の読み方 ---------- */

  function showHowTo(){
    openModal(`<h2>${ic('hint')} 問題の読み方</h2>
      <p>このゲームでは、<b>機械が決まったとおりに動くように、電気の通り道(ラダー図)を作ります</b>。</p>
      <div class="howto-ex">
        <div class="hx-row"><span class="hx-do">ボタン1を押している間</span><span class="hx-arr">→</span><span class="hx-res">ランプ1がつく</span></div>
        <div class="hx-cap"><b>→ の左</b>が、あなたが機械に<b>すること</b>(ボタンを押す・スイッチを入れる)。<br><b>→ の右</b>が、そのとき機械が<b>どうなればいいか</b>。</div>
      </div>
      <ol class="howto-steps">
        <li><b>正解の動きを見る</b>:「▶ 正解の動きを見る」で、機械がどう動けばいいかを見る</li>
        <li><b>部品を置く</b>:下の部品(接点・コイル)を選んで、ラダー図のマスに置く</li>
        <li><b>試す</b>:機械のボタンを押して、表のとおりに動くか見る(電気が通っている線は光る)</li>
        <li><b>判定</b>:いろいろな押し方で自動で試して、全部合えばクリア</li>
      </ol>
      <p class="note">分からない言葉は、点線の言葉をタップすると説明が出ます。迷ったら「ヒント」も使えます。</p>
      <div class="acts"><button class="btn primary" data-m="close">わかった</button></div>`);
  }

  /* ---------- 見た目 ---------- */

  const css = document.createElement('style');
  css.textContent = [
    '.mission .howto{border:0;width:18px;height:18px;border-radius:50%;background:#e6e9f2;color:#24305e;font-size:11px;font-weight:900;line-height:18px;text-align:center;margin:0 8px 0 -4px;vertical-align:1px;cursor:pointer;padding:0}',
    '.demo-row{display:flex;align-items:center;gap:8px;margin-top:6px;flex-wrap:wrap}',
    '.demo-row span{font-size:11.5px;color:var(--sub);font-weight:600}',
    '.demo-btn{border:0;border-radius:999px;background:#24305e;color:#fff;font-weight:900;font-size:13px;padding:5px 14px;cursor:pointer}',
    'body.demo-on #editor{filter:blur(5px) grayscale(.6);opacity:.35;pointer-events:none}',
    '.demo-bar{position:fixed;left:50%;top:calc(52px + env(safe-area-inset-top));transform:translateX(-50%);z-index:41;width:min(440px,calc(100vw - 20px));background:#0f1626;color:#e8eefc;border-radius:12px;padding:8px 12px;box-shadow:0 8px 24px rgba(10,15,40,.4);display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center}',
    '.demo-bar .db-h{display:flex;gap:8px;align-items:baseline;font-size:12.5px;min-width:0}',
    '.demo-bar .db-h b{color:#ffd84d;white-space:nowrap}',
    '.demo-bar .db-h span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.demo-bar .db-op{grid-column:1;font-size:14px;font-weight:800}',
    '.demo-bar .btn{grid-column:2;grid-row:1 / span 2}',
    '.demo-bar .btn.small:not(.primary){background:transparent;color:#fff;border:1px solid rgba(255,255,255,.4);box-shadow:none}',
    '.howto-ex{background:#f6f7fb;border-radius:10px;padding:10px;margin:8px 0}',
    '.hx-row{display:flex;gap:6px;align-items:baseline;flex-wrap:wrap;font-weight:800;font-size:14px}',
    '.hx-do{color:#24305e;background:#fff;border-radius:6px;padding:2px 8px;box-shadow:inset 0 0 0 2px #24305e}',
    '.hx-arr{color:#b88a14;font-weight:900}',
    '.hx-res{color:#137a4b;background:#fff;border-radius:6px;padding:2px 8px;box-shadow:inset 0 0 0 2px #22b573}',
    '.hx-cap{font-size:12.5px;margin-top:8px;line-height:1.6}',
    '.howto-steps{padding-left:20px;font-size:13.5px;line-height:1.7;margin:8px 0}',
  ].join('\n');
  document.head.appendChild(css);
})();
