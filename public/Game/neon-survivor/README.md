# Neon Survivor / 霓虹幸存者

静态游戏入口：`/Game/neon-survivor/index.html`。兼容旧网址 `/Game/neon_survivor.html`，旧页面只保留轻量跳转。

## 文件组织

```text
public/Game/
  neon_survivor.html          # 兼容旧URL（跳转）
  gamepad_haptics.js          # 已存在的共用手柄支持
  neon-survivor/
    index.html                # 页面DOM与游戏内操作说明
    css/game.css              # 游戏视觉样式
    js/core/                  # 核心游戏逻辑（原 7270 行 js/core.js 已拆分）
      define.js               # NeonCore.define：把类表达式的方法混入原型
      constants.js            # 难度表、光环时长、SafeStorage、Vec
      data/upgrades.js        # UPGRADES_DB 升级卡目录
      audio.js                # SoundEngine 程序化 Web Audio 合成
      game.js                 # class NeonSurvivorGame：构造、生命周期、主循环
      difficulty.js           # 六阶规则、槽位上限、战绩存档
      input/controls.js       # 键鼠/触屏/全屏/游戏内说明
      input/gamepad.js        # 手柄连接、菜单导航与震动
      ships/abilities.js      # 战舰主动技能与折跃/冲刺入口
      progression/catalog.js  # 经验曲线、候选卡、稀有度、破限
      progression/session.js  # 一次升级会话：预选/确认/重随/放逐/保留
      progression/apply.js    # 应用升级与破限
      progression/recalculate.js # 移速/被动/折跃/环绕刃/僚机重算
      ui/upgrade-panel.js     # 升级卡渲染与选择状态
      ui/hud.js               # HUD、武器栏、战绩表、技能反馈
      ui/combat-dock.js       # 局内战术技能坞
      ui/loadout.js           # 暂停页装配面板：装备、当前等级特效、技能与遗物
      simulation/speed.js     # PilotSpeed：房主/队友/房客预测共用的唯一移动与折跃模型
      combat/firing.js        # 索敌与七种通用武器开火
      combat/damage.js        # 伤害结算、掉落、限频音效、玩家受击
      combat/rewards.js       # 击杀奖励、战利品、晶体压缩
      director/scaling.js     # 自适应难度与波次缩放输入
      director/spawning.js    # 波次节奏、蜂群、精英、防挂机追兵
      director/boss.js        # Boss 战
      simulation/index.js     # update(dt)：一次有序的世界推进
      simulation/player.js    # 玩家状态：回复、折跃移动、光环、瞄准、镜头
      simulation/weapons.js   # 武器计时、激光束、僚机
      simulation/effects.js   # 黑洞、地雷、尾迹、电链、冲击波、粒子、飘字
      simulation/bullets.js   # 玩家子弹与敌方弹幕
      simulation/enemies.js   # 敌人推进、碰撞、控制与死亡
      simulation/gems.js      # 经验晶体、掉落与拾取
      render/index.js         # render()：相机准备与有序绘制、自适应画质阶梯
      render/quality.js       # QualityLadder：帧耗驱动的画质档位（DPR/阴影）
      render/fighter.js       # 战机绘制与赛博网格背景
      render/world.js         # 世界层：晶体、冲击波、粒子、敌人
      render/effects.js       # 特效层：电链、黑洞、地雷、光束、僚机、子弹、战机特效、飘字
    js/players.js             # V6玩家注册表：稳定ID、最多4人状态容器
    js/ships.js               # 通用ShipRegistry：定义/渲染/能力/卡池接口，无战舰硬编码
    js/ships.generated.js     # 自动生成：已扫描战舰的静态插件包，不要手动编辑
    js/ship-selection.js      # 按ShipRegistry自动创建可玩战舰选择按钮
    js/ships/                # 新战舰直接在这里添加目录
      riftblade/             # 裂锋，ship.js + renderer.js
      astra/                 # 星织：已开放，详细见 astra/README.md
      phantom/               # 幽灵：已开放，详细见 phantom/README.md
    js/combat/weapons.js      # V6共享武器冷却、每玩家射击与伤害ownerId
    js/ships/astra/abilities.js # 星织星能/双主动/相位闪现/24张专属卡元数据
    js/ships/astra/weapons.js   # 星梭织阵锚链与网络爆发
    js/ships/astra/upgrades.js  # 星织8种扩展法术武器和升级效果
    js/ships/astra/effects.js   # 星织本机及远端视觉特效
    js/ships/astra/network.js   # 星织独立快照字段：星能、法术CD、锚点
    js/ships/phantom/abilities.js # 幽灵潜行、烙印、共生及其24张专属卡
    js/ships/phantom/weapons.js   # 幽魂之镰回旋切割与灵质回收
    js/ships/phantom/arsenal.js   # 幽灵其余8种专属武器的独立战斗循环
    js/ships/phantom/network.js   # 幽灵灵质、潜行、充能和镰刀的联机快照
    js/ships/phantom/effects.js   # 幽灵本机/世界绘制钩子
    js/endless.js             # 无尽阶段、奖励、路线与Boss词缀
    js/relics.js              # 战术遗物定义和结算钩子
    js/arsenal.js             # 传说「星穹火控矩阵」独立齐射效果
    js/fusions.js             # 武器融合配方与连击判定
    js/events.js              # 限时战术事件
    js/ui.js                  # 三选一奖励面板与阶段HUD
    js/settings.js            # 手机友好的独立设置、设备本地偏好
    js/network/rtc.js         # WebRTC无服务器连接与手动信令
    js/network/signaling.js   # Vercel Hobby房间码自动信令客户端
    js/network/coop.js        # 双人输入、房主权威结算和快照
    js/network/ui.js          # 房间创建、发现与配对界面
    js/network/resonance.js   # 距离联动、双星折跃、协同恢复
    js/network/teammates.js   # 队友离屏定位气泡、昵称与战机颜色校验
    js/network/encounters.js  # 联机人数缩放与联机Boss分发
    js/network/coop-bosses.js # 联机专属Boss注册表：站位同步／左右夹击／极性配对
    js/network/experience.js  # 共享经验池、全图磁铁规则
    js/network/revive.js      # 对等倒地救援、全局递增坚守倒计时
    js/network/world-view.js  # 房主/房客共用原版渲染器的只读世界视图
    MANUAL.md                 # 玩家指南、机制和开发说明
```

原有核心 `js/core.js`（7270 行、105 个方法）已按职责拆分为 `js/core/` 下的 37 个模块，最大文件 457 行（另有 `js/network/schema.js` 状态契约）。拆分是**纯代码搬移**：方法体逐字节保留，所有方法仍挂在同一个 `NeonSurvivorGame.prototype` 上，因此 `Object.create(game)` 房客视图、`game.render.call(view)`、`game[rule.method].call(source, level)` 等既有动态调用方式完全不变。拆分后 `node tests/neon-survivor-core-split.smoke.cjs`（文件与标签一致性、加载顺序、原型契约、单文件行数上限）和 `node tests/neon-survivor-script-order.smoke.cjs`（按 index.html 顺序真实加载全部脚本并启动、跑 240 帧）会守住这些约束。

**新增核心逻辑时**：不要重新堆进单个文件。把方法写进已有的对应模块，用 `NeonCore.define(NeonSurvivorGame, class { ... })` 挂到原型上；新文件必须加进 `index.html` 的脚本列表（`core/define.js` 最先、`core/game.js` 在定义类之前、`core/boot.js` 最后），否则一致性测试会失败。

## V6：在文件夹中新增战舰（自动注册）

**只需在 `public/Game/neon-survivor/js/ships/<shipId>/` 新建目录并放入战舰JS文件。** 启动 `npm run dev` 或部署 `npm run build` 前，`predev` / `prebuild` 自动运行扫描器并重建 `ships.generated.js`，无须再修改 `js/ships.js`、`js/core/` 或 `index.html` 的战舰清单。若已经打开开发服务器，新增文件后可以执行 `npm run ships:generate` 并刷新页面，或重新启动 `npm run dev`。静态网页浏览器不能自行枚举文件夹，因此**不会在运行中的网页直接发现未构建的文件**。

