# 黑暗传说原生对照 fixture

来源 APK：`com.zn.monster` 7.1 / versionCode 55。

SHA-256：`9767B9C3945D38985C07DB73D56DEC83E162B37C69A9686686BC9BDE67E35079`。

这些输入均为人工构造的确定性内存数据，不含账号、真实存档、密码或业务请求。期望结果来自 Unicorn 2.1.4 对该 APK 的原始 ARM 函数/片段的限定执行，不是由待测 JavaScript 实现生成。

- `native-rule-fixtures.json`：213 个成长、技能费用和强化显示阈值样本。
- `native-combat-fixtures.json`：720 个单次攻击算式样本，覆盖双方攻击、等级差、巅峰等级、暴击、闪避、攻击/防御百分比 Buff 与六类额外属性；包含 float32 中间结果。
- `native-player-attribute-fixtures.json`：252 个角色核心属性样本，覆盖不同等级、巅峰等级、八类固定属性及三类百分比属性。输入是装备等来源已收集后的聚合属性标签，验证基础成长和最终应用顺序。
- `native-equipment-attribute-fixtures.json`：180 个普通装备主属性样本，覆盖评分档位、评分值、强化、神器偏移及巅峰装备成长边界，不包含宝石、翅膀、附魔与随机词条生成。
- `native-skill-selection-fixtures.json`：360 个技能选择样本，覆盖空技能栏、1–4 个技能、敌我分支、普通/深渊模式和触发加成，比较技能 ID 与实际消耗的随机数数量。
- `native-hp-state-fixtures.json`：112 个生命状态样本，比较 HP 夹取、死亡标记和死亡清空 Buff；包含死亡角色被普通治疗后仍保留死亡标记的边界。

战斗样本执行 `WarRole::attacked` 的 `0xa10098–0xa11460` 算式路径。内存分配、日志、确定性随机输入及 UI/音效调用在隔离 harness 中处理；在 `chageHp` 入口捕获扣血请求。它们不证明完整回合顺序、Buff 施加/过期、宠物行为、HP 副作用、奖励和存档一致。

属性样本执行原版 `Player::refreshPlayerAttribute`（`0x99c954`）及 `GameEquipment::refreshRealAtt`（`0x825ff0`）。前者在 `0x99cd84` 跳到 `0x99eed8`，以合成标签替代装备/宠物等来源的收集；基础成长和最终属性计算保留原始指令。只比较八项核心数值，不宣称来源收集、VIP 或其他副作用已经迁移。

初始化 harness 使用原始 JSON 值和业务对象构造代码；场景节点、autorelease、平台身份获取被省略，整型转十进制字符串使用适配器以避开 Android locale。随机数固定为合成输入。装备所属编译单元的静态表由原初始化器执行；这不是完整 Android 运行环境。

复现脚本、原始库、解包资源及进一步解析证据在本次交付的 `monster-analysis.zip` 中。原生环境使用 capstone 5.0.9、pyelftools 0.33、unicorn 2.1.4；对应脚本为 `emulate-tables.py`、`recover-combat.py`、`recover-new-game.py`、`recover-player-attributes.py` 与 `recover-equipment-attributes.py`。

技能选择脚本为 `recover-skill-selection.py`，执行 `WarRole::choiceAttackSkill`（`0xa0ecf0`）；输入的 Cocos Value 按原版 16 字节布局构造，并由原版 vector size 函数核验长度。生命脚本为 `recover-hp-state.py`，执行 `WarRole::chageHp` 至 `0xa12730`，在 UI 显示前读取 HP 临时值、死亡标记与 Buff 容器长度。这些样本没有覆盖复活消耗、治疗技能、生命偷取或动画完成回调。

## 新档、掉落与入账样本

新增样本同样来自原始 ARM 指令，全部使用合成输入：

