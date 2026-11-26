/* =========================================================================
   BGM の曲(和音・リズム・メロディ)
     ・数字は MIDI の音の高さ(60 = ド、1つで半音)
     ・1小節 = 16分音符 16個。chords の1つが1小節
     ・考えている間のじゃまにならないよう、ステージの曲はメロディなしで静かめ
   曲:map(マップ・タイトル)/ work(エリア1〜3)/ factory(エリア4〜)/ boss(ボス戦)
   ========================================================================= */
(function(){
  'use strict';

  const MAJ = [0, 4, 7];
  const MIN = [0, 3, 7];
  const MAJ7 = [0, 4, 7, 11];
  const MIN7 = [0, 3, 7, 10];
  const DOM7 = [0, 4, 7, 10];

  const TRACKS = {
    // マップ:ゆったり明るい。やさしいメロディつき
    map:{
      bpm:88,
      chords:[[53, MAJ7], [55, MAJ], [52, MIN7], [57, MIN7]],
      bass:'whole',
      pad:0.035,
      arp:{rate:2, pattern:[0, 2, 1, 3, 2, 1, 0, 2], oct:12, type:'triangle', vol:0.045, cut:2400},
      hat:{steps:[2, 6, 10, 14], vol:0.012},
      melody:{type:'sine', vol:0.05, notes:[
        [0, 0, 76, 6], [0, 8, 79, 4], [0, 12, 81, 4],
        [1, 0, 79, 8], [1, 8, 74, 8],
        [2, 0, 76, 6], [2, 8, 72, 4], [2, 12, 74, 4],
        [3, 0, 76, 16],
      ]},
    },
    // エリア1〜3:作業場の軽いリズム
    work:{
      bpm:100,
      chords:[[57, MIN7], [53, MAJ7], [48, MAJ], [55, MAJ]],
      bass:'pulse8',
      pad:0.025,
      arp:{rate:2, pattern:[0, 1, 2, 1, 3, 2, 1, 2], oct:12, type:'triangle', vol:0.03, cut:2000},
      kick:{steps:[0, 8], vol:0.16},
      hat:{steps:[2, 6, 10, 14], vol:0.014},
    },
    // エリア4〜:工場・コンベアの刻み
    factory:{
      bpm:112,
      chords:[[50, MIN], [46, MAJ], [48, MAJ], [45, MIN]],
      bass:'oct8',
      pad:0.02,
      arp:{rate:2, pattern:[0, 1, 2, 1], oct:12, type:'square', vol:0.018, cut:1500},
      kick:{steps:[0, 4, 8, 12], vol:0.14},
      hat:{steps:[2, 6, 10, 14], vol:0.016},
      snare:{steps:[4, 12], vol:0.035},
    },
    // ボス戦:速く、緊張感
    boss:{
      bpm:128,
      chords:[[52, MIN], [48, MAJ], [50, MAJ], [47, DOM7]],
      bass:'oct8',
      pad:0.02,
      arp:{rate:1, pattern:[0, 1, 2, 3], oct:12, type:'sawtooth', vol:0.014, cut:1800},
      kick:{steps:[0, 4, 8, 12], vol:0.17},
      hat:{steps:[0, 2, 4, 6, 8, 10, 12, 14], vol:0.014},
      snare:{steps:[4, 12], vol:0.045},
      melody:{type:'square', vol:0.028, cut:2200, notes:[
        [0, 0, 76, 3], [0, 3, 79, 3], [0, 6, 83, 2], [0, 8, 81, 4], [0, 12, 79, 4],
        [1, 0, 76, 8], [1, 8, 72, 8],
        [2, 0, 74, 6], [2, 6, 78, 2], [2, 8, 81, 8],
        [3, 0, 83, 8], [3, 8, 78, 8],
      ]},
    },
  };

  /* ---------- 16分音符1つぶんを鳴らす ---------- */

  function playStep(B, s, step, t){
    const tr = s.track;
    const bars = tr.chords.length;
    const bar = Math.floor(step / 16) % bars;
    const i = step % 16;
    const stepLen = 60 / tr.bpm / 4;
    const [root0, iv] = tr.chords[bar];
    const root = root0 + s.shift;
    const dest = s.bus;

    // 和音(小節の頭で1回)
    if(i === 0 && tr.pad){
      B.pad(dest, iv.map(x=>root + 12 + x), t, stepLen * 16, tr.pad);
    }

    // ベース
    if(tr.bass === 'whole' && i === 0){
      B.note(dest, root - 12, t, stepLen * 15, 'triangle', 0.12);
    }
    if(tr.bass === 'pulse8' && i % 2 === 0){
      B.note(dest, root - 12, t, stepLen * 1.6, 'triangle', i % 4 === 0 ? 0.11 : 0.07);
    }
    if(tr.bass === 'oct8' && i % 2 === 0){
      const up = (i / 2) % 2 === 1 ? 12 : 0;
      B.note(dest, root - 12 + up, t, stepLen * 1.6, 'triangle', 0.1);
    }

    // 分散和音(アルペジオ)
    if(tr.arp && i % tr.arp.rate === 0){
      const a = tr.arp;
      const k = a.pattern[(i / a.rate) % a.pattern.length];
      const m = root + a.oct + iv[k % iv.length] + (k >= iv.length ? 12 : 0);
      B.note(dest, m, t, stepLen * a.rate * 1.8, a.type, a.vol, a.cut);
    }

    // リズム
    if(tr.kick && tr.kick.steps.includes(i)){
      B.kick(dest, t, tr.kick.vol);
    }
    if(tr.hat && tr.hat.steps.includes(i)){
      B.hit(dest, t, tr.hat.vol, 'hi');
    }
    if(tr.snare && tr.snare.steps.includes(i)){
      B.hit(dest, t, tr.snare.vol, 'sn');
    }

    // メロディ(4小節で1回り)
    if(tr.melody){
      const mb = Math.floor(step / 16) % 4;
      for(const [nb, ns, m, len] of tr.melody.notes){
        if(nb === mb && ns === i){
          B.note(dest, m + s.shift, t, stepLen * len, tr.melody.type, tr.melody.vol, tr.melody.cut);
        }
      }
    }
  }

  window.BGM_TRACKS = TRACKS;
  window.BGM_PLAY_STEP = playStep;
})();