```text
js/ships/
  comet/
    ship.js            # 必需：基础属性、装备槽位、起始装备、主动ID、折跃树、可玩状态
    renderer.js        # 必需：Canvas战舰外形绘制
    abilities.js       # 可选：onStart / onTick / onAction / onUpgrade / onStop
    upgrades.js        # 可选：本舰独立武器/被动/折跃升级卡池
    warp.js            # 可选：本舰独立折跃实现
    effects.js         # 可选：本机、其他玩家及世界中的战舰视觉特效
    network.js         # 可选：本舰独立网络快照投影（字段有大小上限）
    assets/             # 可选：图片、音效等静态资源，JS通过URL引用
    README.md           # 可选：本舰机制说明
```

战舰目录名仅允许小写英文字母、数字和下划线，并以字母开头。文件名允许字母、数字、下划线和短横线。目录中的JS按 `ship.js` → `renderer.js` → `abilities.js` → `weapons.js` → `arsenal.js` → `upgrades.js` → `warp.js` → `effects.js` → `network.js` → 其他文件名顺序自动执行；文件是自注册的**普通浏览器JS脚本**，不能直接使用未打包的 `import` / `export`。构建阶段会检查缺失文件、非法目录、JS语法错误和未注册的战舰，并直接报错。

`ship.js` 最小示例：

```js
window.NeonShips.register({
  id: 'comet', code: 'COMET', name: '彗星·追击者',
  description: '独立可玩战舰示例', playable: true,
  baseStats: { hp: 105, speed: 250, regen: 0.8, dashCharges: 3 },
  slots: { weapons: 5, passives: 3, warp: 7, activeSkills: 0 },
  startingWeapon: 'blaster', passiveId: null,
  activeSkillIds: [], warpTreeId: 'assault', rendererId: 'comet'
});
```

**槽位及属性约定**：`slots` 是每艘战舰的统一装备容量声明；缺省武器/被动/折跃分别为 `4/4/7`。`activeSkills` 必须等于 `activeSkillIds.length`，不能只提高数字就自动获得技能。`weapons` 是**同时装备的武器类型数量**（含初始武器），`passives` 是模组类型数量，`warp` 是最多能选择的**不同折跃强化类型**，不是折跃充能次数；每张升级卡的 `maxLvl` 决定可强化的等级。进阶 V–VI 在本舰配置基础上扣除一个被动槽（最少 0），不会改变武器或折跃槽。全部容量通过 `window.NeonShips.slotLimitsFor(pilot, difficulty)` 统一计算，`canEquipUpgrade(pilot, card, difficulty)` 统一供单人抽卡和房主验证房客升级。已装备技能升级不需要新槽；槽位满后不可再装入该类新技能。装备栏按战舰武器/被动容量动态绘制，高难度额外锁定的一格仍会标明。修改舰种生命/移速/回复后，等级和被动重算从注册表的 `baseStats` 出发，不会退回裂锋的默认 `100 HP / 240 速度 / 0.8 回血`。新增自定义舰可参考 `node tests/neon-survivor-ship-slots.smoke.cjs`。

`renderer.js` 最小示例（Canvas坐标已由游戏转换到战舰本地）：

```js
window.NeonShips.registerRenderer('comet', (ctx, fighter, profile) => {
  ctx.fillStyle = '#10263c';
  ctx.strokeStyle = fighter.downed ? '#ff617e' : (profile.color || '#00f3ff');
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(24, 0);
  ctx.lineTo(-16, -15);
  ctx.lineTo(-10, 0);
  ctx.lineTo(-16, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
});
```

可选 `abilities.js` 通过 `window.NeonShips.registerAbilities('comet', {onTick(pilot, game, dt) { ... }})` 注册战舰生命周期；`upgrades.js` 使用 `window.NeonShips.registerUpgradeCatalog('comet', [ ... ])` 定义本舰独立升级卡池；`effects.js` 用 `registerEffects('comet', { pilot(ctx, player, game) {}, world(ctx, game) {}, network(ctx, snapshot) {} })` 注册独立特效；`network.js` 用 `registerNetworkProjection('comet', player => ({ classState: { ... } }))` 提供有大小上限的舰种专属可序列化状态，不可覆盖基础玩家ID、HP等字段。所有伤害和资源结算必须通过房主权威游戏对象。`playable: true` 的战舰会自动出现在主菜单选择器；未完成的战舰设置 `playable: false`，只作为预览，不可选。新增复杂战舰应实现自己的能力与升级效果后再开放，**自动注册不代表自动生成战舰玩法**。

验证命令：`npm run ships:generate`、`npm run ships:check`、`node tests/neon-survivor-ship-autodiscovery.smoke.cjs`、`node tests/neon-survivor-ship-effects.smoke.cjs`。前者更新生成包，第二项用于CI检查文件是否与目录保持一致；第三项会在系统临时目录自动创建两个测试战舰验证新增、加载、选舰与不完整文件报错，不污染项目。现有三舰的配置与Renderer，以及星织/幽灵的所有独立能力、武器、视觉代码均已移入各自战舰目录，通过生成包加载，`js/heroes/` 不再是战舰加载入口。

### 三艘可玩战舰（V6-A4）

| 战舰 | 状态 | 初始HP | 基础速度 | 初始装备 | 独有机制与详细手册 |
|---|---|---:|---:|---|---|
| 裂锋·虚空突击者 | **可玩** | 100 | 240 | 脉冲离子炮 | 进攻折跃、精准连击；[`ships/riftblade/README.md`](js/ships/riftblade/README.md) |
| 星织·织界术师 | **可玩** | 95 | 235 | 星梭织阵 | 进攻星陨/防守结界、星能、相位闪现；[`ships/astra/README.md`](js/ships/astra/README.md) |
| 幽灵·共生拟态 | **可玩** | 85 | 260 | 幽魂之镰 | 灵质、潜行烙印引爆、联机挂载；[`ships/phantom/README.md`](js/ships/phantom/README.md) |

三舰均从统一注册表自动出现在首页和多人准备页。星织与幽灵各有 **9 武器 + 8 被动 + 7 专属折跃卡**，对应武器/主动/折跃执行和房主权威联机状态已接入；裂锋仍使用原有基础升级库。参见 `tests/neon-survivor-three-playable-ships.smoke.cjs` 进行三舰独立伤害、卡片效果、联机共生和资源归属回归。代码级可玩性已通过测试；真实多设备、多浏览器和持续帧率仍需要现场验收，避免把自动化冒烟等同实机测试。

## V6 可扩展架构进展（进行中）

MCP Goal/Plan《霓虹幸存者 V6：可扩展四人联机与四战舰架构》跟踪后续阶段。**已接入的只是基础容器，并非四人联机已上线**：

- `js/players.js` 的 `NeonPlayers.PlayerRegistry` 支持最多4个合法稳定玩家ID，以原对象引用维护状态、显式替换/注销及不可变基础投影；当前真正参战的仍然只有 `host` 和 `guest`。`game.player` 与 `lanCoop.ally` 是注册表中的原对象而非副本，原有战斗系统暂保持不变。
- `js/ships.js` 的 `NeonShips` 已去掉战舰数量硬上限：从 `js/ships/<shipId>/` 自动生成定义、初始属性/开局装备、技能/天赋/折跃树接口和Renderer，后续新增舰种无需修改内核。现有裂锋、星织、幽灵三舰均已设置 `playable:true`，并具备开局武器、职业升级和操作入口；第四舰尚未设计。
- `js/combat/weapons.js` 的 `NeonWeaponSystem` 统一七种旧武器的冷却曲线、逐玩家发射计时与`ownerId`，房客已从双人硬编码默认迁移为通用武器发射入口，房主引用同一份冷却规则；角色伤害仍由房主结算。少量旧测试未加载新模块时保留原逻辑兜底。
- `js/ships/astra/` 与 `js/ships/phantom/` 现已包含本舰专属技能、武器、升级、绘制和联机数据，且对外开放选舰。后续仍需真实浏览器、多设备与性能验收。
- 房主/房客快照开始透传 `shipId`，房客只读视图由其决定绘图；老版不含该字段的快照仍以裂锋样式兜底。原双人 WebRTC 单peer、room信令单guest和双人规则仍未迁移到4人，因此此版本房间上限仍为2人。
- 后续依MCP Plan逐步完成角色技能接口、多人网络容器、`players[]`快照、多人升级/救援/共振/Boss和四端验收；在网络扩容前不修改服务端房间容量，避免出现可以加入却无法游戏的伪四人房间。