| fixture | 数量 | 原生来源 / 边界 |
| --- | --- | --- |
| `native-drop-group-fixtures.json` | 75 | `GameData::getBaseCopyById`；比较原表加默认 5003 材料项，按关卡类型/等级及随机余数变化 |
| `native-drop-selection-fixtures.json` | 432 | `Copy::getDrops`；合成向量与物品 ID，在合并入口捕获命中 ID 和随机消耗；不证明物品构造 |
| `native-experience-credit-fixtures.json` | 128 | `Player::addExp`；数值入账、递归、等级上限、宠物经验发放参数和解锁/药剂回调顺序；回调实现及视觉效果不在样本内 |
| `native-gold-credit-fixtures.json` | 30 | `GameLogic::changeGold`；正负增量、原符号整数溢出、20 亿上限边界及成就参数；UI 通知省略 |
| `native-bag-credit-fixtures.json` | 12 | `GameLogic::addBagItem`；材料叠加、重复 ID 与装备独立条目；物品构造时显式设置并核验 type |
| `native-regular-reward-fixtures.json` | 1192 | `WarFinishLayer::initUi` 的普通关卡数值片段，覆盖等级差边界、累积巅峰惩罚、难度、全局倍率重置、首通/随机掉率奖励及 float32 顺序；不执行物品或事件结算 |
| `native-enemy-adjustment-fixtures.json` | 168 | `Enemy::resetAttByQuality` 后接 `resetAttByHard`，每组比较两阶段；不证明敌人生成、随机质量或巅峰调整 |
| `native-first-material-drop-fixtures.json` | 48 | 首关真实向量、原物品表、`getDrops`、`getBaseItemById`、`addDropItem`；仅注入概率随机值，不替换物品工厂，比较合并后的 ID/type/数量 |
| `native-new-game-fixture.json` | 1 组状态 | 原新档分支及属性刷新；由 `project-new-game-fixture.py` 投影原生结果，输入为原目录行，期望值不调用迁移代码 |
| `native-first-credit-fixture.json` | 1 组状态 | 原战前角色、命中序列和发放片段；固定随机值下比较金币 1117、经验 15、生命 230；不代表调度器或原生存档已迁移 |

此前小计 3922 个数值/物品样本和两组状态对照；新增样本和当前总量见下节。对应恢复脚本为 `recover-drop-groups.py`、`recover-drop-selection.py`、`recover-experience-credit.py`、`recover-inventory.py`、`recover-regular-rewards.py`、`recover-enemy-adjustment.py`、`recover-first-material-drops.py`、`recover-first-credit.py` 与两个 `project-*-fixture.py`。

原生奖励片段在复用已翻译代码块时，用指令 hook 明确停止在片段边界，并核验最终 PC，避免片段外代码混入结果。全局奖励倍率实际对应 `WarLayer::dropQuality`，首战样本为 120；不能把原表金币 150 或该次所得 117 当作全局固定奖励。

云存档测试使用确定性内存 D1 与合成认证会话，覆盖账号隔离、原子版本冲突、切换账号、损坏格式与请求失败。浏览器测试在隔离的 Chromium/WebKit context 中调用真实 Worker 代码和内存 D1，验证云端续玩、材料重载和失败重试，不使用真实业务数据，未做真实 iPhone 验收。早期组合测试使用原生 trace 作为行动输入；现已替换为由生产领域代码自行调度的组合测试。

## 自动调度、目录生成与进度

| fixture | 数量 | 来源与限制 |
| --- | --- | --- |
| `native-enemy-factory-fixtures.json` | 849 | 全部原敌人目录，原 `GameData::getBaseEnemyById`、JSON、技能工厂均执行。装备技能值用原生 `Value::asInt` 读取，不手算 Cocos Value 布局；原工厂读取但不使用目录 quality，结果全部为构造默认 0 |
| `native-turn-selection-fixtures.json` | 384 | `WarLayer::nextWar` 的行动者、目标及行动标记。技能选择与随机活目标为显式适配输入；其余队列/条件分支保留。死亡角色过滤不能擅自加入此层 |
| `native-battle-random-choice-fixtures.json` | 103 + 66 | 原普通品质阈值及 `getRandomEnemy` 的死亡重抽，比较结果与消耗；原完整队列上取模后重抽，不改成先筛活人再随机 |
| `native-solo-normal-battle-fixtures.json` | 15 次完整战斗 | 一个玩家、1–3 只狼，正常胜负、秒杀、暴击和持续未命中。原调度/攻击/生命/回合结束执行；延迟换敌排队。UI 回调按命中顺序排空，不证明动画时序。核心随机仅统计选目标和暴击/伤害/命中，排除标题彩票和表现随机 |
| `native-copy-progress-fixtures.json` | 576 + 16 | 原结算章节片段及 `addCopyFinish`。先建立原战斗单例供敌人数读取，比较章节、关卡、新章节/完成标志、货币、成就参数和计数。提示/通知省略，成就仅捕获 |
| `native-equipped-core-fixtures.json` | 36 | 原 `refreshPlayerAttribute` 收集真实初始装备和翅膀，覆盖等级、巅峰及部分/零 HP；不是聚合标签注入。证实重算保持当前 HP |
| `native-battle-reward-rate-fixtures.json` | 87 | 原 `initWarData` 尾部按品质 100/120/150/200 求整数平均，比较不同混合队列及原默认分支 |

