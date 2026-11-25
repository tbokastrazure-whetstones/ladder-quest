/* =========================================================================
   内部リレー(M)を、どのステージでもいくつでも足せるようにする
     ・手札の「その他」に「＋内部リレー」のカード。押すと M を1つ足す
     ・足した M は、そのステージで覚えておく(G.save.extraM)
     ・内部リレーの接点は、★2 の「接点数」に数えない
   ========================================================================= */
(function(){
  'use strict';

  // 1ステージで足せる内部リレーの数(%MX0.0〜%MX24.7 まで使える)
  const MAX_MEM = 200;

  /* ---------- 接点数:内部リレー(%MX)の接点は数えない ---------- */

  countContacts = function(prog){
    let n = 0;
    for(const rg of prog){
      for(const row of rg.cells){
        for(const c of row){
          if(!c || (c.t !== 'NO' && c.t !== 'NC')){
            continue;
          }
          if(kindOf(c.a) === 'M'){
            continue;
          }
          n++;
        }
      }
    }
    return n;
  };

  /* ---------- 内部リレーを足す ---------- */

  // %MX0.0 → 0、%MX1.2 → 10
  function memIndex(a){
    const m = /^%MX(\d+)\.([0-7])$/.exec(a || '');
    if(!m){
      return -1;
    }
    return Number(m[1]) * 8 + Number(m[2]);
  }

  function memAddr(i){
    return '%MX' + Math.floor(i / 8) + '.' + (i % 8);
  }

  function addOneMem(st){
    const P = prep(st);
    if(P.mem.length >= MAX_MEM){
      return null;
    }
    const used = P.mem.map(x=>memIndex(x.a));
    const next = used.length ? Math.max(...used) + 1 : 0;
    const item = {a:memAddr(next), name:'M' + (next + 1), desc:'内部リレー(自由に使える)', extra:true};
    P.mem.push(item);
    return item;
  }

  // ステージを開いたとき、前に足した数だけ M を足し直す
  function restoreMems(st){
    const want = (G.save.extraM && G.save.extraM[st.id]) || 0;
    const P = prep(st);
    const have = P.mem.filter(x=>x.extra).length;
    for(let i = have; i < want; i++){
      addOneMem(st);
    }
  }

  function addMemByUser(){
    const st = G.stage;
    if(!st){
      return;
    }
    const item = addOneMem(st);
    if(!item){
      toast('内部リレーは ' + MAX_MEM + ' 個までです');
      return;
    }
    if(!G.save.extraM){
      G.save.extraM = {};
    }
    G.save.extraM[st.id] = (G.save.extraM[st.id] || 0) + 1;
    persist();
    SFX.play('place');
    toast(item.name + ' を足しました(接点数には数えません)');
    G.tool = null;
    renderEditor();
  }

  const baseOpenStage = openStage;
  openStage = function(st){
    if(st && !st.tutorial){
      restoreMems(st);
    }
    baseOpenStage(st);
  };

  /* ---------- 手札:「＋内部リレー」のカード ---------- */

  const ADD_KEY = 'ADDM|';

  const baseHandTools = handTools;
  handTools = function(st){
    const secs = baseHandTools(st);
    if(st.tutorial){
      return secs;
    }
    const util = secs.find(s=>s.cls === 's-util');
    if(util){
      util.groups[0].items.unshift({k:ADD_KEY, t:'ADDM', name:'＋内部リレー'});
    }
    return secs;
  };

  const baseToolIcon = toolIcon;
  toolIcon = function(t){
    if(t === 'ADDM'){
      return '<svg viewBox="0 0 40 24"><rect x="9" y="3" width="22" height="18" rx="4" stroke="currentColor" stroke-width="2.5" fill="none"/>'
        + '<text x="20" y="16.5" text-anchor="middle" font-size="11" font-weight="900" fill="currentColor">M+</text></svg>';
    }
    return baseToolIcon(t);
  };

  // タップでも、ドラッグして離しても、M を1つ足すだけ(マスには置かない)
  const baseSelectTool = selectTool;
  selectTool = function(k){
    if(k === ADD_KEY){
      addMemByUser();
      return;
    }
    baseSelectTool(k);
  };

  const basePlaceTool = placeTool;
  placeTool = function(ri, r, c, where){
    if(G.tool === ADD_KEY){
      addMemByUser();
      return true;
    }
    return basePlaceTool(ri, r, c, where);
  };

  /* ---------- 見た目 ---------- */

  const css = document.createElement('style');
  css.textContent = [
    '.hcard.t-ADDM svg{color:#6f48d4}',
  ].join('\n');
  document.head.appendChild(css);
})();