基础架构用 `node tests/neon-survivor-players.smoke.cjs`、`node tests/neon-survivor-ships.smoke.cjs`、`node tests/neon-survivor-combat-weapons.smoke.cjs` 和 `node tests/neon-survivor-astra-foundation.smoke.cjs` 测试；浏览器真机联机及四舰玩法尚未完成。

脚本以 `index.html` 中的实际次序为准：公共肉鸽模块 → 通用 `ships.js` → 自动生成 `ships.generated.js`（所有舰种私有模块）→ `players.js`/`combat/*.js` → `network/*.js` → `js/core/`（`define.js` 最先，`game.js` 在定义 `NeonSurvivorGame` 之前，其余核心模块挂原型，`boot.js` 最后启动）。无额外浏览器运行时依赖。测试通过 `tests/helpers/neon-core.cjs` 从 `index.html` 解析这个顺序，因此调整核心文件列表不需要改测试。

无尽接口：`window.NeonRogueEndless`；战斗事件只由核心调用公开钩子，UI 不直接操作战斗模型。

## V6 2/3/4 人房间与手柄操作（当前实现）

大厅可选择2、3、4人容量，每位房客分别获得独立座位、Offer/Answer、WebRTC DataChannel与输入序号；多人准备页面展示全部成员、战舰与准备状态，只有全员准备后房主才能开始。房主在唯一权威世界内更新每艘战舰，并向每个客户端推送含 `players[]`、`localPlayerId` 的个人快照；经验共享、升级个人选择、倒地复活采用多人规则。原双人房间继续兼容旧流程。**代码层已通过2/3/4人主持模拟及三条独立WebRTC连接测试；真实3/4台设备的连通性、性能及断线重连仍需实机验收。**以下 V4 章节记载旧版双人MVP的实现与约束，不代表当前房间容量。

**对局轮次纪元（round epoch）**：`match_start` 广播 `roundId + 1`，房主**必须自己 adopt 同一个值**，房客也用它作为自己的 `roundId`；房客**只接受 `round === roundId` 的快照**。两边一旦不一致，房客会永远停在「正在同步房主战场…」，而它的输入仍然照常到达房主——因为输入通道不校验轮次——于是表现为「房主看得见我动，我却什么都看不见」。`ready_reset` 与 `match_restart` 各自 `roundId++`，用于丢弃上一局的迟到快照；房主收到 `ready_update` 时也比对同一个纪元。`tests/neon-survivor-ready-room.smoke.cjs` 走**真实** `beginHostMatch()` 握手并断言两边纪元一致、且首帧快照能被房客接受；此前该测试直接手写 `host.roundId = guest.roundId = 1`，正好绕过了这个 off-by-one。

升级选择新增手柄快速操作：A预选、X/RT一键确认、B取消预选、Y保留机会（无尽模式X放逐、Y重掷、RT确认）；准备页A准备、LB/RB更换已开放的战舰、Start由房主启动。升级按钮旁边、开始/暂停和准备页都显示对应控制器按键提示，**只有检测到手柄连接才显示**；Xbox/PlayStation/Switch布局动态适配。键鼠和触屏操作不受影响。

### 人数缩放：血量是温和的一条轴，数量才是另一条

联机难度由**同一个「在线房客数」**驱动两条轴。此前只有血量轴，于是人数越多反而越简单：队伍火力按人数线性增长（4 人约 ×4），而怪血只涨 ×2.08，同时普通怪同屏上限对所有人数都是 100——4 人局每个人面对的怪只有单机的四分之一。

| 模式 | 同屏上限 | 刷怪间隔系数 | 虫潮规模 | 普通 / 精英 / Boss 生命 |
|---|---:|---:|---:|---|
| 单人 | 100 | 1.000 | 20 | ×1.00 / ×1.00 / ×1.00 |
| 2 人 | 130 | 0.692 | 26 | ×1.35 / ×1.45 / ×1.65 |
| 3 人 | 160 | 0.563 | 32 | ×1.71 / ×1.84 / ×2.10 |
| 4 人 | 190 | 0.474 | 38 | ×2.08 / ×2.23 / ×2.54 |

- 一个系数 `partyScale = 1 + 0.3 × 在线房客数` 同时驱动上限、刷怪节奏与虫潮规模，因此三者不会各自漂移；血量沿用原有曲线 `1.35/1.45/1.65 × (1 + 0.27 × max(0, 在线房客数 − 1))`——注意它从**第二名房客**才开始抬升，所以 2 人档就是原始的 ×1.35/×1.45/×1.65。
- **只提高上限是无效的**：同屏数量 ≈ 刷怪速率 × 平均存活时间，而存活时间 ∝ 血量 ÷ 队伍火力。所以刷怪间隔也必须缩放，且必须乘在 `Math.max(0.16, …)` 地板**之后**——乘在地板之前会让 4 人局被封顶在单机的刷怪速率，提高后的上限永远填不满。
- 人数按**在线**房客计：3 人房掉线 1 人即回落到 2 人档，4 人房掉线 2 人回落到 2 人档。
- 组合后「有效负担 ÷ 人均火力」为 2 人约 88、3 人约 91、4 人约 99（单人基准 100）。
- 单人时 `active()` 为 false，所有系数恒为 1，行为与改动前逐字节一致。

### 联机专属 Boss 注册表

联机时每逢第 2、4、6……轮 Boss 为联机专属，按轮次在 `js/network/coop-bosses.js` 的注册表里轮换；单人 Boss 序列不受影响。原先散落在模拟、伤害、奖励与两条渲染路径上的 `type === 'boss_dual_reactor'` 硬编码判断，统一收敛为 `NeonLanEncounters.isCoopBoss(type)` + 注册表分发。

| 轮次 | Boss | 破盾条件 | 未破盾 | 破盾后 |
|---|---|---|---|---|
| 2、8…… | 双生裁决者 · 共振要塞 | 每个光圈由**不同**玩家占据 1.4 秒；光圈数 = 队伍人数 | ×0.45 | ×1.25 / 9 秒 |
| 4、10…… | 镜像壁垒 · 逆相护罩 | **左右两侧同时**有人进攻 1.2 秒 | ×0.15 | ×1.25 / 9 秒 |
| 6、12…… | 极性分裂 · 电荷枷锁 | 锚点圈内**同时**有一名「+」与一名「−」 | ×0.35 | ×1.30 / 8 秒 |

**设计约束：不新增任何快照字段。** 敌人层只走 16 个字段，帧预算按字节实测，所以 Boss 只能使用**已经在传**的通道：`coopCapture`（破盾进度）、`coopExposed`（剩余暴露秒数）、`arming`（护盾标志）、`aimTimer`（锚点轨道角，通用渲染器只在 `sniper` 分支读它，因此不冲突）。其余状态一律从**已复制的数据推导**——镜像壁垒的左右分侧由 Boss 速度方向与各玩家位置现算，因此房主判定和房客绘制必然一致，不会出现「传过去的一位状态位和它对不上」。

**断线保护**：护盾只在联机进行中生效。房客掉线后 `modifyBossDamage` 立即返回原伤害，避免留下打不死的 Boss 把整局卡死。