首关阶段总量为 6039 个规则/数值/物品/进度样本、15 次完整普通战斗、两组基础状态（合计 6056 组）。复现脚本分别为 `recover-enemy-factory.py`、`recover-turn-selection.py`、`recover-battle-random-choices.py`、`recover-solo-normal-battles.py`、`recover-copy-progress.py`、`recover-equipped-core.py` 和 `recover-battle-reward-rate.py`。

旧 `solo-battle-domain.js` 已由 `battle-domain.js` 与 `skill-domain.js` 替换，支持单角色技能、Buff、回血和吸血；宠物与复活仍未接通。原生 trace 仅作期望值，不作为调度输入。

## 选关、技能与随机物品扩展

下列 fixture 同样来自原始 ARM 指令与确定性合成输入；恢复脚本在解析目录。数量是样本组数，不代表完整 APK 已运行。

| fixture | 数量 | 来源 / 边界 |
| --- | --- | --- |
| `native-skill-effect-fixtures.json` | 256 | `recover-skill-effects.py`；技能伤害、治疗、Buff 及随机消耗 |
| `native-skill-battle-fixtures.json` | 64 次战斗 | `recover-skill-battles.py`；2329 次命中，技能/Buff 生命周期、胜负、状态和核心随机；不含宠物/复活/动画时序 |
| `native-copy-preparation-fixtures.json` | 576 | `recover-copy-preparation.py`；地图与普通副本准备、品质、难度和巅峰调整 |
| `native-special-copy-preparation-fixtures.json` | 139 | `recover-special-copy-preparation.py`；深渊、特殊首领、随机多波副本和试炼初始敌人；不含试炼积分推进 |
| `native-rare-preparation-fixtures.json` | 30 | `recover-rare-preparation.py`；随机遭遇类型、宝箱怪/海盗船长等实际构造 |
| `native-item-construction-fixtures.json` | 3195 | `recover-item-construction.py`；原物品工厂、普通装备评分与构造 |
| `native-dropped-equipment-collection.json` | 608 | `recover-dropped-equipment-collection.py`；实际掉落装备的属性收集，区分普通/神器/巅峰来源 |
| `native-god-equipment-fixtures.json` | 224 | `recover-god-equipment.py`；神器星级、偏移及唯一标签 |
| `native-gem-equipment-fixtures.json` | 256 | `recover-gem-equipment.py`；宝石等级/巅峰成长、品质、词条及随机消耗 |
| `native-paragon-equipment-fixtures.json` | 384 | `recover-paragon-equipment.py`；五个不同属性及固定模板词条、主属性成长 |
| `native-instance-reward-fixtures.json` | 96 | `recover-instance-rewards.py`；副本/特殊首领/深渊/试炼数字奖励，不代表试炼最终积分领奖已接通 |
| `native-abyss-milestone-fixtures.json` | 114 | `recover-abyss-milestones.py`；全深渊层数的固定里程碑材料，不含每日重置/扫荡 |

`public/monster/data/drop-groups.json` 由 `recover-catalog-drop-groups.py` 使用原生宽松 CSJson 解析全 331 条关卡，保留原目录中严格 JSON 无法解析的掉落字段；`equipment-templates.json` 保留原工厂固定属性。界面仅开放已装配路径，尚未恢复的任务、宠物等效果不因数据表存在而视为完成。
