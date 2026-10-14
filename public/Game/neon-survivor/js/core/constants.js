    /* Difficulty tiers, aegis durations, safe storage and vector helpers. */
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
