// 0 is the independent standard mode; ascensions I–VI accumulate rules.
    const NEON_DIFFICULTIES = Object.freeze([
      { name: '标准', rule: '完整四武器/四模组，标准战斗与道具掉落', enemyCount: 1, enemyDamage: 1, eliteRate: 1, normalDrops: 1, nukeDrops: 1 },
      { name: 'I · 敌潮', rule: '敌潮密度提高，全局毁灭更稀有', enemyCount: 1.15, enemyDamage: 1, eliteRate: 1, normalDrops: 1, nukeDrops: 0.8 },
      { name: 'II · 重击', rule: '敌人伤害 +15%', enemyCount: 1.15, enemyDamage: 1.15, eliteRate: 1, normalDrops: 0.95, nukeDrops: 0.65 },
      { name: 'III · 精英', rule: '精英入侵频率与强度提升', enemyCount: 1.15, enemyDamage: 1.15, eliteRate: 1.4, normalDrops: 0.9, nukeDrops: 0.5 },
      { name: 'IV · 匮乏', rule: '治疗/磁铁物资更少', enemyCount: 1.15, enemyDamage: 1.15, eliteRate: 1.4, normalDrops: 0.8, nukeDrops: 0.35 },
      { name: 'V · 取舍', rule: '辅助模组仅有 3 个槽位', enemyCount: 1.15, enemyDamage: 1.15, eliteRate: 1.4, normalDrops: 0.7, nukeDrops: 0.2 },
      { name: 'VI · 噩梦', rule: 'Boss 额外攻击阶段，后期火力升级', enemyCount: 1.25, enemyDamage: 1.25, eliteRate: 1.6, normalDrops: 0.6, nukeDrops: 0.1 }
    ]);
    const NEON_AEGIS_DURATIONS = Object.freeze([0.15, 0.20, 0.25, 0.30, 0.35, 0.40]);
    /* ==========================================================================
       1. SYNTHESIS AUDIO SYSTEM (Web Audio API - Zero External Audio Files)
       ========================================================================== */
    class SoundEngine {
      constructor() {
        this.ctx = null;
        this.enabled = true;
        this.masterGain = null;
        this.gemPitchIndex = 0;
        this.lastGemTime = 0;
        this.bgmPlaying = false;
        this.bgmTimer = null;
        this.bgmStep = 0;
        this.scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00]; // Pentatonic
      }

      init() {
        if (this.ctx) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.enabled ? 0.28 : 0;
        this.masterGain.connect(this.ctx.destination);
        this.startBGM();
      }

      toggle() {
        this.enabled = !this.enabled;
        if (this.masterGain) {
          this.masterGain.gain.value = this.enabled ? 0.28 : 0.0;
        }
        return this.enabled;
      }

      playLaser(freq = 600, type = 'sawtooth') {
        if (!this.enabled || !this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = this.ctx.currentTime;
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(80, t + 0.12);

        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.12);
      }

      playExplosion(size = 'small') {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const dur = size === 'large' ? 0.6 : 0.25;

        // White noise node for crisp explosion crunch
        const bufferSize = this.ctx.sampleRate * dur;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-3 * i / bufferSize);
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(size === 'large' ? 450 : 800, t);
        filter.frequency.exponentialRampToValueAtTime(60, t + dur);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(size === 'large' ? 0.6 : 0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start(t);

        // Sub bass thump
        const sub = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        sub.type = 'sine';
        sub.frequency.setValueAtTime(size === 'large' ? 140 : 100, t);
        sub.frequency.exponentialRampToValueAtTime(30, t + dur);
        subGain.gain.setValueAtTime(size === 'large' ? 0.5 : 0.3, t);
        subGain.gain.exponentialRampToValueAtTime(0.01, t + dur);
        sub.connect(subGain);
        subGain.connect(this.masterGain);
        sub.start(t);
        sub.stop(t + dur);
      }

      playGemPickup() {
        if (!this.enabled || !this.ctx) return;
        const now = performance.now();
        if (now - this.lastGemTime < 250) {
          this.gemPitchIndex = (this.gemPitchIndex + 1) % this.scale.length;
        } else {
          this.gemPitchIndex = 0;
        }
        this.lastGemTime = now;

        const freq = this.scale[this.gemPitchIndex];
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.5, t + 0.1);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.12);
      }

      playDash() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(600, t + 0.08);
        osc.frequency.exponentialRampToValueAtTime(120, t + 0.2);

        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.2);
      }

      playZap() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(950, t);
        osc.frequency.exponentialRampToValueAtTime(220, t + 0.15);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.15);
      }

      playLevelUp() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const notes = [440, 554.37, 659.25, 880];
        notes.forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const start = t + idx * 0.08;
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.2, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(start);
          osc.stop(start + 0.35);
        });
      }

      playBossAlert() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        for (let i = 0; i < 3; i++) {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const st = t + i * 0.28;
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(320, st);
          osc.frequency.linearRampToValueAtTime(580, st + 0.14);
          osc.frequency.linearRampToValueAtTime(320, st + 0.26);

          gain.gain.setValueAtTime(0.35, st);
          gain.gain.linearRampToValueAtTime(0.01, st + 0.27);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(st);
          osc.stop(st + 0.27);
        }
      }

      playHeal() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const st = t + idx * 0.06;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, st);
          gain.gain.setValueAtTime(0.2, st);
          gain.gain.exponentialRampToValueAtTime(0.001, st + 0.25);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(st);
          osc.stop(st + 0.25);
        });
      }

      playNuke() {
        if (!this.enabled || !this.ctx) return;
        this.playExplosion('large');
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, t);
        osc.frequency.exponentialRampToValueAtTime(40, t + 0.8);
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.8);
      }

      playBeam() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(450, t);
        osc.frequency.linearRampToValueAtTime(750, t + 0.15);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.2);
      }

      playFreeze() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        [1200, 1600, 2200].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const st = t + idx * 0.04;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, st);
          gain.gain.setValueAtTime(0.15, st);
          gain.gain.exponentialRampToValueAtTime(0.001, st + 0.18);
          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(st);
          osc.stop(st + 0.18);
        });
      }

      playBlackHole() {
        if (!this.enabled || !this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(45, t + 0.4);
        gain.gain.setValueAtTime(0.35, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.45);
      }

      // Procedural Cyber Synth Background Loop
      startBGM() {
        if (this.bgmPlaying) return;
        this.bgmPlaying = true;
        const bassNotes = [55, 55, 65.41, 55, 73.42, 55, 65.41, 49]; // A1, C2, D2, G1
        const tempo = 128; // BPM
        const interval = (60 / tempo / 2) * 1000; // 16th notes approx

        this.bgmTimer = setInterval(() => {
          if (!this.enabled || !this.ctx) return;
          const t = this.ctx.currentTime;
          const step = this.bgmStep % 16;

          // Bass synth
          if (step % 2 === 0) {
            const noteIdx = Math.floor(step / 2) % bassNotes.length;
            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(bassNotes[noteIdx], t);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, t);
            filter.frequency.exponentialRampToValueAtTime(100, t + 0.15);

            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.masterGain);
            osc.start(t);
            osc.stop(t + 0.18);
          }

          // Kick Drum on 0, 4, 8, 12
          if (step % 4 === 0) {
            const kickOsc = this.ctx.createOscillator();
            const kickGain = this.ctx.createGain();
            kickOsc.frequency.setValueAtTime(120, t);
            kickOsc.frequency.exponentialRampToValueAtTime(35, t + 0.1);
            kickGain.gain.setValueAtTime(0.2, t);
            kickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            kickOsc.connect(kickGain);
            kickGain.connect(this.masterGain);
            kickOsc.start(t);
            kickOsc.stop(t + 0.12);
          }

          // Hi-hat on every odd step
          if (step % 2 === 1) {
            const bufSize = this.ctx.sampleRate * 0.04;
            const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
            const d = buf.getChannelData(0);
            for (let i = 0; i < bufSize; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-15 * i / bufSize);
            const hat = this.ctx.createBufferSource();
            hat.buffer = buf;
            const hatFilter = this.ctx.createBiquadFilter();
            hatFilter.type = 'highpass';
            hatFilter.frequency.value = 6500;
            const hatGain = this.ctx.createGain();
            hatGain.gain.value = 0.04;
            hat.connect(hatFilter);
            hatFilter.connect(hatGain);
            hatGain.connect(this.masterGain);
            hat.start(t);
          }

          this.bgmStep++;
        }, interval);
      }
    }

    /* ==========================================================================
       2. VECTOR MATH & UTILITY
       ========================================================================== */
    const SafeStorage = {
      get(key, defVal = '') {
        try {
          const v = localStorage.getItem(key);
          return v !== null ? v : defVal;
        } catch (e) {
          return defVal;
        }
      },
      set(key, val) {
        try {
          localStorage.setItem(key, String(val));
        } catch (e) {
          // Silently ignore storage errors (e.g. file:// protocol restriction)
        }
      }
    };

    const Vec = {
      dist(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.hypot(dx, dy);
      },
      clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
      },
      rand(min, max) {
        return Math.random() * (max - min) + min;
      },
      randChoice(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
      }
    };

    /* ==========================================================================
       3. UPGRADE DEFINITIONS (Weapons & Passives)
       ========================================================================== */
    const UPGRADES_DB = [
      // WEAPONS
      {
        id: 'blaster',
        type: 'weapon',
        name: '脉冲离子炮',
        icon: '🔫',
        rarity: 'common',
        desc: '向射击方向高速发射高能离子弹。高阶解锁穿透与等离子爆轰。',
        maxLvl: 5,
        statText: [
          '发射单发高能离子弹，精准弹道点杀',
          '双联平行发射，火力覆盖加倍',
          '射速提升 +25%',
          '三联平行发射，弹道附带高能穿透',
          '【超载等离子】巨型连发穿透，命中引发范围等离子爆震！'
        ]
      },
      {
        id: 'orbit',
        type: 'weapon',
        name: '环绕相位刃',
        icon: '🌀',
        rarity: 'rare',
        desc: '在机体周围高速盘旋的能量光刃，斩碎靠近的敌人。',
        maxLvl: 5,
        statText: [
          '生成 2 枚环绕光刃，近身切割护体',
          '旋转速度 +30%',
          '增至 3 枚光刃，环绕切割轨道扩大',
          '切割伤害 +40%',
          '【相位风暴】增至 5 枚致密高速光刃，形成不可逾越的绝对切割力场！'
        ]
      },
      {
        id: 'tesla',
        type: 'weapon',
        name: '特斯拉闪电链',
        icon: '⚡',
        rarity: 'rare',
        desc: '释放高压弧光在敌群间传导。随升级解锁电磁阻滞与球形闪电爆轰！',
        maxLvl: 5,
        statText: [
          '高压弧光连锁跳跃 3 名敌人',
          '电弧伤害 +30%',
          '【电磁阻滞】跳跃增至 5 名，附带 0.6 秒 50% 减速软控',
          '释放频率提升 +35%',
          '【雷暴过载】双重雷暴齐发！附带球形闪电爆鸣与 1.2 秒麻痹瘫痪！'
        ]
      },
      {
        id: 'missiles',
        type: 'weapon',
        name: '自寻迹微型飞弹',
        icon: '🚀',
        rarity: 'rare',
        desc: '发射自动跟踪敌群的制导飞弹。随升级逐步解锁破片溅射、引力减速与集束子母弹！',
        maxLvl: 5,
        statText: [
          '发射 2 枚微型寻踪飞弹，精准点杀 (微型爆心)',
          '【破片爆震】飞弹增至 3 枚，爆炸范围扩大 +55%',
          '【引力冲击】爆炸产生高压震荡波，强力击退并减速敌群 50%',
          '【集束子母弹】飞弹增至 5 枚！母弹爆炸分裂 2 枚微型子弹头二次爆轰',
          '【天火蜂巢】8枚聚变重弹！大范围坍缩聚怪 + 24枚裂变子弹超新星连环轰炸！'
        ]
      },
      {
        id: 'nova',
        type: 'weapon',
        name: '超新星冲击环',
        icon: '💥',
        rarity: 'legendary',
        desc: '蓄力释放向外扩散的引力光环，击退并重创周围所有敌人。',
        maxLvl: 5,
        statText: ['每 5 秒释放一次冲击', '击退距离 +50%', '冲击伤害 +45%', '冷却缩减 1.5 秒', '事件视界：冲击附带毁灭黑洞吸附']
      },
      {
        id: 'laser',
        type: 'weapon',
        name: '虚空裁决死光',
        icon: '🔆',
        rarity: 'rare',
        desc: '射出高能连续穿透激光束扫荡敌阵，撕裂行进路径上的所有机甲。',
        maxLvl: 5,
        statText: ['发射高能穿透死光', '光束伤害 +35%', '光束宽度与范围 +40%', '发射频率 +30%', '歼星裁决：双联交叉高能死光']
      },
      {
        id: 'drones',
        type: 'weapon',
        name: '蜂群浮游僚机',
        icon: '🛸',
        rarity: 'rare',
        desc: '呼叫智能自动僚机编队伴飞索敌，高速向敌机射出追踪光子针。',
        maxLvl: 5,
        statText: ['部署 2 架自动巡游僚机', '射速 +30%', '+1 架僚机，巡航索敌范围扩大', '伤害 +40%', '航母蜂群：共 5 架僚机，协同等离子齐射']
      },
      {
        id: 'blackhole',
        type: 'weapon',
        name: '时空引力黑洞',
        icon: '🌌',
        rarity: 'legendary',
        desc: '发射引力坍缩黑洞，强力吸附大批敌群聚集并引发粉碎湮灭。',
        maxLvl: 5,
        statText: ['生成微型黑洞牵引敌群', '吸扯力与范围 +35%', '持续时间 +1秒，伤害 +40%', '坍缩引发二次冲击波', '宇宙奇点：巨型超重力黑洞与超新星爆炸']
      },
      {
        id: 'cryomine',
        type: 'weapon',
        name: '极光冰爆地雷',
        icon: '❄️',
        rarity: 'rare',
        desc: '在战机尾焰轨迹投下脉冲冰雷，敌人接近时爆发绝对零度冰环。',
        maxLvl: 5,
        statText: ['每次投掷 2 枚极光冰雷', '爆炸半径 +35%, 附带50%减速', '投掷数量 +1 枚', '冰爆伤害 +45%', '绝对零度：大范围冻结与碎冰风暴']
      },

      // PASSIVES（等级基础攻击：每级+3%全武器伤害，Lv10约+27%，Lv20约+57%，武器强化仍是大头）
      {
        id: 'power',
        type: 'passive',
        name: '强核反应堆',
        icon: '🔥',
        rarity: 'common',
        desc: '全武器攻击力提升 20%。（等级本身每级+3%基础攻击）',
        maxLvl: 5,
        statText: ['伤害 +15%', '伤害 +30%', '伤害 +45%', '伤害 +60%', '伤害 +85%']
      },
      {
        id: 'haste',
        type: 'passive',
        name: '超频加速卡',
        icon: '⏱️',
        rarity: 'common',
        desc: '全武器冷却缩减 10%。',
        maxLvl: 5,
        statText: ['CD -10%', 'CD -20%', 'CD -30%', 'CD -38%', 'CD -50%']
      },
      {
        id: 'thruster',
        type: 'passive',
        name: '矢量推进器',
        icon: '👟',
        rarity: 'common',
        desc: '战机移动速度与冲刺恢复速度大幅提升。等级本身每级+6移速（最多+120），与推进器叠加但不超过385。',
        maxLvl: 5,
        statText: ['移速 +15%', '移速 +28%, 冲刺CD -15%', '移速 +40%', '移速 +52%, 冲刺CD -30%', '光速引擎：无敌冲刺距离翻倍']
      },
      {
        id: 'magnet',
        type: 'passive',
        name: '强引力透镜',
        icon: '🧲',
        rarity: 'common',
        desc: '大幅扩大核心拾取范围，并额外提升 15% 能量核心经验收益。',
        maxLvl: 5,
        statText: ['拾取 +50%, 经验 +15%', '拾取 +100%, 经验 +30%', '拾取 +160%, 经验 +45%', '拾取 +230%, 经验 +60%', '宇宙引力：经验 +75%，全图核心向你汇聚']
      },
      {
        id: 'armor',
        type: 'passive',
        name: '纳米修复装甲',
        icon: '🛡️',
        rarity: 'rare',
        desc: '大幅提升生命上限，并在战机原生缓慢自愈基础上显著加快机体自愈回血。',
        maxLvl: 5,
        statText: ['HP +35, 自愈 +1.8/s', 'HP +70, 自愈 +3.6/s', 'HP +105, 自愈 +5.4/s', 'HP +140, 自愈 +7.2/s', '纳米永生：受致命伤紧急重构免死，自愈 +9.0/s']
      },
      {
        id: 'crit',
        type: 'passive',
        name: '量子弱点瞄准仪',
        icon: '🎯',
        rarity: 'legendary',
        desc: '大幅提升暴击率与暴击毁灭伤害。',
        maxLvl: 5,
        statText: ['暴击率 +12%, 爆伤 +50%', '暴击率 +24%', '暴击率 +36%, 爆伤 +100%', '暴击率 +48%', '降维打击：暴击率 65%，爆伤 300%']
      },
      {
        id: 'multishot',
        type: 'passive',
        name: '星穹火控矩阵',
        icon: '🌠',
        rarity: 'legendary',
        desc: '全武装协同：增幅离子炮、飞弹、冰雷、闪电链与相位刃，并周期性释放自动锁定敌人的星穹齐射。',
        maxLvl: 5,
        statText: [
          '弹道 +1、闪电链 +1 跳；每8秒自动追踪攻击1名敌人',
          '星穹齐射进化：每6.5秒自动攻击最多2名敌人',
          '弹道累计 +2，星穹齐射最多攻击3个目标',
          '火控共振：每5秒攻击最多4个目标，并提高齐射伤害',
          '【星穹超载】弹道累计 +3，每3.5秒追踪最多5个目标，伤害进一步强化'
        ]
      },
      {
        id: 'area',
        type: 'passive',
        name: '高维拓扑透镜',
        icon: '🔮',
        rarity: 'rare',
        desc: '全武器波及范围、爆炸半径、光刃轨道与激光束宽度大幅扩大。',
        maxLvl: 5,
        statText: ['攻击范围 +25%', '攻击范围 +45%', '攻击范围 +65%', '攻击范围 +85%', '超空间展开：范围 +120%，附带穿透强效']
      },

      // DASH MASTERY UPGRADES (独立折跃系统：不占用4武器与4模组槽位！)
      {
        id: 'dash_aegis',
        type: 'dash',
        name: '时空相位无敌光环',
        icon: '🛡️',
        rarity: 'legendary',
        desc: '折跃后展开绝对无敌光环，延长免疫时间，并对光环范围内敌人造成持续粉碎震荡伤害！',
        maxLvl: 6,
        statText: [
          '相位光环 0.15秒，获得贴身震荡防护',
          '光环 0.20秒，解锁持续脉冲伤害',
          '光环 0.25秒，脉冲半径与伤害提升',
          '光环 0.30秒，强化脉冲击退',
          '光环 0.35秒，进一步提升范围和攻击力',
          '神谕力场：光环 0.40秒并在结束时释放八向贯穿激光（时间有上限）'
        ]
      },
      {
        id: 'dash_charge',
        type: 'dash',
        name: '折跃储能矩阵',
        icon: '⚡',
        rarity: 'rare',
        desc: '每级增加一段折跃储能，从初始3段成长至最多9段；合理规划恢复与连击。',
        maxLvl: 6,
        statText: ['4段折跃', '5段折跃，恢复速度提升', '6段折跃', '7段折跃', '8段折跃', '9段折跃：九连极限机动']
      },
      {
        id: 'dash_dmg',
        type: 'dash',
        name: '高能粒子折跃刃',
        icon: '⚔️',
        rarity: 'rare',
        desc: '大幅提升冲刺沿途贯穿碰撞造成的真实切割伤害与暴击率。',
        maxLvl: 5,
        statText: ['冲刺斩击伤害 +60%', '斩击伤害 +120%, 暴击率 +15%', '斩击伤害 +180%', '斩击伤害 +250%, 暴击率 +25%', '神罗天征斩：斩击伤害 +350%，且必定暴击！']
      },
      {
        id: 'dash_area',
        type: 'dash',
        name: '时空撕裂折跃面',
        icon: '🔮',
        rarity: 'common',
        desc: '扩大冲刺斩击宽度，提升命中能力；防护时间受安全上限约束。',
        maxLvl: 4,
        statText: ['折跃切割宽度提升', '更宽的斩击判定', '宽幅扫荡与少量防护延长', '超维折跃：最大斩击宽度，防护不超过安全上限']
      },
      {
        id: 'dash_blast',
        type: 'dash',
        name: '超新星折跃爆轰',
        icon: '💥',
        rarity: 'legendary',
        desc: '战机每次折跃落点时引发剧烈能量爆轰冲击，强力击退并重创周围敌人！',
        maxLvl: 4,
        statText: ['折跃落点引发范围能量冲击波 (140伤害)', '爆轰伤害 +50%, 爆炸半径 +35%', '爆轰伤害 +100%, 强力击退敌群', '引力坍缩爆轰：引发黑洞吸附后发生超新星核爆！']
      },
      {
        id: 'dash_fire',
        type: 'dash',
        name: '裂变等离子火墙',
        icon: '🔥',
        rarity: 'rare',
        desc: '在冲刺起点至落点间拉出高能激光等离子火墙，持续焚烧触碰的所有敌机！',
        maxLvl: 4,
        statText: ['冲刺留下持续2.2秒的等离子火墙', '火墙伤害 +50%, 持续时间 +0.5秒', '火墙伤害 +100%, 火墙宽度扩大', '恒星地狱火：火墙持续3.5秒，造成毁灭级高频蒸发伤害！']
      },
      {
        id: 'dash_cryo',
        type: 'dash',
        name: '绝对零度霜冻折跃',
        icon: '❄️',
        rarity: 'rare',
        desc: '冲刺时爆发出极寒冰霜光环，将沿途贯穿的敌人冻结冰封 2.5 秒并附加易伤！',
        maxLvl: 3,
        statText: ['冲刺沿途完全冰封敌人2秒 (减速60%)', '冰冻范围 +40%, 冰冻易伤 +30%', '深度绝对零度：完全冻结敌人3秒并附加碎冰爆裂！']
      }
    ];

    /* ==========================================================================
       4. GAME CORE ENGINE
       ======================================================================== */
    class NeonSurvivorGame {
      constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.sound = new SoundEngine();

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.cameraZoom = 1;

        this.state = 'start'; // 'start', 'playing', 'paused', 'levelup', 'gameover', 'victory'
        this.loopRunning = false;
        this.gamepadVibrationEnabled = SafeStorage.get('neon_vibration', 'true') !== 'false';
        this.unlockedDifficulty = Math.max(0, Math.min(6, parseInt(SafeStorage.get('neon_ascension_unlocked', '0'), 10) || 0));
        this.selectedDifficulty = Math.max(0, Math.min(this.unlockedDifficulty, parseInt(SafeStorage.get('neon_difficulty_selected', '0'), 10) || 0));
        this.difficulty = this.selectedDifficulty;
        this.combatTelemetry = { invulnerableSeconds: 0, nukeDrops: 0, damageTaken: 0, preciseDashes: 0 };
        this.isHelpOpen = false;
        this.prevHelpState = 'start';
        this.lastTime = 0;
        this.survivalTime = 0;
        this.kills = 0;
        this.totalDamageDealt = 0;
        this.endlessMode = false;
        this.lanRTC = null;
        this.lanCoop = null;

        // Player
        this.player = {
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          baseSpeed: 240,
          radius: 16,
          hp: 100,
          maxHp: 100,
          regen: 0.8, // 战机原生缓慢回血 (0.8 HP/s)
          invulnTimer: 0,
          // Dash: 3 Stored Charges + Path Slicing
          dashCharges: 3,
          maxDashCharges: 3,
          dashRechargeTimer: 0,
          dashRechargeTime: 2.2,
          isDashing: false,
          dashDuration: 0.18,
          dashTimeLeft: 0,
          dashDir: { x: 0, y: 0 },
          dashHitEnemies: new Set(),
          // Upgrades and Levels
          level: 1,
          xp: 0,
          xpNeeded: 10,
          crystals: 0,
          magnetRadius: 100,
          // Passives
          dmgMultiplier: 1.0,
          cdrMultiplier: 1.0,
          critRate: 0.08,
          critDmg: 1.5,
          cheatDeathUsed: false,
          hasCheatDeath: false,
          areaMultiplier: 1.0,
          extraProjectiles: 0,
          dashSlashDmgMult: 1.0,
          dashSlashWidthMult: 1.0,
          hasPlasmaTrail: false,
          dashUpgrades: {},
          aegisTimer: 0,
          aegisPulseTimer: 0,
          hasAegis: false,
          aegisDuration: 0,
          aegisDamage: 0,
          aegisRadius: 0,
          hasAegisBurst: false,
          hasDashBlast: false,
          dashBlastDamage: 0,
          dashBlastRadius: 0,
          hasFireTrail: false,
          fireTrailDamage: 0,
          fireTrailDuration: 0,
          hasDashCryo: false,
          dashCryoDuration: 0,
          dashAlwaysCrit: false,
          dashCombo: 0,
          dashComboUntil: 0,
          dashPreciseHit: false,
          limitBreaks: {},
          totalLimitBreaks: 0,
          // Equipped weapons: id -> level
          weapons: { blaster: 1 },
          passives: {},
          aimAngle: 0,
          autoAim: true
        };
        // Gamepad badges on ordinary menu actions are created only while a
        // connected controller is present. Buttons remain fully clickable.
        for (const [id, key] of [
          ['btn-start-game', 'a'], ['btn-start-help', 'x'],
          ['btn-resume', 'a'], ['btn-pause-help', 'x']
        ]) {
          document.getElementById(id)?.setAttribute?.('data-gamepad-action', key);
        }
        this.selectedShipId = window.NeonShips?.DEFAULT_SHIP_ID || 'riftblade';
        this.player.shipId = this.selectedShipId;
        // Authoritative player container; legacy game.player remains the exact
        // same object. Remote pilots are registered by the co-op adapter.
        this.players = window.NeonPlayers ? new window.NeonPlayers.PlayerRegistry() : null;
        this.players?.register('host', this.player);

        // Entities
        this.bullets = [];
        this.enemies = [];
        this.enemyBullets = [];
        this.gems = [];
        this.particles = [];
        this.texts = [];
        this.orbiters = [];
        this.shockwaves = [];
        this.laserBeams = [];
        this.companionDrones = [];
        this.blackHoles = [];
        this.mines = [];
        this.lightningTethers = [];
        this.dashTrails = [];

        // Weapon Cooldown Timers
        this.weaponTimers = {
          blaster: 0,
          tesla: 0,
          missiles: 0,
          nova: 0,
          laser: 0,
          drones: 0,
          blackhole: 0,
          cryomine: 0
        };
        this.player.timers = this.weaponTimers;
        this.bossCycle = 0;

        // Spawning director
        this.spawnTimer = 0;
        this.waveTimer = 0;
        this.bossSpawned = false;
        this.currentBoss = null;

        // Controls
        this.keys = {};
        this.mouse = { x: this.width / 2, y: this.height / 2, down: false };
        this.touch = { active: false, identifier: null, startX: 0, startY: 0, currentX: 0, currentY: 0 };

        // Visual effects
        this.screenShake = 0;
        this.screenShakeAngle = 0;
        this.camera = { x: 0, y: 0 };
        this.gridOffset = { x: 0, y: 0 };

        this.initDOM();
        this.setupEvents();
        window.NeonGameSettings?.apply(this);
        this.renderDifficultySelector();
        window.NeonShipSelection?.render(this);
        this.resize();
        this.renderWeaponsHUD();

        // 启动全局唯一定时循环，杜绝多次重开产生并发循环
        this.loopRunning = true;
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
      }

      showStartMenu() {
        this.state = 'start';
        this.releaseJoystickTouch();
        this.hideAllModals();
        this.modalStart.classList.add('active');
        this.renderDifficultySelector();
        window.NeonShipSelection?.render(this);
      }

      getDifficultyRules() {
        return NEON_DIFFICULTIES[this.difficulty || 0];
      }

      getUpgradeSlotLimits(player = this.player) {
        return window.NeonShips?.slotLimitsFor?.(player, this.difficulty) || {
          weapons: 4, passives: this.difficulty >= 5 ? 3 : 4,
          warp: 7, activeSkills: 0
        };
      }

      getPassiveSlotLimit(player = this.player) {
        return this.getUpgradeSlotLimits(player).passives;
      }

      getEffectiveDashRecharge() {
        // Even maximum haste must leave a meaningful gap between protective dashes.
        return Math.max(0.70, this.player.dashRechargeTime * this.player.cdrMultiplier);
      }

      renderDifficultySelector() {
        const el = document.getElementById('neon-difficulty-selector');
        if (!el) return;
        const accessible = Math.max(0, this.unlockedDifficulty);
        el.innerHTML = `<div style="color:#00f3ff;font-weight:800;margin-bottom:8px">进阶难度 <small style="color:#9cb0d0">(通关逐阶解锁，规则叠加)</small></div>
          <div id="neon-difficulty-buttons" style="display:flex;gap:6px;flex-wrap:wrap"></div>
          <div id="neon-difficulty-description" style="font-size:12px;color:#bbc9e0;margin-top:9px"></div>`;
        const buttons = el.querySelector('#neon-difficulty-buttons');
        NEON_DIFFICULTIES.forEach((tier, index) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.disabled = index > accessible;
          button.textContent = index === 0 ? '标准' : `进阶 ${index}${index > accessible ? ' 🔒' : ''}`;
          button.style.cssText = `border:1px solid ${index === this.selectedDifficulty ? '#00f3ff' : '#43516d'};border-radius:9px;padding:8px 9px;background:${index === this.selectedDifficulty ? '#12394e' : '#151b30'};color:${index > accessible ? '#65738c' : '#eaf7ff'};cursor:${index > accessible ? 'not-allowed' : 'pointer'};font-size:12px`;
          button.onclick = () => this.selectDifficulty(index);
          buttons.appendChild(button);
        });
        el.querySelector('#neon-difficulty-description').textContent =
          `${NEON_DIFFICULTIES[this.selectedDifficulty].name}：${NEON_DIFFICULTIES[this.selectedDifficulty].rule}。当前解锁至进阶 ${accessible}。`;
      }

      selectDifficulty(index) {
        if (this.state !== 'start' && this.state !== 'gameover' && this.state !== 'victory') return;
        if (!Number.isInteger(index) || index < 0 || index > this.unlockedDifficulty || index > 6) return;
        this.selectedDifficulty = index;
        SafeStorage.set('neon_difficulty_selected', String(index));
        this.renderDifficultySelector();
      }

      saveRunResults(won) {
        const key = 'neon_ascension_records_v2';
        let records = {};
        try { records = JSON.parse(SafeStorage.get(key, '{}')) || {}; } catch (e) { records = {}; }
        const index = String(this.difficulty);
        const record = records[index] || { wins: 0, attempts: 0, bestKills: 0, bestSeconds: 0 };
        record.attempts++;
        if (won) record.wins++;
        record.bestKills = Math.max(record.bestKills, this.kills);
        record.bestSeconds = Math.max(record.bestSeconds, this.survivalTime);
        records[index] = record;
        SafeStorage.set(key, JSON.stringify(records));
        if (won) {
          this.unlockedDifficulty = Math.max(this.unlockedDifficulty, Math.min(6, this.difficulty + 1));
          SafeStorage.set('neon_ascension_unlocked', String(this.unlockedDifficulty));
          this.renderDifficultySelector();
        }
      }

      initDOM() {
        this.hudLevel = document.getElementById('level-badge');
        this.hudHp = document.getElementById('hp-fill');
        this.hudDash = document.getElementById('dash-fill');
        this.hudTimer = document.getElementById('hud-timer');
        this.hudKills = document.getElementById('hud-kills');
        this.hudCrystals = document.getElementById('hud-crystals');
        this.hudXp = document.getElementById('xp-bar');
        this.bossHud = document.getElementById('boss-hud');
        this.bossHpFill = document.getElementById('boss-hp-fill');
        this.weaponsBar = document.getElementById('weapons-bar');

        this.modalStart = document.getElementById('modal-start');
        this.modalLevelup = document.getElementById('modal-levelup');
        this.modalPause = document.getElementById('modal-pause');
        this.modalGameover = document.getElementById('modal-gameover');
        this.modalVictory = document.getElementById('modal-victory');
        this.upgradeGrid = document.getElementById('upgrade-options');
        this.crtOverlay = document.getElementById('crtOverlay');
      }

      resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width * this.dpr;
        this.canvas.height = this.height * this.dpr;
        this.ctx.resetTransform();
        this.ctx.scale(this.dpr, this.dpr);
      }

      releaseJoystickTouch() {
        this.touch.active = false;
        this.touch.identifier = null;
        const joyBase = document.getElementById('joystickBase');
        if (joyBase) joyBase.style.display = 'none';
      }

      setupTouchControls() {
        const touchArea = document.getElementById('touch-controls');
        const joyBase = document.getElementById('joystickBase');
        const joyThumb = document.getElementById('joystickThumb');
        const dashBtn = document.getElementById('touch-dash-btn');
        if (!touchArea || !joyBase || !joyThumb || !dashBtn) return;

        if ('ontouchstart' in window) touchArea.style.display = 'block';

        // Only one specific finger owns the joystick. Dash touches are independent.
        window.addEventListener('touchstart', (e) => {
          if (!['playing', 'lan-client'].includes(this.state) || this.touch.active) return;
          if (e.target && typeof e.target.closest === 'function' &&
              e.target.closest('#hud, .modal-overlay, #touch-dash-btn, #astra-touch-actions, #neon-settings-modal, #neon-lan-lobby')) return;
          const rect = dashBtn.getBoundingClientRect();
          for (const t of e.changedTouches || []) {
            if (t.clientX >= rect.left && t.clientX <= rect.right &&
                t.clientY >= rect.top && t.clientY <= rect.bottom) continue;
            this.touch.identifier = t.identifier;
            this.touch.active = true;
            this.touch.startX = t.clientX;
            this.touch.startY = t.clientY;
            this.touch.currentX = t.clientX;
            this.touch.currentY = t.clientY;
            joyBase.style.display = 'block';
            joyBase.style.left = `${t.clientX}px`;
            joyBase.style.top = `${t.clientY}px`;
            joyThumb.style.left = '50%';
            joyThumb.style.top = '50%';
            break;
          }
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
          if (!this.touch.active) return;
          const t = Array.from(e.changedTouches || []).find(t => t.identifier === this.touch.identifier);
          if (!t) return; // The dash finger must not steer the ship.
          if (e.cancelable) e.preventDefault();
          this.touch.currentX = t.clientX;
          this.touch.currentY = t.clientY;
          const dx = t.clientX - this.touch.startX;
          const dy = t.clientY - this.touch.startY;
          const dist = Math.min(50, Math.hypot(dx, dy));
          const angle = Math.atan2(dy, dx);
          joyThumb.style.left = `calc(50% + ${Math.cos(angle) * dist}px)`;
          joyThumb.style.top = `calc(50% + ${Math.sin(angle) * dist}px)`;
        }, { passive: false });

        const onTouchFinish = (e) => {
          if (!this.touch.active) return;
          const ownerReleased = Array.from(e.changedTouches || [])
            .some(t => t.identifier === this.touch.identifier);
          if (ownerReleased) this.releaseJoystickTouch();
        };
        window.addEventListener('touchend', onTouchFinish);
        window.addEventListener('touchcancel', onTouchFinish);

        dashBtn.addEventListener('touchstart', (e) => {
          e.stopPropagation();
          e.preventDefault();
          this.triggerDash();
        }, { passive: false });
        dashBtn.addEventListener('keydown', (e) => {
          if (!['Enter', ' '].includes(e.key) || e.repeat ||
              !['playing', 'lan-client'].includes(this.state)) return;
          e.preventDefault();
          e.stopPropagation();
          this.triggerDash();
        });
        const spellSwitch = document.getElementById('astra-switch-spell');
        const spellCast = document.getElementById('astra-cast-spell');
        for (const [control, action] of [
          [spellSwitch, () => this.cycleAstraSpell()],
          [spellCast, () => this.castAstraSpell()]
        ]) {
          if (!control) continue;
          control.addEventListener('touchstart', event => {
            event.preventDefault();
            event.stopPropagation();
            action();
          }, { passive: false });
          control.addEventListener('click', event => {
            event.stopPropagation();
            action();
          });
        }
        const phantomDock = document.getElementById('phantom-dock-action');
        if (phantomDock) {
          phantomDock.addEventListener('touchstart', event => {
            event.preventDefault(); event.stopPropagation(); this.togglePhantomDock();
          }, { passive: false });
          phantomDock.addEventListener('click', event => {
            event.stopPropagation(); this.togglePhantomDock();
          });
        }
      }

      setupEvents() {
        window.addEventListener('resize', () => this.resize());
        document.addEventListener('fullscreenchange', () => this.updateFullscreenButton());
        document.addEventListener('webkitfullscreenchange', () => this.updateFullscreenButton());

        // Keyboard
        window.addEventListener('keydown', (e) => {
          if (this.settingsOpen) return;
          if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
          if (this.state === 'levelup' && !e.repeat) {
            const number = /^[1-5]$/.test(e.key) ? Number(e.key) - 1 : -1;
            const cards = Array.from(this.upgradeGrid?.children || [])
              .filter(card => card.upgradeId);
            if (number >= 0 && cards[number]) {
              e.preventDefault();
              this.gamepadSelectedUpgradeIdx = number;
              cards[number].click();
              return;
            }
            if (e.key === 'Escape' && this.pendingUpgradeId) {
              e.preventDefault();
              this.cancelUpgradePreview();
              return;
            }
            if (e.key === 'Enter' && !['BUTTON'].includes(e.target?.tagName)) {
              e.preventDefault();
              const card = cards[this.gamepadSelectedUpgradeIdx] || cards[0];
              if (this.pendingUpgradeId) this.confirmUpgradePreview();
              else card?.click();
              return;
            }
          }
          this.keys[e.key.toLowerCase()] = true;
          this.keys[e.code] = true;
          if (e.code === 'Space') {
            this.triggerDash();
            e.preventDefault();
          }
          if (!e.repeat && (this.state === 'playing' || this.state === 'lan-client') &&
              (this.state === 'playing' ? this.player?.shipId === 'astra' :
                this.lanCoop?.latest?.guest?.shipId === 'astra')) {
            if (e.key.toLowerCase() === 'q') {
              this.cycleAstraSpell();
              e.preventDefault();
            } else if (e.key.toLowerCase() === 'e') {
              this.castAstraSpell();
              e.preventDefault();
            }
          }
          if (!e.repeat && e.key.toLowerCase() === 'q' &&
              (this.state === 'playing' || this.state === 'lan-client') &&
              (this.state === 'playing' ? this.player?.shipId :
                this.lanCoop?.latest?.guest?.shipId) === 'phantom') {
            this.togglePhantomDock();
            e.preventDefault();
          }
          if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
            if (this.state === 'playing') this.pauseGame();
            else if (this.state === 'paused') this.resumeGame();
          }
          if (!e.repeat && e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey &&
              !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
            this.toggleFullscreen();
            e.preventDefault();
          }
        });

        window.addEventListener('keyup', (e) => {
          this.keys[e.key.toLowerCase()] = false;
          this.keys[e.code] = false;
        });

        // Mouse
        window.addEventListener('mousemove', (e) => {
          this.mouse.x = e.clientX;
          this.mouse.y = e.clientY;
        });

        window.addEventListener('mousedown', (e) => {
          if (e.button === 0) {
            this.mouse.down = true;
          } else if (e.button === 2) {
            this.triggerDash();
            e.preventDefault();
          }
        });

        window.addEventListener('mouseup', (e) => {
          if (e.button === 0) this.mouse.down = false;
        });

        window.addEventListener('contextmenu', (e) => e.preventDefault());

        this.setupTouchControls();

        // UI Buttons
        // Gamepad Vibration Toggle Button
        const btnVibrate = document.getElementById('btn-vibrate');
        const updateVibrateBtnStyle = () => {
          if (!btnVibrate) return;
          btnVibrate.textContent = this.gamepadVibrationEnabled ? '📳' : '🔕';
          btnVibrate.style.borderColor = this.gamepadVibrationEnabled ? 'var(--neon-green)' : 'rgba(255, 255, 255, 0.2)';
          btnVibrate.style.color = this.gamepadVibrationEnabled ? '#00ffaa' : '#8899aa';
          btnVibrate.title = this.gamepadVibrationEnabled ? '手柄震动：【开启】(点击关闭)' : '手柄震动：【关闭】(点击开启)';
        };
        if (btnVibrate) {
          btnVibrate.onclick = () => {
            this.toggleGamepadVibration();
            updateVibrateBtnStyle();
          };
          updateVibrateBtnStyle();
        }

        const btnTestVibrate = document.getElementById('btn-test-vibrate');
        if (btnTestVibrate) btnTestVibrate.onclick = () => this.testGamepadVibration();

        const btnFullscreen = document.getElementById('btn-fullscreen');
        if (btnFullscreen) btnFullscreen.onclick = () => this.toggleFullscreen();
        this.updateFullscreenButton();

        // Connected badge is an independent haptics test; the toggle is separate.
        const gamepadBadge = document.getElementById('gamepad-badge');
        if (gamepadBadge) {
          gamepadBadge.style.cursor = 'pointer';
          gamepadBadge.onclick = () => this.testGamepadVibration();
        }

        document.getElementById('btn-start-game').onclick = () => {
          this.sound.init();
          this.startNewGame();
        };
        const lanButton = document.getElementById('btn-lan-coop');
        if (lanButton) lanButton.onclick = () => window.NeonLanLobby?.open(this);

        document.getElementById('btn-sound').onclick = (e) => {
          const on = this.sound.toggle();
          e.currentTarget.textContent = on ? '🔊' : '🔇';
          window.NeonGameSettings?.set('sound', on, this);
        };

        let crtOn = true;
        document.getElementById('btn-crt').onclick = () => {
          crtOn = !crtOn;
          this.crtOverlay.style.opacity = crtOn ? '1' : '0';
          window.NeonGameSettings?.set('crt', crtOn, this);
        };

        document.getElementById('btn-pause').onclick = () => {
          if (this.state === 'playing') this.pauseGame();
          else if (this.state === 'paused') this.resumeGame();
        };

        document.getElementById('btn-resume').onclick = () => this.resumeGame();
        document.getElementById('btn-restart-pause').onclick = () => this.startNewGame();
        document.getElementById('btn-restart-over').onclick = () => this.showStartMenu();
        document.getElementById('btn-restart-vic').onclick = () => this.showStartMenu();
        document.getElementById('btn-endless').onclick = () => {
          this.modalVictory.classList.remove('active');
          if (window.NeonRogueEndless) window.NeonRogueEndless.start(this);
          else {
            this.endlessMode = true;
            this.state = 'playing';
            this.lastTime = performance.now();
          }
        };

        // Manual / Help Modal Events
        const btnHelp = document.getElementById('btn-help');
        if (btnHelp) btnHelp.onclick = () => this.openHelpModal();

        const btnStartHelp = document.getElementById('btn-start-help');
        if (btnStartHelp) btnStartHelp.onclick = () => this.openHelpModal();

        const btnPauseHelp = document.getElementById('btn-pause-help');
        if (btnPauseHelp) btnPauseHelp.onclick = () => this.openHelpModal();

        const btnCloseHelp = document.getElementById('btn-close-help');
        if (btnCloseHelp) btnCloseHelp.onclick = () => this.closeHelpModal();

        // Help tab switching
        const tabBtns = document.querySelectorAll('.help-tab-btn');
        tabBtns.forEach(btn => {
          btn.onclick = () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const targetTab = btn.getAttribute('data-tab');
            document.querySelectorAll('.help-section').forEach(sec => sec.classList.remove('active'));
            const sec = document.getElementById(targetTab);
            if (sec) sec.classList.add('active');
          };
        });

        // Initialize Gamepad API
        this.setupGamepad();
      }

      openHelpModal(targetTab = 'help-controls') {
        this.prevHelpState = this.state;
        if (this.state === 'playing') {
          this.state = 'paused';
        }
        const modal = document.getElementById('modal-help');
        if (modal) modal.classList.add('active');
        this.isHelpOpen = true;

        if (targetTab) {
          const tabBtns = document.querySelectorAll('.help-tab-btn');
          tabBtns.forEach(b => {
            if (b.getAttribute('data-tab') === targetTab) b.classList.add('active');
            else b.classList.remove('active');
          });
          document.querySelectorAll('.help-section').forEach(sec => {
            if (sec.id === targetTab) sec.classList.add('active');
            else sec.classList.remove('active');
          });
        }
      }

      closeHelpModal() {
        const modal = document.getElementById('modal-help');
        if (modal) modal.classList.remove('active');
        this.isHelpOpen = false;
        if (this.prevHelpState === 'playing') {
          this.state = 'playing';
          this.lastTime = performance.now();
        }
      }

      updateFullscreenButton() {
        const button = document.getElementById('btn-fullscreen');
        if (!button) return;
        const active = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
        button.textContent = active ? '⤢' : '⛶';
        button.title = active ? '退出全屏 (F)' : '进入全屏 (F)';
        button.setAttribute('aria-label', button.title);
      }

      async toggleFullscreen() {
        try {
          if (document.fullscreenElement || document.webkitFullscreenElement) {
            const exit = document.exitFullscreen || document.webkitExitFullscreen;
            if (!exit) throw new Error('unsupported');
            await exit.call(document);
          } else {
            const root = document.documentElement;
            const request = root.requestFullscreen || root.webkitRequestFullscreen;
            if (!request) throw new Error('unsupported');
            await request.call(root);
          }
        } catch (err) {
          this.showGamepadFeedback('浏览器不支持或阻止了全屏模式', '#ffba8a');
        }
        this.updateFullscreenButton();
      }

      showGamepadFeedback(message, color = '#00ffaa') {
        const status = document.getElementById('gamepad-name');
        if (status && this.gamepadIndex >= 0) {
          status.textContent = message;
          status.title = message;
        }
        this.texts.push({
          x: this.player ? this.player.x : this.width / 2,
          y: this.player ? this.player.y - 55 : this.height / 2 - 50,
          text: message,
          color,
          size: 15,
          life: 2.2,
          maxLife: 2.2
        });
      }

      async testGamepadVibration() {
        if (!this.gamepadVibrationEnabled) {
          this.showGamepadFeedback('震动已关闭，点击震动开关启用', '#ffba8a');
          return { status: 'disabled' };
        }
        const result = await GamepadHaptics.playConnected(this.gamepadIndex, 350, 0.95, 0.8);
        const feedback = {
          accepted: '浏览器已接受震动请求，请检查实际反馈',
          unsupported: '当前手柄或浏览器不支持震动接口',
          disconnected: '未检测到已连接的游戏手柄',
          rejected: '震动请求被浏览器或手柄拒绝'
        };
        this.showGamepadFeedback(feedback[result.status], result.status === 'accepted' ? '#00ffaa' : '#ffba8a');
        return result;
      }

      setupGamepad() {
        this.gamepadIndex = -1;
        this.gamepadPrevButtons = {};
        this.gamepadSelectedUpgradeIdx = 0;
        this.gamepadNavTimer = 0;
        this.gamepadCombatInputLocked = false;

        this.syncGamepadBadge = (gp) => {
          window.NeonGamepadHints?.sync(gp);
          const badge = document.getElementById('gamepad-badge');
          const testButton = document.getElementById('btn-test-vibrate');
          if (badge) badge.style.display = gp ? 'inline-flex' : 'none';
          if (testButton) testButton.style.display = gp ? 'inline-flex' : 'none';
          if (gp) {
            const name = document.getElementById('gamepad-name');
            if (name) name.textContent = GamepadHaptics.supportsRumble(gp)
              ? '已连接 · 点击测试震动' : '已连接 · 无震动接口';
          }
        };

        window.addEventListener('gamepadconnected', (e) => {
          this.gamepadIndex = e.gamepad.index;
          const haptics = GamepadHaptics.supportsRumble(e.gamepad);
          this.syncGamepadBadge(e.gamepad);
          this.texts.push({
            x: this.player ? this.player.x : this.width / 2,
            y: this.player ? this.player.y - 60 : this.height / 2 - 50,
            text: haptics ? '手柄已连接 · 点击测试震动' : '手柄已连接 · 未检测到震动接口',
            color: '#00ffaa',
            size: 18,
            life: 2.5,
            maxLife: 2.5
          });
          // Browsers can deny haptics without a user gesture. Do not claim
          // vibration on connect; the explicit test button supplies a gesture.
        });

        window.addEventListener('gamepaddisconnected', (e) => {
          const remaining = GamepadHaptics.connectedGamepads().find(gp => gp.index !== e.gamepad.index);
          this.gamepadIndex = remaining ? remaining.index : -1;
          this.syncGamepadBadge(remaining);
          if (!remaining) {
            this.gamepadMove = { x: 0, y: 0 };
            this.gamepadPrevButtons = {};
          }
          this.texts.push({
            x: this.player ? this.player.x : this.width / 2,
            y: this.player ? this.player.y - 60 : this.height / 2 - 50,
            text: '⚠️ 手柄已断开连接',
            color: '#ff3300',
            size: 16,
            life: 2.0,
            maxLife: 2.0
          });
        });
      }

      toggleGamepadVibration() {
        this.gamepadVibrationEnabled = !this.gamepadVibrationEnabled;
        SafeStorage.set('neon_vibration', this.gamepadVibrationEnabled ? 'true' : 'false');
        window.NeonGameSettings?.set('vibration', this.gamepadVibrationEnabled, this);
        if (this.gamepadVibrationEnabled) {
          // Called from a direct click: test immediately while user activation
          // is still available for browsers with haptic gesture restrictions.
          this.testGamepadVibration();
        }
        this.texts.push({
          x: this.player ? this.player.x : this.width / 2,
          y: this.player ? this.player.y - 40 : this.height / 2 - 30,
          text: this.gamepadVibrationEnabled ? '📳 手柄震动：已开启' : '🔕 手柄震动：已关闭',
          color: this.gamepadVibrationEnabled ? '#00ffaa' : '#8c9cb8',
          size: 16,
          life: 1.5,
          maxLife: 1.5
        });
      }

      vibrateGamepad(duration = 100, strong = 0.5, weak = 0.3) {
        if (!this.gamepadVibrationEnabled) return Promise.resolve({ status: 'disabled' });
        return GamepadHaptics.playConnected(this.gamepadIndex, duration, strong, weak);
      }

      rememberGamepadButtons(gp) {
        for (let i = 0; i < gp.buttons.length; i++) {
          const button = gp.buttons[i];
          this.gamepadPrevButtons[i] = Boolean(typeof button === 'object' ? button?.pressed : button > 0.5);
        }
      }

      finishGamepadMenuFrame(gp, lockCombat = false) {
        // A button used for menu confirmation must never also start a dash.
        this.rememberGamepadButtons(gp);
        this.gamepadMove = { x: 0, y: 0 };
        if (lockCombat) this.gamepadCombatInputLocked = true;
      }

      pollGamepad(dt) {
        if (typeof navigator === 'undefined' || !navigator.getGamepads) return;
        let gamepads;
        try { gamepads = navigator.getGamepads(); } catch (e) { return; }
        if (!gamepads) return;

        let gp = null;
        for (let i = 0; i < gamepads.length; i++) {
          if (gamepads[i] && gamepads[i].connected) {
            gp = gamepads[i];
            this.gamepadIndex = i;
            break;
          }
        }
        if (!gp) {
          window.NeonGamepadHints?.sync(null);
          if (this.gamepadIndex !== -1) {
            this.gamepadIndex = -1;
            this.gamepadMove = { x: 0, y: 0 };
            this.gamepadPrevButtons = {};
            this.syncGamepadBadge(null);
          }
          return;
        }

        const badge = document.getElementById('gamepad-badge');
        window.NeonGamepadHints?.sync(gp);
        if (badge && badge.style.display === 'none') this.syncGamepadBadge(gp);

        const isPressed = (btnIdx) => {
          const btn = gp.buttons[btnIdx];
          if (!btn) return false;
          return typeof btn === 'object' ? btn.pressed : btn > 0.5;
        };

        const justPressed = (btnIdx) => {
          const pressed = isPressed(btnIdx);
          const wasPressed = !!this.gamepadPrevButtons[btnIdx];
          return pressed && !wasPressed;
        };

        if (this.state === 'lan-waiting') {
          window.NeonLanReady?.pollGamepad(this.lanCoop, justPressed);
          this.finishGamepadMenuFrame(gp, true);
          return;
        }

        if (this.state === 'endless-choice') {
          window.NeonRogueUI?.pollGamepad(this, justPressed, gp);
          this.finishGamepadMenuFrame(gp, this.state === 'playing');
          return;
        }

        // 1. Upgrade Modal Navigation (state === 'levelup')
        if (this.state === 'levelup') {
          const cards = document.querySelectorAll('#upgrade-options .upgrade-card');
          if (cards.length > 0) {
            if (this.gamepadNavTimer > 0) this.gamepadNavTimer -= dt;
            else {
              const lx = gp.axes[0] || 0;
              const dLeft = isPressed(14) || lx < -0.45;
              const dRight = isPressed(15) || lx > 0.45;

              if (dLeft) {
                this.gamepadSelectedUpgradeIdx = (this.gamepadSelectedUpgradeIdx - 1 + cards.length) % cards.length;
                this.gamepadNavTimer = 0.22;
                this.sound.playLaser(500, 'sine');
              } else if (dRight) {
                this.gamepadSelectedUpgradeIdx = (this.gamepadSelectedUpgradeIdx + 1) % cards.length;
                this.gamepadNavTimer = 0.22;
                this.sound.playLaser(500, 'sine');
              }
            }

            this.gamepadSelectedUpgradeIdx = Math.max(0, Math.min(this.gamepadSelectedUpgradeIdx, cards.length - 1));

            cards.forEach((c, idx) => {
              if (idx === this.gamepadSelectedUpgradeIdx) {
                c.style.transform = 'translateY(-6px) scale(1.03)';
                c.style.borderColor = '#00f3ff';
                c.style.boxShadow = '0 0 20px rgba(0, 243, 255, 0.7)';
              } else {
                c.style.transform = '';
                c.style.borderColor = '';
                c.style.boxShadow = '';
              }
            });

            // A previews (A twice also confirms), while X/RT instantly
            // accepts the highlighted eligible card. Neither action reaches
            // the combat dash handler while the upgrade modal owns focus.
            const fastConfirm = justPressed(7) || (!this.endlessMode && justPressed(2));
            const preview = justPressed(0);
            if (fastConfirm || preview) {
              const targetCard = cards[this.gamepadSelectedUpgradeIdx] || cards[0];
              if (targetCard && !targetCard.classList?.contains('picked')) {
                if (fastConfirm) {
                  if (this.pendingUpgradeId !== targetCard.upgradeId) targetCard.click();
                  this.confirmUpgradePreview();
                } else if (this.pendingUpgradeId &&
                    this.pendingUpgradeId === targetCard.upgradeId) {
                  this.confirmUpgradePreview();
                } else {
                  targetCard.click();
                }
                this.vibrateGamepad(120, 0.4, 0.2);
              }
            }
            if (this.endlessMode && justPressed(3)) this.rerollEndlessUpgrade();
            if (this.endlessMode && justPressed(2)) {
              const chosen = this.currentUpgradeChoices?.[this.gamepadSelectedUpgradeIdx];
              if (chosen) this.banishEndlessUpgrade(chosen.id);
            }
            if (justPressed(1)) {
              this.cancelUpgradePreview();
            } // B only cancels. Never accidentally bank leftover credits.
            if (!this.endlessMode && justPressed(3) && !this.pendingUpgradeId) {
              this.finishUpgradeSelection();
            }
          } else {
            // 安全退出避免弹窗死锁
            this.finishUpgradeSelection();
          }
          this.finishGamepadMenuFrame(gp, this.state === 'playing');
          return;
        }

        // 2. Modals (Start / Help / Pause / GameOver / Victory)
        if (this.isHelpOpen) {
          if (justPressed(1) || justPressed(9) || justPressed(0)) {
            this.closeHelpModal();
          }
          this.finishGamepadMenuFrame(gp, this.state === 'playing');
          return;
        } else if (this.state === 'paused') {
          if (justPressed(9) || justPressed(1) || justPressed(0)) {
            this.resumeGame();
            this.vibrateGamepad(80, 0.3, 0.2);
          }
          this.finishGamepadMenuFrame(gp, this.state === 'playing');
          return;
        }

        // Start screen confirmation
        const modalStart = document.getElementById('modal-start');
        if (modalStart && modalStart.classList.contains('active')) {
          if (justPressed(14)) this.selectDifficulty(Math.max(0, this.selectedDifficulty - 1));
          if (justPressed(15)) this.selectDifficulty(Math.min(this.unlockedDifficulty, this.selectedDifficulty + 1));
          if (justPressed(0) || justPressed(9)) {
            const btnStart = document.getElementById('btn-start-game');
            if (btnStart) btnStart.click();
            this.vibrateGamepad(150, 0.5, 0.3);
          }
          if (justPressed(3) || justPressed(2)) {
            this.openHelpModal();
          }
          this.finishGamepadMenuFrame(gp, this.state === 'playing');
          return;
        }

        // Game Over screen
        const modalGameOver = document.getElementById('modal-gameover');
        if (modalGameOver && modalGameOver.classList.contains('active')) {
          if (justPressed(0) || justPressed(9)) {
            this.startNewGame();
            this.vibrateGamepad(150, 0.5, 0.3);
          }
          this.finishGamepadMenuFrame(gp, this.state === 'playing');
          return;
        }

        // Victory screen
        const modalVic = document.getElementById('modal-victory');
        if (modalVic && modalVic.classList.contains('active')) {
          if (justPressed(0) || justPressed(9)) {
            const btnEndless = document.getElementById('btn-endless');
            if (btnEndless) btnEndless.click();
          }
          this.finishGamepadMenuFrame(gp, this.state === 'playing');
          return;
        }

        if (this.state !== 'playing') {
          this.finishGamepadMenuFrame(gp);
          return;
        }

        // On returning from any menu, require the confirmation button to be
        // physically released before gameplay actions can be dispatched.
        if (this.gamepadCombatInputLocked) {
          const actionButtons = [0, 1, 2, 3, 4, 5, 6, 7, 9];
          const released = actionButtons.every(index => !isPressed(index));
          this.finishGamepadMenuFrame(gp);
          if (released) this.gamepadCombatInputLocked = false;
          return;
        }

        // 3. Gameplay Controls (state === 'playing')
        if (this.state === 'playing') {
          // Pause: Start button (9)
          if (justPressed(9)) {
            this.pauseGame();
            this.finishGamepadMenuFrame(gp);
            return;
          }
          if (this.player?.shipId === 'astra') {
            if (justPressed(2)) this.cycleAstraSpell();
            if (justPressed(3)) this.castAstraSpell();
          }
          if (this.player?.shipId === 'phantom' && justPressed(2)) this.togglePhantomDock();

          // Dash Trigger: A (0), B (1), RB (5), RT (7), LB (4), LT (6)
          if (justPressed(0) || justPressed(1) || justPressed(5) || justPressed(7) || justPressed(4) || justPressed(6)) {
            this.triggerDash();
            this.vibrateGamepad(120, 0.6, 0.3);
          }

          // Left Stick & D-Pad: Analog Movement
          let mx = gp.axes[0] || 0;
          let my = gp.axes[1] || 0;
          const deadzone = 0.18;
          if (Math.abs(mx) < deadzone) mx = 0;
          if (Math.abs(my) < deadzone) my = 0;

          // D-Pad override/addition
          if (isPressed(14)) mx = -1; // Left
          if (isPressed(15)) mx = 1;  // Right
          if (isPressed(12)) my = -1; // Up
          if (isPressed(13)) my = 1;  // Down

          this.gamepadMove = { x: mx, y: my };

          // Weapon targeting is always automatic, even when the right stick moves.
        }

        // Record buttons for edge detection
        this.rememberGamepadButtons(gp);
      }

      startNewGame() {
        this.state = 'playing';
        this.selectedAstraSpell = 'meteor';
        this.releaseJoystickTouch();
        if (this.lanCoop?.rtc.connected && this.lanCoop.ally) this.lanCoop.startHost();
        this.difficulty = this.selectedDifficulty;
        this.combatTelemetry = { invulnerableSeconds: 0, nukeDrops: 0, damageTaken: 0, preciseDashes: 0 };
        this.survivalTime = 0;
        this.kills = 0;
        this.totalDamageDealt = 0;
        this.endlessMode = false;
        this.bossSpawned = false;
        this.currentBoss = null;

        // Reset player
        this.player.x = 0;
        this.player.y = 0;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.hp = 100;
        this.player.maxHp = 100;
        this.player.regen = 0.8; // 原生回血
        this.player.level = 1;
        this.player.xp = 0;
        this.player.xpNeeded = this.calcXpNeeded(1);
        this.pendingLevelUps = 0;
        this.upgradeSession = null;
        this.endlessUpgradeRerolls = 2;
        this.endlessUpgradeBanishes = 2;
        this.banishedUpgrades = new Set();
        this.player.crystals = 0;
        this.player.invulnTimer = 0;
        this.player.dashCharges = 3;
        this.player.maxDashCharges = 3;
        this.player.dashRechargeTimer = 0;
        this.player.isDashing = false;
        this.player.dashTimeLeft = 0;
        this.player.dashHitEnemies = new Set();

        this.player.dmgMultiplier = 1.0;
        this.player.cdrMultiplier = 1.0;
        this.player.critRate = 0.08;
        this.player.critDmg = 1.5;
        this.player.baseSpeed = 240;
        this.player.magnetRadius = 120;
        this.player.hasCheatDeath = false;
        this.player.cheatDeathUsed = false;

        this.player.weapons = { blaster: 1 };
        this.player.passives = {};
        this.player.areaMultiplier = 1.0;
        this.player.extraProjectiles = 0;
        this.player.dashSlashDmgMult = 1.0;
        this.player.dashSlashWidthMult = 1.0;
        this.player.hasPlasmaTrail = false;
        this.player.dashUpgrades = {};
        this.player.aegisTimer = 0;
        this.player.aegisPulseTimer = 0;
        this.player.hasAegis = false;
        this.player.aegisDuration = 0;
        this.player.aegisDamage = 0;
        this.player.aegisRadius = 0;
        this.player.hasAegisBurst = false;
        this.player.hasDashBlast = false;
        this.player.dashBlastDamage = 0;
        this.player.dashBlastRadius = 0;
        this.player.hasFireTrail = false;
        this.player.fireTrailDamage = 0;
        this.player.fireTrailDuration = 0;
        this.player.hasDashCryo = false;
        this.player.dashCryoDuration = 0;
        this.player.dashAlwaysCrit = false;
        this.player.dashCombo = 0;
        this.player.dashComboUntil = 0;
        this.player.dashPreciseHit = false;
        this.player.limitBreaks = {};
        this.player.totalLimitBreaks = 0;
        // A new run must never inherit previously charged mage spells,
        // stored star anchors, phase counters or co-op shield duration.
        // Keep these resets independent of which ship will be selected.
        this.player.astra = null;
        this.player.astraArsenal = null;
        this.player.starWeave = null;
        this.player.astraTempShield = null;
        this.player.coopShield = null;
        this.player.phantom = null;
        this.player.phantomScythe = null;
        // Current Riftblade stats are identical to the historical defaults.
        // Future ships supply their initial loadout through the same factory.
        const shipStart = window.NeonShips?.startingState(this.selectedShipId);
        if (shipStart) Object.assign(this.player, shipStart);
        this.recalculateDashStats();
        window.NeonGameSettings?.apply(this); // Restore per-device preferences on every restart.

        this.bullets = [];
        this.enemies = [];
        this.enemyBullets = [];
        this.gems = [];
        this.particles = [];
        this.texts = [];
        this.orbiters = [];
        this.shockwaves = [];
        this.laserBeams = [];
        this.companionDrones = [];
        this.blackHoles = [];
        this.mines = [];
        this.lightningTethers = [];
        this.dashTrails = [];

        this.weaponTimers = { blaster: 0, tesla: 0, missiles: 0, nova: 0, laser: 0, drones: 0, blackhole: 0, cryomine: 0 };
        this.player.timers = this.weaponTimers;
        this.bossCycle = 0;
        this.lastSwarmWave = 0;
        this.lastEliteWave = 0;
        this.afkTimer = 0;
        this.lastAfkX = 0;
        this.lastAfkY = 0;
        this.spawnTimer = 0;
        this.waveTimer = 0;
        window.NeonRogueEndless?.reset(this);
        window.NeonShips?.runAbility?.(this.player, 'onStart', this);

        this.hideAllModals();
        this.bossHud.style.display = 'none';
        this.renderWeaponsHUD();
        this.updateHUD();

        this.lastTime = performance.now();
        if (!this.loopRunning) {
          this.loopRunning = true;
          requestAnimationFrame((t) => this.loop(t));
        }
      }

      hideAllModals() {
        this.modalStart.classList.remove('active');
        this.modalLevelup.classList.remove('active');
        this.modalPause.classList.remove('active');
        this.modalGameover.classList.remove('active');
        this.modalVictory.classList.remove('active');
      }

      pauseGame() {
        if (this.lanCoop?.guestMode || this.state === 'lan-client') return;
        if (this.state !== 'playing') return;
        this.state = 'paused';
        if (this.lanCoop?.ally) {
          this.lanCoop.ally.input = { dx: 0, dy: 0, aim: this.lanCoop.ally.aimAngle, dash: false };
          this.lanCoop.ally.lastInputAt = 0;
        }
        this.releaseJoystickTouch();
        try { this.renderStatsTable('pause-stats'); } catch (e) { console.error(e); }
        if (this.modalPause) this.modalPause.classList.add('active');
      }

      resumeGame() {
        if (this.lanCoop?.guestMode || this.state === 'lan-client') return;
        if (this.state !== 'paused') return;
        if (this.modalPause) this.modalPause.classList.remove('active');
        this.state = 'playing';
        this.lastTime = performance.now();
      }

      gameOver() {
        this.state = 'gameover';
        this.releaseJoystickTouch();
        this.saveRunResults(false);
        this.saveEndlessResults();
        try { this.sound.playExplosion('large'); } catch (e) {}
        try { this.renderStatsTable('gameover-stats'); } catch (e) { console.error(e); }
        if (this.modalGameover) this.modalGameover.classList.add('active');
      }

      victory() {
        if (this.state !== 'playing') return;
        this.state = 'victory';
        this.releaseJoystickTouch();
        this.saveRunResults(true);
        try { this.sound.playLevelUp(); } catch (e) {}
        try { this.renderStatsTable('victory-stats'); } catch (e) { console.error(e); }
        if (this.modalVictory) this.modalVictory.classList.add('active');
      }

      saveEndlessResults() {
        if (!this.endlessMode || !this.endlessState) return;
        const key = 'neon_endless_records_v3';
        let records = {};
        try { records = JSON.parse(SafeStorage.get(key, '{}')) || {}; } catch (error) { records = {}; }
        const tier = String(this.difficulty);
        const old = records[tier] || { attempts: 0, bestStage: 0, bestSeconds: 0, mostRelics: 0 };
        records[tier] = {
          attempts: old.attempts + 1,
          bestStage: Math.max(old.bestStage, this.endlessState.stage || 0),
          bestSeconds: Math.max(old.bestSeconds, this.survivalTime),
          mostRelics: Math.max(old.mostRelics, this.endlessState.relics.length)
        };
        SafeStorage.set(key, JSON.stringify(records));
      }

      renderStatsTable(elementId) {
        const el = document.getElementById(elementId);
        if (!el) return;
        const mins = Math.floor(this.survivalTime / 60);
        const secs = Math.floor(this.survivalTime % 60);
        const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

        // High scores storage with SafeStorage (resilient under file:// protocol)
        const prevBestTime = parseFloat(SafeStorage.get('neon_best_time', 0));
        const prevBestKills = parseInt(SafeStorage.get('neon_best_kills', 0));
        const bestTimeSec = Math.max(this.survivalTime, isNaN(prevBestTime) ? 0 : prevBestTime);
        const bestKillsNum = Math.max(this.kills, isNaN(prevBestKills) ? 0 : prevBestKills);
        SafeStorage.set('neon_best_time', bestTimeSec);
        SafeStorage.set('neon_best_kills', bestKillsNum);

        const bMins = Math.floor(bestTimeSec / 60);
        const bSecs = Math.floor(bestTimeSec % 60);
        const bestTimeStr = `${bMins.toString().padStart(2, '0')}:${bSecs.toString().padStart(2, '0')}`;

        let weaponNames = Object.keys(this.player.weapons).map(id => {
          const def = UPGRADES_DB.find(u => u.id === id);
          return `${def ? def.name : id} Lv.${this.player.weapons[id]}`;
        }).join(', ');
        const rogue = this.endlessMode && this.endlessState ? this.endlessState : null;
        const rogueStats = rogue ? `
          <div class="stat-row"><span class="lbl">无尽阶段</span><span class="val">${rogue.stage || 1}</span></div>
          <div class="stat-row"><span class="lbl">遗物 / 融合</span><span class="val">${rogue.relics.length} / ${rogue.fusions.length}</span></div>
          <div class="stat-row"><span class="lbl">战术事件成功</span><span class="val">${rogue.eventsWon} / ${rogue.eventsDone}</span></div>` : '';

        el.innerHTML = `
          <div class="stat-row"><span class="lbl">生存时间</span><span class="val">${timeStr}</span></div>
          ${rogueStats}
          <div class="stat-row"><span class="lbl">进阶难度</span><span class="val">${this.getDifficultyRules().name}</span></div>
          <div class="stat-row"><span class="lbl">无敌覆盖率</span><span class="val">${(100 * this.combatTelemetry.invulnerableSeconds / Math.max(1, this.survivalTime)).toFixed(1)}%</span></div>
          <div class="stat-row"><span class="lbl">精准折跃 / 毁灭掉落</span><span class="val">${this.combatTelemetry.preciseDashes} / ${this.combatTelemetry.nukeDrops}</span></div>
          <div class="stat-row"><span class="lbl">每秒平均输出</span><span class="val">${Math.round(this.totalDamageDealt / Math.max(1, this.survivalTime)).toLocaleString()}</span></div>
          <div class="stat-row"><span class="lbl">本局累计承伤</span><span class="val">${Math.round(this.combatTelemetry.damageTaken)}</span></div>
          <div class="stat-row"><span class="lbl">历史最长生存</span><span class="val" style="color:#ffaa00">🏆 ${bestTimeStr}</span></div>
          <div class="stat-row"><span class="lbl">本局击杀</span><span class="val">${this.kills}</span></div>
          <div class="stat-row"><span class="lbl">最高击杀纪录</span><span class="val" style="color:#ffaa00">👑 ${bestKillsNum}</span></div>
          <div class="stat-row"><span class="lbl">达到等级</span><span class="val">LV.${this.player.level}</span></div>
          <div class="stat-row"><span class="lbl">能量核采集</span><span class="val">${this.player.crystals}</span></div>
          <div class="stat-row" style="grid-column: span 2;"><span class="lbl">总造成伤害</span><span class="val">${Math.floor(this.totalDamageDealt).toLocaleString()}</span></div>
          <div class="stat-row" style="grid-column: span 2;"><span class="lbl">装配武器</span><span class="val">${weaponNames || '无'}</span></div>
        `;
      }

      cycleAstraSpell() {
        if (this.state !== 'playing' && this.state !== 'lan-client') return false;
        const id = this.state === 'lan-client' ? this.lanCoop?.latest?.guest?.shipId :
          this.player?.shipId;
        if (id !== 'astra' || this.settingsOpen) return false;
        this.selectedAstraSpell = this.selectedAstraSpell === 'ward' ? 'meteor' : 'ward';
        return true;
      }

      castAstraSpell() {
        if (this.state === 'lan-client') {
          if (this.settingsOpen || this.lanCoop?.latest?.guest?.downed) return false;
          return this.lanCoop?.requestGuestSpell(this.selectedAstraSpell || 'meteor') === true;
        }
        if (this.state !== 'playing' || this.player?.shipId !== 'astra' ||
            this.settingsOpen || this.player?.downed) return false;
        return window.NeonShips?.runAbility?.(this.player, 'onAction', this,
          this.selectedAstraSpell || 'meteor') === true;
      }

      togglePhantomDock() {
        if (this.settingsOpen) return false;
        if (this.state === 'lan-client') {
          if (this.lanCoop?.latest?.guest?.shipId !== 'phantom') return false;
          return this.lanCoop?.requestGuestShipAction('dock_toggle') === true;
        }
        if (this.state !== 'playing' || this.player?.shipId !== 'phantom' ||
            this.player.downed || this.player.hp <= 0) return false;
        if (this.player.phantom?.docked) {
          return window.NeonShips?.runAbility?.(this.player, 'onAction', this,
            { kind:'undock', eject:true }) === true;
        }
        const carrier = this.lanCoop?.ally;
        if (!carrier || !this.lanCoop?.rtc?.connected) return false;
        return window.NeonShips?.runAbility?.(this.player, 'onAction', this,
          { kind:'dock', carrier }) === true;
      }

      getWarpDirection() {
        let x = Number(Boolean(this.keys?.d || this.keys?.arrowright)) -
          Number(Boolean(this.keys?.a || this.keys?.arrowleft));
        let y = Number(Boolean(this.keys?.s || this.keys?.arrowdown)) -
          Number(Boolean(this.keys?.w || this.keys?.arrowup));
        if (this.touch?.active) {
          x = this.touch.currentX - this.touch.startX;
          y = this.touch.currentY - this.touch.startY;
        } else if (this.gamepadMove &&
          Math.hypot(this.gamepadMove.x,this.gamepadMove.y) > .2) {
          x = this.gamepadMove.x; y = this.gamepadMove.y;
        } else if (typeof navigator !== 'undefined' && navigator.getGamepads) {
          const gp = navigator.getGamepads()?.[this.gamepadIndex];
          const gx = Number.isFinite(gp?.axes?.[0]) ? gp.axes[0] : 0;
          const gy = Number.isFinite(gp?.axes?.[1]) ? gp.axes[1] : 0;
          if (Math.hypot(gx,gy) > .22) { x=gx; y=gy; }
        }
        const length=Math.hypot(x,y);
        if (Number.isFinite(length) && length>.05) return {x:x/length,y:y/length};
        const aim=Number.isFinite(this.player?.aimAngle)?this.player.aimAngle:0;
        return {x:Math.cos(aim),y:Math.sin(aim)};
      }

      triggerDash() {
        if (this.state === 'lan-client' && this.lanCoop?.guestMode) {
          if (this.lanCoop.latest?.guest?.downed) return;
          this.lanCoop.dashQueued = true;
          return;
        }
        // Every additional ship implements one common warp hook. The game
        // controller neither knows its action names nor computes its damage.
        if (this.state === 'playing' && this.player?.shipId &&
            this.player.shipId !== 'riftblade') {
          if (!this.player.downed && this.player.hp > 0 &&
              window.NeonShips?.runAbility?.(this.player,'onAction',this,
                {kind:'warp',direction:this.getWarpDirection()}) === true) {
            this.sound?.playDash?.();
            this.lanCoop?.onHostDash();
          }
          return;
        }
        if (this.player?.downed) return;
        if (this.player.dashCharges <= 0 || this.player.isDashing || this.state !== 'playing') return;
        this.lanCoop?.onHostDash();
        window.NeonRogueEndless?.onDash(this);
        if (this.survivalTime > (this.player.dashComboUntil || 0)) this.player.dashCombo = 0;
        this.player.dashPreciseHit = false;
        this.player.dashCharges--;
        this.player.isDashing = true;
        this.player.dashTimeLeft = this.player.dashDuration;
        // Movement and aura protection overlap rather than summing into a long immunity window.
        const dashProtection = this.player.dashDuration + 0.08 + (this.player.dashInvulnBonus || 0);
        this.player.invulnTimer = Math.max(this.player.invulnTimer,
          Math.min(0.40, Math.max(dashProtection, this.player.hasAegis ? this.player.aegisDuration : 0)));
        if (this.player.hasAegis) {
          this.player.aegisTimer = this.player.aegisDuration;
          this.player.aegisPulseTimer = 0;
        }
        this.player.dashStartX = this.player.x;
        this.player.dashStartY = this.player.y;
        this.player.dashHitEnemies = new Set();
        this.sound.playDash();

        this.vibrateGamepad(100, 0.45, 0.2);
        this.player.dashDir = this.getWarpDirection();

        // Spawn warp slash shockwave
        this.shockwaves.push({
          x: this.player.x,
          y: this.player.y,
          radius: 15,
          maxRadius: 75,
          alpha: 1.0,
          color: '#00f3ff'
        });
      }

      /* ========================================================================
         5. UPGRADE SYSTEM & LEVEL UP
         ======================================================================== */
      calcXpNeeded(level) {
        // Balanced roguelite curve: steady, meaningful progression
        // Lv 1: 25, Lv 2: 50, Lv 3: 80, Lv 5: 160, Lv 8: 320, Lv 10: 460, Lv 15: 890, Lv 20: 1420
        return Math.floor(25 + level * 18 + Math.pow(level, 1.45) * 8);
      }

      gainXP(amount) {
        // Magnet upgrade bonus XP multiplier
        // A corrupted/overflowing drop must never stall the RAF thread in
        // an unbounded level-up loop or create hundreds of upgrade dialogs.
        if (!Number.isFinite(amount) || amount <= 0) return;
        const xpBonus = 1 + Math.min(5, Math.max(0, this.player.passives?.magnet || 0)) * .15;
        if (!Number.isFinite(this.player.xpNeeded) || this.player.xpNeeded <= 0)
          this.player.xpNeeded = this.calcXpNeeded(Math.max(1, this.player.level || 1));
        const need = Math.max(1, Number.isFinite(this.player.xpNeeded) ? this.player.xpNeeded :
          this.calcXpNeeded(Math.max(1, this.player.level || 1)));
        const earned = Math.min(Math.round(amount * xpBonus), Math.max(300, need * 3));
        if (!Number.isFinite(this.player.xp) || this.player.xp < 0) this.player.xp = 0;
        this.player.xp = Math.min(this.player.xp + earned, need * 8);
        this.player.crystals++;

        let shouldLevelUp = false;
        let levelUps = 0;
        while (levelUps < 8 && Number.isFinite(this.player.xpNeeded) &&
          this.player.xpNeeded > 0 && this.player.xp >= this.player.xpNeeded) {
          this.player.xp -= this.player.xpNeeded;
          this.player.level++;
          levelUps++;
          this.player.xpNeeded = this.calcXpNeeded(this.player.level);
          this.pendingLevelUps = (this.pendingLevelUps || 0) + 1;
          shouldLevelUp = true;
        }
        // One authoritative LAN team level, regardless of which pilot collected XP.
        window.NeonLanExperience?.synchronizeLevel(this);
        // 裸等级成长：升级即刷新移速（含硬上限）与冲刺斩等级项
        if (shouldLevelUp) {
          this.recalculateMoveSpeed();
          this.recalculateDashStats();
        }
        if (shouldLevelUp && this.state === 'playing') {
          this.triggerLevelUp();
        }
        this.updateHUD();
      }

      getUpgradeChoiceCount() {
        // Standard / Ascension I-II: five, III-IV: four, V-VI: three.
        return this.difficulty >= 5 ? 3 : this.difficulty >= 3 ? 4 : 5;
      }

      getUpgradeCatalog(player = this.player) {
        // Each playable ship may register its own complete upgrade deck.
        // The original ship retains the exact historical card table.
        return window.NeonShips?.upgradeCatalogFor(player) || UPGRADES_DB;
      }

      isUpgradeAvailableFor(player, upgrade, banished = null) {
        if (!upgrade || banished?.has(upgrade.id)) return false;
        if (window.NeonShips?.canEquipUpgrade) {
          return window.NeonShips.canEquipUpgrade(player, upgrade, this.difficulty);
        }
        const field = upgrade.type === 'weapon' ? 'weapons' :
          upgrade.type === 'passive' ? 'passives' :
            upgrade.type === 'dash' ? 'dashUpgrades' : null;
        if (!field) return false;
        const loadout = player[field] || {};
        const level = loadout[upgrade.id] || 0;
        if (level >= upgrade.maxLvl) return false;
        if (level > 0) return true;
        const limits = this.getUpgradeSlotLimits(player);
        return Object.keys(loadout).length <
          (upgrade.type === 'weapon' ? limits.weapons :
            upgrade.type === 'passive' ? limits.passives : limits.warp);
      }

      triggerLevelUp() {
        if ((this.pendingLevelUps || 0) <= 0) return;
        this.pendingUpgradeId = null;
        this.upgradeSession = { picked: new Set(), capacity: Math.min(3, this.pendingLevelUps) };
        const count = this.getUpgradeChoiceCount();
        const catalog = this.getUpgradeCatalog(this.player);
        const eligible = catalog.filter(u =>
          this.isUpgradeAvailableFor(this.player, u, this.banishedUpgrades));

        // If all standard upgrades are maxed, activate infinite Limit Break!
        this.levelupEligible = eligible;
        let choices = [];
        if (eligible.length === 0) {
          choices = this.getLimitBreakChoices(count);
        } else {
          choices = window.NeonUpgradeRarity?.pickForPilot(
            eligible, count, this.difficulty, this.player, catalog) ||
            [...eligible].sort(() => Math.random() - 0.5).slice(0, count);
          if (choices.length < count) {
            const lbChoices = this.getLimitBreakChoices(count);
            for (const lbc of lbChoices) {
              if (choices.length < count && !choices.some(c => c.id === lbc.id)) {
                choices.push(lbc);
              }
            }
          }
        }

        // Host and guest independently roll cards in the same paused phase.
        this.lanCoop?.prepareGuestUpgrade?.();
        this.state = 'levelup';
        this.gamepadSelectedUpgradeIdx = 0;
        try { this.sound.playLevelUp(); } catch (e) {}
        this.shockwaves.push({
          x: this.player.x,
          y: this.player.y,
          radius: 20,
          maxRadius: 180,
          alpha: 1,
          color: '#9d00ff'
        });

        this.renderUpgradeChoices(choices);
        if (this.modalLevelup) this.modalLevelup.classList.add('active');
      }

      // Co-op upgrade selection uses the SAME upgrade definitions and cards as
      // solo mode, while authority to validate choices stays on the host.
      getCoopUpgradeDefinition(id, player = this.player) {
        return (this.getUpgradeCatalog?.(player) || UPGRADES_DB)
          .find(upgrade => upgrade.id === id) || null;
      }

      getCoopUpgradeChoices(ally) {
        const catalog = this.getUpgradeCatalog(ally);
        const eligible = catalog.filter(upgrade =>
          this.isUpgradeAvailableFor(ally, upgrade));
        const choices = window.NeonUpgradeRarity?.pickForPilot(
          eligible, this.getUpgradeChoiceCount(), this.difficulty, ally, catalog) ||
          [...eligible].sort(() => Math.random() - 0.5).slice(0, this.getUpgradeChoiceCount());
        ally.legendaryPityId = choices.find(upgrade => upgrade.pityGuaranteed)?.id || null;
        return choices.map(upgrade => upgrade.id);
      }

      getLimitBreakChoices(count = this.getUpgradeChoiceCount()) {
        const equippedList = [
          ...Object.keys(this.player.weapons).map(id => ({ id, type: 'weapon' })),
          ...Object.keys(this.player.passives).map(id => ({ id, type: 'passive' })),
          { id: 'dash_dmg', type: 'dash' }
        ];

        // Include any unlocked special dash branches into the infinite limit break pool
        if (this.player.hasAegis || (this.player.dashUpgrades && this.player.dashUpgrades['dash_aegis'])) {
          equippedList.push({ id: 'dash_aegis', type: 'dash' });
        }
        if (this.player.hasDashBlast || (this.player.dashUpgrades && this.player.dashUpgrades['dash_blast'])) {
          equippedList.push({ id: 'dash_blast', type: 'dash' });
        }
        if (this.player.hasFireTrail || (this.player.dashUpgrades && this.player.dashUpgrades['dash_fire'])) {
          equippedList.push({ id: 'dash_fire', type: 'dash' });
        }
        if (this.player.hasDashCryo || (this.player.dashUpgrades && this.player.dashUpgrades['dash_cryo'])) {
          equippedList.push({ id: 'dash_cryo', type: 'dash' });
        }

        const shuffled = equippedList.filter(item => !this.banishedUpgrades?.has(item.id)).sort(() => Math.random() - 0.5);
        const picked = shuffled.slice(0, count);

        return picked.map(item => {
          const def = UPGRADES_DB.find(u => u.id === item.id);
          const currentLb = (this.player.limitBreaks && this.player.limitBreaks[item.id]) || 0;
          const nextLb = currentLb + 1;

          let statDesc = '';
          if (item.type === 'weapon') {
            if (item.id === 'missiles') {
              statDesc = `蜂巢超载：重型聚合弹+1枚，裂变子弹伤害+25%，全弹爆炸半径+15%！`;
            } else {
              statDesc = `全弹道伤害 +12%，弹速/范围/攻速全面超频！`;
            }
          } else if (item.type === 'dash') {
            if (item.id === 'dash_aegis') {
              statDesc = `时空光环伤害 +25%、范围 +10%，防护时间不超过0.40秒！`;
            } else if (item.id === 'dash_dmg') {
              statDesc = `折跃斩切割伤害 +25%（可无限叠加），暴击伤害 +20%！`;
            } else if (item.id === 'dash_blast') {
              statDesc = `落点爆轰伤害 +30%，超新星冲击半径 +15%！`;
            } else if (item.id === 'dash_fire') {
              statDesc = `等离子火墙伤害 +25%，燃烧持续时间 +0.5秒！`;
            } else if (item.id === 'dash_cryo') {
              statDesc = `冰霜冻结时间 +0.5秒，冰霜易伤加成 +15%！`;
            } else {
              statDesc = `折跃充能速度 +15%，机动航速全面提升！`;
            }
          } else {
            if (item.id === 'armor') {
              statDesc = `最大生命 +12，瞬间抢修回复 35 点生命！`;
            } else if (item.id === 'power') {
              statDesc = `强核超聚变：全局总伤害额外 +6%！`;
            } else if (item.id === 'haste') {
              statDesc = `超频晶振：全武器冷却额外缩减 -3%！`;
            } else if (item.id === 'crit') {
              statDesc = `弱点死局：暴击率 +2%，暴击伤害 +15%！`;
            } else if (item.id === 'area') {
              statDesc = `空间扩张：全域攻击范围与弹体尺寸 +6%！`;
            } else if (item.id === 'thruster') {
              statDesc = `曲率航行：移动速度 +5%，冲刺恢复加速 +5%！`;
            } else if (item.id === 'multishot') {
              statDesc = `火控超频：全武器伤害 +5%，不再无限增加弹药数量！`;
            } else {
              statDesc = `引力坍缩：核心拾取范围 +15%，伤害 +5%！`;
            }
          }

          return {
            id: item.id,
            type: 'limit_break',
            subType: item.type,
            name: `${def ? def.name : item.id}【超频破限】`,
            icon: def ? def.icon : '⚡',
            rarity: 'legendary',
            desc: `战力破限过载！超越常规上限的无限潜能强化！`,
            statText: [statDesc],
            lbCount: nextLb
          };
        });
      }

      nextEndlessUpgradeChoices() {
        const pool = (this.levelupEligible || []).filter(u =>
          !this.banishedUpgrades?.has(u.id) && !this.upgradeSession?.picked.has(u.id) &&
          this.isUpgradeAvailableFor(this.player, u));
        const alternatives = pool.filter(u => !(this.currentUpgradeChoices || []).some(chosen => chosen.id === u.id));
        const count = this.getUpgradeChoiceCount();
        const pityActive = this.player.level >= (window.NeonUpgradeRarity?.PITY_LEVEL || 10) &&
          !window.NeonUpgradeRarity?.hasLegendary(this.player, UPGRADES_DB);
        // Reroll should not accidentally exclude the only remaining legendary.
        const candidates = alternatives.length >= count &&
          (!pityActive || alternatives.some(card => card.rarity === 'legendary'))
          ? alternatives : pool;
        if (!candidates.length) return this.getLimitBreakChoices();
        const result = window.NeonUpgradeRarity?.pickForPilot(
          candidates, count, this.difficulty, this.player, UPGRADES_DB) ||
          window.NeonRogueEndless.pickUpgrades(candidates, count, Math.random, this.difficulty);
        if (result.length < count) {
          for (const option of this.getLimitBreakChoices(count)) {
            if (result.length >= count) break;
            if (!result.some(item => item.id === option.id)) result.push(option);
          }
        }
        return result;
      }

      rerollEndlessUpgrade() {
        if (!this.endlessMode || this.state !== 'levelup' || this.endlessUpgradeRerolls <= 0) return false;
        this.endlessUpgradeRerolls--;
        this.gamepadSelectedUpgradeIdx = 0;
        this.renderUpgradeChoices(this.nextEndlessUpgradeChoices());
        return true;
      }

      banishEndlessUpgrade(id) {
        if (!this.endlessMode || this.state !== 'levelup' || this.endlessUpgradeBanishes <= 0) return false;
        if (this.upgradeSession?.picked.has(id)) return false;
        if (this.banishedUpgrades.has(id) || !(this.currentUpgradeChoices || []).some(c => c.id === id)) return false;
        this.endlessUpgradeBanishes--;
        this.banishedUpgrades.add(id);
        this.gamepadSelectedUpgradeIdx = 0;
        this.renderUpgradeChoices(this.nextEndlessUpgradeChoices());
        return true;
      }

      skipEndlessUpgrade() {
        if (!this.endlessMode || this.state !== 'levelup' || this.pendingUpgradeId) return false;
        this.player.crystals += 12;
        this.pendingLevelUps = Math.max(0, (this.pendingLevelUps || 1) - 1);
        // One opportunity is exchanged for crystals; the rest stay banked.
        return this.finishUpgradeSelection();
      }

      finishUpgradeSelection() {
        if (this.state !== 'levelup') return false;
        if (this.pendingUpgradeId) return false; // A preview is not a confirmed upgrade.
        this.upgradeSession = null;
        this.modalLevelup?.classList.remove('active');
        if (!this.lanCoop?.waitForGuestUpgrade?.()) {
          this.state = 'playing';
          this.lastTime = performance.now();
        }
        this.gamepadCombatInputLocked = true;
        return true;
      }

      selectUpgradePreview(upgrade) {
        if (!upgrade || !(this.currentUpgradeChoices || []).some(item => item.id === upgrade.id) ||
            upgrade.alreadyChosen || this.upgradeSession?.picked?.has(upgrade.id)) return false;
        if (typeof this.onUpgradePick !== 'function' &&
            ((this.state !== 'levelup') || (this.pendingLevelUps || 0) <= 0 ||
              (this.upgradeSession && this.upgradeSession.picked.size >= this.upgradeSession.capacity) ||
              (upgrade.type !== 'limit_break' &&
                !this.isUpgradeAvailableFor(this.player, upgrade, this.banishedUpgrades)))) return false;
        this.pendingUpgradeId = upgrade.id;
        const index = this.currentUpgradeChoices.findIndex(item => item.id === upgrade.id);
        if (index >= 0) this.gamepadSelectedUpgradeIdx = index;
        this.refreshUpgradePreview();
        return true;
      }

      refreshUpgradePreview() {
        for (const card of Array.from(this.upgradeGrid?.children || [])) {
          if (!card.upgradeId) continue;
          const selected = this.pendingUpgradeId === card.upgradeId;
          card.className = (card.className || '').replace(/\s*selected-pending\b/g, '') +
            (selected ? ' selected-pending' : '');
          card.setAttribute?.('aria-pressed', String(selected));
        }
        this.refreshUpgradeControls();
      }

      cancelUpgradePreview() {
        if (!this.pendingUpgradeId) return false;
        this.pendingUpgradeId = null;
        this.refreshUpgradePreview();
        return true;
      }

      confirmUpgradePreview() {
        const id = this.pendingUpgradeId;
        const upgrade = (this.currentUpgradeChoices || []).find(item => item.id === id);
        if (!upgrade || upgrade.alreadyChosen || this.upgradeSession?.picked?.has(id)) return false;
        if (typeof this.onUpgradePick === 'function') {
          // Guest sends the choice ONLY after explicit confirmation. Keep the
          // preview if the DataChannel is unavailable so it can be retried.
          if (this.onUpgradePick(upgrade) !== true) return false;
          this.pendingUpgradeId = null;
          return true;
        }
        if (this.state !== 'levelup' || (this.pendingLevelUps || 0) <= 0 ||
            (this.upgradeSession && this.upgradeSession.picked.size >= this.upgradeSession.capacity) ||
            (upgrade.type !== 'limit_break' &&
              !this.isUpgradeAvailableFor(this.player, upgrade, this.banishedUpgrades))) {
          this.cancelUpgradePreview();
          return false;
        }
        try {
          if (upgrade.type === 'limit_break') this.applyLimitBreak(upgrade);
          else this.applyUpgrade(upgrade);
        } catch (error) {
          console.error('Upgrade application error caught:', error);
          return false;
        }
        this.pendingUpgradeId = null;
        this.pendingLevelUps = Math.max(0, this.pendingLevelUps - 1);
        this.upgradeSession?.picked?.add(id);
        const committedCard = Array.from(this.upgradeGrid?.children || [])
          .find(card => card.upgradeId === id);
        if (committedCard) {
          committedCard.className = (committedCard.className || '')
            .replace(/\s*selected-pending\b/g, '') + ' picked';
          committedCard.setAttribute?.('tabindex', '-1');
        }
        const session = this.upgradeSession;
        const hasMore = this.currentUpgradeChoices?.some(option =>
          !session?.picked?.has(option.id) &&
          (option.type === 'limit_break' ||
            this.isUpgradeAvailableFor(this.player, option, this.banishedUpgrades)));
        if (this.pendingLevelUps <= 0 ||
            (session && session.picked.size >= session.capacity) || !hasMore) {
          this.finishUpgradeSelection();
        } else {
          this.refreshUpgradePreview();
        }
        return true;
      }

      refreshUpgradeControls() {
        const parent = this.upgradeGrid?.parentNode;
        if (!parent) return;
        let controls = parent.querySelector?.('#upgrade-bank-actions');
        if (!controls) {
          controls = document.createElement('div');
          controls.id = 'upgrade-bank-actions';
          controls.className = 'upgrade-bank-actions';
          parent.appendChild(controls);
        }
        controls.replaceChildren();
        const credits = this.onUpgradePick ? this.guestUpgradeCredits : this.pendingLevelUps;
        const chosen = this.onUpgradePick ? this.guestUpgradeChosen : this.upgradeSession?.picked?.size || 0;
        const cap = this.onUpgradePick ? this.guestUpgradeCapacity : this.upgradeSession?.capacity || 1;
        const info = document.createElement('span');
        info.textContent = `本轮 ${chosen}/${cap} 次 · 剩余 ${credits || 0} 次强化机会（可保留）`;
        controls.appendChild(info);
        const pending = (this.currentUpgradeChoices || []).find(card => card.id === this.pendingUpgradeId);
        const selection = document.createElement('span');
        selection.className = 'upgrade-preview-label';
        selection.textContent = pending ? `待确认：${pending.name}（尚未生效）` : '先点选卡片，再点击确定升级';
        controls.appendChild(selection);
        const confirm = document.createElement('button');
        confirm.type = 'button';
        confirm.className = 'upgrade-confirm-btn';
        confirm.textContent = '确定升级';
        confirm.disabled = !pending;
        confirm.onclick = () => this.confirmUpgradePreview();
        confirm.setAttribute?.('data-gamepad-action', 'rt');
        const confirmHint = window.NeonGamepadHints?.keyBadge('rt');
        if (confirmHint) confirm.appendChild(confirmHint);
        controls.appendChild(confirm);
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.className = 'upgrade-cancel-btn';
        cancel.textContent = '取消选择';
        cancel.disabled = !pending;
        cancel.onclick = () => this.cancelUpgradePreview();
        cancel.setAttribute?.('data-gamepad-action', 'b');
        const cancelHint = window.NeonGamepadHints?.keyBadge('b');
        if (cancelHint) cancel.appendChild(cancelHint);
        controls.appendChild(cancel);
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = credits ? `保留剩余 ${credits} 次并继续` : '完成选择';
        button.disabled = Boolean(pending);
        button.onclick = () => {
          if (this.pendingUpgradeId) return false;
          return this.onUpgradeFinish ? this.onUpgradeFinish() : this.finishUpgradeSelection();
        };
        button.setAttribute?.('data-gamepad-action', 'y');
        const bankHint = window.NeonGamepadHints?.keyBadge('y');
        if (bankHint) button.appendChild(bankHint);
        controls.appendChild(button);
        const hints = document.createElement('div');
        hints.className = 'neon-gamepad-hint-row';
        const hint = window.NeonGamepadHints;
        if (hint) {
          hints.append(
            hint.prompt('左右切换', 'lb'), hint.prompt('预选', 'a'),
            hint.prompt(this.endlessMode ? '放逐' : '快速确认', 'x'),
            hint.prompt('快速确认', 'rt'),
            hint.prompt('取消预选', 'b'),
            hint.prompt(this.endlessMode ? '重掷' : '保留机会', 'y')
          );
          controls.appendChild(hints);
        }
      }

      renderUpgradeChoices(choices) {
        this.upgradeGrid.innerHTML = '';
        this.pendingUpgradeId = null;
        this.currentUpgradeChoices = choices;
        const weights = window.NeonUpgradeRarity?.weights(this.difficulty);
        const subtitle = this.modalLevelup?.querySelector?.('.modal-sub');
        if (subtitle && weights) {
          const total = weights.common + weights.rare + weights.legendary;
          const pct = tier => (100 * weights[tier] / total).toFixed(1).replace(/\.0$/, '');
          subtitle.textContent = `各稀有度均可选时：普通 ${pct('common')}% · 稀有 ${pct('rare')}% · 传说 ${pct('legendary')}%（抽空后重分配）` +
            (choices.some(card => card.pityGuaranteed) ? ' · 已触发10级传说保底' : '');
        }
        const weaponCount = Object.keys(this.player.weapons).length;
        const passiveCount = Object.keys(this.player.passives).length;
        const slotLimits = this.getUpgradeSlotLimits(this.player);

        choices.forEach(upg => {
          const isDash = upg.type === 'dash';
          const isLb = upg.type === 'limit_break';
          const isWeapon = upg.type === 'weapon' || upg.subType === 'weapon';
          const curLvl = isDash
            ? ((this.player.dashUpgrades && this.player.dashUpgrades[upg.id]) || 0)
            : (isWeapon ? (this.player.weapons[upg.id] || 0) : (this.player.passives[upg.id] || 0));
          const nextLvl = curLvl + 1;
          const nextText = upg.statText[nextLvl - 1] || upg.statText[0] || '属性全面提升';

          const isNew = curLvl === 0 && !isLb && !isDash;
          let badgeText = '';
          let badgeColor = '#00f3ff';
          if (isDash) {
            badgeText = `⚡ 折跃特化 ➔ Lv.${nextLvl}`;
            badgeColor = '#00f3ff';
          } else if (isLb) {
            badgeText = `⚡ 破限 +${upg.lbCount}`;
            badgeColor = '#ffea00';
          } else if (isNew) {
            badgeText = isWeapon ? `✨ 新武器 (已用 ${weaponCount}/${slotLimits.weapons})` :
              `🔷 新模组 (已用 ${passiveCount}/${slotLimits.passives})`;
            badgeColor = '#00ffaa';
          } else {
            badgeText = `强化 ➔ Lv.${nextLvl}`;
          }

          const card = document.createElement('div');
          card.upgradeId = upg.id;
          card.setAttribute?.('role', 'button');
          card.setAttribute?.('tabindex', upg.alreadyChosen || this.upgradeSession?.picked?.has(upg.id) ? '-1' : '0');
          card.setAttribute?.('aria-pressed', 'false');
          const alreadyPicked = upg.alreadyChosen || this.upgradeSession?.picked.has(upg.id);
          card.className = `upgrade-card ${upg.rarity} ${isLb ? 'limit-break' : ''} ${isDash ? 'dash-card' : ''} ${alreadyPicked ? 'picked' : ''}`;
          card.innerHTML = `
            <div class="rarity-tag" style="${upg.pityGuaranteed ? 'color:#ffd700;background:rgba(255,215,0,0.25);' : (isLb ? 'color:#ffd700;background:rgba(255,215,0,0.25);' : (isDash ? 'color:#00f3ff;background:rgba(0,243,255,0.2);' : ''))}">${upg.pityGuaranteed ? '★ 传说保底' : (isDash ? 'WARP UPGRADE' : (isLb ? 'LIMIT BREAK' : upg.rarity))}</div>
            <div class="upgrade-icon">${upg.icon}</div>
            <div class="upgrade-name">${upg.name}</div>
            <div class="upgrade-desc">${upg.desc}</div>
            <div class="upgrade-lvl" style="color:${badgeColor};font-weight:700;">${badgeText}</div>
            <div style="font-size:11px;color:${isLb ? '#ffd700' : (isDash ? '#00f3ff' : '#9cb0d0')};margin-top:6px;font-weight:600;">⚡ ${nextText}</div>
          `;

          card.onclick = () => {
            this.selectUpgradePreview(upg);
          };
          card.onkeydown = event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              this.selectUpgradePreview(upg);
            }
          };
          if (this.endlessMode && this.endlessUpgradeBanishes > 0) {
            const banish = document.createElement('button');
            banish.type = 'button';
            banish.textContent = '禁用此项';
            banish.title = '本局不再出现此项升级';
            banish.style.cssText = 'margin-top:9px;padding:5px 10px;border:1px solid #f66;color:#ffb9b9;background:#341827;border-radius:7px;font-size:11px;cursor:pointer;';
            banish.onclick = event => {
              event.stopPropagation();
              this.banishEndlessUpgrade(upg.id);
            };
            card.appendChild(banish);
          }

          this.upgradeGrid.appendChild(card);
        });
        this.refreshUpgradeControls();
        const parent = this.upgradeGrid.parentNode;
        let controls = document.getElementById('endless-upgrade-actions');
        if (!controls && parent) {
          controls = document.createElement('div');
          controls.id = 'endless-upgrade-actions';
          controls.style.cssText = 'display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:14px 0 0;';
          parent.appendChild(controls);
        }
        if (controls) {
          controls.replaceChildren();
          controls.style.display = this.endlessMode ? 'flex' : 'none';
          if (this.endlessMode) {
            const addAction = (caption, action, disabled = false) => {
              const btn = document.createElement('button');
              btn.type = 'button';
              btn.textContent = caption;
              btn.disabled = disabled;
              btn.style.cssText = 'border:1px solid #337f9c;background:#122b3e;color:#c9edff;border-radius:10px;padding:8px 14px;cursor:pointer;opacity:' + (disabled ? '.4' : '1');
              btn.onclick = action;
              controls.appendChild(btn);
            };
            addAction('重随 Y · ' + this.endlessUpgradeRerolls, () => this.rerollEndlessUpgrade(), this.endlessUpgradeRerolls <= 0);
            addAction('跳过 · +12晶体', () => this.skipEndlessUpgrade());
            const label = document.createElement('span');
            label.style.cssText = 'font-size:11px;color:#9fb5c9;align-self:center;';
            label.textContent = '禁用余量 ' + this.endlessUpgradeBanishes + '（手柄X禁用选中卡）';
            controls.appendChild(label);
          }
        }
      }

      applyUpgrade(upg) {
        // Class-specific actions are provided by ship plugins; returning true
        // means the hook already applied the card and its side effects.
        if (window.NeonShips?.runAbility?.(this.player, 'onUpgrade', this, upg) === true) {
          this.renderWeaponsHUD();
          return;
        }
        if (upg.type === 'dash') {
          if (!this.player.dashUpgrades) this.player.dashUpgrades = {};
          this.player.dashUpgrades[upg.id] = (this.player.dashUpgrades[upg.id] || 0) + 1;
          this.recalculateDashStats();
        } else if (upg.type === 'weapon') {
          this.player.weapons[upg.id] = (this.player.weapons[upg.id] || 0) + 1;
          if (upg.id === 'orbit') this.syncOrbiters();
          if (upg.id === 'drones') this.syncDrones();
        } else {
          this.player.passives[upg.id] = (this.player.passives[upg.id] || 0) + 1;
          this.recalculatePassives();
          if (upg.id === 'multishot' && this.player.weapons.orbit) this.syncOrbiters();
        }
        this.renderWeaponsHUD();
      }

      applyLimitBreak(upg) {
        if (!this.player.limitBreaks) this.player.limitBreaks = {};
        this.player.limitBreaks[upg.id] = (this.player.limitBreaks[upg.id] || 0) + 1;
        this.player.totalLimitBreaks = (this.player.totalLimitBreaks || 0) + 1;

        if (upg.subType === 'weapon') {
          this.player.dmgMultiplier += 0.12;
          this.player.areaMultiplier += 0.03;
          if (upg.id === 'missiles') {
            this.player.missileLb = (this.player.missileLb || 0) + 1;
          }
        } else {
          if (upg.id === 'dash_aegis') {
            // Applied centrally by recalculateDashStats; duration is intentionally capped.
          } else if (upg.id === 'dash_dmg') {
            this.player.dashSlashDmg = Math.round((this.player.dashSlashDmg || 95) * 1.25);
            this.player.dashSlashDmgMult = (this.player.dashSlashDmgMult || 1.0) + 0.25;
          } else if (upg.id === 'dash_blast') {
            this.player.dashBlastDamage = Math.round((this.player.dashBlastDamage || 140) * 1.30);
            this.player.dashBlastRadius = Math.round((this.player.dashBlastRadius || 110) * 1.15);
          } else if (upg.id === 'dash_fire') {
            this.player.fireTrailDamage = Math.round((this.player.fireTrailDamage || 60) * 1.25);
            this.player.fireTrailDuration += 0.5;
          } else if (upg.id === 'dash_cryo') {
            this.player.dashCryoDuration += 0.5;
          } else if (upg.id === 'armor') {
            this.player.maxHp += 12;
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + 35);
          } else if (upg.id === 'power') {
            this.player.dmgMultiplier += 0.06;
          } else if (upg.id === 'haste') {
            this.player.cdrMultiplier = Math.max(0.18, this.player.cdrMultiplier * 0.97);
          } else if (upg.id === 'crit') {
            this.player.critRate = Math.min(0.95, this.player.critRate + 0.02);
            this.player.critDmg += 0.15;
          } else if (upg.id === 'area') {
            this.player.areaMultiplier += 0.06;
          } else if (upg.id === 'thruster') {
            // 破限移速走统一公式，防止绕过硬上限
            this.recalculateMoveSpeed();
          } else {
            this.player.dmgMultiplier += 0.05;
          }
        }

        this.sound.playLevelUp();
        this.screenShake = 10;
        this.texts.push({
          x: this.player.x,
          y: this.player.y - 35,
          text: `⚡ ${upg.name} +${upg.lbCount}!`,
          color: '#ffea00',
          size: 20,
          life: 2.0,
          maxLife: 2.0
        });

        this.recalculateDashStats();
        this.renderWeaponsHUD();
      }

      recalculateMoveSpeed() {
        // 等级移速成长：每级+6，最多+120；全局硬上限385（推进器/破限叠加也不超）
        const LEVEL_SPEED_CAP = 120;
        const TOTAL_SPEED_CAP = 385;
        const p = this.player.passives || {};
        const levelBonus = Math.min(LEVEL_SPEED_CAP, (this.player.level - 1) * 6);
        const thrusterMult = 1.0 + (p.thruster || 0) * 0.12;
        const lbBonus = ((this.player.limitBreaks && this.player.limitBreaks.thruster) || 0) * 5;
        const shipSpeed = window.NeonShips?.get?.(this.player.shipId)?.baseStats.speed || 240;
        this.player.baseSpeed = Math.min(TOTAL_SPEED_CAP,
          Math.round(shipSpeed * thrusterMult + levelBonus + lbBonus));
      }

      recalculatePassives() {
        const p = this.player.passives;
        const stats = window.NeonShips?.get?.(this.player.shipId)?.baseStats;
        // Power
        this.player.dmgMultiplier = 1.0 + (p.power || 0) * 0.18;
        // Haste
        this.player.cdrMultiplier = Math.max(0.35, 1.0 - (p.haste || 0) * 0.1);
        // Thruster + 等级成长统一收口（含硬上限）
        this.recalculateMoveSpeed();
        // Magnet
        this.player.magnetRadius = 120 * (1.0 + (p.magnet || 0) * 0.5);
        // Armor
        const armorLvl = p.armor || 0;
        const baseMaxHp = (stats?.hp || 100) + armorLvl * 35;
        this.player.maxHp = this.endlessMode && window.NeonRogueRelics?.owns(this, 'glass_reactor')
          ? Math.max(30, Math.round(baseMaxHp * 0.75))
          : baseMaxHp;
        this.player.hp = Math.min(this.player.maxHp, this.player.hp);
        this.player.regen = (stats?.regen ?? 0.8) + armorLvl * 1.8;
        this.player.hasCheatDeath = armorLvl >= 5 ||
          (this.player.shipId === 'phantom' && (p.death_reversal || 0) > 0);
        // Crit
        const critLvl = p.crit || 0;
        this.player.critRate = 0.08 + critLvl * 0.12;
        this.player.critDmg = 1.5 + critLvl * 0.35;
        // Area
        this.player.areaMultiplier = 1.0 + (p.area || 0) * 0.25;
        // Multishot
        const multiLvl = p.multishot || 0;
        // Bounded projectile growth; the legendary payoff is its separate starfield salvo.
        this.player.extraProjectiles = [0, 1, 1, 2, 2, 3][Math.min(5, multiLvl)] || 0;

        this.recalculateDashStats();
      }

      recalculateDashStats() {
        const du = this.player.dashUpgrades || {};

        // 1. Max charges: 3 base + dash_charge
        const baseCharges = window.NeonShips?.get(this.player.shipId)?.baseStats.dashCharges || 3;
        this.player.maxDashCharges = Math.min(9, baseCharges + (du.dash_charge || 0));
        this.player.dashCharges = Math.min(this.player.maxDashCharges, this.player.dashCharges);

        // 2. Recharge cooldown: reduced by haste and dash_charge
        const chargeHaste = (du.dash_charge || 0) * 0.12;
        this.player.dashRechargeTime = Math.max(0.9, 2.2 / (1 + chargeHaste));

        // 3. Slash Damage
        const dmgLvl = du.dash_dmg || 0;
        const dmgBoost = 1.0 + dmgLvl * 0.6 + (dmgLvl >= 5 ? 0.6 : 0);
        // Shared level growth (+3% / level) is applied exactly once in dealDamage().
        // Dash mastery, passives and limit breaks remain separate sources of power.
        const dashBreaks = (this.player.limitBreaks || {}).dash_dmg || 0;
        this.player.dashSlashDmg = Math.round(95 * this.player.dmgMultiplier * dmgBoost * Math.pow(1.25, dashBreaks));
        this.player.dashAlwaysCrit = dmgLvl >= 5;

        // 4. Slash Width & Invulnerability
        const areaLvl = du.dash_area || 0;
        this.player.dashSlashWidth = (18 + areaLvl * 10) * this.player.areaMultiplier;
        this.player.dashInvulnBonus = Math.min(0.08, areaLvl * 0.02);

        // 5. Blast Nova
        const blastLvl = du.dash_blast || 0;
        this.player.hasDashBlast = blastLvl > 0;
        this.player.dashBlastDamage = blastLvl > 0 ? Math.round((140 + (blastLvl - 1) * 70) * this.player.dmgMultiplier * Math.pow(1.3, (this.player.limitBreaks || {}).dash_blast || 0)) : 0;
        this.player.dashBlastRadius = (110 + (blastLvl - 1) * 35) * this.player.areaMultiplier;

        // 6. Fire Trail
        const fireLvl = du.dash_fire || 0;
        this.player.hasFireTrail = fireLvl > 0;
        this.player.fireTrailDuration = 2.2 + fireLvl * 0.4;
        this.player.fireTrailDamage = fireLvl > 0 ? Math.round((55 + (fireLvl - 1) * 30) * this.player.dmgMultiplier * Math.pow(1.25, (this.player.limitBreaks || {}).dash_fire || 0)) : 0;

        // 7. Cryo Freeze
        const cryoLvl = du.dash_cryo || 0;
        this.player.hasDashCryo = cryoLvl > 0;
        this.player.dashCryoDuration = 2.0 + cryoLvl * 0.5 + ((this.player.limitBreaks || {}).dash_cryo || 0) * 0.5;

        // 8. Phase Aegis Aura (时空相位无敌光环)
        const aegisLvl = du.dash_aegis || 0;
        this.player.hasAegis = aegisLvl > 0;
        if (aegisLvl > 0) {
          const damages = [0, 55, 75, 100, 130, 165];
          const radii = [45, 55, 65, 80, 95, 110];
          const breaks = (this.player.limitBreaks || {}).dash_aegis || 0;
          this.player.aegisDuration = NEON_AEGIS_DURATIONS[Math.min(aegisLvl, 6) - 1] || 0.15;
          // Infinite limit breaks must not evolve into a full-screen passive kill aura.
          this.player.aegisDamage = Math.round((damages[Math.min(aegisLvl, 6) - 1] || 0) * this.player.dmgMultiplier * Math.min(3, Math.pow(1.25, breaks)));
          this.player.aegisRadius = radii[Math.min(aegisLvl, 6) - 1] * this.player.areaMultiplier * Math.min(1.7, Math.pow(1.1, breaks));
          this.player.hasAegisBurst = aegisLvl >= 6;
        } else {
          this.player.aegisDuration = 0;
          this.player.aegisDamage = 0;
          this.player.aegisRadius = 0;
          this.player.hasAegisBurst = false;
        }
      }

      syncOrbiters() {
        const lvl = this.player.weapons.orbit || 0;
        if (lvl <= 0) return;
        const count = 2 + (lvl >= 3 ? 1 : 0) + (lvl >= 5 ? 2 : 0) + Math.min(2, this.player.extraProjectiles || 0);
        this.orbiters = [];
        for (let i = 0; i < count; i++) {
          this.orbiters.push({
            angle: (i / count) * Math.PI * 2,
            distance: (85 + (lvl >= 3 ? 20 : 0)) * this.player.areaMultiplier,
            radius: 9 * this.player.areaMultiplier,
            damage: 28 * this.player.dmgMultiplier * (1 + (lvl - 1) * 0.35),
            color: '#00ffaa'
          });
        }
      }

      syncDrones() {
        const lvl = this.player.weapons.drones || 0;
        if (lvl <= 0) return;
        const count = Math.min(5, 1 + lvl);
        this.companionDrones = [];
        for (let i = 0; i < count; i++) {
          this.companionDrones.push({
            angle: (i / count) * Math.PI * 2,
            orbitDist: 52 * this.player.areaMultiplier,
            shootTimer: i * 0.1,
            shootInterval: Math.max(0.24, 0.58 - lvl * 0.07),
            damage: 22 * this.player.dmgMultiplier * (1 + (lvl - 1) * 0.3)
          });
        }
      }

      renderWeaponsHUD() {
        this.weaponsBar.innerHTML = '';
        const activeCatalog = this.getUpgradeCatalog(this.player);
        const slotLimits = this.getUpgradeSlotLimits(this.player);

        // Render the configured number of weapon slots for this ship.
        const rowWeapons = document.createElement('div');
        rowWeapons.className = 'equip-group';
        const weaponEntries = Object.entries(this.player.weapons);
        for (let i = 0; i < slotLimits.weapons; i++) {
          const slot = document.createElement('div');
          if (i < weaponEntries.length) {
            const [id, lvl] = weaponEntries[i];
            const def = activeCatalog.find(u => u.id === id);
            const lb = (this.player.limitBreaks && this.player.limitBreaks[id]) || 0;
            const lvlText = lb > 0 ? `L5 <span style="color:#ffea00;font-weight:900;">+${lb}</span>` : `L${lvl}`;
            slot.className = `weapon-slot active-w ${lb > 0 ? 'limit-break' : ''}`;
            slot.title = `${def ? def.name : id} 等级 ${lvl} ${lb > 0 ? `(超频破限 +${lb})` : ''}`;
            slot.innerHTML = `<span>${def ? def.icon : '🔫'}</span><span class="lvl-text">${lvlText}</span>`;
          } else {
            slot.className = 'weapon-slot empty';
            slot.title = '武器空槽位 (通过升级选择新武器)';
            slot.innerHTML = `<span style="font-size:12px;opacity:0.35">➕</span>`;
          }
          rowWeapons.appendChild(slot);
        }
        this.weaponsBar.appendChild(rowWeapons);

        // Show the full passive layout; ascension V+ locks the final slot.
        const rowPassives = document.createElement('div');
        rowPassives.className = 'equip-group';
        const passiveEntries = Object.entries(this.player.passives);
        const configuredPassives = window.NeonShips?.slotLimitsFor?.(this.player, 0)?.passives ?? 4;
        for (let i = 0; i < configuredPassives; i++) {
          const slot = document.createElement('div');
          if (i < passiveEntries.length) {
            const [id, lvl] = passiveEntries[i];
            const def = activeCatalog.find(u => u.id === id);
            const lb = (this.player.limitBreaks && this.player.limitBreaks[id]) || 0;
            const lvlText = lb > 0 ? `L5 <span style="color:#ffea00;font-weight:900;">+${lb}</span>` : `L${lvl}`;
            slot.className = `weapon-slot passive ${lb > 0 ? 'limit-break' : ''}`;
            slot.title = `${def ? def.name : id} 等级 ${lvl} ${lb > 0 ? `(超频破限 +${lb})` : ''}`;
            slot.innerHTML = `<span>${def ? def.icon : '🔮'}</span><span class="lvl-text" style="color:${lb > 0 ? '#ffea00' : '#d37aff'}">${lvlText}</span>`;
          } else {
            const locked = i >= slotLimits.passives;
            slot.className = 'weapon-slot empty';
            slot.title = locked ? '进阶 V：该模组槽已锁定' : '模组空槽位 (通过升级选择新模组)';
            slot.innerHTML = locked ? '<span style="font-size:11px;opacity:0.55">🔒</span>' : '<span style="font-size:11px;opacity:0.3">🔷</span>';
          }
          rowPassives.appendChild(slot);
        }
        this.weaponsBar.appendChild(rowPassives);
      }

      updateHUD() {
        const isAstra = this.player?.shipId === 'astra';
        const isPhantom = this.player?.shipId === 'phantom';
        const astraState = isAstra ? window.NeonAstra?.state(this.player) : null;
        if (astraState) {
          this.player.maxDashCharges = Math.min(4, 2 + (astraState.warpUpgrades.star_gate || 0));
          this.player.dashCharges = astraState.blinkCharges;
          this.player.dashRechargeTimer = astraState.blinkRecharge;
        }
        const ghostState = isPhantom ? window.NeonPhantom?.state(this.player) : null;
        if (ghostState) {
          this.player.maxDashCharges = Math.min(3, 2 + (ghostState.warpUpgrades?.charge_overflow || 0));
          this.player.dashCharges = ghostState.dashCharges;
          this.player.dashRechargeTimer = ghostState.dashRecharge;
        }
        const ectoPanel = document.getElementById('phantom-ecto-hud');
        if (ectoPanel) {
          ectoPanel.hidden = !isPhantom;
          if (ghostState) {
            const text = document.getElementById('phantom-ecto-text');
            const fill = document.getElementById('phantom-ecto-fill');
            const maximum = Math.max(1, ghostState.maxEctoplasm || 100);
            if (text) text.textContent = `灵质 ${Math.floor(ghostState.ectoplasm || 0)}/${maximum}` +
              (ghostState.shiftActive ? ' · 潜行' : '') + (ghostState.docked ? ' · 共生' : '');
            if (fill) fill.style.width = Math.round(100 * Math.min(1,
              (ghostState.ectoplasm || 0) / maximum)) + '%';
          }
        }
        const dockPanel = document.getElementById('phantom-touch-actions');
        if (dockPanel) {
          dockPanel.hidden = !isPhantom || (this.state !== 'playing' &&
            !(this.state === 'lan-client' && this.lanCoop?.latest?.phase === 'playing'));
          const control = document.getElementById('phantom-dock-action');
          if (control) {
            control.textContent = ghostState?.docked ? '脱离共生 Q' : '共生合体 Q';
            control.disabled = this.state === 'playing' ?
              !this.lanCoop?.ally : !this.lanCoop?.latest?.host;
          }
        }
        const manaPanel = document.getElementById('astra-mana-hud');
        if (manaPanel) {
          manaPanel.hidden = !isAstra;
          if (isAstra && astraState) {
            const manaLabel = document.getElementById('astra-mana-text');
            const manaFill = document.getElementById('astra-mana-fill');
            const maxMana = Math.max(1, astraState.maxMana || 100);
            if (manaLabel) manaLabel.textContent =
              '星能 ' + Math.floor(astraState.mana) + '/' + maxMana;
            if (manaFill) manaFill.style.width =
              Math.round(Math.max(0, Math.min(1, astraState.mana / maxMana)) * 100) + '%';
          }
        }
        const actionPanel = document.getElementById('astra-touch-actions');
        if (actionPanel) {
          const guestPlaying = this.state === 'lan-client' &&
            this.lanCoop?.latest?.phase === 'playing';
          actionPanel.hidden = !isAstra || (this.state !== 'playing' && !guestPlaying);
          if (isAstra && astraState) {
            const spell = this.selectedAstraSpell || 'meteor';
            const chosen = spell === 'meteor' ? '星陨裁决' : '星界结界';
            const switcher = document.getElementById('astra-switch-spell');
            const caster = document.getElementById('astra-cast-spell');
            if (switcher) switcher.textContent = '切换 ' + chosen;
            if (caster) {
              const cooldown = astraState.cooldowns[spell] || 0;
              caster.textContent = cooldown > 0 ? '冷却 ' + Math.ceil(cooldown) + 's' : '施法 ' + chosen;
              caster.disabled = cooldown > 0 ||
                astraState.mana < (spell === 'meteor' ? 50 : 60);
              caster.title = '星能 ' + Math.floor(astraState.mana) + '/' + astraState.maxMana;
            }
          }
        }
        this.hudLevel.textContent = `LV ${this.player.level}`;
        const hpPct = Math.max(0, Math.min(100, (this.player.hp / this.player.maxHp) * 100));
        this.hudHp.style.width = `${hpPct}%`;
        if (this.hudHp.parentElement) {
          this.hudHp.parentElement.title = `生命值: ${Math.round(this.player.hp)}/${this.player.maxHp} (自愈: +${this.player.regen.toFixed(1)}/s)`;
        }

        // Dynamic Dash Segments HUD (3–9 charges)
        const dashContainer = document.getElementById('dash-segments');
        const maxCharges = this.player.maxDashCharges || 3;
        const charges = this.player.dashCharges;
        const rechargeProgress = charges < maxCharges
          ? (this.player.dashRechargeTimer / (isAstra ? 5 : isPhantom ? 5.5 : this.getEffectiveDashRecharge())) * 100
          : 0;

        if (dashContainer) {
          if (dashContainer.children.length !== maxCharges) {
            dashContainer.innerHTML = '';
            for (let k = 0; k < maxCharges; k++) {
              const seg = document.createElement('div');
              seg.className = 'dash-segment';
              const fill = document.createElement('div');
              fill.className = 'dash-segment-fill';
              fill.id = `dash-seg-${k}`;
              seg.appendChild(fill);
              dashContainer.appendChild(seg);
            }
          }

          for (let i = 0; i < maxCharges; i++) {
            const segFill = document.getElementById(`dash-seg-${i}`);
            if (segFill) {
              if (i < charges) {
                segFill.style.width = '100%';
              } else if (i === charges) {
                segFill.style.width = `${Math.min(100, Math.max(0, rechargeProgress))}%`;
              } else {
                segFill.style.width = '0%';
              }
            }
          }
        }

        const touchDashBtn = document.getElementById('touch-dash-btn');
        if (touchDashBtn) {
          const dashCount = touchDashBtn.querySelector('.dash-key-count');
          if (dashCount) {
            const countText = `${charges}/${maxCharges}`;
            if (dashCount.textContent !== countText) dashCount.textContent = countText;
          }
          const fraction = Math.max(0, Math.min(1, charges / Math.max(1, maxCharges)));
          touchDashBtn.style.setProperty('--dash-fill', `${Math.round(fraction * 100)}%`);
          touchDashBtn.classList.toggle('dash-empty', charges === 0);
          touchDashBtn.setAttribute('aria-label', `折跃冲刺：${charges}/${maxCharges}段可用`);
        }

        const statTextEl = document.getElementById('dash-stat-text');
        if (statTextEl) {
          // HUD shows the current uncritical hit value (including global level scaling).
          const slashD = Math.round((this.player.dashSlashDmg || 95) * this.getLevelDmgMult());
          const cd = this.getEffectiveDashRecharge().toFixed(1);
          let extraBadges = [];
          if (this.player.hasAegis) extraBadges.push(`🛡️光环${this.player.aegisDuration.toFixed(2)}s`);
          if (this.player.hasDashBlast) extraBadges.push('💥爆轰');
          if (this.player.hasFireTrail) extraBadges.push('🔥火墙');
          if (this.player.hasDashCryo) extraBadges.push('❄️冰封');

          const totalDashLb = ((this.player.limitBreaks && this.player.limitBreaks['dash_dmg']) || 0)
                            + ((this.player.limitBreaks && this.player.limitBreaks['dash_aegis']) || 0)
                            + ((this.player.limitBreaks && this.player.limitBreaks['dash_blast']) || 0);
          const lbStr = totalDashLb > 0 ? ` <span style="color:#ffea00;font-weight:900;">(+${totalDashLb}破限)</span>` : '';
          const extraStr = extraBadges.length > 0 ? ` | ${extraBadges.join(' ')}` : '';
          statTextEl.innerHTML = `⚡ ${maxCharges}段 | ⚔️ ${slashD}${lbStr} | ⏱️ ${cd}s | 精准连击×${this.player.dashCombo || 0}${extraStr}`;
        }

        const xpPct = (this.player.xp / this.player.xpNeeded) * 100;
        this.hudXp.style.width = `${xpPct}%`;

        const mins = Math.floor(this.survivalTime / 60);
        const secs = Math.floor(this.survivalTime % 60);
        this.hudTimer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        this.hudKills.textContent = this.kills;
        this.hudCrystals.textContent = this.player.crystals;

        // Boss HUD
        if (this.currentBoss && this.currentBoss.hp > 0) {
          this.bossHud.style.display = 'flex';
          const bossPct = (this.currentBoss.hp / this.currentBoss.maxHp) * 100;
          this.bossHpFill.style.width = `${Math.max(0, bossPct)}%`;
        } else {
          this.bossHud.style.display = 'none';
        }
      }

      /* ========================================================================
         6. WEAPON FIRING LOGIC
         ======================================================================== */
      findNearestEnemy(range = 700) {
        let nearest = null;
        let minDistSq = range * range;
        for (const e of this.enemies) {
          const dx = e.x - this.player.x;
          const dy = e.y - this.player.y;
          const dSq = dx * dx + dy * dy;
          if (dSq < minDistSq) {
            minDistSq = dSq;
            nearest = e;
          }
        }
        return nearest;
      }

      fireBlaster(lvl) {
        this.sound.playLaser(620, 'sawtooth');
        const count = (lvl >= 4 ? 3 : (lvl >= 2 ? 2 : 1)) + (this.player.extraProjectiles || 0);
        const spread = 0.16;
        const pierce = lvl >= 4 ? 2 : 1;
        const baseDmg = 25 * this.player.dmgMultiplier * (1 + (lvl - 1) * 0.25);
        const radius = (lvl >= 5 ? 7 : 4.5) * this.player.areaMultiplier;
        const isPlasmaExplosion = lvl >= 5;

        for (let i = 0; i < count; i++) {
          const offsetAngle = (i - (count - 1) / 2) * spread;
          const angle = this.player.aimAngle + offsetAngle;
          this.bullets.push({
            type: 'blaster',
            x: this.player.x,
            y: this.player.y,
            vx: Math.cos(angle) * 780,
            vy: Math.sin(angle) * 780,
            radius,
            damage: baseDmg,
            pierce: pierce,
            isPlasmaExplosion: isPlasmaExplosion,
            explosionRadius: 48 * this.player.areaMultiplier,
            color: lvl >= 5 ? '#ffaa00' : '#00f3ff',
            life: 1.4,
            trail: []
          });
        }
      }

      fireTesla(lvl) {
        const nearest = this.findNearestEnemy(480 * this.player.areaMultiplier);
        if (!nearest) return;
        this.sound.playZap();

        const targets = [nearest];
        const maxJumps = 2 + (lvl >= 3 ? lvl + 1 : lvl) + (this.player.extraProjectiles || 0);
        let current = nearest;
        const damage = 42 * this.player.dmgMultiplier * (1 + (lvl - 1) * 0.3);

        for (let j = 0; j < maxJumps; j++) {
          let next = null;
          let minDSq = 280 * 280 * this.player.areaMultiplier;
          for (const e of this.enemies) {
            if (targets.includes(e)) continue;
            const dx = e.x - current.x;
            const dy = e.y - current.y;
            const dSq = dx * dx + dy * dy;
            if (dSq < minDSq) {
              minDSq = dSq;
              next = e;
            }
          }
          if (next) {
            targets.push(next);
            current = next;
          } else break;
        }

        // Apply damage and spark visuals
        let prevX = this.player.x;
        let prevY = this.player.y;
        targets.forEach((tg) => {
          this.dealDamage(tg, damage, 'tesla');
          // Tesla CC: Lv.3+ adds 0.6s EMP slow (50%), Lv.5 adds 1.2s EMP paralysis stun + ball lightning burst!
          if (lvl >= 3) {
            tg.freezeTimer = Math.max(tg.freezeTimer || 0, lvl >= 5 ? 1.2 : 0.6);
          }
          if (lvl >= 5) {
            this.shockwaves.push({
              x: tg.x,
              y: tg.y,
              radius: 4,
              maxRadius: 36 * this.player.areaMultiplier,
              alpha: 0.8,
              color: '#00f3ff'
            });
          }
          this.particles.push({
            type: 'lightning',
            x1: prevX,
            y1: prevY,
            x2: tg.x,
            y2: tg.y,
            color: '#00f3ff',
            life: 0.14,
            maxLife: 0.14
          });
          prevX = tg.x;
          prevY = tg.y;
        });
      }

      fireMissiles(lvl) {
        const lb = (this.player.limitBreaks && this.player.limitBreaks.missiles) || 0;
        let count = 2;
        if (lvl === 2) count = 3;
        else if (lvl === 3) count = 4;
        else if (lvl === 4) count = 5;
        else if (lvl >= 5) count = 8 + Math.floor(lb / 2);
        // Keep the late-game cluster chain inside a stable physical projectile budget.
        count = Math.min(16, count + (this.player.extraProjectiles || 0) * (lvl >= 5 ? 2 : 1));

        let baseDmg = 60;
        if (lvl === 2) baseDmg = 80;
        else if (lvl === 3) baseDmg = 110;
        else if (lvl === 4) baseDmg = 145;
        else if (lvl >= 5) baseDmg = 195 + lb * 30;

        const damage = baseDmg * this.player.dmgMultiplier;

        let baseRadius = 48;
        if (lvl === 2) baseRadius = 75;
        else if (lvl === 3) baseRadius = 98;
        else if (lvl === 4) baseRadius = 122;
        else if (lvl >= 5) baseRadius = 155 + lb * 18;
        const explosionRadius = baseRadius * this.player.areaMultiplier;

        const hasCc = lvl >= 3;
        const slowDuration = lvl >= 5 ? 1.6 : (lvl >= 3 ? 1.0 : 0);
        const clusterCount = lvl >= 5 ? (3 + (lb >= 3 ? 1 : 0)) : (lvl === 4 ? 2 : 0);
        const isLevel5 = lvl >= 5;

        this.sound.playLaser(isLevel5 ? 260 : 380, 'square');

        for (let i = 0; i < count; i++) {
          const spread = (i - (count - 1) / 2) * 0.22 + (Math.random() - 0.5) * 0.25;
          const angle = this.player.aimAngle + spread;
          const speed = isLevel5 ? 560 : 500;
          this.bullets.push({
            type: 'missile',
            x: this.player.x,
            y: this.player.y,
            vx: Math.cos(angle) * (speed * 0.65),
            vy: Math.sin(angle) * (speed * 0.65),
            radius: (isLevel5 ? 6.5 : (lvl >= 3 ? 5.5 : 4.5)) * this.player.areaMultiplier,
            speed: speed,
            damage: damage,
            target: this.findNearestEnemy(950),
            explosionRadius: explosionRadius,
            hasCc: hasCc,
            slowDuration: slowDuration,
            clusterCount: clusterCount,
            isLevel5: isLevel5,
            life: 2.8,
            color: isLevel5 ? '#ff00aa' : (lvl >= 4 ? '#ff007f' : '#ff3388'),
            trail: []
          });
        }
      }

      fireNova(lvl) {
        window.NeonRogueFusions?.onNova(this);
        this.sound.playExplosion('large');
        const radius = (220 + (lvl >= 2 ? 60 : 0)) * this.player.areaMultiplier;
        const damage = 85 * this.player.dmgMultiplier * (1 + (lvl - 1) * 0.4);

        // Lv.5 事件视界：爆发瞬间将周围敌群微幅吸聚后施加毁灭冲击
        if (lvl >= 5) {
          const pullR = radius * 1.15;
          const pullRSq = pullR * pullR;
          for (const e of this.enemies) {
            const dx = this.player.x - e.x;
            const dy = this.player.y - e.y;
            const dSq = dx * dx + dy * dy;
            if (dSq > 16 && dSq <= pullRSq) {
              const d = Math.sqrt(dSq);
              e.vx += (dx / d) * 220;
              e.vy += (dy / d) * 220;
            }
          }
        }

        this.shockwaves.push({
          x: this.player.x,
          y: this.player.y,
          radius: 10,
          maxRadius: radius,
          alpha: 1,
          color: lvl >= 5 ? '#ff00aa' : '#ffaa00'
        });

        // Damage and knockback all enemies in area
        const rSq = radius * radius;
        for (const e of this.enemies) {
          const dx = e.x - this.player.x;
          const dy = e.y - this.player.y;
          if (dx * dx + dy * dy <= rSq) {
            this.dealDamage(e, damage, 'nova');
            const kAngle = Math.atan2(dy, dx);
            const kb = 320 + (lvl >= 3 ? 120 : 0);
            e.vx += Math.cos(kAngle) * kb;
            e.vy += Math.sin(kAngle) * kb;
            if (lvl >= 3) {
              e.freezeTimer = Math.max(e.freezeTimer || 0, 0.8);
            }
          }
        }
      }

      fireLaser(lvl) {
        this.sound.playBeam();
        const count = lvl >= 5 ? 2 : 1;
        const width = (12 + lvl * 3) * this.player.areaMultiplier;
        const length = 720 * this.player.areaMultiplier;
        const damage = 75 * this.player.dmgMultiplier * (1 + (lvl - 1) * 0.35);

        for (let i = 0; i < count; i++) {
          const spread = count === 2 ? (i === 0 ? -0.22 : 0.22) : 0;
          const angle = this.player.aimAngle + spread;
          this.laserBeams.push({
            x: this.player.x,
            y: this.player.y,
            angle,
            length,
            width,
            damage,
            life: 0.22,
            maxLife: 0.22,
            color: '#00f3ff'
          });

          // Check line damage against all enemies
          for (const e of this.enemies) {
            const dx = e.x - this.player.x;
            const dy = e.y - this.player.y;
            const proj = dx * Math.cos(angle) + dy * Math.sin(angle);
            if (proj > 0 && proj < length) {
              const perpDist = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
              if (perpDist < width / 2 + e.radius) {
                this.dealDamage(e, damage, 'laser');
                this.particles.push({
                  type: 'spark',
                  x: e.x,
                  y: e.y,
                  vx: Math.cos(angle) * 140 + (Math.random() - 0.5) * 60,
                  vy: Math.sin(angle) * 140 + (Math.random() - 0.5) * 60,
                  radius: Math.random() * 2 + 1.2,
                  color: '#00f3ff',
                  life: 0.18,
                  maxLife: 0.18
                });
              }
            }
          }
        }
      }

      fireBlackHole(lvl) {
        this.sound.playBlackHole();
        const spawnDist = 240 * this.player.areaMultiplier;
        const targetX = this.player.x + Math.cos(this.player.aimAngle) * spawnDist;
        const targetY = this.player.y + Math.sin(this.player.aimAngle) * spawnDist;
        const radius = (180 + (lvl - 1) * 35) * this.player.areaMultiplier;
        const damage = 42 * this.player.dmgMultiplier * (1 + (lvl - 1) * 0.35);

        this.blackHoles.push({
          x: targetX,
          y: targetY,
          radius,
          damage,
          life: 3.5 + (lvl >= 3 ? 1.0 : 0),
          maxLife: 3.5 + (lvl >= 3 ? 1.0 : 0),
          rotAngle: 0,
          pulseTimer: 0,
          color: '#9d00ff'
        });
      }

      fireCryoMine(lvl) {
        const count = 2 + (lvl >= 3 ? 1 : 0) + (this.player.extraProjectiles || 0);
        const blastRadius = (120 + (lvl - 1) * 25) * this.player.areaMultiplier;
        const damage = 65 * this.player.dmgMultiplier * (1 + (lvl - 1) * 0.4);

        for (let i = 0; i < count; i++) {
          this.mines.push({
            x: this.player.x + (Math.random() - 0.5) * 60,
            y: this.player.y + (Math.random() - 0.5) * 60,
            radius: 12,
            blastRadius,
            damage,
            life: 9.0,
            armTimer: 0.3,
            pulseTimer: 0,
            color: '#00f3ff'
          });
        }
      }

      dealDamage(target, rawDamage, source = 'combat', forceCrit = false, attacker = this.player) {
        if (this.lanCoop?.ally && source !== 'lan-resonance') {
          rawDamage *= 1 + this.lanCoop.getLinkBonus(attacker);
        }
        if (this.endlessMode) {
          rawDamage = window.NeonRogueRelics?.modifyDamage(this, target, rawDamage, source) ?? rawDamage;
          rawDamage = window.NeonRogueFusions?.modifyDamage(this, target, rawDamage, source) ?? rawDamage;
        }
        const isCrit = forceCrit || Math.random() < (attacker.critRate || 0);
        // Shared +3% per character level: exactly one multiplication per hit.
        let finalDamage = (isCrit ? rawDamage * (attacker.critDmg || 1.5) : rawDamage) *
          (1 + Math.max(0, (attacker.level || 1) - 1) * 0.03);

        // Boss Carrier Shield Absorption
        if (target.isBoss && target.hasShield) {
          finalDamage *= 0.15;
          if (Math.random() < 0.25) {
            this.texts.push({
              x: target.x + (Math.random() - 0.5) * 20,
              y: target.y - 20,
              text: '🛡️ 力场偏折吸收!',
              color: '#00f3ff',
              size: 13,
              life: 0.45,
              maxLife: 0.45
            });
          }
        }

        // Shield pylon buff on regular minions
        if (target.shielded) {
          finalDamage *= 0.5;
        }
        if (target.isBoss && target.rogueAffixes?.includes('armored')) finalDamage *= 0.83;
        finalDamage = window.NeonLanEncounters?.modifyBossDamage(this, target, finalDamage) ?? finalDamage;

        target.hp -= finalDamage;
        this.totalDamageDealt += finalDamage;
        if (this.endlessMode) window.NeonRogueFusions?.onDamage(this, target, finalDamage, source);

        // Floating combat text with pool limit & clean thousand formatting
        if (this.texts.length < 28 || isCrit) {
          const formattedDmg = finalDamage >= 1000 ? (finalDamage / 1000).toFixed(1) + 'k' : Math.round(finalDamage);
          this.texts.push({
            x: target.x + (Math.random() - 0.5) * 16,
            y: target.y - 12,
            text: isCrit ? `💥${formattedDmg}!` : `${formattedDmg}`,
            color: isCrit ? '#ffea00' : '#ffffff',
            size: isCrit ? (finalDamage >= 1000 ? 18 : 16) : (finalDamage >= 1000 ? 14 : 12),
            life: 0.45,
            maxLife: 0.45
          });
        }

        // Hit spark particles with strict budget
        if (this.particles.length < (this.fxLow ? 15 : 45)) {
          const sparkCount = isCrit ? 2 : 1;
          for (let i = 0; i < sparkCount; i++) {
            this.particles.push({
              type: 'spark',
              x: target.x,
              y: target.y,
              vx: (Math.random() - 0.5) * 120,
              vy: (Math.random() - 0.5) * 120,
              radius: Math.random() * 2 + 1,
              color: isCrit ? '#ffea00' : target.color,
              life: 0.18,
              maxLife: 0.18
            });
          }
        }

        if (target.hp <= 0 && !target.dead) {
          target.dead = true;
          this.onEnemyKilled(target, source);
        }
      }

      rollNormalDrop(roll, source = 'combat') {
        const rules = this.getDifficultyRules();
        const routeBonus = window.NeonRogueEndless?.getDropMultiplier(this) || 1;
        const heal = 0.015 * rules.normalDrops * routeBonus;
        const magnet = 0.011 * rules.normalDrops * routeBonus;
        const nuke = source === 'nuke' ? 0 : 0.009 * rules.nukeDrops;
        if (roll < heal) return 'heal';
        if (roll < heal + magnet) return 'magnet';
        if (roll < heal + magnet + nuke) return 'nuke';
        return 'gem';
      }

      playCombatSound(channel, callback, maxPerFrame = 2) {
        const time = this.survivalTime || 0;
        const state = this.combatSoundBudget ||= {};
        const item = state[channel] ||= { time: NaN, count: 0 };
        if (item.time !== time) { item.time = time; item.count = 0; }
        if (item.count >= maxPerFrame) return false;
        item.count++;
        callback?.();
        return true;
      }

      onEnemyKilled(enemy, source = 'combat') {
        this.kills++;
        if (this.endlessMode) window.NeonRogueEndless?.onKill(this, enemy, source);
        // A dash can kill dozens of enemies in the same simulation frame.
        // Rate-limit sound nodes; never rate-limit kills, XP or loot rewards.
        this.playCombatSound('explosion', () =>
          this.sound.playExplosion(enemy.isBoss ? 'large' : 'small'),
          enemy.isBoss ? 2 : 1);
        this.screenShake = Math.max(this.screenShake, enemy.isBoss ? 15 : 2.5);

        // Boss-Minion Linkage hooks
        if (enemy.type === 'nexus_pylon') {
          if (this.currentBoss && this.currentBoss.type === 'boss_nexus' && !this.currentBoss.dead) {
            this.dealDamage(this.currentBoss, 700);
            this.sound.playNuke();
            this.shockwaves.push({
              x: enemy.x,
              y: enemy.y,
              radius: 10,
              maxRadius: 200,
              alpha: 1,
              color: '#00f3ff'
            });
            this.texts.push({
              x: enemy.x,
              y: enemy.y - 25,
              text: '⚡ 信标过载反噬！雷暴极核受创！',
              color: '#00f3ff',
              size: 16,
              life: 1.8,
              maxLife: 1.8
            });
          }
        } else if (enemy.type === 'shield_drone') {
          const aliveDrones = this.enemies.filter(e => e !== enemy && e.type === 'shield_drone' && !e.dead);
          if (aliveDrones.length === 0 && this.currentBoss && this.currentBoss.type === 'boss_carrier') {
            this.currentBoss.hasShield = false;
            this.currentBoss.stunTimer = 4.0;
            this.sound.playExplosion('large');
            this.screenShake = 16;
            this.shockwaves.push({
              x: this.currentBoss.x,
              y: this.currentBoss.y,
              radius: 15,
              maxRadius: 260,
              alpha: 1,
              color: '#ff007f'
            });
            this.texts.push({
              x: this.currentBoss.x,
              y: this.currentBoss.y - 35,
              text: '💥 护盾全面瓦解！母舰核心过载瘫痪！',
              color: '#ffaa00',
              size: 18,
              life: 2.0,
              maxLife: 2.0
            });
          }
        }

        // Spawn death particles with strict cap
        if (this.particles.length < (this.fxLow ? 20 : 60)) {
          const count = enemy.isBoss ? 18 : 4;
          for (let i = 0; i < count; i++) {
            const spd = Math.random() * 140 + 30;
            const a = Math.random() * Math.PI * 2;
            this.particles.push({
              type: 'spark',
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(a) * spd,
              vy: Math.sin(a) * spd,
              radius: Math.random() * 2.2 + 1.2,
              color: enemy.color,
              life: 0.25,
              maxLife: 0.25
            });
          }
        }

        // Paced XP scaling: +18% per minute, steady progression
        const timeMin = this.survivalTime / 60;
        const timeMultiplier = 1.0 + timeMin * 0.18;
        const baseXP = enemy.xpVal || 2;
        const scaledXP = Math.round(baseXP * timeMultiplier);

        const dropRoll = Math.random();
        if (enemy.isBoss) {
          window.NeonLanEncounters?.bonusOnVictory(this, enemy);
          this.currentBoss = null;
          // Boss drops 10 gold gems worth 25 each (total 250 XP: gives 1-2 clean level ups)
          for (let i = 0; i < 10; i++) {
            this.gems.push({
              type: 'gem',
              x: enemy.x + (Math.random() - 0.5) * 80,
              y: enemy.y + (Math.random() - 0.5) * 80,
              value: 25,
              color: '#ffea00',
              radius: 7.0
            });
          }
          if (Math.random() < this.getDifficultyRules().normalDrops) {
            this.gems.push({ type: 'heal', x: enemy.x - 35, y: enemy.y, radius: 11 });
          }
          if (Math.random() < this.getDifficultyRules().normalDrops) {
            this.gems.push({ type: 'magnet', x: enemy.x + 35, y: enemy.y, radius: 11 });
          }
          if (!this.endlessMode) {
            setTimeout(() => { if (this.currentBoss === null && this.state === 'playing') this.victory(); }, 1400);
          } else {
            this.texts.push({
              x: this.player.x,
              y: this.player.y - 35,
              text: '👑 欧米茄领主已被粉碎！无尽巨额经验已释放！',
              color: '#ffea00',
              size: 18,
              life: 2.0,
              maxLife: 2.0
            });
          }
        } else if (enemy.isElite) {
          this.playCombatSound('elite-explosion', () => this.sound.playExplosion('large'), 1);
          this.screenShake = Math.max(this.screenShake, 6);
          if (this.shockwaves.length < 36) this.shockwaves.push({
            x: enemy.x, y: enemy.y, radius: 8, maxRadius: 160,
            alpha: .9, color: '#ffd700'
          });
          if (this.texts.length < 36) this.texts.push({
            x: enemy.x, y: enemy.y - 25, text: '★ 精英机甲击破!',
            color: '#ffd700', size: 16, life: 1.5, maxLife: 1.5
          });
          for (let k = 0; k < 2; k++) {
            this.gems.push({
              type: 'gem',
              x: enemy.x + (Math.random() - 0.5) * 40,
              y: enemy.y + (Math.random() - 0.5) * 40,
              value: Math.max(12, Math.round(scaledXP * 0.75)),
              color: '#ffea00',
              radius: 6.5
            });
          }
          if (Math.random() < 0.3 * this.getDifficultyRules().normalDrops) {
            this.gems.push({ type: 'heal', x: enemy.x, y: enemy.y, radius: 10 });
          }
        } else {
          const drop = this.rollNormalDrop(dropRoll, source);
          if (drop !== 'gem') {
            this.gems.push({ type: drop, x: enemy.x, y: enemy.y, radius: 10 });
            if (drop === 'nuke') this.combatTelemetry.nukeDrops++;
          } else {
            let gemColor = enemy.xpColor || '#00f3ff';
            let gemRadius = 4.5;
            if (scaledXP >= 16) {
              gemColor = '#ffea00';
              gemRadius = 6.5;
            } else if (scaledXP >= 8) {
              gemColor = '#d37aff';
              gemRadius = 5.5;
            }
            this.gems.push({
              type: 'gem',
              x: enemy.x,
              y: enemy.y,
              value: scaledXP,
              color: gemColor,
              radius: gemRadius
            });
          }
        }
      }

      cleanAndCompactGems() {
        if (this.gems.length <= 90) return;
        const compacted = [];
        for (let i = 0; i < this.gems.length; i += 2) {
          const g1 = this.gems[i];
          const g2 = this.gems[i + 1];
          if (g1 && g2 && g1.type === 'gem' && g2.type === 'gem') {
            g1.value += g2.value;
            g1.color = '#ffea00';
            g1.radius = Math.min(8.5, g1.radius + 1.2);
            compacted.push(g1);
          } else {
            if (g1) compacted.push(g1);
            if (g2) compacted.push(g2);
          }
        }
        this.gems = compacted;
      }

      /* ========================================================================
         7. ENEMY DIRECTOR & SPAWNING
         ======================================================================== */
      getAdaptiveScaling() {
        let weaponLevels = 0;
        for (const lvl of Object.values(this.player.weapons)) weaponLevels += lvl;
        let passiveLevels = 0;
        for (const lvl of Object.values(this.player.passives)) passiveLevels += lvl;
        const totalLb = this.player.totalLimitBreaks || 0;

        // Player potency (Level + Weapon tiers + Passives + Limit breaks)
        // 等级/攻击加成对怪血的反哺已压平：玩家变强不再大幅推高怪血
        const potency = (this.player.level - 1) * 0.04
                      + (weaponLevels - 1) * 0.05
                      + passiveLevels * 0.03
                      + totalLb * 0.08
                      + (this.player.dmgMultiplier - 1.0) * 0.15;

        // "时间越到后面 越难才对"：后期间隙与怪物硬度随时间平滑阶梯攀升（已放缓）
        const timeMin = this.survivalTime / 60;
        const timeEscalation = 1.0 + timeMin * 0.14 + Math.pow(Math.max(0, timeMin - 3.0), 1.35) * 0.15;

        return timeEscalation * (1.0 + Math.max(0, potency));
      }

      getLevelDmgMult() {
        // 等级基础攻击：每级 +3%（底薪），武器强化仍是大头，避免数值膨胀
        // Lv10约+27%，Lv20约+57%，Lv30约+87%
        return 1.0 + (this.player.level - 1) * 0.03;
      }

      updateSpawning(dt) {
        this.waveTimer += dt;
        this.spawnTimer += dt;

        const timeMin = this.survivalTime / 60;
        // As time advances, spawn interval accelerates from 1.25s down to 0.12s
        const coopSpawnMultiplier = window.NeonLanEncounters?.active(this)
          ? window.NeonLanEncounters.TUNING.spawnInterval : 1;
        const spawnInterval = Math.max(0.12, (1.25 - timeMin * 0.12) /
          this.getDifficultyRules().enemyCount * coopSpawnMultiplier);

        // Boss spawn at 3 minutes (180s), and periodically in endless mode
        if (this.survivalTime >= 180 && !this.bossSpawned) {
          this.bossSpawned = true;
          this.lastBossTime = this.survivalTime;
          this.spawnBoss();
        } else if (this.endlessMode && (!this.currentBoss || this.currentBoss.dead)) {
          if (this.survivalTime - (this.lastBossTime || 180) >= 180) {
            this.lastBossTime = this.survivalTime;
            this.spawnBoss();
          }
        }

        // Swarm Rush wave every 55s after 45s
        if (this.survivalTime > 45 && this.survivalTime - (this.lastSwarmWave || 0) >= 55) {
          this.lastSwarmWave = this.survivalTime;
          this.spawnSwarmRush();
        }

        // Elite Incursion every 85s after 75s
        if (this.survivalTime > 75 && this.survivalTime - (this.lastEliteWave || 0) >= 85 / (this.getDifficultyRules().eliteRate * (window.NeonRogueEndless?.getEliteMultiplier(this) || 1))) {
          this.lastEliteWave = this.survivalTime;
          this.spawnEliteIncursion();
        }

        if (this.spawnTimer >= spawnInterval) {
          this.spawnTimer = 0;
          this.spawnEnemyWave();
        }
      }

      getNormalEnemyCount() {
        let count = 0;
        for (let i = 0; i < this.enemies.length; i++) {
          const e = this.enemies[i];
          if (!e.isBoss && !e.isElite) count++;
        }
        return count;
      }

      getActiveSpawnPilot() {
        // While the host is down, enemies must keep spawning around the
        // surviving guest. Otherwise the last-stand challenge becomes empty.
        if (this.player.downed && (this.lanCoop?.allies?.size || 0) > 1) {
          const survivor = [...this.lanCoop.allies.values()].find(p =>
            !p.disconnected && p.hp > 0 && !p.downed);
          if (survivor) return survivor;
        }
        if (this.player.downed && this.lanCoop?.ally?.hp > 0 &&
            !this.lanCoop.ally.downed) return this.lanCoop.ally;
        return this.player;
      }

      spawnSwarmRush() {
        if (this.getNormalEnemyCount() >= 90) return;
        const spawnPilot = this.getActiveSpawnPilot();
        this.sound.playBossAlert();
        this.texts.push({
          x: spawnPilot.x,
          y: spawnPilot.y - 45,
          text: '⚠️ 密集虫潮蜂拥突袭 (SWARM RUSH)!',
          color: '#ff3300',
          size: 20,
          life: 2.2,
          maxLife: 2.2
        });
        const hpMult = this.getAdaptiveScaling() * (this.difficulty >= 3 ? 1.20 : 1);
        const swarmCount = Math.round(20 * this.getDifficultyRules().enemyCount);
        for (let i = 0; i < swarmCount; i++) {
          const a = (i / swarmCount) * Math.PI * 2;
          const spawnDist = Math.hypot(this.width, this.height) / 2 + 70;
          this.enemies.push({
            type: 'swarmer',
            x: spawnPilot.x + Math.cos(a) * spawnDist,
            y: spawnPilot.y + Math.sin(a) * spawnDist,
            vx: 0,
            vy: 0,
            hp: Math.round(26 * hpMult),
            maxHp: Math.round(26 * hpMult),
            radius: 12,
            speed: 250,
            color: '#ff0055',
            xpVal: 2,
            damage: 10 // Fixed constant damage
          });
        }
      }

      spawnEliteIncursion() {
        // 精英怪与Boss不受100只普通怪上限限制！仅防范同屏精英过多
        const livingElites = this.enemies.filter(e => e.isElite).length;
        if (livingElites >= 10) return;
        const spawnPilot = this.getActiveSpawnPilot();

        this.sound.playBossAlert();
        this.texts.push({
          x: spawnPilot.x,
          y: spawnPilot.y - 45,
          text: '⚠️ 敌军重装精英突入战场 (ELITE INCURSION)!',
          color: '#ffea00',
          size: 20,
          life: 2.5,
          maxLife: 2.5
        });
        const hpMult = this.getAdaptiveScaling() * (window.NeonRogueEndless?.getEnemyHpMultiplier(this) || 1);
        const a = Math.random() * Math.PI * 2;
        const dist = 520;
        this.enemies.push({
          type: 'shield_pylon',
          isElite: true,
          x: spawnPilot.x + Math.cos(a) * dist,
          y: spawnPilot.y + Math.sin(a) * dist,
          vx: 0,
          vy: 0,
          hp: Math.round(360 * hpMult),
          maxHp: Math.round(360 * hpMult),
          radius: 22,
          speed: 85,
          color: '#ffea00',
          damage: 18,
          xpVal: 35
        });
        for (let k = 0; k < 2; k++) {
          const offA = a + (k === 0 ? 0.35 : -0.35);
          this.enemies.push({
            type: 'sniper',
            isElite: true,
            x: spawnPilot.x + Math.cos(offA) * dist,
            y: spawnPilot.y + Math.sin(offA) * dist,
            vx: 0,
            vy: 0,
            hp: Math.round(220 * hpMult),
            maxHp: Math.round(220 * hpMult),
            radius: 20,
            speed: 100,
            aimTimer: 1.5,
            shootCooldown: 2.8,
            color: '#ff00aa',
            damage: 26,
            xpVal: 28
          });
        }
      }

      spawnAntiAfkPursuers() {
        this.texts.push({
          x: this.player.x,
          y: this.player.y - 45,
          text: '⚠️ 战机原地悬停滞留！自爆巡航蜂正在逼近!',
          color: '#ff3300',
          size: 18,
          life: 2.0,
          maxLife: 2.0
        });
        const hpMult = this.getAdaptiveScaling();
        for (let i = 0; i < 2; i++) {
          const a = Math.random() * Math.PI * 2;
          this.enemies.push({
            type: 'kamikaze',
            x: this.player.x + Math.cos(a) * 440,
            y: this.player.y + Math.sin(a) * 440,
            vx: 0,
            vy: 0,
            hp: Math.round(28 * hpMult),
            maxHp: Math.round(28 * hpMult),
            radius: 11,
            speed: 235,
            color: '#ff3300',
            damage: 18,
            xpVal: 3
          });
        }
      }

      spawnEnemyWave() {
        const spawnPilot = this.getActiveSpawnPilot();
        const MAX_NORMAL_ENEMIES = 100;
        const eliteHpScale = this.difficulty >= 3 ? 1.20 : 1;
        // Cull distant normal enemies. BOSSES AND ELITES ARE NEVER CULLED!
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (!e.isBoss && !e.isElite) {
            const dx = e.x - spawnPilot.x;
            const dy = e.y - spawnPilot.y;
            if (dx * dx + dy * dy > 1650 * 1650) {
              this.enemies.splice(i, 1);
            }
          }
        }

        const t = this.survivalTime;
        const livingElites = this.enemies.filter(e => e.isElite).length;
        // 随时间推移，有独立概率刷新游荡精英怪（不受100只普通怪限制）
        const shouldSpawnElite = (t > 90 && Math.random() < 0.07 * this.getDifficultyRules().eliteRate * (window.NeonRogueEndless?.getEliteMultiplier(this) || 1) && livingElites < 6);

        // 100只怪的数量限制仅限制普通杂兵，精英和BOSS绝对不被限制！
        if (!shouldSpawnElite && this.getNormalEnemyCount() >= MAX_NORMAL_ENEMIES) return;

        const angle = Math.random() * Math.PI * 2;
        const spawnDist = Math.hypot(this.width, this.height) / 2 + 80;
        const sx = spawnPilot.x + Math.cos(angle) * spawnDist;
        const sy = spawnPilot.y + Math.sin(angle) * spawnDist;

        // Player-Adaptive Durability Scaling + Time Escalation
        const hpMult = this.getAdaptiveScaling();
        const timeMin = t / 60;
        const spdMult = Math.min(1.6, 1.0 + timeMin * 0.045);
        const spdMultKamikaze = Math.min(1.30, 1.0 + timeMin * 0.03);
        const dmgMult = 1.0 + Math.min(2.0, timeMin * 0.07);
        // 自爆蜂同屏上限：超量则本波 fallback 到普通怪，保证经验不断流
        let aliveKamikaze = 0;
        for (const en of this.enemies) { if (en.type === 'kamikaze' && !en.dead) aliveKamikaze++; }
        const kamikazeCapped = aliveKamikaze >= 6;

        // If standalone elite roll succeeded, spawn elite unit and return
        if (shouldSpawnElite) {
          const eliteType = Math.random() < 0.5 ? 'charger' : 'sniper';
          if (eliteType === 'charger') {
            this.enemies.push({
              type: 'charger',
              isElite: true,
              x: sx,
              y: sy,
              vx: 0,
              vy: 0,
              hp: Math.round(220 * hpMult * eliteHpScale),
              maxHp: Math.round(220 * hpMult * eliteHpScale),
              radius: 22,
              speed: 200 * spdMult,
              chargeTimer: 1.8,
              isCharging: false,
              color: '#d300ff',
              xpVal: 24,
              xpColor: '#ffd700',
              damage: Math.round(22 * dmgMult)
            });
          } else {
            this.enemies.push({
              type: 'sniper',
              isElite: true,
              x: sx,
              y: sy,
              vx: 0,
              vy: 0,
              hp: Math.round(180 * hpMult * eliteHpScale),
              maxHp: Math.round(180 * hpMult * eliteHpScale),
              radius: 20,
              speed: 100 * spdMult,
              aimTimer: 1.3,
              shootCooldown: 2.8,
              color: '#ff00aa',
              xpVal: 22,
              xpColor: '#ffd700',
              damage: Math.round(24 * dmgMult)
            });
          }
          return;
        }

        // Select enemy type based on survival time
        const r = Math.random();
        if (t > 90 && r < 0.2) {
          // Purple Charger
          this.enemies.push({
            type: 'charger',
            x: sx,
            y: sy,
            vx: 0,
            vy: 0,
            hp: Math.round(85 * hpMult),
            maxHp: Math.round(85 * hpMult),
            radius: 17,
            speed: 200 * spdMult,
            chargeTimer: 2.0,
            isCharging: false,
            color: '#b000ff',
            xpVal: 6,
            xpColor: '#b000ff',
            damage: Math.round(20 * dmgMult)
          });
        } else if (t > 45 && r < 0.35) {
          // Green Spitter (ranged shooter)
          this.enemies.push({
            type: 'spitter',
            x: sx,
            y: sy,
            vx: 0,
            vy: 0,
            hp: Math.round(55 * hpMult),
            maxHp: Math.round(55 * hpMult),
            radius: 15,
            speed: 130 * spdMult,
            shootCooldown: 2.8,
            shootTimer: Math.random() * 2,
            color: '#00ff88',
            xpVal: 5,
            xpColor: '#00ff88',
            damage: Math.round(14 * dmgMult)
          });
        } else if (t > 130 && r < 0.22) {
          // 轨道狙击巡洋机 (Sniper Cruiser)
          this.enemies.push({
            type: 'sniper',
            x: sx,
            y: sy,
            vx: 0,
            vy: 0,
            hp: Math.round(70 * hpMult),
            maxHp: Math.round(70 * hpMult),
            radius: 17,
            speed: 105 * spdMult,
            aimTimer: 1.2,
            shootCooldown: 3.2,
            color: '#ff00aa',
            xpVal: 8,
            xpColor: '#ff00aa',
            damage: Math.round(24 * dmgMult)
          });
        } else if (t > 100 && r < 0.32) {
          // 护盾信标机 (Shield Pylon Drone)
          this.enemies.push({
            type: 'shield_pylon',
            x: sx,
            y: sy,
            vx: 0,
            vy: 0,
            hp: Math.round(110 * hpMult),
            maxHp: Math.round(110 * hpMult),
            radius: 16,
            speed: 95 * spdMult,
            color: '#ffea00',
            xpVal: 9,
            xpColor: '#ffea00',
            damage: Math.round(12 * dmgMult)
          });
        } else if (t > 95 && r < 0.40 && !kamikazeCapped) {
          // 纳米自爆蜘蛛 (Kamikaze Tick)：降频（95s后约5%/波）+ 降速 + 降伤 + 同屏上限
          this.enemies.push({
            type: 'kamikaze',
            x: sx,
            y: sy,
            vx: 0,
            vy: 0,
            hp: Math.round(28 * hpMult),
            maxHp: Math.round(28 * hpMult),
            radius: 11,
            speed: 232 * spdMultKamikaze,
            color: '#ff3300',
            xpVal: 4,
            xpColor: '#ff3300',
            damage: Math.round(18 * dmgMult)
          });
        } else if (t > 20 && r < 0.65) {
          // Crimson Swarmer
          this.enemies.push({
            type: 'swarmer',
            x: sx,
            y: sy,
            vx: 0,
            vy: 0,
            hp: Math.round(28 * hpMult),
            maxHp: Math.round(28 * hpMult),
            radius: 12,
            speed: 235 * spdMult,
            color: '#ff0055',
            xpVal: 2,
            xpColor: '#ff0055',
            damage: Math.round(10 * dmgMult)
          });
        } else {
          // Standard Blue Drone
          this.enemies.push({
            type: 'drone',
            x: sx,
            y: sy,
            vx: 0,
            vy: 0,
            hp: Math.round(40 * hpMult),
            maxHp: Math.round(40 * hpMult),
            radius: 14,
            speed: 155 * spdMult,
            color: '#00c3ff',
            xpVal: 3,
            xpColor: '#00c3ff',
            damage: Math.round(12 * dmgMult)
          });
        }
      }

      spawnBoss() {
        this.bossCycle = (this.bossCycle || 0) + 1;
        const spawnPilot = this.getActiveSpawnPilot();
        this.sound.playBossAlert();
        this.shockwaves.push({
          x: spawnPilot.x,
          y: spawnPilot.y,
          radius: 10,
          maxRadius: 380,
          alpha: 1,
          color: '#ff0055'
        });

        const spawnAngle = Math.random() * Math.PI * 2;
        const spawnDist = 460;
        const bx = spawnPilot.x + Math.cos(spawnAngle) * spawnDist;
        const by = spawnPilot.y + Math.sin(spawnAngle) * spawnDist;
        const cycle = Math.floor((this.bossCycle - 1) / 3);
        const hpScale = this.getAdaptiveScaling() * (1.0 + cycle * 0.45) * (this.difficulty >= 6 ? 1.12 : 1);
        const timeMin = this.survivalTime / 60;
        const dmgScale = 1.0 + Math.min(2.0, timeMin * 0.08) + cycle * 0.15;

        let boss = null;
        const bossNameEl = document.getElementById('boss-name');

        if (window.NeonLanEncounters?.active(this) && this.bossCycle % 2 === 0) {
          boss = window.NeonLanEncounters.createDualBoss(this, bx, by, hpScale, dmgScale);
          if (bossNameEl) bossNameEl.textContent = '双生裁决者 · 共振要塞 (DUAL REACTOR)';
        } else if (this.bossCycle % 3 === 1) {
          // BOSS 1: 雷暴行者·极性核心 (STORM NEXUS)
          boss = {
            type: 'boss_nexus',
            isBoss: true,
            x: bx,
            y: by,
            vx: 0,
            vy: 0,
            hp: Math.round(4500 * hpScale),
            maxHp: Math.round(4500 * hpScale),
            radius: 46,
            speed: 105,
            color: '#00f3ff',
            damage: Math.round(28 * dmgScale),
            attackTimer: 0,
            pylonTimer: 0
          };
          if (bossNameEl) bossNameEl.textContent = '⚡ 雷暴行者·极性核心 (STORM NEXUS)';
          // Summon 2 tethered conductor pylons
          for (let i = 0; i < 2; i++) {
            const pAngle = (i / 2) * Math.PI * 2;
            this.enemies.push({
              type: 'nexus_pylon',
              x: bx + Math.cos(pAngle) * 160,
              y: by + Math.sin(pAngle) * 160,
              vx: 0,
              vy: 0,
              hp: Math.round(360 * hpScale),
              maxHp: Math.round(360 * hpScale),
              radius: 18,
              speed: 90,
              color: '#00f3ff',
              damage: Math.round(16 * dmgScale),
              xpVal: 15,
              orbitAngle: pAngle
            });
          }
        } else if (this.bossCycle % 3 === 2) {
          // BOSS 2: 欧米茄·母舰堡垒 (OMEGA CARRIER)
          boss = {
            type: 'boss_carrier',
            isBoss: true,
            hasShield: true,
            x: bx,
            y: by,
            vx: 0,
            vy: 0,
            hp: Math.round(7500 * hpScale),
            maxHp: Math.round(7500 * hpScale),
            radius: 52,
            speed: 80,
            color: '#ff007f',
            damage: Math.round(34 * dmgScale),
            attackTimer: 0,
            spawnTimer: 0,
            stunTimer: 0
          };
          if (bossNameEl) bossNameEl.textContent = '🛡️ 欧米茄·母舰堡垒 (OMEGA CARRIER)';
          // Summon 3 shield drones
          for (let i = 0; i < 3; i++) {
            const sAngle = (i / 3) * Math.PI * 2;
            this.enemies.push({
              type: 'shield_drone',
              x: bx + Math.cos(sAngle) * 180,
              y: by + Math.sin(sAngle) * 180,
              vx: 0,
              vy: 0,
              hp: Math.round(420 * hpScale),
              maxHp: Math.round(420 * hpScale),
              radius: 17,
              speed: 75,
              color: '#00f3ff',
              damage: Math.round(15 * dmgScale),
              xpVal: 18,
              orbitAngle: sAngle
            });
          }
        } else {
          // BOSS 3: 湮灭·引力吞噬者 (SINGULARITY DEVOURER)
          boss = {
            type: 'boss_devourer',
            isBoss: true,
            x: bx,
            y: by,
            vx: 0,
            vy: 0,
            hp: Math.round(11000 * hpScale),
            maxHp: Math.round(11000 * hpScale),
            radius: 54,
            speed: 72,
            color: '#9d00ff',
            damage: Math.round(42 * dmgScale),
            attackTimer: 0,
            devourTimer: 0,
            stunTimer: 0
          };
          if (bossNameEl) bossNameEl.textContent = '🌌 湮灭·引力吞噬者 (SINGULARITY DEVOURER)';
        }

        window.NeonRogueEndless?.decorateBoss(this, boss);
        this.enemies.push(boss);
        this.currentBoss = boss;
      }

      /* ========================================================================
         8. MAIN SIMULATION UPDATE
         ======================================================================== */
      update(dt) {
        if (this.state !== 'playing') return;
        if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) dt = 0.016;

        // 玩家坐标与速度自愈防脱离/NaN
        if (!Number.isFinite(this.player.x) || !Number.isFinite(this.player.y)) {
          this.player.x = 0;
          this.player.y = 0;
          this.player.vx = 0;
          this.player.vy = 0;
          this.player.isDashing = false;
        }
        if (!Number.isFinite(this.player.vx)) this.player.vx = 0;
        if (!Number.isFinite(this.player.vy)) this.player.vy = 0;

        this.survivalTime += dt;
        // A playable ship runs the same registered hook regardless of pilot
        // identity. This scales to additional ships/teammates without adding
        // character-specific branches to the world loop.
        if (window.NeonShips?.runAbility) {
          const pilots = this.players?.list?.() || [{ id: 'host', state: this.player }];
          for (const { state: pilot } of pilots) {
            if (pilot.hp > 0 && !pilot.downed) window.NeonShips.runAbility(pilot, 'onTick', this, dt);
          }
        }
        this.updateSpawning(dt);
        window.NeonLanEncounters?.scaleNewEnemies(this);
        if (this.endlessMode) window.NeonRogueEndless?.update(this, dt);

        // Player Passive Regen
        if (!this.player.downed && this.player.regen > 0 && this.player.hp < this.player.maxHp) {
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.regen * dt);
        }

        // Screen Shake decay
        if (this.screenShake > 0) {
          this.screenShake = Math.max(0, this.screenShake - dt * 25);
          this.screenShakeAngle = Math.random() * Math.PI * 2;
        }

        // Invulnerability
        if (this.player.invulnTimer > 0) {
          this.combatTelemetry.invulnerableSeconds += Math.min(dt, this.player.invulnTimer);
          this.player.invulnTimer -= dt;
        }

        // Dash 3-Charge Recharge System
        if (this.player.shipId === 'phantom') {
          const ghost = window.NeonPhantom?.state(this.player);
          if (ghost) {
            this.player.maxDashCharges = Math.min(3, 2 + (ghost.warpUpgrades.charge_overflow || 0));
            this.player.dashCharges = ghost.dashCharges;
            this.player.dashRechargeTimer = ghost.dashRecharge;
          }
        }
        if (this.player.shipId === 'riftblade' && this.player.dashCharges < this.player.maxDashCharges) {
          this.player.dashRechargeTimer += dt;
          const targetRecharge = this.getEffectiveDashRecharge();
          if (this.player.dashRechargeTimer >= targetRecharge) {
            this.player.dashRechargeTimer = 0;
            this.player.dashCharges++;
          }
        } else if (this.player.shipId === 'riftblade') {
          this.player.dashRechargeTimer = 0;
        }

        if (this.player.downed) {
          // Keep simulating enemies, projectiles and the surviving teammate,
          // but a wreck may not steer, dash, heal or perform weapon attacks.
          this.player.vx = 0;
          this.player.vy = 0;
          this.player.isDashing = false;
        } else if (this.player.isDashing) {
          this.player.dashTimeLeft -= dt;
          const dashSpeed = this.player.baseSpeed * 3.6;
          const previousDashX = this.player.x;
          const previousDashY = this.player.y;
          this.player.x += this.player.dashDir.x * dashSpeed * dt;
          this.player.y += this.player.dashDir.y * dashSpeed * dt;
          const segmentX = this.player.x - previousDashX;
          const segmentY = this.player.y - previousDashY;
          const segmentLengthSq = segmentX * segmentX + segmentY * segmentY;

          // Piercing slash damage to all enemies along the dash path!
          const slashWidth = this.player.radius + (this.player.dashSlashWidth || 18);
          const slashDmg = this.player.dashSlashDmg || Math.round(95 * this.player.dmgMultiplier);

          for (const e of this.enemies) {
            if (!this.player.dashHitEnemies.has(e)) {
              // Swept collision avoids skipping enemies at high dash speed / low FPS.
              const projection = segmentLengthSq > 0
                ? Math.max(0, Math.min(1, ((e.x - previousDashX) * segmentX + (e.y - previousDashY) * segmentY) / segmentLengthSq))
                : 1;
              const hitX = previousDashX + projection * segmentX;
              const hitY = previousDashY + projection * segmentY;
              const d = Vec.dist(hitX, hitY, e.x, e.y);
              if (d < e.radius + slashWidth) {
                this.player.dashHitEnemies.add(e);
                const precise = d < e.radius + Math.max(7, slashWidth * 0.40);
                if (precise && !this.player.dashPreciseHit) {
                  this.player.dashPreciseHit = true;
                  this.player.dashCombo = Math.min(5, (this.player.dashCombo || 0) + 1);
                  this.player.dashComboUntil = this.survivalTime + 1.20;
                  this.combatTelemetry.preciseDashes++;
                  window.NeonRogueEndless?.onPreciseDash(this, e);
                  this.texts.push({ x: e.x, y: e.y - 30, text: `精准折跃 ×${this.player.dashCombo}`, color: '#00f3ff', size: 15, life: 0.8, maxLife: 0.8 });
                  this.vibrateGamepad(55, 0.25, 0.15);
                }

                // If cryo dash is unlocked:
                if (this.player.hasDashCryo) {
                  e.freezeTimer = this.player.dashCryoDuration || 2.5;
                }

                // Critical, level, and mastery multipliers are each applied once.
                this.dealDamage(e, slashDmg * (precise ? 1 + this.player.dashCombo * 0.08 : 1),
                  'dash', this.player.dashAlwaysCrit);

                this.playCombatSound('dash-impact', () => this.sound.playLaser(780,'triangle'), 2);
                if (this.particles.length < (this.fxLow ? 20 : 60)) {
                  this.particles.push({
                    type: 'spark',
                    x: e.x, y: e.y,
                    vx: this.player.dashDir.x * 220 + (Math.random() - 0.5) * 80,
                    vy: this.player.dashDir.y * 220 + (Math.random() - 0.5) * 80,
                    radius: Math.random() * 2.5 + 1.5,
                    color: this.player.hasFireTrail ? '#ff007f' : '#00f3ff',
                    life: 0.22, maxLife: 0.22
                  });
                }
              }
            }
          }

          // Trail phantom particles
          if (this.particles.length < (this.fxLow ? 20 : 60)) {
            this.particles.push({
              type: 'afterimage',
              x: this.player.x,y: this.player.y,
              radius: this.player.radius * (this.player.hasFireTrail ? 1.4 : 1.1),
              color: this.player.hasFireTrail ? 'rgba(255, 0, 128, 0.65)' : 'rgba(0, 243, 255, 0.55)',
              life: 0.2,maxLife: 0.2
            });
          }

          if (this.player.dashTimeLeft <= 0) {
            this.player.isDashing = false;
            if (!this.player.dashPreciseHit) {
              this.player.dashCombo = 0;
              this.player.dashComboUntil = 0;
            }

            // Trigger Destination Nova Blast if upgraded!
            if (this.player.hasDashBlast) {
              this.sound.playExplosion('small');
              this.shockwaves.push({
                x: this.player.x,
                y: this.player.y,
                radius: 15,
                maxRadius: this.player.dashBlastRadius,
                alpha: 1.0,
                color: '#ffaa00'
              });
              const bSq = this.player.dashBlastRadius * this.player.dashBlastRadius;
              for (const e of this.enemies) {
                const bdx = e.x - this.player.x;
                const bdy = e.y - this.player.y;
                if (bdx * bdx + bdy * bdy <= bSq) {
                  this.dealDamage(e, this.player.dashBlastDamage);
                  const ang = Math.atan2(bdy, bdx);
                  e.vx += Math.cos(ang) * 350;
                  e.vy += Math.sin(ang) * 350;
                }
              }
            }

            // Drop Persistent Plasma Fire Trail if upgraded!
            if (this.player.hasFireTrail && this.player.dashStartX !== undefined) {
              this.dashTrails.push({
                x1: this.player.dashStartX,
                y1: this.player.dashStartY,
                x2: this.player.x,
                y2: this.player.y,
                damage: this.player.fireTrailDamage,
                life: this.player.fireTrailDuration,
                maxLife: this.player.fireTrailDuration,
                color: '#ff007f'
              });
            }
          }
        } else {
          // Standard Player Movement
          let moveX = 0, moveY = 0;
          if (this.keys['w'] || this.keys['arrowup']) moveY -= 1;
          if (this.keys['s'] || this.keys['arrowdown']) moveY += 1;
          if (this.keys['a'] || this.keys['arrowleft']) moveX -= 1;
          if (this.keys['d'] || this.keys['arrowright']) moveX += 1;

          if (this.touch.active) {
            const dx = this.touch.currentX - this.touch.startX;
            const dy = this.touch.currentY - this.touch.startY;
            const dist = Math.hypot(dx, dy);
            if (dist > (window.NeonGameSettings?.get('joystickDeadzone') || 10)) {
              moveX = dx / dist;
              moveY = dy / dist;
            }
          }

          if (this.gamepadMove && (this.gamepadMove.x !== 0 || this.gamepadMove.y !== 0)) {
            moveX = this.gamepadMove.x;
            moveY = this.gamepadMove.y;
          }

          const moveLen = Math.hypot(moveX, moveY);
          if (moveLen > 0.05) {
            const normX = moveX / moveLen;
            const normY = moveY / moveLen;
            const phaseSpeed = this.player.shipId === 'phantom' &&
              this.player.phantom?.shiftActive ? window.NeonPhantom?.BASE?.shiftSpeedMultiplier || 1.4 : 1;
            this.player.vx = normX * this.player.baseSpeed * phaseSpeed;
            this.player.vy = normY * this.player.baseSpeed * phaseSpeed;
          } else {
            this.player.vx *= 0.8;
            this.player.vy *= 0.8;
          }

          this.player.x += this.player.vx * dt;
          this.player.y += this.player.vy * dt;
        }

        // Anti-AFK detection: if standing idle in one spot for > 8.5s, spawn pursuers
        const afkMoveDist = Vec.dist(this.player.x, this.player.y, this.lastAfkX || 0, this.lastAfkY || 0);
        if (this.player.downed) {
          this.afkTimer = 0;
        } else if (afkMoveDist > 6) {
          this.afkTimer = 0;
          this.lastAfkX = this.player.x;
          this.lastAfkY = this.player.y;
        } else {
          this.afkTimer = (this.afkTimer || 0) + dt;
          if (this.afkTimer > 8.5) {
            this.afkTimer = 4.5;
            this.spawnAntiAfkPursuers();
          }
        }

        // Update Aegis Aura (时空相位无敌光环)
        if (!this.player.downed && this.player.aegisTimer > 0) {
          this.player.aegisTimer -= dt;
          this.player.aegisPulseTimer = (this.player.aegisPulseTimer || 0) + dt;

          if (this.player.aegisDamage > 0 && this.player.aegisPulseTimer >= 0.05) {
            this.player.aegisPulseTimer = 0;
            const aRadSq = this.player.aegisRadius * this.player.aegisRadius;
            for (const e of this.enemies) {
              const dx = e.x - this.player.x;
              const dy = e.y - this.player.y;
              if (dx * dx + dy * dy <= aRadSq) {
                this.dealDamage(e, this.player.aegisDamage * 0.25);
                const ang = Math.atan2(dy, dx);
                e.vx += Math.cos(ang) * 160;
                e.vy += Math.sin(ang) * 160;
              }
            }
          }

          if (this.player.aegisTimer <= 0 && this.player.hasAegisBurst) {
            this.sound.playLaser(980, 'sawtooth');
            this.screenShake = 12;
            for (let k = 0; k < 8; k++) {
              const bAngle = (k / 8) * Math.PI * 2;
              this.bullets.push({
                x: this.player.x,
                y: this.player.y,
                vx: Math.cos(bAngle) * 880,
                vy: Math.sin(bAngle) * 880,
                radius: 6,
                damage: Math.round(180 * this.player.dmgMultiplier),
                pierce: 3,
                color: '#ffe600',
                life: 1.2
              });
            }
          }
        }

        // Always lock onto the nearest enemy. No keyboard, mouse, or gamepad
        // action can disable automatic targeting.
        this.player.autoAim = true;
        if (this.player.downed && this.lanCoop?.ally?.hp > 0) {
          this.player.aimAngle = this.player.aimAngle || 0;
        } else {
          const nearest = this.findNearestEnemy(650);
          if (nearest) {
            this.player.aimAngle = Math.atan2(nearest.y - this.player.y, nearest.x - this.player.x);
          }
        }

        // Camera smoothly follows player
        const livingAlly = (this.lanCoop?.allies?.size || 0) > 1
          ? [...this.lanCoop.allies.values()].find(p =>
            !p.disconnected && p.hp > 0 && !p.downed)
          : this.lanCoop?.ally;
        const cameraTarget = this.player.downed && livingAlly?.hp > 0
          ? livingAlly : this.player;
        this.camera.x += (cameraTarget.x - this.camera.x) * 0.12;
        this.camera.y += (cameraTarget.y - this.camera.y) * 0.12;
        if (!Number.isFinite(this.camera.x) || !Number.isFinite(this.camera.y)) {
          this.camera.x = this.player.x;
          this.camera.y = this.player.y;
        }

        // --- Weapon Timers & Firing ---
        const weapons = this.player.downed ? {} : this.player.weapons;
        if (!this.player.downed) window.NeonLegendaryArsenal?.update(this, dt);
        // Class-specific weapon and mana ticks are dispatched once through
        // NeonShips.onTick above for EVERY registered pilot. Never duplicate.
        window.NeonAstra?.tickShields(this, dt);
        // All pilots now share one firing pipeline; timers belong to the
        // pilot, while effects/kill accounting remain authoritative on game.
        window.NeonWeaponSystem?.update(this, this.player, dt);

        // 5. Orbiters Update
        if (!this.player.downed && this.orbiters.length > 0) {
          const rotSpeed = 3.2 + (weapons.orbit || 1) * 0.5;
          this.orbiters.forEach((orb) => {
            orb.angle += rotSpeed * dt;
            const ox = this.player.x + Math.cos(orb.angle) * orb.distance;
            const oy = this.player.y + Math.sin(orb.angle) * orb.distance;

            // Orbiter collision check
            for (const e of this.enemies) {
              if (Vec.dist(ox, oy, e.x, e.y) < orb.radius + e.radius) {
                this.dealDamage(e, orb.damage * dt * 4, 'orbit'); // Continuous cutting damage
              }
            }
          });
        }

        // 7. Companion Drones
        if (weapons.drones && this.companionDrones.length === 0) {
          this.syncDrones();
        }

        // --- Update Laser Beams ---
        for (let i = this.laserBeams.length - 1; i >= 0; i--) {
          const lb = this.laserBeams[i];
          lb.life -= dt;
          if (lb.life <= 0) {
            this.laserBeams.splice(i, 1);
          }
        }

        // --- Update Companion Drones ---
        if (!this.player.downed && this.companionDrones.length > 0) {
          this.companionDrones.forEach((dr) => {
            dr.angle += 2.4 * dt;
            dr.shootTimer += dt;
            const dx = this.player.x + Math.cos(dr.angle) * dr.orbitDist;
            const dy = this.player.y + Math.sin(dr.angle) * dr.orbitDist;
            dr.x = dx;
            dr.y = dy;

            if (dr.shootTimer >= dr.shootInterval) {
              dr.shootTimer = 0;
              const target = this.findNearestEnemy(550);
              if (target) {
                const a = Math.atan2(target.y - dy, target.x - dx);
                this.sound.playLaser(920, 'triangle');
                this.bullets.push({
                  x: dx,
                  y: dy,
                  vx: Math.cos(a) * 900,
                  vy: Math.sin(a) * 900,
                  radius: 3.5,
                  damage: dr.damage,
                  color: '#00ffaa',
                  life: 0.8
                });
              }
            }
          });
        }

        // --- Update Black Holes ---
        for (let i = this.blackHoles.length - 1; i >= 0; i--) {
          const bh = this.blackHoles[i];
          bh.life -= dt;
          bh.rotAngle += 4.5 * dt;
          bh.pulseTimer += dt;

          const rSq = bh.radius * bh.radius;
          for (const e of this.enemies) {
            const edx = bh.x - e.x;
            const edy = bh.y - e.y;
            const dSq = edx * edx + edy * edy;
            if (dSq < rSq && dSq > 16) {
              const d = Math.sqrt(dSq);
              const pull = Math.min(320, (1 - d / bh.radius) * 480);
              e.x += (edx / d) * pull * dt;
              e.y += (edy / d) * pull * dt;
            }
          }

          if (bh.pulseTimer >= 0.3) {
            bh.pulseTimer = 0;
            for (const e of this.enemies) {
              const edx = bh.x - e.x;
              const edy = bh.y - e.y;
              if (edx * edx + edy * edy < rSq) {
                this.dealDamage(e, bh.damage * 0.45);
              }
            }
          }

          if (bh.life <= 0) {
            this.sound.playExplosion('large');
            this.screenShake = 12;
            this.shockwaves.push({
              x: bh.x,
              y: bh.y,
              radius: 10,
              maxRadius: bh.radius * 1.15,
              alpha: 1,
              color: '#9d00ff'
            });
            for (const e of this.enemies) {
              const edx = bh.x - e.x;
              const edy = bh.y - e.y;
              if (edx * edx + edy * edy < rSq) {
                this.dealDamage(e, bh.damage * 2.5);
              }
            }
            this.blackHoles.splice(i, 1);
          }
        }

        // --- Update Cryo Mines ---
        for (let i = this.mines.length - 1; i >= 0; i--) {
          const m = this.mines[i];
          m.life -= dt;
          m.armTimer -= dt;
          let triggered = m.life <= 0;

          if (m.armTimer <= 0 && !triggered) {
            for (const e of this.enemies) {
              const mdx = e.x - m.x;
              const mdy = e.y - m.y;
              if (mdx * mdx + mdy * mdy < (m.radius + e.radius) * (m.radius + e.radius)) {
                triggered = true;
                break;
              }
            }
          }

          if (triggered) {
            this.sound.playFreeze();
            this.shockwaves.push({
              x: m.x,
              y: m.y,
              radius: 10,
              maxRadius: m.blastRadius,
              alpha: 1,
              color: '#00f3ff'
            });
            const bSq = m.blastRadius * m.blastRadius;
            for (const e of this.enemies) {
              const mdx = e.x - m.x;
              const mdy = e.y - m.y;
              if (mdx * mdx + mdy * mdy < bSq) {
                this.dealDamage(e, m.damage, 'cryo');
                e.freezeTimer = 3.0; // 50% slow
              }
            }
            this.mines.splice(i, 1);
          }
        }

        // --- Update Plasma Dash Trails (Warp Laser Wall) ---
        for (let i = this.dashTrails.length - 1; i >= 0; i--) {
          const dtTrail = this.dashTrails[i];
          dtTrail.life -= dt;
          for (const e of this.enemies) {
            const dx = e.x - dtTrail.x1;
            const dy = e.y - dtTrail.y1;
            const tdx = dtTrail.x2 - dtTrail.x1;
            const tdy = dtTrail.y2 - dtTrail.y1;
            const lenSq = tdx * tdx + tdy * tdy;
            if (lenSq > 1) {
              const segT = Math.max(0, Math.min(1, (dx * tdx + dy * tdy) / lenSq));
              const px = dtTrail.x1 + segT * tdx;
              const py = dtTrail.y1 + segT * tdy;
              if (Vec.dist(e.x, e.y, px, py) < 22 + e.radius) {
                this.dealDamage(e, dtTrail.damage * dt * 4, 'fire'); // Continuous plasma burning tick
              }
            }
          }
          if (dtTrail.life <= 0) {
            this.dashTrails.splice(i, 1);
          }
        }

        // --- Update Bullets ---
        for (let i = this.bullets.length - 1; i >= 0; i--) {
          const b = this.bullets[i];
          b.life -= dt;
          if (b.life <= 0) {
            if (b.type === 'cluster_missile') {
              // Cluster bomblet airburst detonation on timeout
              this.sound.playExplosion('small');
              this.shockwaves.push({
                x: b.x,
                y: b.y,
                radius: 4,
                maxRadius: b.explosionRadius,
                alpha: 0.85,
                color: b.isLevel5 ? '#ffea00' : '#ff66cc'
              });
              const rSq = b.explosionRadius * b.explosionRadius;
              for (const ae of this.enemies) {
                const edx = ae.x - b.x;
                const edy = ae.y - b.y;
                if (edx * edx + edy * edy <= rSq) {
                  this.dealDamage(ae, b.damage);
                  if (b.hasCc && b.slowDuration) {
                    ae.freezeTimer = Math.max(ae.freezeTimer || 0, b.slowDuration);
                  }
                }
              }
            }
            this.bullets.splice(i, 1);
            continue;
          }

          if (b.type === 'missile') {
            // Homing logic
            if (!b.target || b.target.dead) {
              b.target = this.findNearestEnemy(950);
            }
            if (b.target) {
              const targetAngle = Math.atan2(b.target.y - b.y, b.target.x - b.x);
              const currentAngle = Math.atan2(b.vy, b.vx);
              let diff = targetAngle - currentAngle;
              while (diff < -Math.PI) diff += Math.PI * 2;
              while (diff > Math.PI) diff -= Math.PI * 2;
              const turnRate = b.isLevel5 ? 9.5 : 7.5;
              const newAngle = currentAngle + diff * Math.min(1, turnRate * dt);
              b.vx = Math.cos(newAngle) * b.speed;
              b.vy = Math.sin(newAngle) * b.speed;
            }
          } else if (b.type === 'cluster_missile') {
            if (!b.target || b.target.dead) {
              b.target = this.findNearestEnemy(550);
            }
            if (b.target) {
              const targetAngle = Math.atan2(b.target.y - b.y, b.target.x - b.x);
              const currentAngle = Math.atan2(b.vy, b.vx);
              let diff = targetAngle - currentAngle;
              while (diff < -Math.PI) diff += Math.PI * 2;
              while (diff > Math.PI) diff -= Math.PI * 2;
              const newAngle = currentAngle + diff * Math.min(1, 10.5 * dt);
              b.vx = Math.cos(newAngle) * b.speed;
              b.vy = Math.sin(newAngle) * b.speed;
            }
          }

          b.x += b.vx * dt;
          b.y += b.vy * dt;

          // Check bullet collision with enemies
          let hit = false;
          for (const e of this.enemies) {
            if (Vec.dist(b.x, b.y, e.x, e.y) < b.radius + e.radius) {
              if (b.type === 'missile') {
                // Missile AOE explosion
                this.sound.playExplosion(b.isLevel5 ? 'large' : 'small');
                this.screenShake = Math.max(this.screenShake, b.isLevel5 ? 8 : 3.5);
                this.shockwaves.push({
                  x: b.x,
                  y: b.y,
                  radius: 8,
                  maxRadius: b.explosionRadius,
                  alpha: 1,
                  color: b.isLevel5 ? '#00f3ff' : '#ff007f'
                });

                // Lv.5 Graviton vortex pull: draws all nearby enemies within 1.25x radius inward before blast
                if (b.isLevel5) {
                  const pullRad = b.explosionRadius * 1.25;
                  const pullRadSq = pullRad * pullRad;
                  for (const pe of this.enemies) {
                    const pdx = b.x - pe.x;
                    const pdy = b.y - pe.y;
                    const pdistSq = pdx * pdx + pdy * pdy;
                    if (pdistSq > 0 && pdistSq <= pullRadSq) {
                      const pdist = Math.sqrt(pdistSq);
                      const pullForce = (1 - pdist / pullRad) * 280;
                      pe.vx += (pdx / pdist) * pullForce;
                      pe.vy += (pdy / pdist) * pullForce;
                    }
                  }
                }

                // AoE damage and crowd control
                const rSq = b.explosionRadius * b.explosionRadius;
                for (const ae of this.enemies) {
                  const edx = ae.x - b.x;
                  const edy = ae.y - b.y;
                  const distSq = edx * edx + edy * edy;
                  if (distSq <= rSq) {
                    this.dealDamage(ae, b.damage, 'missile');
                    if (b.hasCc) {
                      ae.freezeTimer = Math.max(ae.freezeTimer || 0, b.slowDuration);
                      const dist = Math.sqrt(distSq) || 1;
                      const kbForce = b.isLevel5 ? 320 : 240;
                      ae.vx += (edx / dist) * kbForce;
                      ae.vy += (edy / dist) * kbForce;
                    }
                  }
                }

                // Spawn cluster bomblets (Lv.4 -> 2 bomblets, Lv.5 -> 3 bomblets)
                if (b.clusterCount > 0) {
                  const clusterDmg = b.damage * (b.isLevel5 ? 0.65 : 0.50);
                  const clusterRad = (55 + (b.isLevel5 ? 20 : 0)) * this.player.areaMultiplier;
                  for (let k = 0; k < b.clusterCount; k++) {
                    const cAngle = Math.random() * Math.PI * 2;
                    const cSpeed = 260 + Math.random() * 140;
                    this.bullets.push({
                      type: 'cluster_missile',
                      x: b.x,
                      y: b.y,
                      vx: Math.cos(cAngle) * cSpeed,
                      vy: Math.sin(cAngle) * cSpeed,
                      radius: 4 * this.player.areaMultiplier,
                      speed: 460,
                      damage: clusterDmg,
                      target: this.findNearestEnemy(600),
                      explosionRadius: clusterRad,
                      hasCc: b.hasCc,
                      slowDuration: b.slowDuration * 0.75,
                      isLevel5: b.isLevel5,
                      life: 0.65 + Math.random() * 0.45,
                      color: b.isLevel5 ? '#ffea00' : '#ff66cc'
                    });
                  }
                }

                hit = true;
                break;
              } else if (b.type === 'cluster_missile') {
                this.sound.playExplosion('small');
                this.shockwaves.push({
                  x: b.x,
                  y: b.y,
                  radius: 4,
                  maxRadius: b.explosionRadius,
                  alpha: 0.85,
                  color: b.isLevel5 ? '#ffea00' : '#ff66cc'
                });
                const rSq = b.explosionRadius * b.explosionRadius;
                for (const ae of this.enemies) {
                  const edx = ae.x - b.x;
                  const edy = ae.y - b.y;
                  if (edx * edx + edy * edy <= rSq) {
                    this.dealDamage(ae, b.damage, 'missile');
                    if (b.hasCc && b.slowDuration) {
                      ae.freezeTimer = Math.max(ae.freezeTimer || 0, b.slowDuration);
                    }
                  }
                }
                hit = true;
                break;
              } else {
                this.dealDamage(e, b.damage, b.type === 'blaster' ? 'blaster' : 'combat',
                  false, this.lanCoop?.allies?.get?.(b.ownerId || b.owner) ||
                    (this.lanCoop?.allies?.get(b.owner) ||
                      (b.owner === 'guest' && this.lanCoop?.ally ? this.lanCoop.ally : this.player)));
                if (b.isPlasmaExplosion) {
                  this.shockwaves.push({
                    x: b.x,
                    y: b.y,
                    radius: 4,
                    maxRadius: b.explosionRadius,
                    alpha: 0.85,
                    color: '#ffaa00'
                  });
                  const pRadSq = b.explosionRadius * b.explosionRadius;
                  for (const pe of this.enemies) {
                    if (pe === e) continue;
                    const pdx = pe.x - b.x;
                    const pdy = pe.y - b.y;
                    if (pdx * pdx + pdy * pdy <= pRadSq) {
                      this.dealDamage(pe, b.damage * 0.65, 'blaster');
                      pe.vx += Math.sign(pdx || 1) * 160;
                      pe.vy += Math.sign(pdy || 1) * 160;
                    }
                  }
                }
                if (b.pierce) {
                  b.pierce--;
                  if (b.pierce <= 0) hit = true;
                } else {
                  hit = true;
                }
                break;
              }
            }
          }

          if (hit) {
            this.bullets.splice(i, 1);
          }
        }

        // --- Update Enemy Projectiles ---
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
          const eb = this.enemyBullets[i];
          eb.life -= dt;
          eb.x += eb.vx * dt;
          eb.y += eb.vy * dt;

          if (eb.life <= 0) {
            this.enemyBullets.splice(i, 1);
            continue;
          }

          if (this.player.invulnTimer <= 0 && Vec.dist(eb.x, eb.y, this.player.x, this.player.y) < eb.radius + this.player.radius) {
            this.hitPlayer(eb.damage);
            this.enemyBullets.splice(i, 1);
          }
        }

        // --- Update Enemies ---
        this.lightningTethers = [];
        for (let i = this.enemies.length - 1; i >= 0; i--) {
          const e = this.enemies[i];
          if (e.dead) {
            this.enemies.splice(i, 1);
            continue;
          }

          // Enemies choose the nearest living ship across the whole party,
          // never hard-code only host and the first guest.
          const targets = [this.player,
            ...((this.lanCoop?.rtc?.connected && this.lanCoop?.allies?.size)
              ? this.lanCoop.allies.values() : (this.lanCoop?.ally ? [this.lanCoop.ally] : []))]
            .filter(p => p && p.hp > 0 && !p.downed && !p.disconnected);
          const aimPlayer = targets.reduce((nearest, p) => !nearest ||
            Vec.dist(e.x, e.y, p.x, p.y) < Vec.dist(e.x, e.y, nearest.x, nearest.y)
              ? p : nearest, null) || this.player;
          const distToPlayer = Vec.dist(e.x, e.y, aimPlayer.x, aimPlayer.y);
          const angleToPlayer = Math.atan2(aimPlayer.y - e.y, aimPlayer.x - e.x);

          // Separation from nearby enemies
          let sepX = 0, sepY = 0;
          for (let j = 0; j < Math.min(10, this.enemies.length); j++) {
            const other = this.enemies[j];
            if (other === e) continue;
            const od = Vec.dist(e.x, e.y, other.x, other.y);
            if (od < e.radius + other.radius && od > 0.1) {
              sepX += (e.x - other.x) / od;
              sepY += (e.y - other.y) / od;
            }
          }

          // Enemy Freeze Slow (修复连续乘0.52导致怪物速度永久归零卡死的bug)
          if (!e.baseSpeed) e.baseSpeed = e.speed || 120;
          if (e.freezeTimer > 0) {
            e.freezeTimer -= dt;
            e.speed = e.baseSpeed * 0.52;
          } else {
            e.speed = e.baseSpeed;
          }

          // Enemy Behavior Types
          if (e.stunnedUntil > this.survivalTime) {
            // Ejection stun pauses both movement AND attacks, not just velocity.
            e.vx = 0;
            e.vy = 0;
          } else if (!e.isBoss && e.fearedUntil > this.survivalTime) {
            // Terror prevents special attacks while enemies retreat.
            const awayX = e.x - aimPlayer.x, awayY = e.y - aimPlayer.y;
            const awayDist = Math.max(1,Math.hypot(awayX,awayY));
            e.vx = awayX / awayDist * (e.speed || 120) * 1.25;
            e.vy = awayY / awayDist * (e.speed || 120) * 1.25;
          } else if (e.type === 'charger') {
            e.chargeTimer -= dt;
            if (e.chargeTimer <= 0) {
              e.isCharging = true;
              e.vx = Math.cos(angleToPlayer) * 440;
              e.vy = Math.sin(angleToPlayer) * 440;
              e.chargeTimer = 3.5;
            }
            if (e.isCharging) {
              e.vx *= 0.985;
              e.vy *= 0.985;
              if (Math.hypot(e.vx, e.vy) < e.speed) e.isCharging = false;
            } else {
              e.vx = Math.cos(angleToPlayer) * e.speed + sepX * 40;
              e.vy = Math.sin(angleToPlayer) * e.speed + sepY * 40;
            }
          } else if (e.type === 'spitter') {
            e.shootTimer += dt;
            if (e.shootTimer >= e.shootCooldown &&
                !(e.fearedUntil > this.survivalTime) && !(e.stunnedUntil > this.survivalTime)) {
              e.shootTimer = 0;
              this.enemyBullets.push({
                x: e.x,
                y: e.y,
                vx: Math.cos(angleToPlayer) * 260,
                vy: Math.sin(angleToPlayer) * 260,
                radius: 5,
                color: '#00ff88',
                damage: e.damage,
                life: 3.5
              });
            }
            if (distToPlayer < 240) {
              e.vx = -Math.cos(angleToPlayer) * e.speed + sepX * 40;
              e.vy = -Math.sin(angleToPlayer) * e.speed + sepY * 40;
            } else {
              e.vx = Math.cos(angleToPlayer) * e.speed + sepX * 40;
              e.vy = Math.sin(angleToPlayer) * e.speed + sepY * 40;
            }
          } else if (e.type === 'kamikaze') {
            // Kamikaze rush & two-stage fuse: 近身先引信预警，走完才结算，拉开可空爆
            e.vx = Math.cos(angleToPlayer) * e.speed;
            e.vy = Math.sin(angleToPlayer) * e.speed;
            if (!e.arming && distToPlayer < 78) {
              e.arming = true;
              e.fuse = 0.55;
              try { this.sound.playZap(); } catch (err) {}
              this.shockwaves.push({
                x: e.x,
                y: e.y,
                radius: 6,
                maxRadius: 46,
                alpha: 0.9,
                color: '#ff3300'
              });
            }
            if (e.arming) {
              e.fuse -= dt;
              if (e.fuse <= 0 && !e.dead) {
                e.dead = true;
                this.sound.playExplosion('small');
                this.shockwaves.push({
                  x: e.x,
                  y: e.y,
                  radius: 10,
                  maxRadius: 85,
                  alpha: 1,
                  color: '#ff3300'
                });
                // 引信走完仍在90半径内才造成伤害，否则只是空爆
                if (Vec.dist(e.x, e.y, this.player.x, this.player.y) < 90) {
                  this.hitPlayer(e.damage);
                }
              }
            }
          } else if (e.type === 'shield_pylon') {
            e.vx = Math.cos(angleToPlayer) * e.speed * 0.7 + sepX * 50;
            e.vy = Math.sin(angleToPlayer) * e.speed * 0.7 + sepY * 50;
            // Buff nearby minions
            for (let j = 0; j < Math.min(15, this.enemies.length); j++) {
              const other = this.enemies[j];
              if (other !== e && !other.isBoss) {
                const od = Vec.dist(e.x, e.y, other.x, other.y);
                if (od < 140) other.shielded = true;
              }
            }
          } else if (e.type === 'sniper') {
            e.aimTimer = (e.aimTimer || 1.2) - dt;
            if (e.aimTimer <= 0) {
              e.aimTimer = 3.0;
              this.sound.playLaser(1100, 'sawtooth');
              this.enemyBullets.push({
                x: e.x,
                y: e.y,
                vx: Math.cos(angleToPlayer) * 620,
                vy: Math.sin(angleToPlayer) * 620,
                radius: 4,
                color: '#ff00aa',
                damage: e.damage,
                life: 3.0
              });
            }
            if (distToPlayer < 320) {
              e.vx = -Math.cos(angleToPlayer) * e.speed;
              e.vy = -Math.sin(angleToPlayer) * e.speed;
            } else {
              e.vx = sepX * 30;
              e.vy = sepY * 30;
            }
          } else if (e.type === 'nexus_pylon') {
            // Orbits Storm Nexus Boss
            if (this.currentBoss && this.currentBoss.type === 'boss_nexus' && !this.currentBoss.dead) {
              e.orbitAngle = (e.orbitAngle || 0) + 1.2 * dt;
              const targetX = this.currentBoss.x + Math.cos(e.orbitAngle) * 160;
              const targetY = this.currentBoss.y + Math.sin(e.orbitAngle) * 160;
              e.x += (targetX - e.x) * 4 * dt;
              e.y += (targetY - e.y) * 4 * dt;
              e.vx = 0;
              e.vy = 0;
              // Add lightning tether link
              this.lightningTethers.push({
                x1: this.currentBoss.x,
                y1: this.currentBoss.y,
                x2: e.x,
                y2: e.y,
                color: '#00f3ff'
              });
            } else {
              e.vx = Math.cos(angleToPlayer) * e.speed;
              e.vy = Math.sin(angleToPlayer) * e.speed;
            }
          } else if (e.type === 'shield_drone') {
            // Orbits Omega Carrier Boss
            if (this.currentBoss && this.currentBoss.type === 'boss_carrier' && !this.currentBoss.dead) {
              e.orbitAngle = (e.orbitAngle || 0) + 1.0 * dt;
              const targetX = this.currentBoss.x + Math.cos(e.orbitAngle) * 180;
              const targetY = this.currentBoss.y + Math.sin(e.orbitAngle) * 180;
              e.x += (targetX - e.x) * 4 * dt;
              e.y += (targetY - e.y) * 4 * dt;
              e.vx = 0;
              e.vy = 0;
            } else {
              e.vx = Math.cos(angleToPlayer) * e.speed;
              e.vy = Math.sin(angleToPlayer) * e.speed;
            }
          } else if (e.type === 'larvae') {
            // Pulled towards Devourer boss mouth
            if (this.currentBoss && this.currentBoss.type === 'boss_devourer' && !this.currentBoss.dead) {
              const bAngle = Math.atan2(this.currentBoss.y - e.y, this.currentBoss.x - e.x);
              const bDist = Vec.dist(e.x, e.y, this.currentBoss.x, this.currentBoss.y);
              e.vx = Math.cos(bAngle) * 190;
              e.vy = Math.sin(bAngle) * 190;
              // If reaches boss mouth: eaten & triggers bullet storm!
              if (bDist < 48) {
                this.currentBoss.hp = Math.min(this.currentBoss.maxHp, this.currentBoss.hp + 120);
                this.sound.playBeam();
                // Radial shockwave
                for (let k = 0; k < 8; k++) {
                  const sAng = (k / 8) * Math.PI * 2;
                  this.enemyBullets.push({
                    x: this.currentBoss.x,
                    y: this.currentBoss.y,
                    vx: Math.cos(sAng) * 220,
                    vy: Math.sin(sAng) * 220,
                    radius: 5,
                    color: '#9d00ff',
                    damage: 16,
                    life: 3.5
                  });
                }
                e.dead = true;
              }
            } else {
              e.vx = Math.cos(angleToPlayer) * e.speed;
              e.vy = Math.sin(angleToPlayer) * e.speed;
            }
          } else if (e.isBoss) {
            // BOSS ARCHETYPES
            // Ascension VI: an extra, telegraphed phase below 60% HP.
            if (this.difficulty >= 6 && e.hp < e.maxHp * 0.60) {
              e.nightmareCharge = (e.nightmareCharge === undefined ? 2.8 : e.nightmareCharge) - dt;
              if (e.nightmareCharge <= 0 && !e.nightmareTelegraph) {
                e.nightmareTelegraph = 0.60;
                e.nightmareCharge = 4.0;
                this.shockwaves.push({ x: e.x, y: e.y, radius: 12, maxRadius: 190, alpha: 1, color: '#ff3366' });
                this.texts.push({ x: e.x, y: e.y - 75, text: '⚠ 噩梦连射 · 准备闪避', color: '#ff6688', size: 18, life: 0.85, maxLife: 0.85 });
              }
              if (e.nightmareTelegraph > 0) {
                e.nightmareTelegraph -= dt;
                if (e.nightmareTelegraph <= 0) {
                  e.nightmareTelegraph = 0;
                  const baseAngle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
                  for (let i = -3; i <= 3; i++) {
                    const angle = baseAngle + i * 0.17;
                    this.enemyBullets.push({
                      x: e.x, y: e.y,
                      vx: Math.cos(angle) * 280, vy: Math.sin(angle) * 280,
                      radius: 5, color: '#ff3366', damage: 23, life: 3.0
                    });
                  }
                }
              }
            }
            if (e.type === 'boss_dual_reactor' && window.NeonLanEncounters?.active(this)) {
              window.NeonLanEncounters.updateBoss(this, e, dt);
            } else if (e.type === 'boss_nexus') {
              e.attackTimer += dt;
              e.vx = Math.cos(angleToPlayer) * e.speed;
              e.vy = Math.sin(angleToPlayer) * e.speed;
              // Electric burst attack
              if (e.attackTimer > 2.2) {
                e.attackTimer = 0;
                this.sound.playZap();
                for (let k = 0; k < 6; k++) {
                  const bAngle = (k / 6) * Math.PI * 2 + (this.survivalTime * 1.5);
                  this.enemyBullets.push({
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(bAngle) * 240,
                    vy: Math.sin(bAngle) * 240,
                    radius: 6,
                    color: '#00f3ff',
                    damage: 20,
                    life: 3.5
                  });
                }
              }
            } else if (e.type === 'boss_carrier') {
              if (e.stunTimer > 0) {
                e.stunTimer -= dt;
                e.vx = 0;
                e.vy = 0;
              } else {
                e.attackTimer += dt;
                e.spawnTimer = (e.spawnTimer || 0) + dt;
                e.vx = Math.cos(angleToPlayer) * e.speed;
                e.vy = Math.sin(angleToPlayer) * e.speed;

                // Summons Kamikaze ticks (节流：4.5s一只，仅无尽/半血以下才两只)
                if (e.spawnTimer > 4.5) {
                  e.spawnTimer = 0;
                  const summonCount = (this.endlessMode || e.hp < e.maxHp * 0.5) ? 2 : 1;
                  for (let s = 0; s < summonCount; s++) {
                    const offAng = (s === 0 ? -0.5 : 0.5) + Math.random() * 0.2;
                    this.enemies.push({
                      type: 'kamikaze',
                      x: e.x + Math.cos(angleToPlayer + offAng) * 45,
                      y: e.y + Math.sin(angleToPlayer + offAng) * 45,
                      vx: 0,
                      vy: 0,
                      hp: 35,
                      maxHp: 35,
                      radius: 11,
                      speed: 230,
                      color: '#ff3300',
                      damage: 18,
                      xpVal: 3
                    });
                  }
                }

                // Plasma spreads
                if (e.attackTimer > 2.0) {
                  e.attackTimer = 0;
                  for (let k = -2; k <= 2; k++) {
                    const bAngle = angleToPlayer + k * 0.22;
                    this.enemyBullets.push({
                      x: e.x,
                      y: e.y,
                      vx: Math.cos(bAngle) * 220,
                      vy: Math.sin(bAngle) * 220,
                      radius: 6,
                      color: '#ff007f',
                      damage: 22,
                      life: 3.8
                    });
                  }
                }
              }
            } else if (e.type === 'boss_devourer') {
              e.attackTimer += dt;
              e.devourTimer = (e.devourTimer || 0) + dt;
              e.vx = Math.cos(angleToPlayer) * e.speed;
              e.vy = Math.sin(angleToPlayer) * e.speed;

              // Spawns ring of larvae to feed upon
              if (e.devourTimer > 5.0) {
                e.devourTimer = 0;
                this.sound.playBlackHole();
                for (let k = 0; k < 6; k++) {
                  const lAng = (k / 6) * Math.PI * 2;
                  this.enemies.push({
                    type: 'larvae',
                    x: e.x + Math.cos(lAng) * 280,
                    y: e.y + Math.sin(lAng) * 280,
                    vx: 0,
                    vy: 0,
                    hp: 45,
                    maxHp: 45,
                    radius: 10,
                    speed: 130,
                    color: '#9d00ff',
                    damage: 12,
                    xpVal: 5
                  });
                }
              }

              // Spiral void hell
              if (e.attackTimer > 1.8) {
                e.attackTimer = 0;
                for (let k = 0; k < 10; k++) {
                  const bAngle = (k / 10) * Math.PI * 2 + (this.survivalTime * 2);
                  this.enemyBullets.push({
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(bAngle) * 210,
                    vy: Math.sin(bAngle) * 210,
                    radius: 6,
                    color: '#9d00ff',
                    damage: 20,
                    life: 4.0
                  });
                }
              }
            } else {
              // Generic boss fallback
              e.attackTimer += dt;
              e.vx = Math.cos(angleToPlayer) * e.speed;
              e.vy = Math.sin(angleToPlayer) * e.speed;
              if (e.attackTimer > 1.8) {
                e.attackTimer = 0;
                for (let k = 0; k < 12; k++) {
                  const bAngle = (k / 12) * Math.PI * 2 + (this.survivalTime * 2);
                  this.enemyBullets.push({
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(bAngle) * 200,
                    vy: Math.sin(bAngle) * 200,
                    radius: 6,
                    color: '#ff0055',
                    damage: 18,
                    life: 4.0
                  });
                }
              }
            }
          } else {
            // Standard Chasers
            e.vx = Math.cos(angleToPlayer) * e.speed + sepX * 50;
            e.vy = Math.sin(angleToPlayer) * e.speed + sepY * 50;
          }

          e.x += e.vx * dt;
          e.y += e.vy * dt;

          // Melee collision with player
          if (!this.player.downed && this.player.invulnTimer <= 0 &&
              Vec.dist(e.x, e.y, this.player.x, this.player.y) < e.radius + this.player.radius) {
            this.hitPlayer(e.damage);
          }
        }

        // --- Lightning Tether Damage to Player ---
        if (!this.player.downed && this.player.invulnTimer <= 0 &&
            this.lightningTethers.length > 0) {
          for (const lt of this.lightningTethers) {
            const ldx = lt.x2 - lt.x1;
            const ldy = lt.y2 - lt.y1;
            const lenSq = ldx * ldx + ldy * ldy;
            if (lenSq > 1) {
              const segT = Math.max(0, Math.min(1, ((this.player.x - lt.x1) * ldx + (this.player.y - lt.y1) * ldy) / lenSq));
              const projX = lt.x1 + segT * ldx;
              const projY = lt.y1 + segT * ldy;
              if (Vec.dist(this.player.x, this.player.y, projX, projY) < 16 + this.player.radius) {
                this.hitPlayer(25 * dt * 4); // Continuous electric shock
                break;
              }
            }
          }
        }

        // --- Update XP Gems & Drops ---
        // One mass kill / blink into a gem pile must not synchronously resolve
        // hundreds of pickups, DOM HUD changes or upgrade dialogs in one RAF.
        const pickupBudget = 24;
        let pickupsThisFrame = 0;
        for (let i = this.gems.length - 1; i >= 0; i--) {
          if (this.state !== 'playing') break;
          const g = this.gems[i];
          if (!g) continue;
          const collector = window.NeonLanExperience?.collector(this, g) || this.player;
          const dist = Vec.dist(g.x, g.y, collector.x, collector.y);
          const pullDist = g.magnetized ? 9999 :
            (window.NeonLanExperience?.pickupRadius(this, collector) || this.player.magnetRadius);

          if (dist < pullDist) {
            // Accelerate towards player
            const angle = Math.atan2(collector.y - g.y, collector.x - g.x);
            const pullSpeed = Math.max(420, 950 - dist * 1.5);
            g.x += Math.cos(angle) * pullSpeed * dt;
            g.y += Math.sin(angle) * pullSpeed * dt;

            if (dist < collector.radius + g.radius + 8) {
              if (pickupsThisFrame >= pickupBudget) continue;
              pickupsThisFrame++;
              if (g.type === 'heal') {
                const healAmt = Math.round(collector.maxHp * 0.35);
                collector.hp = Math.min(collector.maxHp, collector.hp + healAmt);
                this.sound.playHeal();
                this.texts.push({
                  x: collector.x,
                  y: collector.y - 25,
                  text: `💚 +${healAmt} 纳米修复!`,
                  color: '#00ffaa',
                  size: 18,
                  life: 1.0,
                  maxLife: 1.0
                });
              } else if (g.type === 'magnet') {
                this.sound.playZap();
                if (window.NeonLanExperience?.active(this)) {
                  window.NeonLanExperience.activateMapMagnet(this);
                } else {
                  this.gems.forEach(other => { if (other.type === 'gem') other.magnetized = true; });
                }
                this.texts.push({
                  x: collector.x,
                  y: collector.y - 25,
                  text: `🧲 全队共享经验 · 全图回收!`,
                  color: '#00f3ff',
                  size: 18,
                  life: 1.0,
                  maxLife: 1.0
                });
              } else if (g.type === 'nuke') {
                this.sound.playNuke();
                this.screenShake = 24;
                this.shockwaves.push({
                  x: this.player.x,
                  y: this.player.y,
                  radius: 10,
                  maxRadius: 700,
                  alpha: 1,
                  color: '#ffaa00'
                });
                this.texts.push({
                  x: this.player.x,
                  y: this.player.y - 25,
                  text: `💣 全域EMP歼灭脉冲!`,
                  color: '#ffaa00',
                  size: 20,
                  life: 1.2,
                  maxLife: 1.2
                });
                // Wipe small enemies & damage boss
                for (let k = this.enemies.length - 1; k >= 0; k--) {
                  const en = this.enemies[k];
                  if (en.isBoss) {
                    this.dealDamage(en, 650, 'nuke');
                  } else {
                    this.dealDamage(en, 9999, 'nuke');
                  }
                }
              } else {
                this.sound.playGemPickup();
                this.gainXP(g.value);
              }
              this.gems.splice(i, 1);
              // The first level-up pauses gameplay and yields to the upgrade
              // picker. Leave the rest of the drops for resumed simulation.
              if (this.state !== 'playing') break;
            }
          }
        }

        // --- Update Shockwaves ---
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
          const sw = this.shockwaves[i];
          sw.radius += (sw.maxRadius - sw.radius) * Math.min(1, 14 * dt);
          sw.alpha -= dt * 1.8;
          if (sw.alpha <= 0 || sw.radius >= sw.maxRadius - 2) {
            this.shockwaves.splice(i, 1);
          }
        }

        // --- Update Particles ---
        for (let i = this.particles.length - 1; i >= 0; i--) {
          const p = this.particles[i];
          p.life -= dt;
          if (p.life <= 0) {
            this.particles.splice(i, 1);
            continue;
          }
          if (p.type === 'spark') {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.94;
            p.vy *= 0.94;
          }
        }

        // --- Update Floating Combat Text ---
        for (let i = this.texts.length - 1; i >= 0; i--) {
          const t = this.texts[i];
          t.life -= dt;
          t.y -= dt * 35;
          if (t.life <= 0) {
            this.texts.splice(i, 1);
          }
        }

        // Periodically compact gems to avoid excessive array count
        this.cleanAndCompactGems();

        this.updateHUD();
      }

      hitPlayer(dmg) {
        if (this.player.downed) return;
        if (this.player.invulnTimer > 0) return;
        if (this.player.shipId === 'phantom' && this.player.phantom?.shiftActive) return;
        window.NeonRogueEndless?.onDamageTaken(this);
        dmg *= this.getDifficultyRules().enemyDamage *
          (window.NeonLanEncounters?.active(this) ? window.NeonLanEncounters.TUNING.enemyDamage : 1);
        if (this.player.hasDockedGunner) {
          dmg *= (1 - (window.NeonPhantom?.BASE?.carrierRearDamageReduction || 0.40));
        }
        // Spell wards reduce incoming damage; class-link shields consume the
        // remainder before HP. Neither grants another invulnerability window.
        dmg = window.NeonAstra?.incomingDamage(this, this.player, dmg) ?? dmg;
        dmg = window.NeonLanResonance?.absorb(this.player, dmg, this.survivalTime || 0) ?? dmg;
        if (dmg <= 0) return; // Fully blocked hits do not mint invulnerability.
        this.combatTelemetry.damageTaken += dmg;
        this.player.hp -= dmg;
        this.player.invulnTimer = 0.35; // Invulnerable frame
        this.screenShake = 12;
        this.sound.playLaser(140, 'triangle');
        this.vibrateGamepad(160, 0.65, 0.35);

        // Floating damage text on player
        this.texts.push({
          x: this.player.x,
          y: this.player.y - 20,
          text: `-${Math.round(dmg)}`,
          color: '#ff0055',
          size: 16,
          life: 0.8,
          maxLife: 0.8
        });

        if (this.player.hp <= 0) {
          if (this.player.hasCheatDeath && !this.player.cheatDeathUsed) {
            this.player.cheatDeathUsed = true;
            this.player.hp = this.player.maxHp * 0.6;
            this.player.invulnTimer = 2.0;
            this.shockwaves.push({
              x: this.player.x,
              y: this.player.y,
              radius: 10,
              maxRadius: 280,
              alpha: 1,
              color: '#00ffaa'
            });
            this.texts.push({
              x: this.player.x,
              y: this.player.y - 30,
              text: `🛡️ 纳米重构紧急复活!`,
              color: '#00ffaa',
              size: 20,
              life: 1.5,
              maxLife: 1.5
            });
          } else if ((this.lanCoop?.allies?.size || 0) > 1) {
            // 3/4 person rooms use the generic multi-pilot rescue clock.
            this.player.hp = 0;
            window.NeonLanMultiRules?.tick(this, [...this.lanCoop.allies.values()], 0.001);
          } else if (!window.NeonLanRevive?.knockDown(this, 'host')) {
            this.gameOver();
          }
        }
      }

      /* ========================================================================
         9. CANVAS RENDERING
         ======================================================================== */
      render() {
        const ctx = this.ctx;
        ctx.save();
        try {
          ctx.clearRect(0, 0, this.width, this.height);

          // Apply Screen Shake
          let shakeX = 0, shakeY = 0;
          if (this.screenShake > 0) {
            shakeX = Math.cos(this.screenShakeAngle) * this.screenShake;
            shakeY = Math.sin(this.screenShakeAngle) * this.screenShake;
          }

          // Camera Transform (自愈校验：防止 NaN 导致整屏画面消失)
          const camX = Number.isFinite(this.camera.x) ? this.camera.x : (this.player ? this.player.x : 0);
          const camY = Number.isFinite(this.camera.y) ? this.camera.y : (this.player ? this.player.y : 0);
          const zoom = Math.max(0.65, Math.min(1.5, this.cameraZoom || 1));
          const halfWidth = this.width / (2 * zoom);
          const halfHeight = this.height / (2 * zoom);
          // Shared viewport clipping: never skip a visible boss, missile or
          // long-range sniper telegraph, only primitives entirely off-screen.
          const visible = (x, y, radius = 30) =>
            Math.abs(x - camX) <= halfWidth + radius &&
            Math.abs(y - camY) <= halfHeight + radius;
          ctx.translate(this.width / 2 + shakeX, this.height / 2 + shakeY);
          ctx.scale(zoom, zoom);
          ctx.translate(-camX, -camY);

        // 1. Draw Cyberpunk Grid
        this.renderCyberGrid(ctx);

        // 2. Draw XP Gems & Items
        this.gems.forEach((g) => {
          if (!visible(g.x, g.y, (g.radius || 8) + 12)) return;
          ctx.save();
          if (g.type === 'heal') {
            ctx.fillStyle = '#00ff66';
            const s = g.radius;
            ctx.fillRect(g.x - s * 0.35, g.y - s, s * 0.7, s * 2);
            ctx.fillRect(g.x - s, g.y - s * 0.35, s * 2, s * 0.7);
          } else if (g.type === 'magnet') {
            ctx.strokeStyle = '#00f3ff';
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(g.x, g.y, g.radius, Math.PI, 0, false);
            ctx.stroke();
          } else if (g.type === 'nuke') {
            ctx.fillStyle = '#ffaa00';
            ctx.beginPath();
            ctx.arc(g.x, g.y, g.radius * 0.9, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            // Standard XP Diamond (crisp and high performance)
            ctx.fillStyle = g.color;
            ctx.beginPath();
            ctx.moveTo(g.x, g.y - g.radius * 1.3);
            ctx.lineTo(g.x + g.radius, g.y);
            ctx.lineTo(g.x, g.y + g.radius * 1.3);
            ctx.lineTo(g.x - g.radius, g.y);
            ctx.closePath();
            ctx.fill();
          }
          ctx.restore();
        });

        // 3. Draw Shockwaves
        this.shockwaves.forEach((sw) => {
          if (!visible(sw.x, sw.y, sw.radius || 30)) return;
          ctx.save();
          ctx.beginPath();
          ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
          ctx.strokeStyle = sw.color;
          ctx.globalAlpha = sw.alpha;
          ctx.lineWidth = 3.5;
          ctx.stroke();
          ctx.restore();
        });

        // 4. Draw Particles (Optimized batch rendering)
        this.particles.forEach((p) => {
          if (!visible(p.x ?? p.x1, p.y ?? p.y1, p.type === 'lightning' ? 600 : 30)) return;
          ctx.save();
          const progress = p.life / p.maxLife;
          ctx.globalAlpha = Math.max(0, progress);

          if (p.type === 'spark') {
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (p.type === 'afterimage') {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.stroke();
          } else if (p.type === 'lightning') {
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(p.x1, p.y1);
            const midX = (p.x1 + p.x2) / 2 + (Math.random() - 0.5) * 30;
            const midY = (p.y1 + p.y2) / 2 + (Math.random() - 0.5) * 30;
            ctx.lineTo(midX, midY);
            ctx.lineTo(p.x2, p.y2);
            ctx.stroke();
          }
          ctx.restore();
        });

        // 5. Draw Enemies
        this.enemies.forEach((e) => {
          const margin = e.type === 'sniper' ? 640 :
            e.type === 'shield_pylon' ? 125 : (e.radius || 20) + (e.isBoss ? 95 : 30);
          if (!visible(e.x, e.y, margin)) return;
          ctx.save();
          ctx.translate(e.x, e.y);
          if (e.isBoss) {
            ctx.shadowBlur = 25;
            ctx.shadowColor = e.color;
          }
          ctx.fillStyle = e.color;

          if (e.isBoss) {
            if (e.type === 'boss_dual_reactor') {
              // Two rotating reactors visually distinguish the co-op boss.
              const t = this.survivalTime;
              ctx.beginPath();
              for (let i = 0; i < 8; i++) {
                const a = t * 0.35 + i * Math.PI / 4;
                const radius = e.radius * (i % 2 ? 0.86 : 1.08);
                if (i === 0) ctx.moveTo(Math.cos(a) * radius, Math.sin(a) * radius);
                else ctx.lineTo(Math.cos(a) * radius, Math.sin(a) * radius);
              }
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = e.coopExposed > 0 ? '#9dfff3' : '#ffbf80';
              ctx.lineWidth = 4;
              ctx.stroke();
              for (const offset of [-19, 19]) {
                ctx.fillStyle = e.coopExposed > 0 ? '#ffffff' : '#143747';
                ctx.beginPath();
                ctx.arc(offset, 0, 12, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#8fffe4';
                ctx.lineWidth = 2;
                ctx.stroke();
              }
            } else if (e.type === 'boss_nexus') {
              // Storm Nexus: Dual counter-rotating cyan rings + electric core
              ctx.beginPath();
              ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(0, 0, e.radius + 8, this.survivalTime * 2.5, this.survivalTime * 2.5 + Math.PI * 1.4);
              ctx.stroke();
              ctx.strokeStyle = '#00f3ff';
              ctx.beginPath();
              ctx.arc(0, 0, e.radius + 15, -this.survivalTime * 2, -this.survivalTime * 2 + Math.PI * 1.4);
              ctx.stroke();
            } else if (e.type === 'boss_carrier') {
              // Omega Carrier: Hexagonal armored fortress
              ctx.beginPath();
              for (let k = 0; k < 6; k++) {
                const ang = (k / 6) * Math.PI * 2 + this.survivalTime * 0.5;
                const px = Math.cos(ang) * e.radius;
                const py = Math.sin(ang) * e.radius;
                if (k === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
              }
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 3;
              ctx.stroke();

              // Translucent Hexagonal Forcefield if shielded
              if (e.hasShield) {
                ctx.save();
                ctx.strokeStyle = '#00f3ff';
                ctx.lineWidth = 4;
                ctx.fillStyle = 'rgba(0, 243, 255, 0.14)';
                ctx.beginPath();
                for (let k = 0; k < 6; k++) {
                  const ang = (k / 6) * Math.PI * 2 - this.survivalTime * 1.2;
                  const px = Math.cos(ang) * (e.radius + 20);
                  const py = Math.sin(ang) * (e.radius + 20);
                  if (k === 0) ctx.moveTo(px, py);
                  else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
              }
            } else if (e.type === 'boss_devourer') {
              // Singularity Devourer: Void Eye with swirling dark pupil
              ctx.beginPath();
              ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#050010';
              ctx.beginPath();
              ctx.arc(0, 0, e.radius * 0.55, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeStyle = '#ff00aa';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(0, 0, e.radius + 12, this.survivalTime * 3, this.survivalTime * 3 + Math.PI * 1.6);
              ctx.stroke();
            } else {
              ctx.beginPath();
              ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (e.type === 'nexus_pylon') {
            ctx.beginPath();
            ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else if (e.type === 'shield_drone') {
            ctx.beginPath();
            for (let k = 0; k < 6; k++) {
              const ang = (k / 6) * Math.PI * 2;
              const px = Math.cos(ang) * e.radius;
              const py = Math.sin(ang) * e.radius;
              if (k === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            if (this.currentBoss && this.currentBoss.type === 'boss_carrier' && !this.currentBoss.dead) {
              ctx.save();
              ctx.strokeStyle = 'rgba(0, 243, 255, 0.45)';
              ctx.lineWidth = 2.5;
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(this.currentBoss.x - e.x, this.currentBoss.y - e.y);
              ctx.stroke();
              ctx.restore();
            }
          } else if (e.type === 'shield_pylon') {
            ctx.beginPath();
            ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 234, 0, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 110, 0, Math.PI * 2);
            ctx.stroke();
          } else if (e.type === 'kamikaze') {
            // 引信期间闪烁翻倍 + 红色预警环
            if (e.arming) {
              ctx.strokeStyle = 'rgba(255, 51, 0, 0.85)';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(0, 0, e.radius + 9, 0, Math.PI * 2);
              ctx.stroke();
            }
            const a = Math.atan2(e.vy, e.vx);
            ctx.rotate(a);
            ctx.beginPath();
            ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
            ctx.fill();
            const blinkFreq = e.arming ? 40 : 20;
            ctx.fillStyle = Math.sin(this.survivalTime * blinkFreq) > 0 ? '#ffff00' : '#ff0000';
            ctx.beginPath();
            ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (e.type === 'sniper') {
            const a = Math.atan2(this.player.y - e.y, this.player.x - e.x);
            ctx.rotate(a);
            ctx.beginPath();
            ctx.moveTo(e.radius * 1.5, 0);
            ctx.lineTo(-e.radius, -e.radius * 0.8);
            ctx.lineTo(-e.radius * 0.3, 0);
            ctx.lineTo(-e.radius, e.radius * 0.8);
            ctx.closePath();
            ctx.fill();
            if (e.aimTimer > 0) {
              ctx.save();
              ctx.strokeStyle = 'rgba(255, 0, 170, 0.4)';
              ctx.lineWidth = 1.5;
              ctx.setLineDash([8, 8]);
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(600, 0);
              ctx.stroke();
              ctx.restore();
            }
          } else if (e.type === 'larvae') {
            ctx.beginPath();
            ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
            ctx.fill();
          } else if (e.type === 'charger') {
            // Sharp Triangle
            const a = Math.atan2(e.vy, e.vx);
            ctx.rotate(a);
            ctx.beginPath();
            ctx.moveTo(e.radius * 1.4, 0);
            ctx.lineTo(-e.radius, -e.radius);
            ctx.lineTo(-e.radius * 0.4, 0);
            ctx.lineTo(-e.radius, e.radius);
            ctx.closePath();
            ctx.fill();
          } else if (e.type === 'spitter') {
            // Hexagon turret
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
              const ang = (i / 6) * Math.PI * 2;
              const px = Math.cos(ang) * e.radius;
              const py = Math.sin(ang) * e.radius;
              if (i === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
          } else {
            // Diamond / Swarmer
            ctx.beginPath();
            ctx.arc(0, 0, e.radius, 0, Math.PI * 2);
            ctx.fill();
          }

          // Elite Enemy Ring & Badge
          if (e.isElite) {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 2.2;
            ctx.setLineDash([5, 4]);
            ctx.beginPath();
            ctx.arc(0, 0, e.radius + 6, this.survivalTime * 2.2, this.survivalTime * 2.2 + Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('★ELITE', 0, -e.radius - 12);
          }

          // Enemy HP Bar (if damaged)
          if (e.hp < e.maxHp && !e.isBoss) {
            const barW = e.radius * 2;
            const barH = 4;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(-barW / 2, -e.radius - (e.isElite ? 22 : 9), barW, barH);
            ctx.fillStyle = e.isElite ? '#ffd700' : '#00ffaa';
            ctx.fillRect(-barW / 2, -e.radius - (e.isElite ? 22 : 9), Math.max(0, (e.hp / e.maxHp) * barW), barH);
          }

          ctx.restore();
        });

        // 6. Draw Lightning Tethers (Boss 1 electric fence)
        this.lightningTethers.forEach((lt) => {
          ctx.save();
          ctx.strokeStyle = '#00f3ff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(lt.x1, lt.y1);
          const mx1 = lt.x1 * 0.65 + lt.x2 * 0.35 + (Math.random() - 0.5) * 25;
          const my1 = lt.y1 * 0.65 + lt.y2 * 0.35 + (Math.random() - 0.5) * 25;
          const mx2 = lt.x1 * 0.35 + lt.x2 * 0.65 + (Math.random() - 0.5) * 25;
          const my2 = lt.y1 * 0.35 + lt.y2 * 0.65 + (Math.random() - 0.5) * 25;
          ctx.lineTo(mx1, my1);
          ctx.lineTo(mx2, my2);
          ctx.lineTo(lt.x2, lt.y2);
          ctx.stroke();
          ctx.restore();
        });

        // 7. Draw Black Holes
        this.blackHoles.forEach((bh) => {
          if (!visible(bh.x, bh.y, bh.radius || 180)) return;
          ctx.save();
          ctx.translate(bh.x, bh.y);
          ctx.rotate(bh.rotAngle);
          ctx.fillStyle = '#050010';
          ctx.beginPath();
          ctx.arc(0, 0, 24, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#9d00ff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(0, 0, 26, 0, Math.PI * 2);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(0, 243, 255, 0.4)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(0, 0, bh.radius * 0.55, 0, Math.PI * 1.5);
          ctx.stroke();
          ctx.strokeStyle = 'rgba(157, 0, 255, 0.3)';
          ctx.beginPath();
          ctx.arc(0, 0, bh.radius * 0.85, Math.PI * 0.5, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        });

        // 8. Draw Cryo Mines
        this.mines.forEach((m) => {
          if (!visible(m.x, m.y, 34)) return;
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.strokeStyle = '#00f3ff';
          ctx.lineWidth = 2;
          ctx.fillStyle = 'rgba(0, 243, 255, 0.2)';
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const ang = (k / 6) * Math.PI * 2;
            const px = Math.cos(ang) * 11;
            const py = Math.sin(ang) * 11;
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          const pulse = (Math.sin(this.survivalTime * 8) + 1) * 2;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(0, 0, 3 + pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // 9. Draw Laser Beams
        this.laserBeams.forEach((lb) => {
          ctx.save();
          ctx.translate(lb.x, lb.y);
          ctx.rotate(lb.angle);
          ctx.fillStyle = 'rgba(0, 243, 255, 0.35)';
          ctx.fillRect(0, -lb.width / 2, lb.length, lb.width);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, -lb.width * 0.2, lb.length, lb.width * 0.4);
          ctx.restore();
        });

        // 10. Draw Companion Drones
        this.companionDrones.forEach((dr) => {
          if (!visible(dr.x, dr.y, 20)) return;
          ctx.save();
          ctx.translate(dr.x, dr.y);
          ctx.rotate(dr.angle + Math.PI / 2);
          ctx.fillStyle = '#061a30';
          ctx.strokeStyle = '#00ffaa';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(9, 0);
          ctx.lineTo(-7, -7);
          ctx.lineTo(-4, 0);
          ctx.lineTo(-7, 7);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#00ffaa';
          ctx.beginPath();
          ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        });

        // 11. Draw Enemy Bullets
        this.enemyBullets.forEach((eb) => {
          if (!visible(eb.x, eb.y, (eb.radius || 4) + 6)) return;
          ctx.fillStyle = eb.color;
          ctx.beginPath();
          ctx.arc(eb.x, eb.y, eb.radius, 0, Math.PI * 2);
          ctx.fill();
        });

        // 12. Draw Player Bullets
        this.bullets.forEach((b) => {
          if (!visible(b.x, b.y, (b.radius || 4) + 20)) return;
          if (b.type === 'missile') {
            ctx.save();
            ctx.translate(b.x, b.y);
            const ang = Math.atan2(b.vy, b.vx);
            ctx.rotate(ang);
            // Sleek missile fuselage
            ctx.fillStyle = b.isLevel5 ? '#ff00aa' : '#ff007f';
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(-b.radius * 2.2, -b.radius, b.radius * 3.6, b.radius * 2, b.radius);
            } else {
              ctx.rect(-b.radius * 2.2, -b.radius, b.radius * 3.6, b.radius * 2);
            }
            ctx.fill();
            // Glowing warhead tip
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(b.radius * 1.4, 0, b.radius * 0.85, 0, Math.PI * 2);
            ctx.fill();
            // Jet exhaust flare
            ctx.fillStyle = b.isLevel5 ? '#00f3ff' : '#ffcc00';
            ctx.beginPath();
            ctx.moveTo(-b.radius * 2.2, -b.radius * 0.7);
            ctx.lineTo(-b.radius * 3.4, 0);
            ctx.lineTo(-b.radius * 2.2, b.radius * 0.7);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          } else if (b.type === 'cluster_missile') {
            ctx.save();
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          } else {
            ctx.fillStyle = b.color;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // 13. Draw Orbiters
        this.orbiters.forEach((orb) => {
          const cx = Number.isFinite(orb.centerX) ? orb.centerX : this.player.x;
          const cy = Number.isFinite(orb.centerY) ? orb.centerY : this.player.y;
          const ox = cx + Math.cos(orb.angle) * orb.distance;
          const oy = cy + Math.sin(orb.angle) * orb.distance;
          if (!visible(cx, cy, (orb.distance || 70) + (orb.radius || 10))) return;
          ctx.save();
          ctx.shadowBlur = 16;
          ctx.shadowColor = orb.color;
          ctx.fillStyle = orb.color;
          ctx.beginPath();
          ctx.arc(ox, oy, orb.radius, 0, Math.PI * 2);
          ctx.fill();

          // Trailing laser arc
          ctx.strokeStyle = 'rgba(0, 255, 170, 0.35)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(cx, cy, orb.distance, orb.angle - 0.45, orb.angle);
          ctx.stroke();
          ctx.restore();
        });

        // Draw Plasma Dash Trails (Warp Laser Wall)
        this.dashTrails.forEach((dtTrail) => {
          ctx.save();
          const progress = dtTrail.life / dtTrail.maxLife;
          ctx.globalAlpha = Math.max(0, progress);
          ctx.strokeStyle = dtTrail.color;
          ctx.lineWidth = 14;
          ctx.beginPath();
          ctx.moveTo(dtTrail.x1, dtTrail.y1);
          ctx.lineTo(dtTrail.x2, dtTrail.y2);
          ctx.stroke();

          // High-energy white core
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(dtTrail.x1, dtTrail.y1);
          ctx.lineTo(dtTrail.x2, dtTrail.y2);
          ctx.stroke();
          ctx.restore();
        });

        // Draw Phase Aegis Aura (时空相位无敌光环)
        if (this.player.aegisTimer > 0) {
          ctx.save();
          ctx.translate(this.player.x, this.player.y);
          ctx.strokeStyle = '#ffd700';
          ctx.lineWidth = 3.5;
          ctx.fillStyle = 'rgba(255, 215, 0, 0.15)';
          ctx.beginPath();
          ctx.arc(0, 0, this.player.aegisRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Hexagonal energy rune ring
          ctx.strokeStyle = 'rgba(0, 243, 255, 0.75)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const ang = (k / 6) * Math.PI * 2 + this.survivalTime * 4.5;
            const px = Math.cos(ang) * (this.player.aegisRadius * 0.92);
            const py = Math.sin(ang) * (this.player.aegisRadius * 0.92);
            if (k === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.stroke();

          // Expanding pulse wave
          const pulse = ((performance.now() / 250) % 1) * this.player.aegisRadius;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, pulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // All participants share this exact fighter renderer.
        const role = this.isGuestWorldView ? 'guest' : 'host';
        const localProfile = window.NeonLanTeammates?.ownProfile(role) ||
          { name: role === 'guest' ? '队友' : '房主', color: this.shipColor || '#00f3ff' };
        window.NeonShips?.drawPilotEffects?.(ctx, this.player, this);
        window.NeonShips?.drawWorldEffects?.(ctx, this);
        this.renderFighter(ctx, this.player, localProfile,
          this.isGuestWorldView || (this.lanCoop?.ally && this.lanCoop.rtc.connected));

        // The remote co-op fighter is drawn in the same world coordinates.
        this.lanCoop?.renderHost(ctx);

        // 10. Draw Floating Combat Text (High-speed batch render)
        this.texts.forEach((txt) => {
          if (!visible(txt.x, txt.y, 200)) return;
          ctx.save();
          ctx.font = `bold ${txt.size}px monospace`;
          ctx.fillStyle = txt.color;
          ctx.globalAlpha = Math.max(0, txt.life / txt.maxLife);
          ctx.fillText(txt.text, txt.x, txt.y);
          ctx.restore();
        });
        } catch (err) {
          console.error("Render non-fatal error caught:", err);
        } finally {
          ctx.restore();
        }
      }

      // Shared by both cameras: one fighter model, colors and invulnerability FX.
      renderFighter(ctx, fighter, profile, showLabel = false) {
        if (!fighter) return;
        ctx.save();
        ctx.translate(fighter.x, fighter.y);
        ctx.rotate(fighter.aimAngle || 0);
        if (fighter.downed) ctx.globalAlpha = .5;
        if ((fighter.invulnTimer || 0) > 0 && Math.floor(performance.now() / 60) % 2 === 0) {
          ctx.globalAlpha = 0.4;
        }
        // New hulls are registered by rendererId. Legacy default geometry
        // remains as a fallback for isolated tests / missing ship module.
        if (!window.NeonShips?.drawHull?.(ctx, fighter, profile)) {
          ctx.shadowBlur = 20;
          ctx.shadowColor = profile.color;
          ctx.fillStyle = '#0a1628';
          ctx.strokeStyle = fighter.downed ? '#ff617e' : profile.color;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(22, 0);
          ctx.lineTo(-14, -18);
          ctx.lineTo(-6, -6);
          ctx.lineTo(-16, 0);
          ctx.lineTo(-6, 6);
          ctx.lineTo(-14, 18);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = fighter.downed ? '#ff617e' : profile.color;
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fill();
          const flameLen = 10 + Math.random() * 8;
          ctx.fillStyle = '#ff007f';
          ctx.shadowColor = '#ff007f';
          ctx.beginPath();
          ctx.moveTo(-16, -4);
          ctx.lineTo(-16 - flameLen, 0);
          ctx.lineTo(-16, 4);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        if (showLabel) {
          ctx.save();
          ctx.fillStyle = profile.color;
          ctx.font = 'bold 13px system-ui';
          ctx.textAlign = 'center';
          ctx.fillText(fighter.downed ? profile.name + ' · 等待救援' :
            profile.name + ' · ' + Math.ceil(fighter.hp || 0) + ' HP',
            fighter.x, fighter.y - 35);
          ctx.restore();
        }
      }

      renderCyberGrid(ctx) {
        const gridSize = 70;
        const zoom = Math.max(0.65, Math.min(1.5, this.cameraZoom || 1));
        const left = this.camera.x - this.width / (2 * zoom) - gridSize;
        const right = this.camera.x + this.width / (2 * zoom) + gridSize;
        const top = this.camera.y - this.height / (2 * zoom) - gridSize;
        const bottom = this.camera.y + this.height / (2 * zoom) + gridSize;

        const startX = Math.floor(left / gridSize) * gridSize;
        const startY = Math.floor(top / gridSize) * gridSize;

        ctx.strokeStyle = 'rgba(0, 243, 255, 0.07)';
        ctx.lineWidth = 1;
        ctx.beginPath();

        for (let x = startX; x <= right; x += gridSize) {
          ctx.moveTo(x, top);
          ctx.lineTo(x, bottom);
        }
        for (let y = startY; y <= bottom; y += gridSize) {
          ctx.moveTo(left, y);
          ctx.lineTo(right, y);
        }
        ctx.stroke();

        // Cross points
        ctx.fillStyle = 'rgba(0, 243, 255, 0.18)';
        for (let x = startX; x <= right; x += gridSize) {
          for (let y = startY; y <= bottom; y += gridSize) {
            ctx.fillRect(x - 2, y - 2, 4, 4);
          }
        }
      }

      /* ========================================================================
         10. GAME MAIN LOOP
         ======================================================================== */
      loop(timestamp) {
        requestAnimationFrame((t) => this.loop(t));
        try {
          if (!this.lastTime) this.lastTime = timestamp;
          const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
          this.lastTime = timestamp;

          if (this.state === 'lan-client' && this.lanCoop?.guestMode) {
            this.lanCoop.updateGuest(dt);
            this.lanCoop.renderGuest();
            return;
          }
          if (this.state !== 'lan-lobby' && !this.settingsOpen) this.pollGamepad(dt);
          this.update(dt);
          this.lanCoop?.updateHost(dt);
          this.render();
          this.lanCoop?.renderHostUpgradeWait?.(this.ctx);
          if (this.lanCoop?.ally && this.lanCoop.rtc?.connected) {
            window.NeonLanRevive?.overlay(this.ctx, this, {
              rescue: window.NeonLanRevive.summary(this)
            });
          }
        } catch (err) {
          console.error("Game loop non-fatal error caught:", err);
        }
      }
    }

    window.addEventListener('error', (e) => {
      console.warn("Global safety handler caught:", e.error || e.message);
    });

    // Initialize Game on load
    window.addEventListener('DOMContentLoaded', () => {
      window.game = new NeonSurvivorGame();
      // Scanning a host QR opens the game and joins the room without asking the
      // guest to find the LAN menu or retype the code.
      const invite = window.NeonLanInvite?.parse(window.location?.href);
      if (invite) window.NeonLanLobby?.open(window.game,
        { roomCode: invite.room, autoJoin: invite.autoJoin });
    });
