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
    js/core.js                # 现有战斗逻辑与接入点
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
    js/network/encounters.js  # 双人专属Boss和合作难度
    js/network/experience.js  # 共享经验池、全图磁铁规则
    js/network/revive.js      # 对等倒地救援、全局递增坚守倒计时
    js/network/world-view.js  # 房主/房客共用原版渲染器的只读世界视图
    MANUAL.md                 # 玩家指南、机制和开发说明
```

原有核心较大，本版本先做无风险抽离，并将**所有新的玩法逻辑**放在独立模块中，而不是继续扩张HTML。后续应按测试覆盖情况再逐步拆分核心战斗代码，避免一次性大规模重写。

## V6：在文件夹中新增战舰（自动注册）

**只需在 `public/Game/neon-survivor/js/ships/<shipId>/` 新建目录并放入战舰JS文件。** 启动 `npm run dev` 或部署 `npm run build` 前，`predev` / `prebuild` 自动运行扫描器并重建 `ships.generated.js`，无须再修改 `js/ships.js`、`js/core.js` 或 `index.html` 的战舰清单。若已经打开开发服务器，新增文件后可以执行 `npm run ships:generate` 并刷新页面，或重新启动 `npm run dev`。静态网页浏览器不能自行枚举文件夹，因此**不会在运行中的网页直接发现未构建的文件**。

```text
js/ships/
  comet/
    ship.js            # 必需：基础属性、起始装备、主动ID、折跃树、可玩状态
    renderer.js        # 必需：Canvas战舰外形绘制
    abilities.js       # 可选：onStart / onTick / onAction / onUpgrade / onStop
    upgrades.js        # 可选：本舰独立武器/被动/折跃升级卡池
    warp.js            # 可选：本舰独立折跃实现
    effects.js         # 可选：本机、其他玩家及世界中的战舰视觉特效
    network.js         # 可选：本舰独立网络快照投影（字段有大小上限）
    assets/             # 可选：图片、音效等静态资源，JS通过URL引用
    README.md           # 可选：本舰机制说明
```

战舰目录名仅允许小写英文字母、数字和下划线，并以字母开头。文件名允许字母、数字、下划线和短横线。目录中的JS按 `ship.js` → `renderer.js` → `abilities.js` → `weapons.js` → `upgrades.js` → `warp.js` → `effects.js` → `network.js` → 其他文件名顺序自动执行；文件是自注册的**普通浏览器JS脚本**，不能直接使用未打包的 `import` / `export`。构建阶段会检查缺失文件、非法目录、JS语法错误和未注册的战舰，并直接报错。

`ship.js` 最小示例：

```js
window.NeonShips.register({
  id: 'comet', code: 'COMET', name: '彗星·追击者',
  description: '独立可玩战舰示例', playable: true,
  baseStats: { hp: 105, speed: 250, regen: 0.8, dashCharges: 3 },
  startingWeapon: 'blaster', passiveId: null,
  activeSkillIds: [], warpTreeId: 'assault', rendererId: 'comet'
});
```

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

脚本以 `index.html` 中的实际次序为准：公共肉鸽模块 → 通用 `ships.js` → 自动生成 `ships.generated.js`（所有舰种私有模块）→ `players.js`/`combat/*.js` → `network/*.js` → `core.js`。无额外浏览器运行时依赖。

无尽接口：`window.NeonRogueEndless`；战斗事件只由核心调用公开钩子，UI 不直接操作战斗模型。

## V6 2/3/4 人房间与手柄操作（当前实现）

大厅可选择2、3、4人容量，每位房客分别获得独立座位、Offer/Answer、WebRTC DataChannel与输入序号；多人准备页面展示全部成员、战舰与准备状态，只有全员准备后房主才能开始。房主在唯一权威世界内更新每艘战舰，并向每个客户端推送含 `players[]`、`localPlayerId` 的个人快照；经验共享、升级个人选择、倒地复活采用多人规则。原双人房间继续兼容旧流程。**代码层已通过2/3/4人主持模拟及三条独立WebRTC连接测试；真实3/4台设备的连通性、性能及断线重连仍需实机验收。**以下 V4 章节记载旧版双人MVP的实现与约束，不代表当前房间容量。

升级选择新增手柄快速操作：A预选、X/RT一键确认、B取消预选、Y保留机会（无尽模式X放逐、Y重掷、RT确认）；准备页A准备、LB/RB更换已开放的战舰、Start由房主启动。升级按钮旁、开始/暂停和准备页都显示对应控制器按键提示，**只有检测到手柄连接才显示**；Xbox/PlayStation/Switch布局动态适配。键鼠和触屏操作不受影响。

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

- **星织已开放**：拥有9种法术武器、8种被动、7种相位强化和「星能回流」固有天赋；星陨裁决/星界结界共享星能，独立冷却。键鼠 Q 切换/E 施法、手柄 X/Y、手机两枚独立技能键与星能HUD均已接入；WebRTC房客请求有身份、序号及房主资源校验。数值见 [`星织详细说明`](js/ships/astra/README.md)。
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

## 验证

```sh
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
git diff --check
```

真实浏览器/手机/手柄仍需验证首领奖励弹窗、切换战区后继续移动、升级确认的手柄按键隔离、任务提示、小屏幕菜单和无尽模式至少30分钟的性能。Node 测试不等价于真机验收。
