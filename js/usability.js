/* =========================================================================
   遊びやすさの直し(感想 A)
     ・長押しで文字が青く選択されないようにする
     ・「通電中」の表示でラダー図が上下に動かないようにする
     ・リセット = ラダー図(ラング)を最初の状態に戻す
     ・部品の呼び名を、依頼の言葉(井戸ポンプ など)にそろえる
     ・ラングの高さを少し詰める
     ・内部リレーがなぜ「M」なのかを説明する
   ========================================================================= */
(function(){
  'use strict';

  /* ---------- 部品の呼び名をそろえる ----------
     前は機械の種類(モーター1 など)で呼んでいたので、
     依頼では「井戸ポンプ」なのに画面では「モーター1」になっていた。
     io の説明(desc)の言葉を、そのまま呼び名に使う。 */

  // 「起動ボタン(押している間だけ)」→「起動ボタン」
  function roleOf(st, a){
    const io = prep(st).io.find(x=>x.a === a);
    if(!io || !io.desc){
      return '';
    }
    let role = io.desc.split(/[((]/)[0].trim();
    // ラダー図のマスに入りきらない長い名前は、後ろの「スイッチ」「モータ」を省く
    // (例:運転許可スイッチ → 運転許可、丸太ころがしモータ → 丸太ころがし)
    if(role.length > 7){
      role = role.replace(/(スイッチ|モータ|モーター)$/, '');
    }
    return role;
  }

  const baseEasyName = easyName;
  easyName = function(st, a){
    const role = roleOf(st, a);
    if(!role){
      return baseEasyName(st, a);
    }
    // 同じ呼び名が2つあるときは、記号の番号を付けて区別する
    const same = prep(st).io.filter(x=>x.a !== a && roleOf(st, x.a) === role);
    if(same.length){
      const num = (nameOf(st, a).match(/\d+$/) || [''])[0];
      return role + num;
    }
    return role;
  };

  // 依頼の文の {P1|粉ひき機} も、ラダー図と同じ呼び名だけを出す
  // (前は「粉ひき機」+小さく「粉ひきモータ」と2つの名前が並んでいた)
  const baseFillNames = fillNames;
  fillNames = function(st, text){
    const mode = (G.set || SET_DEFAULT).names;
    if(mode === 'symbol'){
      return baseFillNames(st, text);
    }
    const P = prep(st);
    return esc(text).replace(/\{([A-Za-z0-9]+)(?:\|([^}]+))?\}/g, (m, sym, label)=>{
      const io = P.io.find(x=>x.name === sym);
      // text は先に esc 済みなので、label はそのまま使う
      const shown = io ? esc(showName(st, io.a)) : (label || sym);
      return `<b class="nm">${shown}</b>`;
    });
  };

  // 課題文の「ポンプ P1」→「井戸ポンプ」、「点検ボタン PB1」→「点検ボタン」
  // (前は「点検ボタン(点検ボタン)」のように同じ名前が重なることがあった)
  function mergeName(before, nm){
    // 直前の文字が呼び名の一部と同じなら、そこを呼び名に置きかえる
    //  「ポンプ P1」→「井戸ポンプ」、「リセット PB4」→「リセットボタン」
    const maxK = Math.min(nm.length, before.length);
    for(let k = maxK; k >= 2; k--){
      if(nm.includes(before.slice(-k))){
        return before.slice(0, before.length - k) + nm;
      }
    }
    // すぐ前に呼び名がもう書いてある(「運転許可スイッチ SW1」など)ときは、足さない
    if(before.slice(-(nm.length + 6)).includes(nm)){
      return before;
    }
    // 「a接点 運転許可」「コイル 警告灯」のように、部品の種類とはすき間をあける
    if(/(接点|コイル|[A-Za-z0-9])$/.test(before)){
      return before + ' ' + nm;
    }
    return before + nm;
  }

  // 後ろの「 は」の空白や、「(非常停止)」のような重なった補足を外す
  function trimAfter(rest, nm){
    const m = /^\s?[((]([^))]{1,12})[))]/.exec(rest);
    if(m && nm.includes(m[1])){
      return rest.slice(m[0].length);
    }
    return rest.replace(/^ (?=[^\sA-Za-z0-9])/, '');
  }

  const baseNameText = nameText;
  nameText = function(st, text){
    if(!text || (G.set || SET_DEFAULT).names !== 'easy'){
      return baseNameText(st, text);
    }
    const P = prep(st);
    let s = String(text);
    const list = P.io.slice().sort((a, b)=>b.name.length - a.name.length);
    for(const x of list){
      const sym = x.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp('\\s?(?<![A-Za-z0-9])' + sym + '(?![0-9A-Za-z])');
      const nm = showName(st, x.a);
      let m = re.exec(s);
      while(m){
        const head = mergeName(s.slice(0, m.index), nm);
        s = head + trimAfter(s.slice(m.index + m[0].length), nm);
        m = re.exec(s.slice(head.length));
        if(m){
          m.index += head.length;
        }
      }
    }
    return s;
  };

  /* ---------- リセット = ラダー図を最初の状態に戻す ---------- */

  function resetRungs(){
    const bg = openModal('<h2>ラダー図をリセット</h2>'
      + '<p>置いた部品とラングをすべて外して、ラダー図を最初の状態に戻します。</p>'
      + '<p class="note">足した内部リレーの数は、そのまま残ります。</p>'
      + '<div class="acts"><button class="btn" data-m="close">やめる</button>'
      + '<button class="btn primary" data-m="reset">リセットする</button></div>', t=>{
      if(t.dataset.m !== 'reset'){
        return;
      }
      closeModal();
      G.prog = initialProg(G.stage);
      edited();
      resetRun();
      startRun();
      SFX.play('remove');
      toast('ラダー図を最初の状態に戻しました');
    });
    return bg;
  }

  const baseStageClick = onStageClick;
  onStageClick = function(e){
    const t = e.target.closest && e.target.closest('[data-act]');
    if(t && t.dataset.act === 'reset'){
      resetRungs();
      return;
    }
    return baseStageClick(e);
  };

  /* ---------- ラングの高さを詰める ---------- */

  GEO.TOP = 30;
  GEO.RH = 58;

  /* ---------- 内部リレーの「M」の説明 ---------- */

  if(TERMS['内部リレー']){
    TERMS['内部リレー'].plain = 'PLCの中だけにある、目に見えないコイルと接点。'
      + '「M」はメモリ(Memory=記憶)の頭文字で、三菱のPLCでは M、OpenPLC では %MX と書く。';
    TERMS['内部リレー'].ex = '昔は本物のリレー部品を制御盤に並べていた。PLCではその役目を中で受け持つので「内部」リレー。'
      + '「今どの工程か」などを覚えておくのに使う。';
  }

  // はじめて「＋内部リレー」を押したときに、説明のカードを出す
  const baseSelectTool = selectTool;
  selectTool = function(k){
    baseSelectTool(k);
    if(k !== 'ADDM|'){
      return;
    }
    const seen = G.save.seenTerms || [];
    if(seen.includes('内部リレー')){
      return;
    }
    G.save.seenTerms = seen.concat(['内部リレー']);
    persist();
    showTerm('内部リレー');
  };

  /* ---------- 見た目 ---------- */

  const css = document.createElement('style');
  css.textContent = [
    // 長押しで文字が選択されたり、コピーのメニューが出たりしないようにする
    'body{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;-webkit-tap-highlight-color:transparent}',
    'input,textarea,select,[contenteditable]{-webkit-user-select:text;user-select:text}',
    // 「通電中」はラングの見出しの横に出す。高さは固定なので、出ても消えても動かない
    '.rung-head{flex-wrap:nowrap;min-height:22px}',
    '.rung-head .rstat{flex:1 1 0;min-width:0;height:20px;margin:0 4px;padding:0 8px;font-size:11.5px;line-height:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box}',
    '.rung-head .rstat:empty{display:block;background:transparent}',
    '.rung-head button{flex:none}',
  ].join('\n');
  document.head.appendChild(css);
})();
