    /* Wave cadence, swarms, elite incursions and anti-AFK pursuers. */
    NeonCore.define(NeonSurvivorGame, class {
      updateSpawning(dt) {
        this.waveTimer += dt;
        this.spawnTimer += dt;

        const timeMin = this.survivalTime / 60;
        // As time advances, spawn interval accelerates from 1.25s down to 0.16s
        const coopSpawnMultiplier = window.NeonLanEncounters?.active(this)
          ? window.NeonLanEncounters.TUNING.spawnInterval : 1;
        const spawnInterval = Math.max(0.16, (1.25 - timeMin * 0.12) /
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
          const spawnDist = Math.sqrt(this.width * this.width + this.height * this.height) / 2 + 70;
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
        const spawnDist = Math.sqrt(this.width * this.width + this.height * this.height) / 2 + 80;
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
    });
