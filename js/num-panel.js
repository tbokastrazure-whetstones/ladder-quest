/* =========================================================================
   実習機パネルの数字スイッチ(DSW)と 7セグ表示(DPL)を動かす
     ・DSW のつまみをタップすると 0→1→…→9→0 と変わる(実機の DSW は 0〜9 の1けた)
     ・MOV で DPL に入れた数を、7セグの2けた(DPL2=十の位、DPL1=一の位)に出す
     ・不合格の説明や操作の流れで、数のところを「数字SWを 7 に合わせる」のように書く
   ========================================================================= */
(function(){
  'use strict';

  // このステージで数字スイッチ・表示を使うか
  function usesNum(st){
    return !!(st && st.xcards);
  }

  /* ---------- 数字スイッチ ---------- */

  function dswNow(){
    return Number(G.dsw) || 0;
  }

  function applyDsw(){
    if(G.plc && usesNum(G.stage)){
      G.plc.inputs.DSW = dswNow();
    }
  }

  document.addEventListener('click', e=>{
    const k = e.target.closest && e.target.closest('.tr-dsw .tr-knob');
    if(!k || !usesNum(G.stage)){
      return;
    }
    e.stopPropagation();
    G.dsw = (dswNow() + 1) % 10;
    applyDsw();
    SFX.play('tick');
    updateMachineVis();
  }, true);

  const baseResetRun = resetRun;
  resetRun = function(){
    baseResetRun();
    applyDsw();
    updateMachineVis();
  };

  const baseOpenStage = openStage;
  openStage = function(st){
    G.dsw = 0;
    baseOpenStage(st);
    applyDsw();
  };

  /* ---------- 表示を更新 ---------- */

  const baseUpdateMachineVis = updateMachineVis;
  updateMachineVis = function(){
    baseUpdateMachineVis();
    if(!usesNum(G.stage) || !G.plc){
      return;
    }
    const knob = document.querySelector('.tr-dsw .tr-knob');
    if(knob){
      // テストの再生中は、入っている数をそのまま出す
      const v = typeof G.plc.inputs.DSW === 'number' ? G.plc.inputs.DSW : dswNow();
      knob.dataset.v = v;
      knob.classList.add('num');
    }
    const d1 = document.getElementById('tr-dpl1');
    const d2 = document.getElementById('tr-dpl2');
    if(!d1 || !d2){
      return;
    }
    const n = Math.max(0, Math.min(99, Number((G.plc.num || {}).DPL) || 0));
    d2.textContent = n >= 10 ? Math.floor(n / 10) : '';
    d1.textContent = n % 10;
    d2.classList.toggle('on', n >= 10);
    d1.classList.add('on');
  };

  /* ---------- 不合格の説明・操作の流れ ---------- */

  const baseIoLabel = ioLabel;
  ioLabel = function(st, a){
    if(a === 'DSW'){
      return '数字スイッチ(DSW)';
    }
    if(a === 'DPL'){
      return '7セグ表示(DPL)';
    }
    return baseIoLabel(st, a);
  };

  // DSW の数の入力を、いったん「DSW#7」という名前の ON にして書かせ、あとで言いかえる
  const baseOpsTimeline = opsTimeline;
  opsTimeline = function(st, steps, upto){
    const conv = steps.map(s=>{
      if(!s.in || typeof s.in.DSW !== 'number'){
        return s;
      }
      const inp = Object.assign({}, s.in);
      const v = inp.DSW;
      delete inp.DSW;
      inp['DSW#' + v] = true;
      return Object.assign({}, s, {in:inp});
    });
    const html = baseOpsTimeline(st, conv, upto);
    return html.replace(/DSW#(\d+)をON/g, '数字スイッチを $1 に合わせる');
  };

  const baseInKind = inKind;
  inKind = function(st, a){
    if(/^DSW#/.test(a || '')){
      return 'num';
    }
    return baseInKind(st, a);
  };

  const baseLabel2 = ioLabel;
  ioLabel = function(st, a){
    if(/^DSW#/.test(a || '')){
      return a;
    }
    return baseLabel2(st, a);
  };

  const baseFailHTML = failHTML;
  failHTML = function(st, r){
    if(!r || typeof r.exp !== 'number'){
      return baseFailHTML(st, r);
    }
    const sec = (r.t / 1000).toFixed(1) + '秒';
    const tl = opsTimeline(st, r.steps, r.t);
    const bad = `${sec}の時点で、${esc(ioLabel(st, r.addr))} は <b>${r.exp}</b> のはずが、<b>${r.act}</b> になっていました`;
    return `<p class="result-ng">不合格… テスト${r.idx + 1}「${esc(r.name)}」</p>`
      + '<div class="note">このテストでの操作(最初は全部OFF・数字スイッチは 0)</div>'
      + `<div class="timeline">${tl || '<div>(何も操作しない)</div>'}<div class="bad">${bad}</div></div>`
      + '<p class="note">機械のボタンと数字スイッチで同じ順番に操作して、表示がどう変わるか見てみよう。</p>';
  };

  /* ---------- 見た目:つまみに今の数を出す ---------- */

  const css = document.createElement('style');
  css.textContent = [
    '.tr-dsw .tr-knob.num{cursor:pointer;position:relative}',
    '.tr-dsw .tr-knob.num::after{content:attr(data-v);position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 15px/1 Consolas,monospace;color:#fff;text-shadow:0 1px 2px #000}',
    '.tr-dsw .tr-knob.num i{opacity:.25}',
  ].join('\n');
  document.head.appendChild(css);
})();