### 快照预算随敌人上限一起抬高

敌人上限提到 190 后，最大帧实测 **34,729 字节**，占 `SNAPSHOT_LIMIT` 的 91.4%（原先 105 上限时为 28.8 KB / 34,000，而 34,000 已装不下新上限）。`SNAPSHOT_LIMIT` 相应提到 **38,000**，仍低于 DataChannel 自身的 40,000 保护线，且裁剪本身强制帧不超过该值。

生产端 `cap` 与校验端 `safeCap` 必须一起抬（105/130 → **190/215**）：只抬一个会让校验器拒收**每一帧**，表现为「卡在正在同步房主战场」。`tests/neon-survivor-snapshot-budget.smoke.cjs` 把游戏内上限、快照 cap/safeCap 与字节预算三者钉在一起，任何一处单独改动都会失败。

## V4 纯网页双人局域网合作（历史 MVP）

主菜单点击「局域网双人合作」：房主「创建房间」获得6位房间码，另一设备输入该码自动完成 Offer/Answer 交换。邀请链接可自动填写房间码；无须复制大段连接信息。高级连接仍保留旧手动配对。一个房间最多一名房客。

**Vercel Hobby 部署（无额外游戏服务器）**：在免费的 Upstash Redis 数据库获取 REST URL 和 REST Token，在 Vercel 项目环境变量中配置 `UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`，再重新部署。兼容 `KV_REST_API_URL`、`KV_REST_API_TOKEN`。Next.js 路由 `app/api/neon-lan/room/route.ts` 仅保存5分钟的临时连接信息，使用 Redis TTL，不能把房间持久化到 Vercel Function 内存中。未配置 Redis 时房间码会明确提示不可用，仍能用高级手动配对。API 有临时房间令牌、房间容量与简单限流；免费资源用量取决于实际流量。

**扫码一键配对**：房主在「局域网双人合作」点击「创建房间」，成功后立即显示本地生成的邀请二维码（无外部二维码 API）。房客使用手机系统相机扫码，打开游戏链接即可自动进入联机大厅、填入6位房间码并执行加入，不必手动复制 SDP 或输入验证码。也可以通过「复制邀请链接」分享相同的一键加入链接；房间约5分钟有效，过期需要房主重新创建。扫码并不能绕过 WebRTC 局域网连通性限制（两台设备仍需要能够建立直连）。邀请只包含 `lanRoom` 与 `lanAutoJoin`，不包含服务器密钥或房主令牌。二维码采用自托管 QRCode.js（MIT；参见 `js/network/qrcode.LICENSE.txt`）；扫码失败仍能手输房间码或高级手动配对。

**网络边界**：Vercel API/Redis只负责房间码、Offer与Answer；摇杆、折跃、怪物、Boss、经验与战场快照始终通过浏览器间 WebRTC DataChannel 传输。使用 `iceServers: []`，不连接 TURN 中继。纯网页无法进行跨设备局域网广播扫描；房间码是经云端信令发现的房间，不是自动局域网扫描。两台设备必须可以建立局域网直连；如果AP隔离或网络阻止连接，将报错而不会退回云端转发游戏数据。

MVP最多2人：房主浏览器运行唯一战斗世界并结算敌人、Boss、伤害和掉落；房客发送受校验的移动/折跃/瞄准输入，通过约15Hz的世界快照和本地预测/插值调用与房主相同的Canvas渲染、武器特效和HUD。房客可使用同一套升级定义选择个人武器/模组/折跃，房主校验选择并执行权威战斗逻辑；双方共用经验等级。常规输入约30Hz，经WebRTC低延迟数据通道传送，升级和身份等关键事件使用可靠通道。联机普通/精英/Boss生命分别×1.35/1.45/1.65，适度增加伤害和刷怪频率；每逢双人第2、4、6……轮Boss出现专属「双生裁决者」。尚未完成无尽模式团队投票、四人联机和断线重连。房主离线则房间结束。

**经验与暂停**：所有经验晶体统一归房主权威队伍经验池；任一方拾取只计一次，共享等级，各自选择并升级个人装备。全图磁铁只吸经验晶体；治疗由实际拾取者获得。只有房主可以暂停/继续整个联机世界，房客设置不会影响全局。

**多人出击准备页**：WebRTC 建立连接后，房主与房客进入「出击准备 · 霓虹编队」，不是自动开局。双方可以分别选择已开放的裂锋、星织、幽灵，点击「准备就绪」（或「取消准备」）；房主看到所有已占座成员的昵称、战舰与准备状态。所有已占座玩家均在线且已准备后，房主才能开始。换舰必须取消准备；进入战场后不可中途换舰。多人协议和成员容器正在从2人向4人扩展，**真四设备联机仍需单独验收**。参见 `tests/neon-survivor-ready-room.smoke.cjs`、`tests/neon-survivor-ready-ui.smoke.cjs`。

**并行升级选择与机会储存**：每次等级提升，房主和房客各获得 1 次独立的强化机会。标准/进阶I–II同时看到各自随机 5 张卡，进阶III–IV为 4 张，进阶V–VI为 3 张；同一轮最多从候选卡中选 3 种**不同**技能，每个技能只能强化一次。随时可以点「保留剩余次数并继续」把未用机会带到下一次升级，下次可以继续累积，单次仍最多使用 3 次。房主验证房客选择，先结束者等待另一方完成本轮选择/保存后共同恢复战斗。键盘/触屏可点击保存按钮，手柄 B 也可保存（房客还支持 F）。无尽模式保留重随/禁用，但不能再次抽中本轮已强化的技能。

**全模式稀有度权重**：普通、无尽、联机房主及房客统一使用按稀有度加权的不重复抽卡。先决定稀有度，再在该稀有度可选技能中随机选择，避免候选卡数量影响稀有度几率。权重为：基础/进阶I/II：普通60、稀有28、传说12；进阶III：60/25.2/9.6；IV：60/22.4/7.8；V：60/19.6/6；VI：60/16.8/4.2。三种稀有度均存在时基础难度每次抽卡分别为60%/28%/12%；若某种稀有度已无合格技能，则把概率归一化分给其余稀有度。高进阶不会把稀有或传说卡完全移除。

**10 级首张传说保底**：到 10 级仍未获得过传说技能时，后续每次升级候选中至少出现一张符合槽位及技能等级限制的传说卡，直到玩家实际选取其中一张；将升级机会存起来或选了其他技能，都不会消耗首张传说保底。提前获得过传说则不会触发。双人房主、房客独立判定；无尽模式重新抽取保留保底。若传说技能全部被禁用或没有合法候选，不突破现有槽位规则强行发卡。保底卡有独立「★ 传说保底」标记。

**联机倒地与全局坚持**：房主和房客适用相同规则。任一人生命归零进入倒地状态，不再移动/攻击/折跃，另一人继续坚持；初次需要8秒，此后全局每次倒地增加4秒，单次最长40秒。存活者在倒地者145世界单位内连续停留3秒，倒计时以双倍速度推进；救援完成后恢复40%生命、获得2秒无敌，并重生在存活队友附近。双方同时倒地才结束游戏；游戏暂停或升级选择期间倒计时停止。累计倒地次数、累计实际坚持秒数和下次救援时间由房主权威维护、同步给双方；新开一局清零。单人死亡规则不变。

### 双机共振与手机设置

