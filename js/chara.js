/* =========================================================================
   リレーくんの動き(軽いもの)
     ・ふだん:依頼の欄で、ゆっくり上下にゆれて、ときどきまばたき
     ・判定を押したとき:あごに手を当てて考える
     ・合格:うなずく / 不合格:首を小さく横にふる
     ・ボス戦:キリッとした顔で、身構える
   重くしないよう、絵は今の SVG のまま、CSS の動きと表情の差し替えだけで作る。
   ========================================================================= */
(function(){
  'use strict';

  /* ---------- 新しい表情とポーズ ---------- */

  // キリッとした顔(ボス戦):眉を下げ、口はまっすぐ
  RELAY_FACE.tense = '<path d="M13 12 L23 15 M43 12 L33 15"/>'
    + '<rect x="15" y="16" width="7" height="8" rx="3" class="fl"/><rect x="34" y="16" width="7" height="8" rx="3" class="fl"/>'
    + '<path d="M22 30 H34"/>';
  RELAY_LAMP.tense = '#ff5d5d';
  // 身構える:両腕を少し前に上げる
  RELAY_POSE.guard = {L:55, R:-55};
  MOOD_POSE.tense = 'guard';

  // 今のステージで、リレーくんがふだんしている顔
  function baseMood(){
    return G.stage && G.stage.boss ? 'tense' : 'normal';
  }

  /* ---------- 反応のあとは、ふだんの顔に戻す ---------- */

  relayReact = function(mood, ms, pose){
    const sel = '#bottom .mascot, .stage .talk .mascot';
    const els = document.querySelectorAll(sel);
    if(!els.length){
      return;
    }
    const now = Date.now();
    // 機械が動くたびに鳴らしすぎない
    if(G.reactUntil && now < G.reactUntil - 200 && mood === 'happy'){
      return;
    }
    els.forEach(e=>{
      e.innerHTML = mascotSVG(mood, pose);
      e.classList.add('react');
    });
    clearTimeout(G.reactT);
    G.reactUntil = now + (ms || 1200);
    G.reactT = setTimeout(()=>{
      document.querySelectorAll(sel).forEach(e=>{
        e.innerHTML = mascotSVG(baseMood());
        e.classList.remove('react');
      });
    }, ms || 1200);
  };

  // ボス戦では、依頼の欄のリレーくんを最初からキリッとさせる
  const baseMissionHTML = missionHTML;
  missionHTML = function(st){
    const h = baseMissionHTML(st);
    if(!st.boss){
      return h;
    }
    return h.replace(/<div class="mascot">[\s\S]*?<\/svg><\/div>/, `<div class="mascot">${mascotSVG('tense')}</div>`);
  };

  /* ---------- 判定・合格・不合格 ---------- */

  const baseJudge = judge;
  judge = function(){
    if(!G.judging){
      relayReact('think', 2200);
    }
    return baseJudge();
  };

  // 結果の画面が開いたら、合格はうなずき、不合格は首ふり
  const baseOpenModal = openModal;
  openModal = function(html, onClick){
    const bg = baseOpenModal(html, onClick);
    const modal = bg && bg.querySelector && bg.querySelector('.modal');
    if(modal && /class="pass/.test(html)){
      modal.classList.add('m-nod');
    }
    return bg;
  };

  /* ---------- 見た目 ---------- */

  const css = document.createElement('style');
  css.textContent = [
    '@keyframes rkBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}',
    '@keyframes rkBlink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}',
    '@keyframes rkNod{0%,100%{transform:rotate(0)}30%{transform:rotate(8deg) translateY(2px)}60%{transform:rotate(0)}}',
    '@keyframes rkShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}',
    '@keyframes rkGuard{0%,100%{transform:translateY(0)}50%{transform:translateY(-1px) scale(1.02)}}',
    '@media (prefers-reduced-motion:no-preference){',
    // ふだん:ゆっくり上下・まばたき
    '  .mission .mrow > .mascot svg{animation:rkBob 3.2s ease-in-out infinite;transform-origin:50% 100%}',
    '  .mission .mrow > .mascot .rface rect.fl{animation:rkBlink 4.5s infinite;transform-box:fill-box;transform-origin:center}',
    // ボス戦:小さく力をためる
    '  .boss-stage .mission .mrow > .mascot svg{animation:rkGuard 1.4s ease-in-out infinite}',
    // 合格はうなずき、不合格は首ふり
    '  .modal.m-nod .talk .mascot svg{animation:rkNod .7s ease-in-out .3s 2;transform-origin:50% 90%}',
    '  .modal.ng .talk .mascot svg{animation:rkShake .45s ease-in-out .2s 2}',
    '}',
  ].join('\n');
  document.head.appendChild(css);
})();
