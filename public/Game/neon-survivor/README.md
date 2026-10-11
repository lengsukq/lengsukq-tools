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
    js/network/coop.js        # 双人输入、房主权威结算和快照
    js/network/ui.js          # 房间创建、发现与配对界面
    js/network/resonance.js   # 距离联动、双星折跃、协同恢复
    js/network/teammates.js   # 队友离屏定位气泡、昵称与战机颜色校验
    MANUAL.md                 # 玩家指南、机制和开发说明
```

原有核心较大，本版本先做无风险抽离，并将**所有新的玩法逻辑**放在独立模块中，而不是继续扩张HTML。后续应按测试覆盖情况再逐步拆分核心战斗代码，避免一次性大规模重写。

加载顺序：`gamepad_haptics.js` → `relics.js` → `fusions.js` → `events.js` → `endless.js` → `ui.js` → `arsenal.js` → `core.js`。无打包运行时依赖。

无尽接口：`window.NeonRogueEndless`；战斗事件只由核心调用公开钩子，UI 不直接操作战斗模型。

## V4 纯网页双人局域网合作（MVP）

主菜单点击「局域网双人合作」即可创建房间，不需要另外启动Node服务器。

**本机浏览器标签页**：房主创建房间，另一同源页面点击「查找房间（本机浏览器）」可直接加入。该发现采用BroadcastChannel，只在同源同存储分区的浏览器页面之间工作。

**不同电脑/手机**：两人打开游戏；房主创建房间并生成邀请信息，将文本发给房客；房客粘贴邀请、生成应答，将应答发回房主；房主粘贴应答并确认。建立WebRTC DataChannel后两台设备直接通信。配置为空ICE服务器列表，不需要STUN/TURN服务，但局域网设备必须可互相访问。

**重要限制**：浏览器不能使用普通网页监听UDP广播或开放局域网服务，因而本版不能自动扫描同Wi-Fi中其他设备的房间。六位房间号不是发现地址。要实现真正跨设备自动搜房，必须另加局域网信令/发现服务。HTTPS网页和不隔离客户端的Wi-Fi更适合WebRTC直连。

MVP最多2人：房主浏览器运行唯一战斗世界并结算敌人、Boss、伤害和掉落；房客发送受校验的移动/折跃/瞄准输入，接收10Hz战场快照并显示轻量化战斗画面。房客有独立生命、3段折跃和基础自动射击，但**尚未实现独立升级卡、完整个人武器构筑、九段折跃升级、无尽模式团队投票、四人联机、断线重连**。房主离线则房间结束。移动网络或隔离路由可能导致连接失败。

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
git diff --check
```

真实浏览器/手机/手柄仍需验证首领奖励弹窗、切换战区后继续移动、升级确认的手柄按键隔离、任务提示、小屏幕菜单和无尽模式至少30分钟的性能。Node 测试不等价于真机验收。
