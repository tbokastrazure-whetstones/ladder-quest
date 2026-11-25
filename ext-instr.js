/* =========================================================================
   追加の命令(エリア6 から使う)
     ・立ち上がり接点(押した瞬間だけ通る):a接点に e:1 の印を付けたもの
     ・SET / RST コイル(覚える・忘れる):コイルに m:'S' / m:'R' の印を付けたもの
   本体(index.html)の関数を包む形で足す。本体の中身は書き換えない。
   ========================================================================= */
(function(){
  'use strict';

  /* ---------- PLC:立ち上がりの判定と、SET/RST ---------- */

  // 前のスキャンが終わった時点の ON/OFF を覚えておき、「今ON・前はOFF」を立ち上がりとする
  const baseScan = PLC.prototype.scan;
  PLC.prototype.scan = function(prog, dt){
    if(!this.before){
      this.before = {};
    }
    baseScan.call(this, prog, dt);
    this.before = snapshot(this);
  };

  function snapshot(plc){
    const s = {};
    for(const a in plc.mem){
      s[a] = !!plc.mem[a];
    }
    for(const n in plc.tm){
      s[n] = !!plc.tm[n].q;
    }
    for(const n in plc.ct){
      s[n] = !!plc.ct[n].q;
    }
    return s;
  }

  PLC.prototype.rising = function(a){
    const now = this.get(a);
    const before = !!(this.before && this.before[a]);
    return now && !before;
  };

  const baseConducts = PLC.prototype.conducts;
  PLC.prototype.conducts = function(cell){
    if(cell && cell.t === 'NO' && cell.e && cell.a){
      return this.rising(cell.a);
    }
    return baseConducts.call(this, cell);
  };

  const baseDoOut = PLC.prototype.doOut;
  PLC.prototype.doOut = function(o, p, dt){
    if(o && o.t === 'COIL' && o.a && o.m === 'S'){
      // SET:電気が届いたらON にして、そのまま覚えておく
      if(p){
        this.mem[o.a] = true;
      }
      return;
    }
    if(o && o.t === 'COIL' && o.a && o.m === 'R'){
      // RST:電気が届いたらOFF にする
      if(p){
        this.mem[o.a] = false;
      }
      return;
    }
    baseDoOut.call(this, o, p, dt);
  };

  /* ---------- ラダーの記述(DSL):p:I0.5 / SET Q0.2 / RST Q0.2 ---------- */

  const baseParseOut = parseOut;
  parseOut = function(s){
    const p = String(s == null ? '' : s).trim().split(/\s+/);
    if(p[0] === 'SET' || p[0] === 'RST'){
      return {t:'COIL', a:A(p[1]), m:(p[0] === 'SET' ? 'S' : 'R')};
    }
    return baseParseOut(s);
  };

  const baseParseRung = parseRung;
  parseRung = function(def, cols){
    // p:XXX を a:XXX として読み、あとで立ち上がりの印を付ける
    const rows = Array.isArray(def.r) ? def.r : [def.r];
    const marks = [];
    const plain = rows.map((str, r)=>{
      let c = 0;
      return str.trim().split(/\s+/).filter(Boolean).map(tok=>{
        if(tok === '+'){
          return tok;
        }
        if(/^p:/.test(tok)){
          marks.push([r, c]);
          tok = 'a:' + tok.slice(2);
        }
        c++;
        return tok;
      }).join(' ');
    });
    const rung = baseParseRung(Object.assign({}, def, {r:plain}), cols);
    for(const [r, c] of marks){
      rung.cells[r][c].e = 1;
    }
    return rung;
  };

  /* ---------- ラダー図の絵:↑ と S / R の印 ---------- */

  const baseContactSVG = contactSVG;
  contactSVG = function(cell, x, y, st){
    let s = baseContactSVG(cell, x, y, st);
    if(cell && cell.e){
      const cx = x + GEO.CW / 2;
      s += `<path class="sym edge" d="M${cx} ${y + 9} V${y - 9} M${cx - 4} ${y - 4} L${cx} ${y - 9} L${cx + 4} ${y - 4}"/>`;
    }
    return s;
  };

  const baseOutSVG = outSVG;
  outSVG = function(o, x0, xR, y, st, ri){
    let s = baseOutSVG(o, x0, xR, y, st, ri);
    if(o && o.t === 'COIL' && o.m){
      const cx = (x0 + xR) / 2;
      s += `<text class="coil-m" x="${cx}" y="${y + 5}" text-anchor="middle">${o.m}</text>`;
    }
    return s;
  };

  /* ---------- 手札:↑a接点、SETコイル、RSTコイル ---------- */

  const baseHandTools = handTools;
  handTools = function(st){
    const secs = baseHandTools(st);
    const pal = prep(st).palette;
    if(pal.includes('P')){
      addEdgeCards(secs);
    }
    if(pal.includes('SET') || pal.includes('RST')){
      addSetResetCards(secs, pal);
    }
    return secs;
  };

  function addEdgeCards(secs){
    const sec = secs.find(s=>s.cls === 's-contact');
    if(!sec){
      return;
    }
    for(const g of sec.groups){
      const no = g.items.find(it=>it.t === 'NO');
      if(no){
        g.items.push({k:'NO|' + no.a + '|P', t:'P', a:no.a, name:'↑a接点'});
      }
    }
  }

  function addSetResetCards(secs, pal){
    const sec = secs.find(s=>s.cls === 's-coil');
    if(!sec){
      return;
    }
    const items = sec.groups[0].items;
    const coils = items.filter(it=>it.t === 'COIL');
    for(const c of coils){
      if(pal.includes('SET')){
        items.push({k:'COIL|' + c.a + '|S', t:'S', a:c.a, name:c.name + ' S'});
      }
      if(pal.includes('RST')){
        items.push({k:'COIL|' + c.a + '|R', t:'R', a:c.a, name:c.name + ' R'});
      }
    }
  }

  const baseToolIcon = toolIcon;
  toolIcon = function(t){
    const L = 'stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"';
    if(t === 'P'){
      return `<svg viewBox="0 0 40 24"><path d="M2 12H14M14 3V21M26 3V21M26 12H38M20 18V6M16 10 20 6 24 10" ${L}/></svg>`;
    }
    if(t === 'S' || t === 'R'){
      return `<svg viewBox="0 0 40 24"><path d="M2 12H11M29 12H38M15 3Q9 12 15 21M25 3Q31 12 25 21" ${L}/>`
        + `<text x="20" y="16.5" text-anchor="middle" font-size="12" font-weight="900" fill="currentColor">${t}</text></svg>`;
    }
    return baseToolIcon(t);
  };

  // 道具のキーは「種類|番号|印」。印(P・S・R)も読めるようにする
  toolObj = function(){
    if(!G.tool){
      return null;
    }
    const [t, a, x] = G.tool.split('|');
    return {t, a:a || null, x:x || null};
  };

  // 置いたあとで、立ち上がり・SET/RST の印を付ける
  const basePlaceTool = placeTool;
  placeTool = function(ri, r, c, where){
    const o = toolObj();
    const done = basePlaceTool(ri, r, c, where);
    const rg = G.prog[ri];
    if(!o || !o.x || !rg){
      return done;
    }
    if(where === 'cell' && o.x === 'P'){
      const cell = rg.cells[r][c];
      if(cell && cell.t === 'NO'){
        cell.e = 1;
        saveDraft();
        renderEditor();
      }
    }
    if(where === 'out' && (o.x === 'S' || o.x === 'R') && rg.out && rg.out.t === 'COIL'){
      rg.out.m = o.x;
      saveDraft();
      renderEditor();
    }
    return done;
  };

  /* ---------- 実習機の7セグ(DPL)に、カウンタの数を出す ---------- */

  const baseUpdateMachineVis = updateMachineVis;
  updateMachineVis = function(){
    baseUpdateMachineVis();
    const d1 = document.getElementById('tr-dpl1');
    const d2 = document.getElementById('tr-dpl2');
    if(!d1 || !d2 || !G.plc){
      return;
    }
    const counters = Object.values(G.plc.ct || {});
    if(!counters.length){
      return;
    }
    const cv = Math.max(0, Math.min(99, counters[0].cv || 0));
    d2.textContent = Math.floor(cv / 10);
    d1.textContent = cv % 10;
    d2.classList.add('on');
    d1.classList.add('on');
  };

  /* ---------- ことば ---------- */

  Object.assign(TERMS, {
    'SET・RST':{yomi:'せっと・りせっと', plain:'SETコイルは、電気が一瞬でも届くとONにして覚えておく。RSTコイルは、それをOFFに戻す。自己保持を1行で書ける。', ex:'起動ボタンでSET、停止ボタンでRST。'},
    '立ち上がり':{yomi:'たちあがり', plain:'OFFからONに変わった瞬間のこと。↑a接点は、その瞬間(1回のスキャン)だけ電気を通す。押しっぱなしでも1回だけ。', ex:'押すたびに1回だけ数える、1回だけ切り替える。'},
    'オルタネイト':{yomi:'おるたねいと', plain:'押すたびに ON と OFF が入れ替わる動き。立ち上がりと自己保持を組み合わせて作る。', ex:'押すたびに点く・消えるランプ。'},
    'カウンタ':{yomi:'かうんた', plain:'信号が入った回数を数える部品。決めた数(設定値)になるとONになる。リセットで0に戻す。', ex:'3回押したら開く扉。'},
  });
  TERM_RE = buildTermRe();

  /* ---------- 見た目(↑ と S / R の印) ---------- */

  const css = document.createElement('style');
  css.textContent = [
    '.rung-svg .sym.edge{stroke-width:2.5}',
    '.rung-svg .pl.cl .sym.edge{stroke:var(--on)}',
    '.rung-svg text.coil-m{font-size:12px;font-weight:900;fill:#24305e}',
    '.rung-svg .out.pl text.coil-m{fill:var(--on)}',
    '.hcard.t-P svg{color:#1f9a5a}',
    '.hcard.t-S svg{color:#2c63c2}',
    '.hcard.t-R svg{color:#d23a4c}',
  ].join('\n');
  document.head.appendChild(css);
})();
