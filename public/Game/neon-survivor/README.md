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

**网络边界**：Vercel API/Redis只负责房间码、Offer与Answer；摇杆、折跃、怪物、Boss、经验与战场快照始终通过浏览器间 WebRTC DataChannel 传输。使用 `iceServers: []`，不连接 TURN 中继。纯网页无法进行跨设备局域网广播扫描；房间码是经云端信令发现的房间，不是自动局域网扫描。两台设备必须可以建立局域网直连；如果AP隔离或网络阻止连接，将报错而不会退回云端转发游戏数据。

MVP最多2人：房主浏览器运行唯一战斗世界并结算敌人、Boss、伤害和掉落；房客发送受校验的移动/折跃/瞄准输入，通过约15Hz的世界快照和本地预测/插值调用与房主相同的Canvas渲染、武器特效和HUD。房客可使用同一套升级定义选择个人武器/模组/折跃，房主校验选择并执行权威战斗逻辑；双方共用经验等级。常规输入约30Hz，经WebRTC低延迟数据通道传送，升级和身份等关键事件使用可靠通道。联机普通/精英/Boss生命分别×1.35/1.45/1.65，适度增加伤害和刷怪频率；每逢双人第2、4、6……轮Boss出现专属「双生裁决者」。尚未完成无尽模式团队投票、四人联机和断线重连。房主离线则房间结束。

**经验与暂停**：所有经验晶体统一归房主权威队伍经验池；任一方拾取只计一次，共享等级，各自选择并升级个人装备。全图磁铁只吸经验晶体；治疗由实际拾取者获得。只有房主可以暂停/继续整个联机世界，房客设置不会影响全局。

**联机倒地与全局坚持**：房主和房客适用相同规则。任一人生命归零进入倒地状态，不再移动/攻击/折跃，另一人继续坚持；初次需要8秒，此后全局每次倒地增加4秒，单次最长40秒。存活者在倒地者145世界单位内连续停留3秒，倒计时以双倍速度推进；救援完成后恢复40%生命、获得2秒无敌，并重生在存活队友附近。双方同时倒地才结束游戏；游戏暂停或升级选择期间倒计时停止。累计倒地次数、累计实际坚持秒数和下次救援时间由房主权威维护、同步给双方；新开一局清零。单人死亡规则不变。

### 双机共振与手机设置

- 两舰距离不超过340游戏单位时，由房主计算双方伤害 +10%；不超过180单位时提升至 +20%，且每秒为双方各恢复0.8HP（倒地玩家不享受效果）。
- 双方在260单位内、0.55秒内先后使用折跃，会触发一次双星冲击：半径170、最多18个目标受到房主结算的范围伤害，冷却8秒；消耗各自正常的折跃充能，不能无偿触发。
- 双方看到协同距离、增伤层级和连线；距离过远立即失去效果。这些增益仅在真正连接的双人模式计算，单人不受影响。
- 「游戏设置」在首页、顶部HUD及暂停页均可打开；房客独立提供悬浮设置入口。开关音效、自动瞄准、手柄震动、CRT扫描线和低特效，调整折跃按钮54–100px、按钮透明度和虚拟摇杆死区；设置保存在本机 `neon_game_settings_v1`。打开期间屏蔽战斗快捷键与手柄输入穿透。
- 低特效模式减少粒子预算，并降低Canvas渲染像素倍率。移动端战斗HUD默认只留下设置、说明、暂停三个次要操作入口以降低拥挤。
- 头像与身份：游戏设置中的「联机身份 · 战机外观」支持最多12字符昵称、自动区分房主/房客或手动选择6种霓虹配色。数据保存在本机设置中；WebRTC连接后房客同步昵称/颜色给房主，再由房主快照分发身份。自己与队友的战机描边、座舱和名字标签依照各自设定显示。
- 当队友离开当前镜头视野时，屏幕边缘显示不会捕获触摸事件的方向小气泡，标注队友名字、飞船颜色、游戏世界距离与箭头；队友重新进入视野时自动隐藏。气泡依据每个设备的摄像机缩放、HUD占用和竖/横屏安全区域分别计算。
- 设置页新增65%–150%的战场镜头缩放，主机与房客各自调整本地Canvas，不影响HUD及操作区；浏览器会缓存缩放与其余偏好，重新开局、刷新和切换横竖屏无需重复调整。
- 自适应布局依据视口尺寸、屏幕方向与安全区域调整HUD、Boss血条、装备栏、折跃位置、升级卡和滚动对话框；无需手动选择手机横/竖屏模板。

Node模拟测试可验证消息协议与基础双人玩法，但不能替代两台真实设备的ICE配对、触屏/手柄和帧率验收。

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
node tests/neon-survivor-coop-balance.smoke.cjs
node tests/neon-survivor-host-pause.smoke.cjs
node tests/neon-survivor-shared-render.smoke.cjs
node tests/neon-survivor-guest-upgrade.smoke.cjs
node tests/neon-survivor-revive.smoke.cjs
git diff --check
```

真实浏览器/手机/手柄仍需验证首领奖励弹窗、切换战区后继续移动、升级确认的手柄按键隔离、任务提示、小屏幕菜单和无尽模式至少30分钟的性能。Node 测试不等价于真机验收。
