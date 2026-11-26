/* =========================================================================
   スマホで遊びやすくする
     ・部品の手札を、画面の下(判定ボタンの上)に固定する。
       ラングが増えても、手札まで上下にスクロールしなくてよい
     ・手札の見出しをタップすると、小さくたためる(ラダー図を広く見たいとき)
     ・ラングを足したら、新しいラングが見える位置まで動かす
   ========================================================================= */
(function(){
  'use strict';

  /* ---------- 手札をたたむ・広げる ---------- */

  const baseHandHTML = handHTML;
  handHTML = function(st){
    const h = baseHandHTML(st);
    const folded = !!G.handFolded;
    const bar = `<button type="button" class="hand-fold" data-handfold="1">${folded ? '▲ 部品を出す' : '▼ 部品をたたむ'}</button>`;
    // いちばん外側の <div class="hand"> に、たたんだ印と開け閉めのボタンを付ける
    return h.replace('<div class="hand">', `<div class="hand${folded ? ' folded' : ''}">${bar}`);
  };

  document.addEventListener('click', e=>{
    const t = e.target.closest && e.target.closest('[data-handfold]');
    if(!t){
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    G.handFolded = !G.handFolded;
    renderEditor();
  }, true);

  /* ---------- ラングを足したら、新しいラングへ ---------- */

  const baseAddRung = addRung;
  addRung = function(){
    const before = G.prog.length;
    baseAddRung();
    if(G.prog.length === before){
      return;
    }
    const rungs = document.querySelectorAll('#rungs .rung');
    const last = rungs[rungs.length - 1];
    if(last){
      last.scrollIntoView({block:'center', behavior:reduced() ? 'auto' : 'smooth'});
    }
  };

  /* ---------- 見た目 ---------- */

  const css = document.createElement('style');
  css.textContent = [
    '.hand-fold{display:none}',
    // 縦向きのスマホ:手札を判定ボタンの上に固定する
    '@media (max-width:860px) and (orientation:portrait){',
    '  body.on-stage #editor .hand{position:sticky;bottom:calc(66px + env(safe-area-inset-bottom));z-index:4;background:#fff;margin:8px -10px -10px;padding:2px 8px 6px;border-radius:14px 14px 0 0;box-shadow:0 -6px 16px rgba(15,20,45,.12);max-height:32vh;overflow-y:auto;overscroll-behavior:contain}',
    // 手札を小さく:説明は1行、カードは44px、見出しも詰める
    '  body.on-stage #editor .hand .hand-tip{font-size:10.5px;margin:0 2px 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '  body.on-stage #editor .hand .hcard{width:44px;min-height:44px;padding:2px 1px;font-size:9.5px;border-radius:7px}',
    '  body.on-stage #editor .hand .hcard svg{width:28px;height:17px}',
    '  body.on-stage #editor .hand .hcard small{font-size:7.5px}',
    '  body.on-stage #editor .hand .hsec-h{margin:1px 2px 2px}',
    '  body.on-stage #editor .hand .hsec-h b{font-size:10.5px;padding:0 5px}',
    '  body.on-stage #editor .hand .hsec-h span{font-size:10px}',
    '  body.on-stage #editor .hand .gh{font-size:10px;margin-bottom:1px}',
    '  body.on-stage #editor .hand .gc{gap:3px}',
    '  body.on-stage #editor .hand .hgrp{padding:3px 4px}',
    '  body.on-stage #editor .hand .hand-row{gap:5px}',
    // たたむボタンは蛍光色にして、たたんだあとも見失わないようにする
    '  .hand-fold{display:block;width:100%;border:0;background:#eaff7a;color:#1d2a52;font-size:11.5px;font-weight:900;padding:3px 0;margin:2px 0 4px;border-radius:8px;cursor:pointer}',
    '  body.on-stage #editor .hand.folded{padding:6px 8px;background:#1d2a52}',
    '  body.on-stage #editor .hand.folded .hand-fold{background:#d4ff00;color:#1d2a52;font-size:13.5px;padding:8px 0;margin:0;box-shadow:0 0 14px rgba(212,255,0,.75);animation:foldGlow 1.6s ease-in-out infinite}',
    '  body.on-stage #editor .hand.folded > :not(.hand-fold){display:none}',
    '}',
    '@keyframes foldGlow{0%,100%{box-shadow:0 0 6px rgba(212,255,0,.5)}50%{box-shadow:0 0 18px rgba(212,255,0,.95)}}',
    '@media (max-width:860px) and (orientation:portrait){',
    '}',
  ].join('\n');
  document.head.appendChild(css);
})();
