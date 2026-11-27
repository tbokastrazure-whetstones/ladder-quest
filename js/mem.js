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

  function memItem(i){
    return {a:memAddr(i), name:'M' + (i + 1), desc:'内部リレー(自由に使える)', extra:true};
  }

  // 足した M の番号の一覧(G.save.extraM[ステージ] = [番号, ...])
  function savedList(st){
    if(!G.save.extraM){
      G.save.extraM = {};
    }
    const v = G.save.extraM[st.id];
    return Array.isArray(v) ? v : null;
  }

  function addOneMem(st){
    const P = prep(st);
    if(P.mem.length >= MAX_MEM){
      return null;
    }
    const used = P.mem.map(x=>memIndex(x.a));
    let next = 0;
    while(used.includes(next)){
      next++;
    }
    const item = memItem(next);
    P.mem.push(item);
    P.mem.sort((x, y)=>memIndex(x.a) - memIndex(y.a));
    return item;
  }

  // ステージを開いたとき、前に足した M を足し直す
  function restoreMems(st){
    const P = prep(st);
    if(!G.save.extraM){
      G.save.extraM = {};
    }
    const v = G.save.extraM[st.id];
    // 前の形(足した個数だけを覚えていた)は、番号の一覧に置き換える
    if(typeof v === 'number'){
      for(let i = P.mem.filter(x=>x.extra).length; i < v; i++){
        addOneMem(st);
      }
      G.save.extraM[st.id] = P.mem.filter(x=>x.extra).map(x=>memIndex(x.a));
      persist();
      return;
    }
    for(const i of (v || [])){
      if(!P.mem.some(x=>memIndex(x.a) === i)){
        P.mem.push(memItem(i));
      }
    }
    P.mem.sort((x, y)=>memIndex(x.a) - memIndex(y.a));
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
    const list = savedList(st) || [];
    list.push(memIndex(item.a));
    G.save.extraM[st.id] = list;
    persist();
    SFX.play('place');
    toast(item.name + ' を足しました(接点数には数えません)');
    G.tool = null;
    renderEditor();
  }

  /* ---------- 足した内部リレーを消す ----------
     ラダー図で使っている M は消せない(先にラダー図から外す) */

  function usedInProg(a){
    for(const rg of G.prog || []){
      if(rg.out && (rg.out.a === a || rg.out.r === a)){
        return true;
      }
      for(const row of rg.cells){
        for(const c of row){
          if(c && c.a === a){
            return true;
          }
        }
      }
    }
    return false;
  }

  function removeMems(st, addrs){
    const P = prep(st);
    P.mem = P.mem.filter(x=>!(x.extra && addrs.includes(x.a)));
    const idx = addrs.map(memIndex);
    G.save.extraM[st.id] = (savedList(st) || []).filter(i=>!idx.includes(i));
    persist();
  }

  function openMemDelete(){
    const st = G.stage;
    if(!st){
      return;
    }
    const draw = ()=>{
      const extras = prep(st).mem.filter(x=>x.extra);
      const add = `<div class="acts" style="justify-content:flex-start;margin-top:0"><button class="btn primary" data-m="add">＋ 内部リレーを1つ足す</button><span class="note">(今 ${extras.length} 個)</span></div>`;
      if(!extras.length){
        return '<h2>内部リレー</h2>' + add + '<div class="acts"><button class="btn" data-m="close">閉じる</button></div>';
      }
      const rows = extras.map(x=>{
        const used = usedInProg(x.a);
        return `<div class="mdel-row"><b>${esc(x.name)}</b><span>${used ? 'ラダー図で使用中' : '使っていない'}</span>`
          + `<button class="btn small" data-m="del" data-a="${x.a}" ${used ? 'disabled' : ''}>消す</button></div>`;
      }).join('');
      const unused = extras.filter(x=>!usedInProg(x.a)).length;
      return `<h2>内部リレー</h2>` + add
        + '<p class="note">足した内部リレーを消すこともできます。ラダー図で使っているものは消せません(先にラダー図から外す)。</p>'
        + `<div class="mdel-list">${rows}</div>`
        + `<div class="acts"><button class="btn" data-m="delall" ${unused ? '' : 'disabled'}>使っていない ${unused} 個を消す</button><button class="btn primary" data-m="close">閉じる</button></div>`;
    };
    const bg = openModal(draw(), t=>{
      const m = t.dataset.m;
      if(m === 'add'){
        addMemByUser();
        bg.querySelector('.modal').innerHTML = draw();
        return;
      }
      if(m === 'del'){
        removeMems(st, [t.dataset.a]);
      }
      if(m === 'delall'){
        removeMems(st, prep(st).mem.filter(x=>x.extra && !usedInProg(x.a)).map(x=>x.a));
      }
      if(m === 'del' || m === 'delall'){
        SFX.play('remove');
        bg.querySelector('.modal').innerHTML = draw();
        renderEditor();
      }
    });
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
  const DEL_KEY = 'DELM|';

  const baseHandTools = handTools;
  handTools = function(st){
    const secs = baseHandTools(st);
    if(st.tutorial){
      return secs;
    }
    const util = secs.find(s=>s.cls === 's-util');
    if(util){
      const items = util.groups[0].items;
      // 消すのは「＋内部リレー」から開く一覧の中で(手札は置く部品だけにする)
      items.unshift({k:ADD_KEY, t:'ADDM', name:'＋内部リレー'});
    }
    return secs;
  };

  const baseToolIcon = toolIcon;
  toolIcon = function(t){
    if(t === 'ADDM' || t === 'DELM'){
      const mark = t === 'ADDM' ? 'M+' : 'M−';
      return '<svg viewBox="0 0 40 24"><rect x="9" y="3" width="22" height="18" rx="4" stroke="currentColor" stroke-width="2.5" fill="none"/>'
        + `<text x="20" y="16.5" text-anchor="middle" font-size="11" font-weight="900" fill="currentColor">${mark}</text></svg>`;
    }
    return baseToolIcon(t);
  };

  // タップでも、ドラッグして離しても、M を足す・消す画面を開くだけ(マスには置かない)
  const baseSelectTool = selectTool;
  selectTool = function(k){
    // まだ1つも足していなければすぐ足す。足してあれば、足す・消すの一覧を開く
    if(k === ADD_KEY && G.stage && prep(G.stage).mem.some(x=>x.extra)){
      G.tool = null;
      openMemDelete();
      return;
    }
    if(k === ADD_KEY){
      addMemByUser();
      return;
    }
    if(k === DEL_KEY){
      G.tool = null;
      openMemDelete();
      return;
    }
    baseSelectTool(k);
  };

  const basePlaceTool = placeTool;
  placeTool = function(ri, r, c, where){
    if(G.tool === ADD_KEY){
      selectTool(ADD_KEY);
      return true;
    }
    if(G.tool === DEL_KEY){
      G.tool = null;
      openMemDelete();
      return true;
    }
    return basePlaceTool(ri, r, c, where);
  };

  /* ---------- 見た目 ---------- */

  const css = document.createElement('style');
  css.textContent = [
    '.hcard.t-ADDM svg{color:#6f48d4}',
    '.hcard.t-DELM svg{color:#d23a4c}',
    '.mdel-list{max-height:50vh;overflow-y:auto;display:flex;flex-direction:column;gap:4px;margin:8px 0}',
    '.mdel-row{display:flex;align-items:center;gap:10px;background:#f6f7fb;border-radius:8px;padding:5px 8px}',
    '.mdel-row b{width:52px}',
    '.mdel-row span{flex:1;font-size:12px;color:var(--sub)}',
  ].join('\n');
  document.head.appendChild(css);
})();
