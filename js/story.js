/* =========================================================================
   設定と言葉の見直し(感想 B)+ 背景色(感想 C の小さいもの)
     ・プロローグ:なぜ島の機械が止まり、なぜ依頼が届くのか、きみは誰か
     ・依頼の欄に、リレーくんが話す形でまとめる(下の欄の同じ話は出さない)
     ・「保全マン」「仲間になった」「検定までの道のり」の言い方を直す
     ・エリアの色とボス戦で、ステージの背景の色を変える
   ========================================================================= */
(function(){
  'use strict';

  /* ---------- プロローグ ---------- */

  const NEW_PROLOGUE = [
    'ここは<b>回路の島々</b>。島の機械は、むかしから<b>リレー盤</b>で動いていた。'
      + '<small class="pexp">リレー盤…「ボタンを押したら、モーターを回す」のような決まりを、電線のつなぎ方で作った箱。'
      + '中には、電気で切りかわるスイッチ(リレー)がたくさん並んでいる。</small>',
    'ある嵐の夜、雷でリレー盤がこわれて、島じゅうの機械と明かりが止まってしまった。残ったリレーは、ぼく<b>リレーくん</b>だけ…。',
    '島の人たちは、リレー盤の代わりに新しい <b>PLC</b> を手に入れた!でも、PLC を動かす<b>ラダー図</b>を書ける人がいないんだ。'
      + '<small class="pexp">PLC…その決まりを、電線のつなぎかえではなく、画面で書いたプログラムで作れる小さなコンピュータ。'
      + 'プログラムの書き方が「ラダー図」。</small>',
    'そこで呼ばれたのが、制御の見習いの<b>きみ</b>。島の人から届く<b>依頼</b>をこなして機械を直そう。島のボスの機械が動くと、その島に電気が戻るよ。',
    'ぼくはリレー盤の中身を覚えているから、道案内はまかせて。まずは<b>はじまりの村</b>からだよ。',
  ];
  PROLOGUE.splice(0, PROLOGUE.length, ...NEW_PROLOGUE);

  // ことば帳にも入れておく
  TERMS['リレー盤'] = {
    yomi:'りれーばん',
    plain:'電気で切りかわるスイッチ(リレー)をたくさん並べ、電線のつなぎ方で「押したら回す」などの決まりを作った箱。',
    ex:'決まりを変えるには配線をやり直す必要がある。今はその役目を PLC がプログラムで受け持つ。',
  };

  /* ---------- 依頼の欄:リレーくんが話す形 ---------- */

  const baseMissionHTML = missionHTML;
  missionHTML = function(st){
    const h = baseMissionHTML(st);
    if(st.tutorial){
      return h;
    }
    const story = st.story ? `<div class="mstory">${termify(esc(nameText(st, st.story)))}</div>` : '';
    return `<div class="talk mrow"><div class="mascot">${mascotSVG('normal')}</div>`
      + `<div class="mbody">${story}${h}</div></div>`;
  };

  // 下の「説明・評価」の欄では、同じ話をくり返さない(評価だけにする)
  const baseRenderBottom = renderBottom;
  renderBottom = function(){
    baseRenderBottom();
    if(G.tab !== 'task' || !G.stage || G.stage.tutorial){
      return;
    }
    const talk = document.querySelector('#bottom > .talk');
    if(talk){
      talk.remove();
    }
  };

  /* ---------- 言い方の見直し ---------- */

  // 称号:「保全マン」→ 実際の職場の呼び方に近い「保全担当」
  const t = TITLES.find(x=>x[1] === '保全マン');
  if(t){
    t[1] = '保全担当';
  }
  LINES.clear = LINES.clear.map(s=>s.replace('保全マンも感心してるよ!', '島の人も安心してるよ!'));

  // 検定までの道のり → 腕前メーター(ゲームの中の言葉にする。級は「相当」の目安として小さく)
  const ROAD_NAMES = ['入門', '3級相当', '2級相当', '1級相当'];
  ROAD.forEach((r, i)=>{
    r.name = ROAD_NAMES[i] || r.name;
  });
  const baseGoalsHTML = goalsHTML;
  goalsHTML = function(){
    return baseGoalsHTML()
      .replace('検定までの道のり', '腕前メーター')
      .replace(/レベル<\/b>まで/, '</b>の腕前まで')
      .replace(/レベル<\/b>/g, '</b>')
      .replace(/<span class="road-s">[^<]*<\/span>/, '');
  };

  /* ---------- 背景:エリアの色、ボス戦は暗め ---------- */

  const baseOpenStage = openStage;
  openStage = function(st){
    baseOpenStage(st);
    document.body.style.setProperty('--stage-bg', areaColor(st.area));
    document.body.classList.toggle('boss-stage', !!st.boss);
  };

  const baseShowMap = showMap;
  showMap = function(...args){
    document.body.classList.remove('boss-stage');
    return baseShowMap(...args);
  };

  /* ---------- 見た目 ---------- */

  const css = document.createElement('style');
  css.textContent = [
    // 依頼の欄:左にリレーくん、右に話と条件
    '.mission .mrow{display:flex;gap:8px;align-items:flex-start;margin:0}',
    '.mission .mrow > .mascot{width:40px;height:56px;flex:none}',
    '.mission .mbody{flex:1;min-width:0}',
    '.mission .mstory{font-size:12px;font-weight:600;color:#5a6178;line-height:1.45;margin-bottom:2px}',
    '@media (max-width:860px){ .mission .mrow > .mascot{width:34px;height:48px} .mission .mstory{font-size:11.5px} }',
    // タイトル画面:アプリ名の下に、世界の名前を小さく
    '.tt-head h1 .tt-isles{display:block;font-size:.42em;letter-spacing:.2em;margin-top:4px;font-weight:800}',
    // プロローグの言葉の説明(ひとこと解説)
    '.pexp{display:block;margin-top:6px;padding:5px 8px;border-radius:6px;background:rgba(29,42,82,.07);font-size:12px;font-weight:600;line-height:1.5;color:#3d4560}',
    // ステージの背景:エリアの色をうっすら
    'body.on-stage{background:linear-gradient(180deg,color-mix(in srgb,var(--stage-bg,#d9e3f0) 26%,#e3e8f0) 0%,#eef1f6 45%,#f3f4f7 100%) fixed}',
    // ボス戦:上が暗い夜の色
    'body.on-stage.boss-stage{background:linear-gradient(180deg,#1f2340 0%,color-mix(in srgb,var(--stage-bg,#ff5d8f) 35%,#2b2a48) 28%,#dcdbe6 62%,#eceaf2 100%) fixed}',
  ].join('\n');
  document.head.appendChild(css);
})();
