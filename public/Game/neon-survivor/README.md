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

加载顺序：`gamepad_haptics.js` → `relics.js` → `fusions.js` → `events.js` → `endless.js` → `ui.js` → `arsenal.js` → `core.js`。无打包运行时依赖。

无尽接口：`window.NeonRogueEndless`；战斗事件只由核心调用公开钩子，UI 不直接操作战斗模型。

## V4 纯网页双人局域网合作（MVP）

主菜单点击「局域网双人合作」：房主「创建房间」获得6位房间码，另一设备输入该码自动完成 Offer/Answer 交换。邀请链接可自动填写房间码；无须复制大段连接信息。高级连接仍保留旧手动配对。一个房间最多一名房客。

**Vercel Hobby 部署（无额外游戏服务器）**：在免费的 Upstash Redis 数据库获取 REST URL 和 REST Token，在 Vercel 项目环境变量中配置 `UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN`，再重新部署。兼容 `KV_REST_API_URL`、`KV_REST_API_TOKEN`。Next.js 路由 `app/api/neon-lan/room/route.ts` 仅保存5分钟的临时连接信息，使用 Redis TTL，不能把房间持久化到 Vercel Function 内存中。未配置 Redis 时房间码会明确提示不可用，仍能用高级手动配对。API 有临时房间令牌、房间容量与简单限流；免费资源用量取决于实际流量。

**扫码一键配对**：房主在「局域网双人合作」点击「创建房间」，成功后立即显示本地生成的邀请二维码（无外部二维码 API）。房客使用手机系统相机扫码，打开游戏链接即可自动进入联机大厅、填入6位房间码并执行加入，不必手动复制 SDP 或输入验证码。也可以通过「复制邀请链接」分享相同的一键加入链接；房间约5分钟有效，过期需要房主重新创建。扫码并不能绕过 WebRTC 局域网连通性限制（两台设备仍需要能够建立直连）。邀请只包含 `lanRoom` 与 `lanAutoJoin`，不包含服务器密钥或房主令牌。二维码采用自托管 QRCode.js（MIT；参见 `js/network/qrcode.LICENSE.txt`）；扫码失败仍能手输房间码或高级手动配对。

**网络边界**：Vercel API/Redis只负责房间码、Offer与Answer；摇杆、折跃、怪物、Boss、经验与战场快照始终通过浏览器间 WebRTC DataChannel 传输。使用 `iceServers: []`，不连接 TURN 中继。纯网页无法进行跨设备局域网广播扫描；房间码是经云端信令发现的房间，不是自动局域网扫描。两台设备必须可以建立局域网直连；如果AP隔离或网络阻止连接，将报错而不会退回云端转发游戏数据。

MVP最多2人：房主浏览器运行唯一战斗世界并结算敌人、Boss、伤害和掉落；房客发送受校验的移动/折跃/瞄准输入，通过约15Hz的世界快照和本地预测/插值调用与房主相同的Canvas渲染、武器特效和HUD。房客可使用同一套升级定义选择个人武器/模组/折跃，房主校验选择并执行权威战斗逻辑；双方共用经验等级。常规输入约30Hz，经WebRTC低延迟数据通道传送，升级和身份等关键事件使用可靠通道。联机普通/精英/Boss生命分别×1.35/1.45/1.65，适度增加伤害和刷怪频率；每逢双人第2、4、6……轮Boss出现专属「双生裁决者」。尚未完成无尽模式团队投票、四人联机和断线重连。房主离线则房间结束。

**经验与暂停**：所有经验晶体统一归房主权威队伍经验池；任一方拾取只计一次，共享等级，各自选择并升级个人装备。全图磁铁只吸经验晶体；治疗由实际拾取者获得。只有房主可以暂停/继续整个联机世界，房客设置不会影响全局。

**并行升级选择与机会储存**：每次等级提升，房主和房客各获得 1 次独立的强化机会。标准/进阶I–II同时看到各自随机 5 张卡，进阶III–IV为 4 张，进阶V–VI为 3 张；同一轮最多从候选卡中选 3 种**不同**技能，每个技能只能强化一次。随时可以点「保留剩余次数并继续」把未用机会带到下一次升级，下次可以继续累积，单次仍最多使用 3 次。房主验证房客选择，先结束者等待另一方完成本轮选择/保存后共同恢复战斗。键盘/触屏可点击保存按钮，手柄 B 也可保存（房客还支持 F）。无尽模式保留重随/禁用，但不能再次抽中本轮已强化的技能。

**全模式稀有度权重**：普通、无尽、联机房主及房客统一使用按稀有度加权的不重复抽卡。先决定稀有度，再在该稀有度可选技能中随机选择，避免候选卡数量影响稀有度几率。权重为：基础/进阶I/II：普通60、稀有28、传说12；进阶III：60/25.2/9.6；IV：60/22.4/7.8；V：60/19.6/6；VI：60/16.8/4.2。三种稀有度均存在时基础难度每次抽卡分别为60%/28%/12%；若某种稀有度已无合格技能，则把概率归一化分给其余稀有度。高进阶不会把稀有或传说卡完全移除。

**10 级首张传说保底**：到 10 级仍未获得过传说技能时，后续每次升级候选中至少出现一张符合槽位及技能等级限制的传说卡，直到玩家实际选取其中一张；将升级机会存起来或选了其他技能，都不会消耗首张传说保底。提前获得过传说则不会触发。双人房主、房客独立判定；无尽模式重新抽取保留保底。若传说技能全部被禁用或没有合法候选，不突破现有槽位规则强行发卡。保底卡有独立「★ 传说保底」标记。

**联机倒地与全局坚持**：房主和房客适用相同规则。任一人生命归零进入倒地状态，不再移动/攻击/折跃，另一人继续坚持；初次需要8秒，此后全局每次倒地增加4秒，单次最长40秒。存活者在倒地者145世界单位内连续停留3秒，倒计时以双倍速度推进；救援完成后恢复40%生命、获得2秒无敌，并重生在存活队友附近。双方同时倒地才结束游戏；游戏暂停或升级选择期间倒计时停止。累计倒地次数、累计实际坚持秒数和下次救援时间由房主权威维护、同步给双方；新开一局清零。单人死亡规则不变。

### 双机共振与手机设置

- 两舰距离不超过340游戏单位时，由房主计算双方伤害 +10%；不超过180单位时提升至 +20%，且每秒为双方各恢复0.8HP（倒地玩家不享受效果）。
- 双方在260单位内、0.55秒内先后使用折跃，会触发一次双星冲击：半径170、最多18个目标受到房主结算的范围伤害，冷却8秒；消耗各自正常的折跃充能，不能无偿触发。
- 双方看到协同距离、增伤层级和连线；距离过远立即失去效果。这些增益仅在真正连接的双人模式计算，单人不受影响。
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
