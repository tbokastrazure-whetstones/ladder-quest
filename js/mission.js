/* =========================================================================
   依頼(問題文)を短く読みやすくする
     ・行の間を詰め、文字を少し小さくする
     (「接点」「コイル」の部品一覧は、ほぼ答えになるので出さないことにした)
   ========================================================================= */
(function(){
  'use strict';

  const css = document.createElement('style');
  css.textContent = [
    // 依頼の欄を詰める
    '.mission{padding:6px 10px}',
    '.mission .mgoal{font-size:14.5px;line-height:1.4}',
    '.mission .msteps{gap:2px;margin-top:4px;font-size:13px}',
    '.mission .msteps li{padding:2px 7px;line-height:1.4;border-radius:6px}',
    '.mission .mtip{font-size:11.5px;margin-top:3px;line-height:1.4}',
    '.mission .demo-row{margin-top:4px}',
    '.mission .demo-row span{display:none}',
    '.mission .demo-btn{font-size:12px;padding:4px 12px}',
  ].join('\n');
  document.head.appendChild(css);
})();
