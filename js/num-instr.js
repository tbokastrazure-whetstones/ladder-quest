/* =========================================================================
   数値の命令(エリア7 数値の港 から使う)
     ・比較接点 CMP:「DSW>=5」のように、数をくらべて正しいときだけ通す
     ・転送 MOV:電気が届いたら、数をコピーする(MOV DSW DPL = 数字スイッチの数を表示へ)
     ・数字スイッチ DSW(0〜9)と 7セグ表示 DPL(0〜99)
   使える数:DSW / DPL / D0〜(データレジスタ)/ C0〜(カウンタの今の数)/ 0〜99 の数字
   部品はステージごとに決まったカード(st.xcards)だけを手札に出す。数の打ち込みはしない。
   ========================================================================= */
(function(){
  'use strict';

  const NUM_KEY = /^(DSW|DPL|D\d+)$/;
  const CMP_RE = /^([A-Z0-9]+)(>=|<=|<>|=|<|>)([A-Z0-9]+)$/;
  const OP_SHOW = {'>=':'≥', '<=':'≤', '<>':'≠', '=':'=', '<':'<', '>':'>'};

  /* ---------- PLC:数の置き場と計算 ---------- */

  const baseReset = PLC.prototype.reset;
  PLC.prototype.reset = function(){
    baseReset.call(this);
    this.num = {};
  };

  // 数を読む:数字ならそのまま、DSW・DPL・D0 は置き場から、C0 はカウンタの今の数
  PLC.prototype.val = function(x){
    if(/^\d+$/.test(x)){
      return Number(x);
    }
    if(/^C\d+$/.test(x)){
      return (this.ct[x] && this.ct[x].cv) || 0;
    }
    return Number(this.num[x]) || 0;
  };

  PLC.prototype.compare = function(expr){
    const m = CMP_RE.exec(expr || '');
    if(!m){
      return false;
    }
    const l = this.val(m[1]);
    const r = this.val(m[3]);
    if(m[2] === '>='){
      return l >= r;
    }
    if(m[2] === '<='){
      return l <= r;
    }
    if(m[2] === '<>'){
      return l !== r;
    }
    if(m[2] === '='){
      return l === r;
    }
    if(m[2] === '<'){
      return l < r;
    }
    return l > r;
  };

  const baseGet = PLC.prototype.get;
  PLC.prototype.get = function(a){
    if(NUM_KEY.test(a || '')){
      return Number(this.num[a]) || 0;
    }
    return baseGet.call(this, a);
  };

  const baseConducts = PLC.prototype.conducts;
  PLC.prototype.conducts = function(cell){
    if(cell && cell.t === 'CMP'){
      return this.compare(cell.a);
    }
    return baseConducts.call(this, cell);
  };

  const baseDoOut = PLC.prototype.doOut;
  PLC.prototype.doOut = function(o, p, dt){
    if(o && o.t === 'MOV'){
      if(p){
        const [src, dst] = o.a.split(',');
        this.num[dst] = Math.max(0, Math.min(99, this.val(src)));
      }
      return;
    }
    baseDoOut.call(this, o, p, dt);
  };

  // 入力の数字スイッチ(DSW)は、スキャンの頭で数の置き場に入れる
  const baseScan = PLC.prototype.scan;
  PLC.prototype.scan = function(prog, dt){
    if(!this.num){
      this.num = {};
    }
    if(this.inputs && typeof this.inputs.DSW === 'number'){
      this.num.DSW = this.inputs.DSW;
    }
    baseScan.call(this, prog, dt);
  };

  /* ---------- テストの書き方:'DSW=7' 'DPL=3' は数として読む ---------- */

  const baseParseAssign = parseAssign;
  parseAssign = function(s){
    const o = baseParseAssign(s);
    for(const part of String(s || '').trim().split(/\s+/).filter(Boolean)){
      const [k, v] = part.split('=');
      if(NUM_KEY.test(k)){
        o[k] = Number(v);
      }
    }
    return o;
  };

  /* ---------- ラダーの記述(DSL):c:DSW>=5 / MOV DSW DPL ---------- */

  const baseParseOut = parseOut;
  parseOut = function(s){
    const p = String(s == null ? '' : s).trim().split(/\s+/);
    if(p[0] === 'MOV'){
      return {t:'MOV', a:p[1] + ',' + p[2]};
    }
    return baseParseOut(s);
  };

  const baseParseRung = parseRung;
  parseRung = function(def, cols){
    const rows = Array.isArray(def.r) ? def.r : [def.r];
    const marks = [];
    const plain = rows.map((str, r)=>{
      let c = 0;
      return str.trim().split(/\s+/).filter(Boolean).map(tok=>{
        if(tok === '+'){
          return tok;
        }
        if(/^c:/.test(tok)){
          // いったん a接点として読ませ、あとで比較接点に置きかえる
          marks.push([r, c, tok.slice(2)]);
          tok = 'a:I9.7';
        }
        c++;
        return tok;
      }).join(' ');
    });
    const rung = baseParseRung(Object.assign({}, def, {r:plain}), cols);
    for(const [r, c, expr] of marks){
      rung.cells[r][c] = {t:'CMP', a:expr};
    }
    return rung;
  };

  /* ---------- 見た目:比較接点と MOV の箱 ---------- */

  // 「DSW」→「数字SW」、「C0」→「C0の数」のように、画面の言葉にする
  function word(x){
    if(x === 'DSW'){
      return '数字SW';
    }
    if(x === 'DPL'){
      return '表示';
    }
    if(/^C\d+$/.test(x)){
      return x + 'の数';
    }
    return x;
  }

  function cmpText(expr){
    const m = CMP_RE.exec(expr || '');
    if(!m){
      return expr;
    }
    return word(m[1]) + OP_SHOW[m[2]] + word(m[3]);
  }

  function movText(a){
    const [src, dst] = String(a).split(',');
    return word(src) + '→' + word(dst);
  }

  const baseContactSVG = contactSVG;
  contactSVG = function(cell, x, y, st){
    if(!cell || cell.t !== 'CMP'){
      return baseContactSVG(cell, x, y, st);
    }
    const w = GEO.CW - 6;
    const bx = x + 3;
    let s = `<rect class="cfill cmpbox" x="${bx}" y="${y - 13}" width="${w}" height="26" rx="4"/>`;
    s += `<text class="cmpt" x="${x + GEO.CW / 2}" y="${y + 5}" text-anchor="middle">${esc(cmpText(cell.a))}</text>`;
    s += `<text class="lab" x="${x + GEO.CW / 2}" y="${y - 18}" text-anchor="middle">比較</text>`;
    return s;
  };

  const baseOutSVG = outSVG;
  outSVG = function(o, x0, xR, y, st, ri){
    if(!o || o.t !== 'MOV'){
      return baseOutSVG(o, x0, xR, y, st, ri);
    }
    const cx = (x0 + xR) / 2;
    const bw = 112;
    const bx = cx - bw / 2;
    let s = `<line x1="${x0}" y1="${y}" x2="${bx}" y2="${y}"/>`;
    s += `<rect class="ofill" x="${bx}" y="${y - 16}" width="${bw}" height="32" rx="4"/>`;
    s += `<rect class="box" x="${bx}" y="${y - 16}" width="${bw}" height="32" rx="4"/>`;
    s += `<line x1="${bx + bw}" y1="${y}" x2="${xR}" y2="${y}"/>`;
    s += `<text class="big" x="${cx}" y="${y - 21}" text-anchor="middle">MOV(転送)</text>`;
    s += `<text class="movt" x="${cx}" y="${y + 5}" text-anchor="middle">${esc(movText(o.a))}</text>`;
    return s;
  };

  /* ---------- 手札:ステージで決めた比較・転送のカード ---------- */

  const baseHandTools = handTools;
  handTools = function(st){
    const secs = baseHandTools(st);
    const xc = st.xcards;
    if(!xc){
      return secs;
    }
    if(xc.cmp && xc.cmp.length){
      const items = xc.cmp.map(e=>({k:'CMP|' + e, t:'CMP', a:e, name:cmpText(e)}));
      let sec = secs.find(s=>s.cls === 's-contact');
      if(!sec){
        sec = {title:'接点', hint:'条件', cls:'s-contact', groups:[]};
        secs.unshift(sec);
      }
      sec.groups.push({label:'比較(数をくらべる)', items});
    }
    if(xc.mov && xc.mov.length){
      const items = xc.mov.map(e=>{
        const a = e.split(' ').join(',');
        return {k:'MOV|' + a, t:'MOV', a, name:movText(a)};
      });
      let sec = secs.find(s=>s.cls === 's-coil');
      if(!sec){
        sec = {title:'コイル', hint:'右端の「出力」に置く', cls:'s-coil', groups:[{label:'', items:[]}]};
        secs.splice(1, 0, sec);
      }
      sec.groups[0].items.push(...items);
    }
    return secs;
  };

  const baseToolIcon = toolIcon;
  toolIcon = function(t){
    const L = 'stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"';
    if(t === 'CMP'){
      return `<svg viewBox="0 0 40 24"><rect x="5" y="4" width="30" height="16" rx="3" ${L}/>`
        + '<text x="20" y="16.5" text-anchor="middle" font-size="11" font-weight="900" fill="currentColor">≥</text></svg>';
    }
    if(t === 'MOV'){
      return `<svg viewBox="0 0 40 24"><rect x="5" y="4" width="30" height="16" rx="3" ${L}/><path d="M12 12H27M23 8 27 12 23 16" ${L}/></svg>`;
    }
    return baseToolIcon(t);
  };

  const baseToolFor = toolFor;
  toolFor = function(where){
    const o = toolObj();
    if(o && o.t === 'CMP'){
      return where === 'cell';
    }
    if(o && o.t === 'MOV'){
      return where === 'out';
    }
    return baseToolFor(where);
  };

  const basePlaceTool = placeTool;
  placeTool = function(ri, r, c, where){
    const o = toolObj();
    const rg = G.prog[ri];
    if(!o || !rg || o.t !== 'MOV' || where !== 'out'){
      return basePlaceTool(ri, r, c, where);
    }
    if(outLocked(rg)){
      toast('この出力は固定されています');
      return true;
    }
    rg.out = {t:'MOV', a:o.a};
    G.pop = `o-${ri}`;
    edited();
    return true;
  };

  window.NUM_WORD = word;
  window.CMP_TEXT = cmpText;

  /* ---------- 見た目 ---------- */

  const css = document.createElement('style');
  css.textContent = [
    '.rung-svg .cmpbox{stroke:#24305e;stroke-width:2}',
    '.rung-svg text.cmpt{font-size:12.5px;font-weight:900;fill:#24305e}',
    '.rung-svg .pl.cl .cmpbox{stroke:var(--on)}',
    '.rung-svg text.movt{font-size:13px;font-weight:900;fill:#24305e}',
    '.hcard.t-CMP svg{color:#b86e00}',
    '.hcard.t-MOV svg{color:#6f48d4}',
  ].join('\n');
  document.head.appendChild(css);
})();
