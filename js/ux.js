/* =========================================================================
   画面をすっきりさせる(減らす方向の直し)
     ・依頼は「目的+条件の頭2行」だけ見せ、残りとコツは「条件をすべて見る」で開く
     ・ヒントは下のバーの「ヒント」ボタン1つに(下の欄のヒントのタブはなくす)
     ・手札のコイルの段は、横スクロールにせず折り返す
   ========================================================================= */
(function(){
  'use strict';

  // 条件がこの数以上あれば、頭の2行だけ見せる
  const FOLD_AT = 3;
  const SHOW = 2;

  /* ---------- 依頼:要点だけ ---------- */

  const baseMissionRaw = missionRaw;
  missionRaw = function(st){
    if(!st.steps){
      return baseMissionRaw(st);
    }
    const n = st.steps.length;
    const fold = n >= FOLD_AT;
    const more = i=>fold && i >= SHOW ? ' class="mmore-i"' : '';
    const items = st.steps.map(([d, r], i)=>
      `<li${more(i)}><span class="mdo">${fillNames(st, d)}</span><span class="marr">→</span><span class="mres">${fillNames(st, r)}</span></li>`
    ).join('');
    let tip = '';
    if(st.tip){
      tip = `<div class="mtip${fold ? ' mmore-i' : ''}">${fillNames(st, st.tip)}</div>`;
    }
    let btn = '';
    if(fold){
      btn = `<button type="button" class="mtoggle" data-mtoggle="${n}">条件をすべて見る(${n})</button>`;
    }
    return `<div class="mgoal"><span class="chip">依頼</span>${esc(st.goal)}</div><ol class="msteps">${items}</ol>${tip}${btn}`;
  };

  document.addEventListener('click', e=>{
    const b = e.target.closest && e.target.closest('[data-mtoggle]');
    if(!b){
      return;
    }
    e.stopPropagation();
    const m = b.closest('.mission');
    if(!m){
      return;
    }
    const open = m.classList.toggle('mopen');
    b.textContent = open ? '閉じる' : `条件をすべて見る(${b.dataset.mtoggle})`;
  }, true);

  /* ---------- ヒント:下のバーのボタン1つに ---------- */

  function hintsHTML(){
    const st = G.stage;
    const rec = stRec(st.id);
    let h = `<h2>${ic('hint')} ヒント(${rec.hints}/${st.hints.length})</h2>`;
    for(let i = 0; i < rec.hints; i++){
      h += `<div class="hint"><b>ヒント${i + 1}</b> ${termify(esc(nameText(st, st.hints[i])))}</div>`;
    }
    if(rec.hints < st.hints.length){
      h += `<button class="btn" data-m="next">ヒント${rec.hints + 1}を見る(★3が消えます)</button>`;
    } else {
      h += '<div class="note">ヒントはここまで。「模範解答」ボタンで答えも見られます。</div>';
    }
    h += '<div class="acts"><button class="btn primary" data-m="close">閉じる</button></div>';
    return h;
  }

  function showHints(){
    if(!G.stage){
      return;
    }
    const bg = openModal(hintsHTML(), t=>{
      if(t.dataset.m !== 'next'){
        return;
      }
      openHint();
      bg.querySelector('.modal').innerHTML = hintsHTML();
    });
  }
  window.showHints = showHints;

  document.addEventListener('click', e=>{
    const b = e.target.closest && e.target.closest('.ctrlbar [data-tab="hint"]');
    if(!b){
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    showHints();
  }, true);

  const baseRenderBottom = renderBottom;
  renderBottom = function(){
    if(G.tab === 'hint'){
      G.tab = 'task';
    }
    baseRenderBottom();
    const tab = document.querySelector('#bottom .tabs [data-tab="hint"]');
    if(tab){
      tab.remove();
    }
  };

  /* ---------- 見た目 ---------- */

  const css = document.createElement('style');
  css.textContent = [
    // 依頼:たたんでいる間は、頭の2行とボタンだけ
    '.mission:not(.mopen) .mmore-i{display:none}',
    '.mission .mtoggle{display:inline-block;margin-top:3px;border:0;background:none;color:#2c63c2;font-size:12px;font-weight:800;padding:2px 0;cursor:pointer;text-decoration:underline}',
    // 手札:コイルの段は折り返す(横スクロールしない)
    '.hsec-row{flex-wrap:wrap}',
    '.hsec-row .s-coil .hand-row{overflow:visible;flex-wrap:wrap}',
    '.s-coil .hgrp{flex:1 1 auto}',
    '.s-coil .hgrp .gc{flex-wrap:wrap}',
  ].join('\n');
  document.head.appendChild(css);
})();
