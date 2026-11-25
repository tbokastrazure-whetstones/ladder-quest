/* =========================================================================
   置いた接点・コイルを、ダブルタップで固定する(もう一度ダブルタップで解除)
     ・固定した部品は、ドラッグで動かない・上から別の部品を置けない・消せない
     ・部品の左上に鍵の印が付く
   部品があるマスのタップだけ、少し待ってから動かす(2回目が来たらダブルタップとして固定)
   ========================================================================= */
(function(){
  'use strict';

  const DBL_MS = 260;
  let pending = null;

  // タップされたマス(または出力)にある部品を返す
  function partAt(t){
    const ri = Number(t.dataset.ri);
    const rg = G.prog[ri];
    if(!rg){
      return null;
    }
    if(t.dataset.act === 'out'){
      return rg.out ? {obj:rg.out, key:'o-' + ri} : null;
    }
    const r = Number(t.dataset.r);
    const c = Number(t.dataset.c);
    const cell = rg.cells[r] && rg.cells[r][c];
    if(!cell || (cell.t !== 'NO' && cell.t !== 'NC')){
      return null;
    }
    if(cellLocked(rg, r, c)){
      return null;
    }
    return {obj:cell, key:'c-' + ri + '-' + r + '-' + c};
  }

  function togglePin(part){
    part.obj.pin = part.obj.pin ? undefined : 1;
    if(!part.obj.pin){
      delete part.obj.pin;
    }
    saveDraft();
    renderEditor();
    SFX.play(part.obj.pin ? 'relay' : 'remove');
    try{
      if(navigator.vibrate){
        navigator.vibrate(part.obj.pin ? 25 : [12, 40, 12]);
      }
    }catch(_){}
    toast(part.obj.pin ? '固定しました(もう一度ダブルタップで解除)' : '固定を解除しました');
  }

  const baseOnStageClick = onStageClick;
  onStageClick = function(e){
    const t = e.target.closest && e.target.closest('[data-act]');
    if(!t || (t.dataset.act !== 'cell' && t.dataset.act !== 'out')){
      baseOnStageClick(e);
      return;
    }
    // ドラッグの直後のクリックは、今までどおり(無視される)
    if(G.dragged && Date.now() - G.dragged < 400){
      baseOnStageClick(e);
      return;
    }
    const part = partAt(t);
    if(!part){
      baseOnStageClick(e);
      return;
    }
    // 2回目のタップ:固定・解除
    if(pending && pending.key === part.key){
      clearTimeout(pending.timer);
      pending = null;
      togglePin(part);
      return;
    }
    if(pending){
      clearTimeout(pending.timer);
      pending.run();
    }
    // 1回目のタップ:少し待ってから、いつもの動き(選び直し・置き換え)
    const fake = {target:t};
    const run = ()=>{
      if(part.obj.pin){
        toast('固定しています(ダブルタップで解除)');
        return;
      }
      baseOnStageClick(fake);
    };
    pending = {key:part.key, run, timer:setTimeout(()=>{ pending = null; run(); }, DBL_MS)};
  };

  // 固定した部品の上には、手札から置けない・消せない
  const basePlaceTool = placeTool;
  placeTool = function(ri, r, c, where){
    const rg = G.prog[ri];
    const target = !rg ? null : (where === 'out' ? rg.out : (rg.cells[r] && rg.cells[r][c]));
    if(target && target.pin && G.tool && G.tool !== 'ADDM|'){
      toast('固定しています(ダブルタップで解除)');
      renderEditor();
      return true;
    }
    return basePlaceTool(ri, r, c, where);
  };

  // ドラッグで、固定した部品の場所に重ねて入れ替えない
  const baseMovePart = movePart;
  movePart = function(src, t){
    if(t){
      const rg = G.prog[Number(t.dataset.ri)];
      const target = !rg ? null : (t.dataset.act === 'out' ? rg.out : (rg.cells[Number(t.dataset.r)] || [])[Number(t.dataset.c)]);
      if(target && target.pin){
        toast('固定しています(ダブルタップで解除)');
        renderEditor();
        return;
      }
    }
    baseMovePart(src, t);
  };

  /* ---------- 鍵の印 ---------- */

  function lockMark(x, y){
    return `<g class="pinmark" transform="translate(${x} ${y})">`
      + '<rect x="0" y="0" width="14" height="14" rx="4"/>'
      + '<path d="M4.5 6.5V5a2.5 2.5 0 0 1 5 0v1.5M3.5 6.5h7v5h-7z"/>'
      + '</g>';
  }

  const baseContactSVG = contactSVG;
  contactSVG = function(cell, x, y, st){
    let s = baseContactSVG(cell, x, y, st);
    if(cell && cell.pin){
      s += lockMark(x + 2, y - 31);
    }
    return s;
  };

  const baseOutSVG = outSVG;
  outSVG = function(o, x0, xR, y, st, ri){
    let s = baseOutSVG(o, x0, xR, y, st, ri);
    if(o && o.pin){
      s += lockMark(x0 + 8, y - 31);
    }
    return s;
  };

  const css = document.createElement('style');
  css.textContent = [
    '.rung-svg .pinmark rect{fill:#24305e;stroke:none}',
    '.rung-svg .pinmark path{fill:none;stroke:#ffd84d;stroke-width:1.6;stroke-linejoin:round}',
  ].join('\n');
  document.head.appendChild(css);
})();
