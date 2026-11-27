/* =========================================================================
   三菱PLCの書き方に合わせる(技能検定・実習機の X/Y 表記と同じ)
     ・常時ON の接点(M8000 / SM400):命令を左の母線に直接つなげないため
     ・接点のない行は判定で知らせる(三菱では書けない)
     ・カウンタのリセットは、別の行の「C0 RST」で書ける(CTU のリセット入力も使える)
     ・タイマ・カウンタの箱を「OUT T0 K30」「OUT C0 K3」の形で見せる(三菱式の表示のとき)
     ・TOF(三菱にはない)・非常停止・数字スイッチの BCD に注記を足す
   ========================================================================= */
(function(){
  'use strict';

  const ALWAYS = 'M8000';

  function melStyle(){
    return (G.set || SET_DEFAULT).astyle === 'mel';
  }

  /* ---------- 常時ON ---------- */

  const baseGet = PLC.prototype.get;
  PLC.prototype.get = function(a){
    if(a === ALWAYS){
      return true;
    }
    return baseGet.call(this, a);
  };

  // 常時ON は条件ではないので、★2 の接点数には数えない
  const baseCount = countContacts;
  countContacts = function(prog){
    let n = baseCount(prog);
    for(const rg of prog){
      for(const row of rg.cells){
        for(const c of row){
          if(c && c.a === ALWAYS && (c.t === 'NO' || c.t === 'NC')){
            n--;
          }
        }
      }
    }
    return n;
  };

  /* ---------- カウンタを RST で 0 に戻す ---------- */

  const baseDoOut = PLC.prototype.doOut;
  PLC.prototype.doOut = function(o, p, dt){
    if(o && o.t === 'COIL' && o.m === 'R' && /^C\d+$/.test(o.a || '')){
      if(p){
        const c = this.ct[o.a] || (this.ct[o.a] = {cv:0, q:false, in:false});
        c.cv = 0;
        c.q = false;
      }
      return;
    }
    baseDoOut.call(this, o, p, dt);
  };

  /* ---------- 手札:常時ON は a接点だけ、カウンタの RST を足す ---------- */

  const baseHandTools = handTools;
  handTools = function(st){
    const secs = baseHandTools(st);
    const con = secs.find(s=>s.cls === 's-contact');
    if(con){
      for(const g of con.groups){
        g.items = g.items.filter(it=>!(it.a === ALWAYS && it.t === 'NC'));
      }
    }
    const P = prep(st);
    if(P.palette.includes('CTU') || P.palette.includes('CTD')){
      let coil = secs.find(s=>s.cls === 's-coil');
      if(coil){
        for(const n of (P.counters.length ? P.counters : ['C0'])){
          coil.groups[0].items.push({k:'COIL|' + n + '|R', t:'R', a:n, name:n + ' RST'});
        }
      }
    }
    return secs;
  };

  /* ---------- 箱の表示を三菱式に ---------- */

  const baseOutSVG = outSVG;
  outSVG = function(o, x0, xR, y, st, ri){
    let s = baseOutSVG(o, x0, xR, y, st, ri);
    if(!o){
      return s;
    }
    // カウンタの RST コイルは「C0」と書く(C0.Q ではない)
    if(o.t === 'COIL' && /^C\d+$/.test(o.a || '')){
      s = s.split(`>${o.a}.Q<`).join(`>${o.a}<`);
    }
    if(!melStyle()){
      return s;
    }
    if(o.t === 'TON'){
      const k = Math.round(o.pt / 100);
      s = s.replace(`>TON ${esc(o.n)}<`, `>OUT ${esc(o.n)} K${k}<`);
      s = s.replace(/>PT [\d.]+s</, `>${(o.pt / 1000).toFixed(1)}秒でON<`);
    }
    if(o.t === 'CTU'){
      s = s.replace(`>CTU ${esc(o.n)}<`, `>OUT ${esc(o.n)} K${o.pv}<`);
      if(!o.r){
        s = s.replace(/>R: なし</, '>RST は別の行<');
      }
    }
    return s;
  };

  /* ---------- 接点のない行は、判定の前に知らせる ---------- */

  function bareRung(prog){
    return prog.findIndex(rg=>{
      if(!rg.out){
        return false;
      }
      return !rg.cells.some(row=>row.some(c=>c && c.t !== 'W'));
    });
  }

  const baseJudge = judge;
  judge = function(){
    // OpenPLC式では、接点のない行も書ける
    if(G.judging || !G.stage || G.stage.tutorial || !melStyle()){
      return baseJudge();
    }
    const i = bareRung(G.prog);
    if(i < 0){
      return baseJudge();
    }
    SFX.play('fail');
    openModal(talkHTML(`ラング ${i + 1} に接点がないよ。三菱のPLCでは、命令を左の母線に直接つなげないんだ。`
      + '「いつも動かしたい」ときは、<b>常時ON(M8000)</b>の接点を置こう。', 'think')
      + '<div class="acts"><button class="btn primary" data-m="close">直してみる</button></div>', ()=>{});
  };

  /* ---------- 注記 ---------- */

  function addTip(id, text){
    const st = STAGES.find(s=>s.id === id);
    if(st){
      st.tip = (st.tip ? st.tip + ' ' : '') + text;
    }
  }

  // 3-2・3-4 の TOF の版は OpenPLC式のときに出る(三菱式では mode.js の TON の版)
  addTip('3-2', '(OpenPLC式の書き方。三菱のPLCには TOF がないので、三菱式では TON で作る版になる)');
  addTip('3-4', '(OpenPLC式の書き方。三菱のPLCには TOF がないので、三菱式では TON で作る版になる)');
  addTip('5-1', '(実際の機械では、非常停止は PLC を通さず電気の回路でも動力を切る。PLC は「押された」を知るために使う)');

  TERMS['常時ON'] = {
    yomi:'じょうじおん',
    plain:'いつも ON になっている特別な接点。三菱の FX は M8000、Q・iQ は SM400。',
    ex:'三菱のPLCでは命令を左の母線に直接つなげないので、いつも動かしたい命令の前に置く。',
  };
  if(TERMS['数字スイッチ']){
    TERMS['数字スイッチ'].ex += '1けた(0〜9)ならそのまま読めるが、2けた以上は BIN 命令で変換する(表示は BCD 命令)。';
  }
  TERM_RE = buildTermRe();

  Object.assign(STAGE_TERMS, {
    '7-3':['常時ON'],
  });
})();
