    /* Boss encounters. */
    NeonCore.define(NeonSurvivorGame, class {
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
    });
