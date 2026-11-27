/* =========================================================================
   ラダーの書き方のモード(三菱式 / OpenPLC式)
     ・三菱式(はじめの設定):三菱PLCで書ける命令だけ。TOF は使えず、TON と自己保持で作る。
       接点のない行も書けない(mitsu.js で判定の前に知らせる)
     ・OpenPLC式:自社の実習機 PLC TRAINER-S01(OpenPLC 対応)の書き方。TOF も、接点のない行も使える
   モードは設定の「ラダーの書き方」で選ぶ(G.set.astyle:'mel' / 'iec')。
   TOF を使うステージ(3-2・3-4)は、三菱式のときだけ TON で作る版に入れかえる。
   ========================================================================= */
(function(){
  'use strict';

  function melMode(){
    return (G.set || SET_DEFAULT).astyle !== 'iec';
  }
  window.LADDER_MEL = melMode;

  /* ---------- 三菱式の版(TOF を使わない) ---------- */

  const MEL_VARIANT = {
    '3-2':{
      task:'照明スイッチ SW1 がONの間は照明 PL1 と換気扇 FAN がON。SW1 をOFFにすると照明はすぐ消え、換気扇は5秒たってから止まる。',
      tip:'三菱のPLCには TOF(切れてから数えるタイマ)がない。換気扇を自己保持で回し続け、「スイッチが切れていて、換気扇が回っている間」に TON で5秒を数えて止める。',
      palette:['NO', 'NC', 'COIL', 'TON'], maxRows:2,
      start:[
        {r:['a:I0.0 - - -'], o:'Q0.0'},
        {r:['a:I0.0 + ? - -', 'a:Q0.1'], o:'Q0.1'},
        {r:['? a:Q0.1 - -'], o:'TON T0 5000'},
      ],
      answer:[
        {r:['a:I0.0 - - -'], o:'Q0.0'},
        {r:['a:I0.0 + b:T0 - -', 'a:Q0.1'], o:'Q0.1'},
        {r:['b:I0.0 a:Q0.1 - -'], o:'TON T0 5000'},
      ],
      wrong:[
        [ {r:['a:I0.0 - - -'], o:'Q0.0'}, {r:['a:I0.0 + a:T0 - -', 'a:Q0.1'], o:'Q0.1'}, {r:['b:I0.0 a:Q0.1 - -'], o:'TON T0 5000'} ],
        [ {r:['a:I0.0 - - -'], o:'Q0.0'}, {r:['a:I0.0 + b:T0 - -', 'a:Q0.1'], o:'Q0.1'}, {r:['a:I0.0 a:Q0.1 - -'], o:'TON T0 5000'} ],
      ],
      hints:[
        '換気扇の行は自己保持(下の段の換気扇のa接点)。スイッチを切っても回り続ける。',
        '止めるのはタイマ T0。換気扇の行の「?」は T0 のb接点。',
        'タイマの行の「?」はスイッチのb接点(スイッチが切れているときだけ数える)。',
      ],
    },
    '3-4':{
      task:'ボタン PB1 を押して離すと、階段灯 PL1 が点灯し、離してから5秒後に自動で消える。できるだけ少ない接点数で作ろう(★目標 4個)。',
      tip:'三菱のPLCには TOF がないので、自己保持と TON で作る。目標:接点4個以下(★)。',
      palette:['NO', 'NC', 'COIL', 'TON'],
      answer:[
        {r:['a:I0.0 + b:T0 - -', 'a:Q0.0'], o:'Q0.0'},
        {r:['b:I0.0 a:Q0.0 - -'], o:'TON T0 5000'},
      ],
      target:4,
      wrong:[
        [ {r:['a:I0.0 - - -'], o:'Q0.0'} ],
        [ {r:['a:I0.0 + - - -', 'a:Q0.0'], o:'Q0.0'} ],
      ],
      hints:[
        '階段灯を自己保持で点けっぱなしにし、タイマで切る。',
        'タイマは「ボタンを離していて、階段灯がついている間」に数える(ボタンのb接点・階段灯のa接点)。',
        'ラング1:ボタン(下の段に階段灯のa接点)→ T0 のb接点 → 階段灯。ラング2:ボタンのb接点・階段灯のa接点 → TON T0 5.0秒。',
      ],
    },
  };

  // 三菱式の版のステージ(id はそのまま。記録・クリアは元のステージと共通)
  const MEL_STAGE = {};
  for(const id in MEL_VARIANT){
    const base = STAGES.find(s=>s.id === id);
    if(base){
      MEL_STAGE[id] = Object.assign({}, base, MEL_VARIANT[id], {melOf:id});
    }
  }

  // 前処理(prep)は id ごとに覚えているので、三菱式の版は別の名前で覚える
  const MEL_PREP = {};
  const basePrep = prep;
  prep = function(st){
    if(!st || !st.melOf){
      return basePrep(st);
    }
    if(!MEL_PREP[st.melOf]){
      MEL_PREP[st.melOf] = basePrep(Object.assign({}, st, {id:st.melOf + '#mel'}));
    }
    return MEL_PREP[st.melOf];
  };

  // ステージを開くとき、三菱式なら版を入れかえる
  function pick(st){
    if(!st){
      return st;
    }
    const id = st.melOf || st.id;
    if(melMode() && MEL_STAGE[id]){
      return MEL_STAGE[id];
    }
    return STAGES.find(s=>s.id === id) || st;
  }

  // 作りかけは書き方ごとに形がちがうので、モードが変わっていたら使わない
  function draftMode(){
    if(!G.save.draftMode){
      G.save.draftMode = {};
    }
    return G.save.draftMode;
  }

  const baseSaveDraft = saveDraft;
  saveDraft = function(){
    baseSaveDraft();
    if(G.stage && MEL_STAGE[G.stage.melOf || G.stage.id]){
      draftMode()[G.stage.melOf || G.stage.id] = melMode() ? 'mel' : 'iec';
      persist();
    }
  };

  const baseOpenStage = openStage;
  openStage = function(st){
    const s = pick(st);
    const id = s && (s.melOf || s.id);
    if(id && MEL_STAGE[id] && G.save.drafts && G.save.drafts[id]){
      const now = melMode() ? 'mel' : 'iec';
      if((draftMode()[id] || 'iec') !== now){
        delete G.save.drafts[id];
      }
    }
    return baseOpenStage(s);
  };

  // 「次のステージへ」は元のステージの並びで探す
  const baseNextStage = nextStage;
  nextStage = function(st){
    const orig = st && st.melOf ? STAGES.find(s=>s.id === st.melOf) : st;
    return baseNextStage(orig);
  };

  /* ---------- 三菱式では TOF のカードを出さない ---------- */

  const baseHandTools = handTools;
  handTools = function(st){
    const secs = baseHandTools(st);
    if(!melMode()){
      return secs;
    }
    for(const s of secs){
      for(const g of s.groups){
        g.items = g.items.filter(it=>!(it.t === 'FB' && it.a === 'TOF'));
      }
    }
    return secs;
  };

  /* ---------- 設定:ラダーの書き方 ---------- */

  function settingsInner(){
    const mel = melMode();
    const b = (v, sel, label, sub)=>`<button class="opt ${sel ? 'sel' : ''}" data-lstyle="${v}">${label}<small>${sub}</small></button>`;
    return '<div class="note">ラダーの書き方</div><div class="opts">'
      + b('mel', mel, '三菱式', '技能検定向け。TOF なし')
      + b('iec', !mel, 'OpenPLC式', '実習機 TRAINER-S01。TOF も使える')
      + '</div>';
  }

  window.ruleSettingsHTML = function(){
    return `<div id="lstyle-set">${settingsInner()}</div>`;
  };

  document.addEventListener('click', e=>{
    const t = e.target.closest && e.target.closest('[data-lstyle]');
    if(!t){
      return;
    }
    e.stopPropagation();
    G.set.astyle = t.dataset.lstyle;
    saveSettings();
    applySettings();
    const box = document.getElementById('lstyle-set');
    if(box){
      box.innerHTML = settingsInner();
    }
    // 開いているステージに別の版があるときは、開き直す
    if(G.stage && MEL_STAGE[G.stage.melOf || G.stage.id]){
      closeModal();
      openStage(G.stage);
      toast('書き方を変えたので、ステージを開き直しました');
      return;
    }
    if(G.stage){
      renderEditor();
      renderMachine();
      renderBottom();
    }
  }, true);

  // 自己点検用:三菱式の版も確かめられるように
  window.MEL_STAGE = MEL_STAGE;
})();