- **星织已开放**：拥有9种法术武器、8种被动、7种相位强化和「星能回流」固有天赋；星陨裁决/星界结界共享星能，独立冷却。键盘 J/K、手柄 X/Y 与手机 HUD 分别直接施放两种法术，不再需要切换；传说级「星穹回响」在星陨命中后触发限频额外爆发及护盾；WebRTC 房客请求有身份、序号及房主资源校验。数值见 [`星织详细说明`](js/ships/astra/README.md)。
- V5职业羁绊（裂锋与星织均已开放）：有效连线距离≤340世界单位，≤180为近距强化。裂锋为连线双方提供随队伍等级成长的攻击加成，基础远距5%、近距8%，最高远距12%、近距18%；星织每12秒向连线内双方提供持续6秒的临时护盾，含自己，护盾随等级与敌人伤害成长，单舰不超过最大HP的30%与45点。队友倒地、脱离连线或断线后停止新增益；单人无额外职业连线增益。
- 双方在260单位内、0.55秒内先后使用折跃，会触发一次双星冲击：半径170、最多18个目标受到房主结算的范围伤害，冷却8秒；消耗各自正常的折跃充能，不能无偿触发。
- 双方看到协同距离、实时职业攻击增益和星织护盾倒计时/剩余盾值；距离过远立即停止提供新羁绊。这些增益仅在真正连接的联机模式计算，均由房主权威判定。
- 「游戏设置」在首页、顶部HUD及暂停页均可打开；房客独立提供悬浮设置入口。自动瞄准始终开启，不提供关闭开关（旧设备上保存的关闭状态也会被忽略）；音效、手柄震动、CRT扫描线和低特效仍可调整。设置保存在本机 `neon_game_settings_v1`。打开期间屏蔽战斗快捷键与手柄输入穿透。
- 低特效模式减少粒子预算，并降低Canvas渲染像素倍率。手机横屏、竖屏均保留全屏、设置、说明按钮；联机房客同样可使用全屏，是否实际进入由浏览器支持情况决定。
- 头像与身份：游戏设置中的「联机身份 · 战机外观」支持最多12字符昵称、自动区分房主/房客或手动选择6种霓虹配色。数据保存在本机设置中；WebRTC连接后房客同步昵称/颜色给房主，再由房主快照分发身份。自己与队友的战机描边、座舱和名字标签依照各自设定显示。
- 当队友离开当前镜头视野时，屏幕边缘显示不会捕获触摸事件的方向小气泡，标注队友名字、飞船颜色、游戏世界距离与箭头；队友重新进入视野时自动隐藏。气泡依据每个设备的摄像机缩放、HUD占用和竖/横屏安全区域分别计算。
- 设置页新增65%–150%的战场镜头缩放，主机与房客各自调整本地Canvas，不影响HUD及操作区；浏览器会缓存缩放与其余偏好，重新开局、刷新和切换横竖屏无需重复调整。
- 自适应布局依据视口尺寸、屏幕方向与安全区域调整HUD、Boss血条、装备栏、折跃位置、升级卡和滚动对话框；无需手动选择手机横/竖屏模板。

Node模拟测试可验证消息协议与基础双人玩法，但不能替代两台真实设备的ICE配对、触屏/手柄和帧率验收。

**房客 FPS 优化与诊断**：双方仍使用同一套完整渲染器。房客快照插值的实体 ID 映射和临时对象仅在收到约15Hz新快照时生成，绘图帧重用视图和实体对象；HUD 也只随新快照刷新，避免每帧反复写入 DOM。统一渲染器对屏幕外敌人、子弹与粒子进行安全裁剪；离屏队友指示器缓存 HUD 布局读数；房主在裁剪大型网络快照时不再重复 JSON 序列化整个战场。房客移动方向实时本地采样，战斗仍由房主权威结算。

调试时在游戏 HTML URL 后追加 `?perf=1`（如果已有查询参数则追加 `&perf=1`），房客会显示 **实际 FPS、渲染 CPU 平均/峰值毫秒、快照 Hz、最近网络包间隔、画布 DPR**。只有显式启用时才创建调试浮层；它用于识别绘制瓶颈或网络抖动，不等于对所有设备保证60FPS。需要降低图形开销时可使用设置中的「低特效」，画布分辨率和粒子预算会一起降低。

## 性能剖析与已做的优化

**先量后改**：`node tools/neon-survivor/profile-phases.cjs` 会在 Node 的 DOM mock 里启动真实游戏，构造一个后期密帧（100 敌人、220 玩家子弹、200 敌方弹幕、300 晶体），输出每个 `update()` 阶段、每个渲染层以及 `render()` 整体的主线程耗时。它刻意使用**具体的空 2D context 而不是 Proxy**：Proxy 会给每次属性访问加一次 trap，曾把渲染占比夸大近一个数量级，从而把优化方向带偏。

该帧上的实测结论（决定了后续所有取舍）：

| 位置 | 占比 |
|---|---|
| `render()` | ~60%（其中 renderEnemies / renderEnemyBullets / renderGems / renderBullets 合计 ~78%） |
| `updateBullets` | ~17–21% |
| `updateEnemies` | ~7–10% |
| 其余各阶段 | 均 <1% |

**已做**：

- `Vec.dist` 不再用 `Math.hypot`（移动端比 `sqrt` 慢数倍），新增 `Vec.distSq` 供纯半径比较跳过开方；`js/core` 内其余 `Math.hypot` 调用点也一并改写。碰撞、分离、AOE、拾取、环绕刃、折跃扫掠与索敌都走这条路径。
- HUD 的 DOM 写入（`getElementById` 风暴、`innerHTML` 重建、`classList`/`style` 写入与战斗技能坞）从每帧一次降到约 **15Hz**；120Hz 设备不再翻倍。冲刺/闪现充能属于玩法状态，由 `syncShipHudState()` 每帧同步；`updateHUD()` 本身仍是同步的，直接调用立即生效。
- Canvas 阴影模糊由 `shadowEnabled()` 统一门控；移动端 Canvas2D 每个带阴影的图元都要多一趟模糊。
- 敌方弹幕统一经 `spawnEnemyBullet()` 限流（上限 240 发）；特斯拉电链与激光火花的粒子生成改为与伤害路径相同的预算。
- 爆炸与 hi-hat 的噪声缓冲改为**生成一次复用**；此前每次大爆炸要现场填 ~2.6 万个随机采样。
- **海量图元批处理**：晶体、敌方弹幕、普通玩家子弹改为**连续同样式合并**（run-length），同色一批共用一个路径与一次 `fill`。300 个同色晶体从 300 次 `fill` 降到 **1 次**；最坏情况（颜色交替）退化为与旧实现完全相同，不会更差。同机 A/B（各取 7 次最小值）：`render()` 0.107 → 0.097ms，整帧 0.175 → 0.150ms（**-14%**）。
- **自适应画质阶梯**：帧耗持续超预算时逐级下调画布像素倍率与阴影，有持续余量时逐级回升。`high(2.0) → medium(1.5) → low(1.25) → minimal(1.0)`；2.0→1.25 就是**少填 2.56 倍像素**，这是手机上最强的杠杆。降级需 1 个窗口（30 帧）超 12ms 预算，回升需连续 4 个窗口明显低于预算，中间带保持不动以避免来回抖动。玩家选择的「低特效」既是起始档也是回升上限，永不被越过，但设备扛不住时仍可继续下探。只有权威世界会调整，房客视图共用房主画布，不得改动它。

**评估后放弃**（均因缺少可测收益，理由写在代码注释里以免被重复尝试）：

- **空间网格**：微基准显示 100 敌人时小半径查询仅快 1.4x，大半径 AOE 反而慢到 0.39x；且它要优化的 `updateBullets` 每帧只占约 0.2%。已放弃。
- **对象池 / `dealDamage` 微优化**：`updateBullets` + `updateEnemies` 合计仅约 0.05ms/帧，收益不足。
- **精灵缓存 `drawImage`**：已实现并实测为**倒退**（`renderEnemyBullets` 0.019 → 0.026ms，整帧 0.150 → 0.200ms）。它把"一次批处理 `fill`"拆成 N 次 `drawImage`，而现代 Canvas2D 会把单个批处理路径合并为一次 GPU 绘制，N 次 blit 仍是 N 次绘制；再加上每实体的缓存查找（字符串 key 还会每帧分配）。已回退。
- **完整 WebGL2 后端**：收益上限最高，但画面正确性无法在无浏览器的环境里验证，属于必须真机验收的独立工作，未纳入本次改动。

