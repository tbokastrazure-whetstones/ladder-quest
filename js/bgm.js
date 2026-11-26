/* =========================================================================
   BGM(背景の音楽)の再生のしくみ
     ・音のファイルを使わず、ブラウザの中で音を組み立てて鳴らす(通信量ゼロ・オフラインでも鳴る)
     ・曲の中身(和音・リズム・メロディ)は bgm-tracks.js に書く
     ・あとで録音した曲(mp3 など)を使うときは、BGM_FILES に曲名とファイルを書けば、そちらを鳴らす
     ・スピーカーのボタン(効果音)を切ると BGM も止まる。設定で BGM だけ切ることもできる
   ========================================================================= */
(function(){
  'use strict';

  // 録音した曲を使うとき:{map:'bgm/map.mp3'} のように書く(いまは使っていない)
  const BGM_FILES = {};

  // 音量の段階(設定の「小・中・大」)
  const LEVELS = {s:0.22, m:0.42, l:0.7};

  // 先に予約しておく時間(秒)と、予約を見直す間隔(ミリ秒)
  const AHEAD = 0.12;
  const TICK_MS = 25;

  const KEY_ON = 'ladderQuest_bgm';
  const KEY_LV = 'ladderQuest_bgmLevel';

  function load(k, d){
    try{
      const v = localStorage.getItem(k);
      return v === null ? d : v;
    }catch(e){
      return d;
    }
  }

  function save(k, v){
    try{
      localStorage.setItem(k, v);
    }catch(e){}
  }

  const BGM = {
    ctx:null,
    master:null,
    noise:null,
    want:null,
    cur:null,
    timer:null,
    audio:null,

    on(){
      return load(KEY_ON, 'on') !== 'off';
    },
    level(){
      return load(KEY_LV, 'm');
    },
    setOn(v){
      save(KEY_ON, v ? 'on' : 'off');
      this.refresh();
    },
    setLevel(v){
      save(KEY_LV, v);
      this.applyVolume();
    },
    // 効果音(スピーカーのボタン)と BGM の両方が ON のときだけ鳴らす
    allowed(){
      return this.on() && SFX.on();
    },

    /* ---------- 音の土台 ---------- */

    // 最初のタップのあとでないと音は出せないので、タップのたびに呼ぶ
    unlock(){
      if(!this.allowed()){
        return;
      }
      if(!this.ctx){
        const C = window.AudioContext || window.webkitAudioContext;
        if(!C){
          return;
        }
        this.ctx = new C();
        this.master = this.ctx.createGain();
        const comp = this.ctx.createDynamicsCompressor();
        this.master.connect(comp);
        comp.connect(this.ctx.destination);
        this.noise = this.makeNoise();
        this.applyVolume();
      }
      if(this.ctx.state !== 'running'){
        this.ctx.resume().catch(()=>{});
      }
      if(this.want && !this.cur){
        this.start(this.want);
      }
    },

    makeNoise(){
      const c = this.ctx;
      const buf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
      const d = buf.getChannelData(0);
      for(let i = 0; i < d.length; i++){
        d[i] = Math.random() * 2 - 1;
      }
      return buf;
    },

    applyVolume(){
      const v = LEVELS[this.level()] || LEVELS.m;
      if(this.master){
        this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
      }
      if(this.audio){
        this.audio.volume = v;
      }
    },

    /* ---------- 曲の切り替え ---------- */

    // name:曲の名前、shift:半音いくつ上げ下げするか(エリアごとに少し変える)
    play(name, shift){
      this.want = {name, shift:shift || 0};
      this.refresh();
    },

    refresh(){
      if(!this.allowed() || !this.want){
        this.stop();
        return;
      }
      const w = this.want;
      if(this.cur && this.cur.name === w.name && this.cur.shift === w.shift){
        return;
      }
      if(!this.ctx){
        // まだ一度もタップしていない:最初のタップで始める
        return;
      }
      this.start(w);
    },

    start(w){
      this.stop();
      if(BGM_FILES[w.name]){
        this.startFile(w);
        return;
      }
      const track = (window.BGM_TRACKS || {})[w.name];
      if(!track || !this.ctx){
        return;
      }
      const bus = this.ctx.createGain();
      const t0 = this.ctx.currentTime;
      bus.gain.setValueAtTime(0, t0);
      bus.gain.linearRampToValueAtTime(1, t0 + 1.2);
      bus.connect(this.master);
      this.cur = {name:w.name, shift:w.shift, track, bus, step:0, next:t0 + 0.1};
      this.timer = setInterval(()=>this.tick(), TICK_MS);
    },

    startFile(w){
      const a = new Audio(BGM_FILES[w.name]);
      a.loop = true;
      this.audio = a;
      this.applyVolume();
      a.play().catch(()=>{});
      this.cur = {name:w.name, shift:w.shift};
    },

    stop(){
      clearInterval(this.timer);
      this.timer = null;
      if(this.audio){
        this.audio.pause();
        this.audio = null;
      }
      const old = this.cur;
      this.cur = null;
      if(old && old.bus && this.ctx){
        // すっと消す
        const t = this.ctx.currentTime;
        old.bus.gain.cancelScheduledValues(t);
        old.bus.gain.setValueAtTime(old.bus.gain.value, t);
        old.bus.gain.linearRampToValueAtTime(0, t + 0.8);
        setTimeout(()=>old.bus.disconnect(), 1000);
      }
    },

    // 16分音符1つずつ、少し先まで予約していく
    tick(){
      const s = this.cur;
      if(!s || !this.ctx){
        return;
      }
      const stepLen = 60 / s.track.bpm / 4;
      while(s.next < this.ctx.currentTime + AHEAD){
        window.BGM_PLAY_STEP(this, s, s.step, s.next);
        s.next += stepLen;
        s.step++;
      }
    },

    /* ---------- 音を1つ鳴らす部品(bgm-tracks.js から使う) ---------- */

    note(dest, midi, t, dur, type, vol, cutoff){
      const c = this.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = type || 'triangle';
      o.frequency.setValueAtTime(440 * Math.pow(2, (midi - 69) / 12), t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      let last = o;
      if(cutoff){
        const f = c.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(cutoff, t);
        o.connect(f);
        last = f;
      }
      last.connect(g);
      g.connect(dest);
      o.start(t);
      o.stop(t + dur + 0.05);
    },

    // ゆっくり立ち上がって消える和音(パッド)
    pad(dest, midis, t, dur, vol){
      const c = this.ctx;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(900, t);
      const g = c.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + dur * 0.3);
      g.gain.linearRampToValueAtTime(0, t + dur);
      f.connect(g);
      g.connect(dest);
      for(const m of midis){
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(440 * Math.pow(2, (m - 69) / 12), t);
        o.detune.setValueAtTime((Math.random() - 0.5) * 12, t);
        o.connect(f);
        o.start(t);
        o.stop(t + dur + 0.05);
      }
    },

    kick(dest, t, vol){
      const c = this.ctx;
      const o = c.createOscillator();
      const g = c.createGain();
      o.frequency.setValueAtTime(110, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.connect(g);
      g.connect(dest);
      o.start(t);
      o.stop(t + 0.25);
    },

    // ハイハット(hi)とスネア(sn)は、雑音をフィルタで削って作る
    hit(dest, t, vol, kind){
      const c = this.ctx;
      const src = c.createBufferSource();
      src.buffer = this.noise;
      const f = c.createBiquadFilter();
      const g = c.createGain();
      const len = kind === 'sn' ? 0.14 : 0.04;
      f.type = kind === 'sn' ? 'bandpass' : 'highpass';
      f.frequency.setValueAtTime(kind === 'sn' ? 1800 : 7000, t);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + len);
      src.connect(f);
      f.connect(g);
      g.connect(dest);
      src.start(t);
      src.stop(t + len + 0.02);
    },
  };

  /* ---------- 画面に合わせて曲を変える ---------- */

  function stageTrack(st){
    if(st.boss){
      return 'boss';
    }
    return st.area >= 4 ? 'factory' : 'work';
  }

  // エリアごとに調を少しずらして、同じ曲でも雰囲気を変える
  function areaShift(area){
    return [0, 2, -2][(area - 1) % 3];
  }

  const baseShowTitle = showTitle;
  showTitle = function(...args){
    BGM.play('map', 0);
    return baseShowTitle(...args);
  };

  const baseShowMap = showMap;
  showMap = function(...args){
    BGM.play('map', 0);
    return baseShowMap(...args);
  };

  const baseOpenStage = openStage;
  openStage = function(st){
    baseOpenStage(st);
    if(st){
      BGM.play(stageTrack(st), areaShift(st.area || 1));
    }
  };

  // 最初のタップで音を出せるようにする
  document.addEventListener('pointerdown', ()=>BGM.unlock(), true);

  // 裏に回ったら止め、戻ったら続きから
  document.addEventListener('visibilitychange', ()=>{
    if(!BGM.ctx){
      return;
    }
    if(document.hidden){
      BGM.ctx.suspend().catch(()=>{});
      if(BGM.audio){
        BGM.audio.pause();
      }
      return;
    }
    if(BGM.allowed()){
      BGM.ctx.resume().catch(()=>{});
      if(BGM.audio){
        BGM.audio.play().catch(()=>{});
      }
    }
  });

  // スピーカーのボタンを押したあと、BGM も合わせる
  document.addEventListener('click', e=>{
    if(e.target.closest && e.target.closest('[data-snd], [data-m="snd"]')){
      setTimeout(()=>{
        BGM.refresh();
        BGM.unlock();
      }, 0);
    }
  });

  /* ---------- 設定画面の「BGM」の欄 ---------- */

  function settingsInner(){
    const on = BGM.on();
    const lv = BGM.level();
    const b = (attr, v, sel, label)=>`<button class="opt ${sel ? 'sel' : ''}" ${attr}="${v}">${label}</button>`;
    let h = '<div class="note">BGM(音楽)</div><div class="opts">';
    h += b('data-bgm', '1', on, 'ON');
    h += b('data-bgm', '0', !on, 'OFF');
    h += '</div><div class="opts">';
    h += b('data-bgmlv', 's', lv === 's', '音量 小');
    h += b('data-bgmlv', 'm', lv === 'm', '中');
    h += b('data-bgmlv', 'l', lv === 'l', '大');
    h += '</div>';
    if(!SFX.on()){
      h += '<div class="note">効果音が OFF の間は、BGM も鳴りません。</div>';
    }
    return h;
  }

  window.bgmSettingsHTML = function(){
    return `<div id="bgm-set">${settingsInner()}</div>`;
  };

  document.addEventListener('click', e=>{
    const t = e.target.closest && e.target.closest('[data-bgm], [data-bgmlv]');
    if(!t){
      return;
    }
    e.stopPropagation();
    if(t.dataset.bgm){
      BGM.setOn(t.dataset.bgm === '1');
      BGM.unlock();
    }
    if(t.dataset.bgmlv){
      BGM.setLevel(t.dataset.bgmlv);
    }
    const box = document.getElementById('bgm-set');
    if(box){
      box.innerHTML = settingsInner();
    }
  }, true);

  window.BGM = BGM;
})();
