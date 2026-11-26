/* =========================================================================
   文の折り返しを、ことばの切れ目でする
     例:「木材 / を送れる」→「木材を / 送れる」、「丸のこモー / タ」→ 改行しない
     ・Chrome など対応している画面では、CSS の word-break:auto-phrase に任せる
     ・対応していない画面(iPhone の Safari など)では、Intl.Segmenter で
       ことばを区切り、ひらがなの助詞などは前のことばにくっつけて、
       そのかたまりの途中では折り返さないようにする
   ========================================================================= */
(function(){
  'use strict';

  // 折り返しを整える場所
  const TARGETS = '.mission, .bubble, .hint, .modal p, .modal .note, .tcard, .coach-in, .prolog, .goal, .intro2';

  // 1つのかたまりが長すぎると画面からはみ出すので、これより長いものは途中で折り返してよい
  const MAX_CHUNK = 12;

  const native = !!(window.CSS && CSS.supports && CSS.supports('word-break', 'auto-phrase'));
  const seg = (!native && window.Intl && Intl.Segmenter) ? new Intl.Segmenter('ja', {granularity:'word'}) : null;

  // ひらがな・句読点・閉じかっこだけのかたまり(助詞・送りがななど)
  const TAIL = /^[ぁ-ゟー、。,.!?!?))」』】・…ー]+$/;

  function chunksOf(text){
    const out = [];
    for(const s of seg.segment(text)){
      const w = s.segment;
      if(out.length && TAIL.test(w) && !/\s$/.test(out[out.length - 1])){
        out[out.length - 1] += w;
      } else {
        out.push(w);
      }
    }
    return out;
  }

  const made = new WeakSet();

  function wrapTextNode(node){
    if(made.has(node) || !node.parentNode){
      return;
    }
    const text = node.nodeValue;
    if(!text || !/[぀-ヿ一-鿿]/.test(text)){
      return;
    }
    const frag = document.createDocumentFragment();
    for(const c of chunksOf(text)){
      if(c.length < 2 || c.length > MAX_CHUNK || /^\s+$/.test(c)){
        const t = document.createTextNode(c);
        // 自分で作った文字は、もう一度区切らない(くり返しにならないように)
        made.add(t);
        frag.appendChild(t);
        continue;
      }
      const span = document.createElement('span');
      span.className = 'nb';
      span.textContent = c;
      frag.appendChild(span);
    }
    node.parentNode.replaceChild(frag, node);
  }

  // 一度区切った文字は .nb の中か made に入るので、何度呼んでも同じ結果になる
  function wrapIn(root){
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(n){
        const p = n.parentNode;
        if(!p || p.closest('svg, button, .nb, script, style, input, textarea')){
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const list = [];
    while(walker.nextNode()){
      list.push(walker.currentNode);
    }
    list.forEach(wrapTextNode);
  }

  function scan(node){
    // 文字だけが足されたとき(textContent の書き換えなど)
    if(node.nodeType === 3){
      const p = node.parentNode;
      if(p && p.closest && p.closest(TARGETS) && !p.closest('svg, button, .nb')){
        wrapTextNode(node);
      }
      return;
    }
    if(node.nodeType !== 1){
      return;
    }
    if(node.closest('svg')){
      return;
    }
    // 整える場所の中に足された部品なら、その部品の中を整える
    if(node.closest(TARGETS)){
      wrapIn(node);
      return;
    }
    node.querySelectorAll(TARGETS).forEach(wrapIn);
  }

  if(seg){
    const obs = new MutationObserver(list=>{
      for(const m of list){
        m.addedNodes.forEach(scan);
      }
    });
    obs.observe(document.body, {childList:true, subtree:true});
  }

  const css = document.createElement('style');
  css.textContent = [
    // 対応している画面:ことばの切れ目で折り返す
    TARGETS + '{word-break:auto-phrase;line-break:strict}',
    // 部品の名前・用語は途中で折り返さない
    '.nm, .term, .nb{white-space:nowrap}',
    '.nb{display:inline}',
    // 手札の名前は1行で。入りきらない名前は、カードの幅を広げる
    '.hcard{width:auto;min-width:54px;padding-left:4px;padding-right:4px}',
    '.hcard > span{white-space:nowrap;line-height:1.15}',
    '@media (max-width:860px) and (orientation:portrait){ body.on-stage #editor .hand .hcard{width:auto;min-width:44px;padding:2px 4px} }',
  ].join('\n');
  document.head.appendChild(css);
})();