## 界面文案与内部标识

**不变量：任何玩家可见的文本都不能直接打印内部标识符或原始英文枚举值。**

注册表里的 `id` / `rarity` 是机器标识，不是文案。星织与幽灵各自注册了独立的升级卡表（`window.NeonShips.registerUpgradeCatalog`），因此**它们不在全局 `UPGRADES_DB` 里**——任何按名字查找升级卡的地方都必须走 `game.getUpgradeCatalog(player)`，只查 `UPGRADES_DB` 会命中失败并回退到原始 `id`。

已修复的四处泄漏（`node tests/neon-survivor-ui-labels.smoke.cjs` 全部覆盖，且逐条验证过"还原成旧代码后测试确实变红"）：

| 位置 | 玩家原本看到的 | 现在显示 |
| --- | --- | --- |
| `js/core/ui/hud.js` 结算表「装配武器」（暂停 / 坠毁 / 胜利三处共用） | `star_weave Lv.1` | `星梭织阵 Lv.1` |
| `js/core/ui/upgrade-panel.js` 升级卡稀有度角标 | `common` / `rare` / `legendary` | `普通` / `稀有` / `传说` |
| 同上，折跃卡与破限卡角标 | `WARP UPGRADE` / `STEALTH UPGRADE` / `LIMIT BREAK` | `折跃强化` / `潜行强化` / `超频破限` |
| `js/core/render/world.js` 精英怪头顶标签 | `★ELITE` | `★精英` |
| `js/ship-selection.js` 新增战舰的兜底文案 | `初始：star_weave` | 走该舰卡表取中文名，取不到则 `战舰专属武器` |

稀有度中文标签集中在 `js/core/ui/upgrade-panel.js` 的 `NEON_RARITY_LABELS`；测试会断言它覆盖**所有已注册卡表 + `UPGRADES_DB`** 出现过的稀有度，避免将来新增稀有度时静默退回英文。

**刻意保留**：首领名与警报里的英文括注（`双生裁决者 · 共振要塞 (DUAL REACTOR)`、`(SWARM RUSH)`）属于既有的双语美术风格，中文名在前、不影响理解；手柄按键图例（`LB` / `RT` / `Menu`）是实体按键丝印，不是内部标识。

## 状态契约：一份声明，三处派生

`js/network/schema.js` 是**唯一的**字段契约：每个复制字段声明一次，生产者（`coop.js` 的 `snapshot()`）、消费者（`world-view.js` 的 `updateView()`）和校验器（`safeSnapshot()`）全部由它派生。分层是：

- `core/simulation/speed.js` 管**规则**：两侧都运行的纯公式。
- `js/network/schema.js` 管**形状**：有哪些字段、怎么过网。

在此之前同一个字段要手写三遍，于是出现了整类 bug：`lastSlashFx` 与光环标记由房主写入却无人读取；`regen` 在房客端用第二份公式重算；队友对象同时存在 `charges` 与 `dashCharges` 两个名字指向同一个值。现在**一个值只有一个名字**——在活动对象上、在线上、在视图里都是。

描述符带 `kind`（`number`/`string`/`boolean`/`bag`/`ids`/`nullable`/`effect`/`projection`）、`min`/`max`（越界即钳制，非有限值落到 `invalid`）、`fallback`（对端较旧时缺失的回退）、`scope`（`pilot` / `identity` / `remote` 升级协商）、`roster`（是否进入精简的 `players[]`）。

**上限只声明一次**：每个实体数组同时声明 `cap`（生产者）、`safeCap`（校验器）、`floor`（超预算时的裁剪下限）和 `trim`（牺牲顺序，`null` 表示受保护、只走保 Boss 的敌人裁剪）。这正是 `gems` 曾经 `cap 90 / safeCap 90` 零余量的来源——生产者上限加一就会让校验器**拒收每一帧**，表现和「卡在正在同步房主战场」一模一样。

`protocolVersion` 从死字段变成真护栏：高于当前 `VERSION`（**4**）的帧被拒绝，而不是被静默误读。

### 线上是列式编码，不是「每实体一个对象」

实体层曾经是「一个实体一个 JSON 对象」，于是每个字段名都要被每个实体付一次费——`"radius":13,` 是 12 字节，乘以 105 个敌人。现在改成**列式（结构数组）**：

```json
"enemies": { "id": [...], "x": [...], "radius": [...], "color": [...] }
```

字段名每层只出现一次。字符串（`color` / `type` / `text`）再经**帧级字符串表**换成下标，105 份 `"#ff3300"` 变成 105 份 `0`——单这一项就省 7.9 KB。

| 世界 | 改前 | 改后 | |
| --- | --- | --- | --- |
| 现实（每层到上限） | 60.5 KB | **16.6 KB** | −73% |
| 最坏（每实体全字段、每层到上限） | 80.6 KB | **24.8 KB** | −70% |

列式之后**不需要缩写字段名**：列名每层只出现一次，缩写只值约 1 字节/实体，却会让线上不可读。所以线上仍然是规范的字段名。

坐标、速度、计时器以**整数十分位**过网（`1234.5` → `12345`）——与行编码本来就会做的 `round(v*10)/10` 精度相同，只是少了小数点。非有限值变成 `0`，而不是 JSON 对 `Infinity` 写出的 `null`。

`js/network/coop.js` 决定**发什么**（行形状、裁剪），`schema.js` 决定**怎么过网**（`encodeFrame` / `decodeFrame`）。房客在**收包那一刻解码一次**，因此插值、视图、Boss 查找、救援浮层全都继续读行实体，编码对它们不可见。

`tests/neon-survivor-snapshot-schema.smoke.cjs` 是这套保证的守卫：上限一致性、**每个上限都必须有安全余量**、有序键形状、双向闭合（线上无未声明列、每层必须带齐声明的列）、每个 kind 的往返、必需字段最小集、协议版本护栏，以及**「每层都到上限的世界必须完整送达」**。`tests/neon-survivor-wire-codec.smoke.cjs` 单独钉住编解码本身：逐 kind 无损、实体 id 跨帧稳定、字符串表永不丢信息、`encodeFrame` 不改动行帧、畸形层被拒、以及预算按 **UTF-8 字节**而不是 UTF-16 码元计量（`texts` 层全是中文与 emoji，`String.length` 会少算 2–3 倍）。

## 房主与房客的一致性（co-op parity）

**不变量：房客的位移、折跃距离、特效和 HUD 数字必须与房主完全一致。**

「一个飞行员移动多快」原本被写了三份：房主自己的玩家（`progression/recalculate.js` + `simulation/player.js`）、房主对远端队友的模拟（`combat/pilots.js` 的 `stepRemote`）、以及房客的本地预测（`network/prediction.js`）。三份在每一项上都对不上：

| 项 | 房主自己 | 房主模拟的队友 | 房客预测 |
| --- | --- | --- | --- |
| 折跃速度 | `baseSpeed * 3.6`（1级 864，上限 1386） | 写死 **780** | 写死 **780** |
| 推进器系数 | `0.12` | `0.15` | `0.15` |
| 破限移速 | 有 | **无** | **无** |
| `baseSpeed` 重算 | 每次升级重算 | **从不重算**（永远是战舰基础值） | 自算一份 |
| 星织风筝 / 幽灵疾行 / 星网延展 | 有 | **无** | 只有部分 |

后果就是：**房客的折跃距离永远比房主短**——1级短 10%，满配短 44%——而且越升级差得越多；队友选了推进器也不会真的变快。

现在全部收敛到 `js/core/simulation/speed.js` 的 `PilotSpeed`（纯函数，`base` / `compute` / `multiplier` / `move` / `dash` / `dashDistance`），三处调用点都只读它，快照再携带房主权威的 `baseSpeed`，房客不再自己猜。

另外修掉的三处「只有房主看得见」：

