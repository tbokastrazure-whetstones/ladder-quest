/* =========================================================================
   チュートリアルのあとの練習問題(4問)
     練習1 b接点 / 練習2 直列 / 練習3 並列(枝分かれ)/ 練習4 ラングを2本
   チュートリアルを終えると、続けて練習へ進める(とばしてマップへも行ける)。
   マップのステージ一覧には入れない(はじまりの村の前の「練習」)。
   ========================================================================= */
(function(){
  'use strict';

  const pb = (a, color)=>({type:'pb', a, color});
  const lamp = (a, color)=>({type:'lamp', a, color});

  const PRACTICE = [
    {
      id:'0-2', area:1, practice:true, title:'練習1 押すと消えるランプ(b接点)', type:'build',
      story:'チュートリアルの次は、少しずつ部品を増やしていこう。まずは b接点。',
      task:'ふだんはランプ PL1 がついていて、ボタン PB1 を押している間だけ消える。',
      goal:'ふだんはついていて、押すと消えるランプを作ろう',
      steps:[
        ['何もしない', '{PL1|ランプ}がついている'],
        ['{PB1|ボタン}を押している間', '{PL1|ランプ}が消える'],
      ],
      tip:'b接点は「押すと切れる」接点。ボタンの b接点 → ランプのコイル、の順に置こう。',
      io:[
        {a:'I0.0', name:'PB1', desc:'ボタン'},
        {a:'Q0.0', name:'PL1', desc:'ランプ'},
      ],
      palette:['NO', 'NC', 'COIL'], cols:4, maxRows:2, maxRungs:2,
      machine:[pb('I0.0', 'yellow'), lamp('Q0.0', 'yellow')],
      answer:[ {r:['b:I0.0 - - -'], o:'Q0.0'} ],
      wrong:[ [ {r:['a:I0.0 - - -'], o:'Q0.0'} ] ],
      tests:[
        {name:'ふだんはついている', s:[[0, '', ''], [300, '', 'Q0.0=1']]},
        {name:'押している間は消える', s:[[0, 'I0.0=1', ''], [300, '', 'Q0.0=0'], [400, 'I0.0=0', ''], [600, '', 'Q0.0=1']]},
      ],
      hints:['手札の「b接点」(赤い斜め線)を選んで、1行目のいちばん左に置く。', '右端の「出力」に、ランプのコイルを置く。'],
      unlock:[],
    },
    {
      id:'0-3', area:1, practice:true, title:'練習2 2つとも押すとつく(直列)', type:'build',
      story:'次は接点を2つ使う。横に並べると、どうなるかな。',
      task:'ボタン PB1 と PB2 を両方押している間だけ、ランプ PL1 がつく。',
      goal:'2つのボタンを両方押したときだけ、ランプがつくようにしよう',
      steps:[
        ['どちらか片方だけ押す', '{PL1|ランプ}はつかない'],
        ['{PB1|ボタン1}と{PB2|ボタン2}を両方押している間', '{PL1|ランプ}がつく'],
      ],
      tip:'接点を横に2つ並べる(直列)と「どちらも」になる。2つ同時に押すには、ボタンをダブルタップして押しっぱなしにしよう。',
      io:[
        {a:'I0.0', name:'PB1', desc:'ボタン1'},
        {a:'I0.1', name:'PB2', desc:'ボタン2'},
        {a:'Q0.0', name:'PL1', desc:'ランプ'},
      ],
      palette:['NO', 'NC', 'COIL'], cols:4, maxRows:2, maxRungs:2,
      machine:[pb('I0.0', 'green'), pb('I0.1', 'green'), lamp('Q0.0', 'yellow')],
      answer:[ {r:['a:I0.0 a:I0.1 - -'], o:'Q0.0'} ],
      wrong:[ [ {r:['a:I0.0 - - -'], o:'Q0.0'} ], [ {r:['a:I0.0 + - - -', 'a:I0.1'], o:'Q0.0'} ] ],
      tests:[
        {name:'片方だけではつかない', s:[[0, 'I0.0=1', ''], [300, '', 'Q0.0=0'], [400, 'I0.0=0 I0.1=1', ''], [700, '', 'Q0.0=0']]},
        {name:'両方押すとつく', s:[[0, 'I0.0=1 I0.1=1', ''], [300, '', 'Q0.0=1']]},
      ],
      hints:['1行目の左から「ボタン1のa接点」「ボタン2のa接点」と横に並べる。', '右端の出力にランプのコイル。'],
      unlock:[],
    },
    {
      id:'0-4', area:1, practice:true, title:'練習3 どちらかでつく(並列)', type:'build',
      story:'今度は縦に並べてみよう。下の段に置くと、道が枝分かれする。',
      task:'ボタン PB1 か PB2 のどちらかを押している間、ランプ PL1 がつく。',
      goal:'どちらのボタンを押しても、ランプがつくようにしよう',
      steps:[
        ['{PB1|ボタン1}を押している間', '{PL1|ランプ}がつく'],
        ['{PB2|ボタン2}を押している間', '{PL1|ランプ}がつく'],
      ],
      tip:'1つ目の接点の真下(2行目の同じ列)に2つ目の接点を置くと、自動で縦線が引かれて枝分かれ(並列)になる。',
      io:[
        {a:'I0.0', name:'PB1', desc:'ボタン1'},
        {a:'I0.1', name:'PB2', desc:'ボタン2'},
        {a:'Q0.0', name:'PL1', desc:'ランプ'},
      ],
      palette:['NO', 'NC', 'COIL'], cols:4, maxRows:2, maxRungs:2,
      machine:[pb('I0.0', 'blue'), pb('I0.1', 'blue'), lamp('Q0.0', 'white')],
      answer:[ {r:['a:I0.0 + - - -', 'a:I0.1'], o:'Q0.0'} ],
      wrong:[ [ {r:['a:I0.0 a:I0.1 - -'], o:'Q0.0'} ], [ {r:['a:I0.0 - - -'], o:'Q0.0'} ] ],
      tests:[
        {name:'ボタン1でつく', s:[[0, 'I0.0=1', ''], [300, '', 'Q0.0=1'], [400, 'I0.0=0', ''], [600, '', 'Q0.0=0']]},
        {name:'ボタン2でつく', s:[[0, 'I0.1=1', ''], [300, '', 'Q0.0=1']]},
      ],
      hints:['1行目のいちばん左に「ボタン1のa接点」。', 'その真下(2行目のいちばん左)に「ボタン2のa接点」を置くと、自動でつながる。'],
      unlock:[],
    },
    {
      id:'0-5', area:1, practice:true, title:'練習4 2つのランプ(ラングを2本)', type:'build',
      story:'1本のラングでは、1つの出力しか動かせない。2つ動かすには、ラングを2本にしよう。',
      task:'ボタン PB1 でランプ PL1、ボタン PB2 でランプ PL2 がつく(押している間だけ)。',
      goal:'2つのボタンで、それぞれのランプをつけよう',
      steps:[
        ['{PB1|ボタン1}を押している間', '{PL1|ランプ1}がつく'],
        ['{PB2|ボタン2}を押している間', '{PL2|ランプ2}がつく'],
      ],
      tip:'「+ ラング追加」で2本目のラングを作る。1本目はボタン1 → ランプ1、2本目はボタン2 → ランプ2。',
      io:[
        {a:'I0.0', name:'PB1', desc:'ボタン1'},
        {a:'I0.1', name:'PB2', desc:'ボタン2'},
        {a:'Q0.0', name:'PL1', desc:'ランプ1'},
        {a:'Q0.1', name:'PL2', desc:'ランプ2'},
      ],
      palette:['NO', 'NC', 'COIL'], cols:4, maxRows:2, maxRungs:3,
      machine:[pb('I0.0', 'green'), pb('I0.1', 'red'), lamp('Q0.0', 'green'), lamp('Q0.1', 'red')],
      answer:[ {r:['a:I0.0 - - -'], o:'Q0.0'}, {r:['a:I0.1 - - -'], o:'Q0.1'} ],
      wrong:[ [ {r:['a:I0.0 - - -'], o:'Q0.0'} ], [ {r:['a:I0.0 - - -'], o:'Q0.1'}, {r:['a:I0.1 - - -'], o:'Q0.0'} ] ],
      tests:[
        {name:'ボタン1でランプ1だけつく', s:[[0, 'I0.0=1', ''], [300, '', 'Q0.0=1 Q0.1=0']]},
        {name:'ボタン2でランプ2だけつく', s:[[0, 'I0.1=1', ''], [300, '', 'Q0.0=0 Q0.1=1']]},
      ],
      hints:['ラダー図の上の「+ ラング追加」を押すと、2本目のラングができる。', '2本目:ボタン2のa接点 → ランプ2のコイル。'],
      unlock:[],
    },
  ];

  Object.assign(STAGE_TERMS, {
    '0-2':['b接点'],
    '0-3':['直列'],
    '0-4':['並列', '枝分かれ'],
    '0-5':['ラング'],
  });

  /* ---------- チュートリアルの終わり → 練習へ ---------- */

  tutorialClear = function(){
    stopCoach();
    G.save.tut = true;
    G.save.seenTerms = Array.from(new Set((G.save.seenTerms || []).concat(['ラダー図', '接点', 'a接点', 'コイル'])));
    persist();
    setTimeout(()=>SFX.play('stamp'), 200);
    setTimeout(()=>SFX.play('chime'), 900);
    openModal(`<div class="pass"><div class="pass-head"><div class="pass-doc"><small>チュートリアル</small><b>はじめての回路</b><span>操作の基本 OK</span></div>`
      + '<div class="stamp" style="animation-delay:.15s"><span>完了</span></div></div></div>'
      + talkHTML('チュートリアル完了!次は<b>練習問題を4問</b>やってみよう。b接点・直列・並列・ラング2本で、ラダー図の基本がひととおり身につくよ。', 'happy')
      + `<div class="acts"><button class="btn" data-m="map">${ic('map')} とばしてマップへ</button><button class="btn primary" data-m="practice">練習問題へ(4問)</button></div>`, t=>{
      if(t.dataset.m === 'practice'){
        closeModal();
        openStage(PRACTICE[0]);
      }
      if(t.dataset.m === 'map'){
        closeModal();
        G.mapArea = 1;
        showMap();
      }
    });
  };

  /* ---------- 練習の「次のステージへ」は、次の練習(最後は はじまりの村)へ ---------- */

  const baseNextStage = nextStage;
  nextStage = function(st){
    const i = PRACTICE.indexOf(st);
    if(i < 0){
      return baseNextStage(st);
    }
    if(i < PRACTICE.length - 1){
      return PRACTICE[i + 1];
    }
    return stageUnlocked(STAGES[0]) ? STAGES[0] : null;
  };

  window.PRACTICE = PRACTICE;
})();