- **折跃斩光刃**（`player.lastSlashFx`）原本只在 `renderSlashFx` 里读 `this.player`，所以房客折跃时光刃**在谁的屏幕上都看不到**——裂锋最标志性的特效在联机里等于不存在。现在房主为每个队友生成光刃（`stepRemote`），房客用自己的预测本地生成（`prediction.dash`），`renderSlashFx` 遍历所有飞行员。
- **相位光环**同理，`renderAegisAura` 现在遍历所有飞行员。
- **房客自己的折跃数值**原本在 `world-view.js` 里写死（斩击伤害 95、连击 0、无光环/火墙/冰霜），所以房客的 HUD 和技能坞在描述它自己驾驶的这艘船时和房主说的不一样。现在 `recalculateDashStats(pilot)` 可为队友复用，数值随快照下发。

### 预算曾经击穿，房客因此看不到敌弹

上一轮把装饰层的上限对齐了房主的产生上限，并把裁剪改成两趟——但**没有量过总量**。真实情况是：房主声明的十四个层加起来要求 **80.6 KB**，而预算是 **18000 字节**，超订 4.4 倍；而裁剪顺序（旧代码就有）把 `gems → bullets → enemyBullets` 排在**前面**、`enemies` 排在**最后**。于是每一局后期都必然触发裁剪，同一局同一个世界下房客拿到的是：

| 层 | 房主产生 | 房客收到（改前） | 房客收到（改后） |
| --- | --- | --- | --- |
| enemies | 105 | 105 | 105 |
| bullets | 120 | **0** | 120 |
| enemyBullets | 130 | **53** | 130 |
| gems | 90 | **0** | 90 |
| 帧字节 | — | 17935 | **16475** |

**改后的帧更小而且完整。** 看不见敌弹不是观感问题——房客无法躲弹幕，这是公平性问题。

现在：

- `SNAPSHOT_LIMIT` 从 18000 提到 **34000**，依据是实测（每层到上限、每实体全字段：24.8 KB 层数据 + 4–5 KB 信封/飞行员/花名册 = 两玩家 28.9 KB、四玩家 29.8 KB）。预算仍由裁剪强制，所以帧永远到不了 `rtc.js` 的 40000 硬线。
- 裁剪顺序**倒置为公平性决策**：装饰（粒子、飘字、冲击波、拖尾、闪电、光束、地雷、黑洞、环绕体、无人机）→ 奖励反馈（晶体）→ 枪口反馈（子弹）→ 威胁（敌人，走保 Boss 通道）→ **`enemyBullets` 永不裁剪**。
- 字节计量改成 **UTF-8**（`schema.byteLength`），`rtc.js` 的发送守卫与两处接收守卫一并改掉：`texts` 层是中文和 emoji，`String.length` 会少算 2–3 倍，等于让 40k 的线被超发 3 倍。
- 删除 `enemyBullets.damage`：房客不做碰撞判定，`renderEnemyBullets` 只读 `x/y/radius/color`，每帧白付约 1.3 KB。

### 联机靠近加成：三个职业贡献，其中一个从来没生效过

`resonance.js` 承诺三个职业贡献：裂锋给伤害、星织周期性给护盾、幽灵给暴击。其中**幽灵那一条是死代码**——`link()` 算出 `critBonus`（贴身 +12% / 近距 +6%），返回它，然后**没有任何代码读**，也不在线上。后果最严重的是**两个幽灵靠近**：

| 组合 | 伤害加成 | 暴击加成 | 护盾 | 结果 |
| --- | --- | --- | --- | --- |
| 裂锋 + 裂锋 | +8% | — | — | 正常 |
| 裂锋 + 幽灵 | +8% | +12% | — | 正常 |
| 星织 + 幽灵 | — | +12% | ✓ | 正常 |
| **幽灵 + 幽灵** | — | **+12% 被丢弃** | — | **什么都没有** |
| **星织 + 星织** | — | — | ✓ | 只有护盾 |

`damageBonus` 要求任一方是裂锋，`shieldSource` 要求任一方是星织，所以两个幽灵**确实什么都拿不到**——而那时 HUD 那行字拼出来是**空字符串**（`info` 为空时 `if (info)` 为假），只剩一条虚线。改前实测：`link.critBonus = 0.12`，而**实测暴击率 0.00%**；改后同一脚本 **12.13%**。

现在：

- `getLinkCrit(attacker)` 与 `getLinkBonus` 对称，暴击加成接进**三个**真正掷骰的地方：`core/combat/damage.js` 的基础骰，以及幽灵两处职业武器自己的骰（`ships/phantom/weapons.js`、`arsenal.js`——它们把结果当 `forceCrit` 传下去，所以漏掉那里等于没修）。
- 两者都在**每帧发布一次**到飞行员身上（`publishLinkBonuses()`），伤害点直接读缓存。旧写法在每个伤害点重新调 `link()`，而 `link()` 会分配对象，幽灵的环绕体伤害又是**每帧每个敌人**一次。
- `critBonus`/`critSource` 随快照下发，所以房客能看到自己实际拿到的数字。

**星织护盾原本几乎拿不到**：需要连续 12 秒不间断处于 340 单位内，任意一帧脱离就把计时器清零。实测 11.9 秒后一帧出界 → 归零。现在改为**衰减**（`SHIELD_DRAIN_RATE = 2`，两倍充能速度），实测 11.5 秒的充能在分开 1 秒后剩 9.5 秒，重连后 3.5 秒就能拿到，而不是从零重来。

**可见效果**（此前 `js/core/render/` 与 `js/core/ui/` 里零共振代码，全部表现就是 `coop.js` 里两段手写绘制）：

- **脚下光环 + 连线**由 `resonance.js` 的 `drawLink()` 一处绘制，房主浮层与房客渲染都调它，两侧不可能画得不一样。贴身时是双环 + 4 颗流动光点，近距时单环 + 2 颗；连线虚线会流动。
- **HUD 徽章**（`js/network/resonance-hud.js` + `#neon-link-badge`）常驻显示当前实际生效的数字，例如 `🔗 联动 Ⅱ · +8% 攻击 · +12% 暴击`；脱离范围显示 `🔗 联动中断 · 靠近队友`，单人模式整块隐藏。只在文案变化时才写 DOM。
- **tier 变化反馈**：进入联动或升到贴身档会飘字（`⚡ 双机联动 Ⅰ/Ⅱ`）并在贴身档放一圈冲击波。**只在升档时**提示——边界会被反复穿越，每次都提示就是噪音。

`tests/neon-survivor-resonance-bonus.smoke.cjs` 钉住以上每一条：九种组合都必须拿到非空加成且来源正确、暴击确实进入伤害骰（用固定随机数做**确定性**断言而不是统计）、护盾充能衰减而非清零、升档才提示、`coop.js` 里不再有 `setLineDash`（绘制只有一处）、徽章对任何组合都不为空、以及 `critBonus` 在线上。改前跑同一段脚本：两个幽灵实测暴击 **0.00%**。

### 房客自己的无人机与环绕体

`syncOrbiters()` / `syncDrones()` / `updateCompanionDrones()` 原本全部写死 `this.player` 与 `this.orbiters`，而**远端队友没有任何客户端在跑这 27 个阶段**。于是：

- **环绕体**：房客的环绕体从来不存在——不造成伤害、不发射、在谁的屏幕上都画不出来。房主把一份合成副本塞进 `frame.guest.companionDrones`，但全仓没有任何代码读那个字段，所以那是纯粹的死负载。
- **无人机**：`coop.js` 里另有一份针对房客的手写模拟，所以**子弹和伤害是有的**，但它只按**一个**无人机的节奏开火（房客升到 3 级有 4 架无人机，实测 5 秒只打出 13 发，而房主的 4 架会打出 54 发），而且那些无人机**同样画不出来**（渲染读的是那份死负载）。

现在所有权落在飞行员身上（`pilot.companionDrones` / `pilot.orbiters`），房主对**每个**飞行员跑这两段，`game.companionDrones` / `game.orbiters` 退化为「所有飞行员的聚合视图」，供渲染与快照共用（`refreshPilotEntities()`，每次 sync 之后也刷新，因此永远不会过期一帧）。无人机找目标时改为**从无人机自己出发**（`findNearestEnemy(range, origin)`，默认参数保证既有调用点不变），子弹带上 `owner`/`ownerId`，所以命中归属正确的飞行员（此前房客的无人机伤害被记在房主头上）。

`coop.js` 里那份手写模拟**必须删掉**：保留它会让房客的无人机每帧被模拟两次（实测 5 秒 65 发，应为 54 发）。`tests/neon-survivor-coop-drones.smoke.cjs` 现在直接钉住这一点——「每架无人机每个间隔只开一枪」——并验证过还原旧代码后报出 `expected about 54 bullets in 5s, got 65`。同一测试还覆盖：房主为每个飞行员建并推进这两类武器、房客的环绕体真的造成切割伤害、无人机**打自己附近的敌人**、线上带着每个飞行员的条目与复制过来的轨道中心、以及不再发送那份无人读取的死负载。

`tests/neon-survivor-coop-delivery.smoke.cjs` 是这次的直接回归测试：每层到上限的世界必须**整层送达**（改前会红），超预算时只有装饰受损，极端超预算时 `enemyBullets` 仍完整且 Boss 仍在。`tests/neon-survivor-shared-render.smoke.cjs` 增加了**渲染对等**断言：同一个世界分别以「房主行实体」和「过网往返后的实体」喂进真实 `render()`，要求两次画布操作序列**逐条相同**——这是「完全一样」在无浏览器环境下能给出的最强证明，也是「缺席字段解码为 `0`/`''`」这一决定的依据。

这条测试立刻抓出一个真 bug：**环绕体的轨道中心从来不在契约里**。`renderOrbiters` 用 `orb.centerX ?? this.player.x`，而 `centerX` 既没被 `syncOrbiters` 写入、也不在线上字段里，所以房客把房主的环绕体画在**自己的船**周围。现在环绕体在模拟时就带上 `centerX`/`centerY`，随契约复制。

`tests/neon-survivor-coop-parity.smoke.cjs` 钉住以上每一条，并且验证过还原旧实现后确实变红（把队友折跃速度改回写死的 780，测试报出「模拟折跃只走了 143.0，应为 ~228.1」）。

## 暂停页：装配与特效面板

暂停页现在以「当前装配」为主体，而不是只有一行 `装配武器 星梭织阵 Lv.1`。面板分五段，全部由 `js/core/ui/loadout.js` 的 `renderLoadoutPanel()` 生成，在 `pauseGame()` 里调用：

| 段落 | 数据来源 | 每张卡显示 |
| --- | --- | --- |
| ⚔️ 武器 / 🔷 模组 / ✨ 相位强化（按舰种换名） | `player.weapons` / `passives` / `dashUpgrades` + **当前生效卡表** | 图标、中文名、`Lv.N`、**当前等级**的特效文本、下一级预告、`+N 破限`、`已满级` |
| 🎮 技能与操作 | 直接读 `#ship-skills-bar` 已渲染的按钮 | 图标、技能名、按键、按钮 `title` 里 `：` 之后的效果句 |
| ♾️ 遗物与融合 | `endlessState.relics` / `fusions` + 各自的定义表 | 中文名与效果说明（仅无尽模式） |

几个刻意的设计决定：

- **特效文本按等级取，不是卡面总述。** 用 `statText[level-1]` 而不是 `desc`，所以 Lv.3 的星梭织阵显示的是「星梭升级为3发多目标追踪弹」，不是 Lv.1 的描述；满级后不再显示不存在的「下一级」。
- **技能文案不复制第二份。** 技能名、按键和效果句从技能坞已渲染的按钮上读，因此面板和玩家实际点的按钮不可能对不上。技能坞不存在时该段整段省略，不报错也不显示空壳。
- **卡表必须走 `getUpgradeCatalog(player)`**，和武器栏、结算表一致。只查 `UPGRADES_DB` 会让星织/幽灵的卡片全部变成 `未知装备`。
- **空槽位显式画出来**（虚线卡），所以「还能装几个」一眼可见；`N/M` 徽章只出现在真正有槽位上限的段落。
- 未知卡 id 显示 `未知装备`，**永远不打印内部 id，也不会出现 `undefined`**。
- 暂停卡是本作最高的对话框，因此 `#modal-pause .modal-card` 自己限制高度并内部滚动（含 `100dvh` 与安全区变量，并保留 `100vh` 回退），这样桌面端仍然居中、手机端按钮仍可滚到，且不改动其它弹窗共用的 `.modal-overlay`。

`tests/neon-survivor-pause-loadout.smoke.cjs` 覆盖以上全部行为，并验证过「把卡表换回 `UPGRADES_DB` 后测试确实变红」。

## 验证

```sh
node tests/neon-survivor-core-split.smoke.cjs
node tests/neon-survivor-script-order.smoke.cjs
node tests/neon-survivor.smoke.cjs
node tests/neon-survivor-touch.smoke.cjs
node tests/neon-survivor-balance.smoke.cjs
node tests/neon-survivor-endless.smoke.cjs
node tests/neon-survivor-ui.smoke.cjs
node tests/neon-survivor-arsenal.smoke.cjs
node tests/neon-survivor-lan.smoke.cjs
node tests/neon-survivor-resonance.smoke.cjs
node tests/neon-survivor-settings.smoke.cjs
node tests/neon-survivor-responsive.smoke.cjs
node tests/neon-survivor-teammates.smoke.cjs
node tests/neon-survivor-signaling.smoke.cjs
node tests/neon-survivor-qr-invite.smoke.cjs
node tests/neon-survivor-coop-balance.smoke.cjs
node tests/neon-survivor-host-pause.smoke.cjs
node tests/neon-survivor-shared-render.smoke.cjs
node tests/neon-survivor-perf.smoke.cjs
node tests/neon-survivor-guest-upgrade.smoke.cjs
node tests/neon-survivor-parallel-upgrade.smoke.cjs
node tests/neon-survivor-rarity.smoke.cjs
node tests/neon-survivor-revive.smoke.cjs
node tests/neon-survivor-vec-perf.smoke.cjs
node tests/neon-survivor-hud-throttle.smoke.cjs
node tests/neon-survivor-entity-caps.smoke.cjs
node tests/neon-survivor-render-batching.smoke.cjs
node tests/neon-survivor-adaptive-quality.smoke.cjs
node tests/neon-survivor-ui-labels.smoke.cjs
node tests/neon-survivor-pause-loadout.smoke.cjs
node tests/neon-survivor-coop-parity.smoke.cjs
node tests/neon-survivor-snapshot-schema.smoke.cjs
node tests/neon-survivor-wire-codec.smoke.cjs
node tests/neon-survivor-coop-delivery.smoke.cjs
node tests/neon-survivor-coop-drones.smoke.cjs
node tests/neon-survivor-resonance-bonus.smoke.cjs
node tools/neon-survivor/profile-phases.cjs
git diff --check
```

真实浏览器/手机/手柄仍需验证首领奖励弹窗、切换战区后继续移动、升级确认的手柄按键隔离、任务提示、小屏幕菜单和无尽模式至少30分钟的性能。Node 测试不等价于真机验收；自适应画质与批处理的**设备端**填充率收益必须在真机上用 `?perf=1` 复核。

**协议版本 4 需要房客刷新页面。** 线上格式从行式改为列式，旧房客会被 `safeSnapshot` 的版本护栏拒绝（表现为停在「正在同步房主战场…」）。方向性是不对称的：新房主仍接受旧房客的输入包（输入没有版本校验），但旧房客读不懂新快照。这一条必须在真机上验收：房客刷新后能进入战场、折跃距离与房主一致、两侧同屏实体数量一致。
