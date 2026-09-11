# 项目修复、测试补强与任务前置流程精简方案

状态：已完成并发布。本文保留实施结果、验证摘要与发布结果；发布前只读核查确认目标 D1 已存在所需字段，未执行远程 DDL。

编写日期：2026-09-11。调查基线：`main`，提交 `26696054700113e07b292803d339481eddac6cd0`。执行环境为 Windows PowerShell；调查时 Node 为 `v24.19.0`。

执行对象：Luna max。按阶段顺序在同一个任务内实施，不需要再次委派。本文中的路径均相对于仓库根目录。

## 1. 目标与边界

完成以下结果：

1. 通用表接口不能通过新增、覆盖或错误筛选越权修改、误删数据。
2. Worker 异步异常统一转换为带正确 CORS 的错误响应。
3. 在线退出登录撤销当前服务器会话，离线或失败时准确说明撤销状态，本地会话不会被迟到请求恢复。
4. 预览验收之前不修改正式 Worker；仅预览模式不部署正式 Worker；发布工具版本固定。
5. 关键测试验证真实行为，减少依赖源码字符串、压缩变量名和文件数量的断言。
6. 对本次涉及的 Worker 表接口做职责拆分，并完成衣柜模块的有限拆分。
7. 项目规则只维护一份事实来源，历史发布证据移出操作清单，普通任务维持最少预读。

本次实施不包括：整站视觉改版、框架迁移、新 ORM、通用权限框架、全面重写 Worker、重做运行时装配、修改真实数据库、删除真实业务数据、新建云端环境或自动部署。保留现有长时间登录产品行为，不把缩短 3650 天会话期限混入本次修复。

执行本方案可以修改源码、测试、配置及对应文档；发布仍需用户明确授权。默认直接在已有 `main` 工作，不创建分支或工作树，不丢弃其他任务的改动。

## 2. 已有证据及其限制

调查时已通过：`pnpm run check`、`pnpm run test:unit`（126 项）、`pnpm run test:static`、`pnpm run test:structure`、`git diff --check`。未执行完整浏览器回归或线上验收。这些通过结果不能代替修复后的验证。

使用项目真实 Worker、真实 `schema.d1.sql`、Node 内存 SQLite 和合成账号得到以下结果；没有访问生产数据库或使用真实凭证：

| 编号 | 已确认的问题 | 复现结果 | 主要定位符号 |
| --- | --- | --- | --- |
| R1 | `insert` 与 `upsert` 共同调用没有冲突记录授权的覆盖 SQL | A 提交 B 的秘藏记录 ID，HTTP 200，记录归属由 B 变成 A | `handleTableApi`、`sanitizeRowForTable`、`upsertRows` |
| R2 | 无效筛选字段被跳过，非空筛选数组被误判为安全 | `typo_id` 删除条件得到 HTTP 200，A 的两条记录全部删除 | `buildFilterSql`、`assertRowsWritable` |
| R3 | 路由返回异步 Promise 时没有等待，外层异常处理接不到拒绝 | 注入无效冲突列后，`worker.fetch()` 直接 reject，没有 JSON Response | Worker `fetch` 路由分发及 `catch` |
| R4 | 退出只清理本地，不请求服务器 | 本地 session 删除，但服务器请求数为 0；Worker 没有注销路由 | `createCloudflareBackend` 中 `auth.signOut` |
| R5 | 正式 Worker 先于 preview 验收部署 | 发布脚本及模拟测试均明确规定此顺序；preview 模式也执行 Worker 部署 | `deploy-cloudflare-pages.ps1`、`tests/deployment-flow.ps1` |

其他维护问题属于源码/文档调查结论，不表示已经发生线上事故：

- `tests/build-budget.mjs` 依赖压缩后的 `Ee(...)` 名字；发布元数据脚本另用全局字符串匹配计算预缓存，两者口径不同。
- `tests/structure-health.mjs` 要求 runtime 文件至少八个，且多处断言绑定具体源码写法。
- Worker 约 2962 行，衣柜模块约 791 行；行数只说明调查范围，不作为必须压缩到某个数字的目标。
- `docs/README.md` 和 `docs/CHANGE_WORKFLOW.md` 重复维护同步判断表。
- 发布清单约 1.3 万字符，包含历次部署哈希和已完成专项；手动验收内有互相不一致的宽屏布局描述。
- `docs/MODULE_MAP.md` 仍把心情提醒写为 20:00；当前 Worker Cron 与近期变更已经是东京时间 18:00。

如果执行时源码已变化，按符号重新定位并复测。不要回退后续正确修改来适配本文旧行号或旧快照。

## 3. 阶段、依赖与交付顺序

| 阶段 | 工作 | 完成条件 | 前置依赖 |
| --- | --- | --- | --- |
| A | 建立真实 SQL 内存测试，修复异步错误边界 | 路由内部异步错误有正确响应；R1/R2 有可复现的回归测试 | 无 |
| B | 修复通用写入权限、筛选与冲突目标 | 权限矩阵、批量拒绝、合法共享编辑通过 | A |
| C | 完成服务端注销及本地会话防恢复 | 在线、离线、重复点击、迟到请求测试通过 | A；B 稳定后实施 |
| D | 调整发布顺序并锁定发布工具 | 所有发布顺序和失败分支由模拟测试验证 | B、C |
| E | 精简脆弱断言与统一预缓存解析 | 构建/元数据口径一致，原有门禁强度不降低 | A—D |
| F | 衣柜有限拆分与遗留无效接口清理 | 原功能不变，旧实现删除，相关回归通过 | B、C、E |
| G | 文档去重、归档和最终验收 | 当前规则唯一，事实一致，交付清单完整 | A—F |

每阶段先完成最小可运行闭环，再进入下一阶段。允许保留阶段性失败测试用于开发；最终交付不能留下失败测试、临时双路径或只写 TODO 的实现。

### 启动动作

```powershell
Get-Content -LiteralPath docs/README.md
git status --short
git branch --show-current
git rev-parse HEAD
```

读取当前 `AGENTS.md`，记录已有改动。先读本方案当前阶段的源码，再局部补充文档。只有涉及退出反馈、衣柜视图或 UI 规范时，才进入 `DESIGN.md` 与 `ui-ux-pro-max` 的对应工作流；遵守当前规则，不自行取消技能要求。

本方案不应被加入所有任务固定预读清单。执行进度只在本文第 12 节更新，不另建多份互相重复的计划。

## 4. 阶段 A：真实 SQL 验证与错误边界

### A1. 增加最小的内存 D1 测试适配器

建议新增 `tests/fixtures/memory-d1.mjs`，只服务 Worker 行为测试：

- 使用 Node `node:sqlite` 的 `DatabaseSync(':memory:')`，加载当前 `cloudflare-worker/schema.d1.sql`。
- 支持生产代码实际使用的 `prepare().bind().first()/all()/run()` 和 `batch()`；后续遇到真实调用再补充必要能力，不实现 SQL 解释器。
- `all()` 返回 `{ results }`；`run()` 返回项目实际消费的 D1 元数据；`batch()` 使用同一内存连接和 SQLite 事务，失败时回滚。不要把 `Promise.all()` 当成事务。
- 开启外键。为每个测试新建并关闭数据库；合成用户、家庭、session token hash 和固定记录，不能读取本机凭证文件。
- 可以在数据库操作处注入一次性失败；用于测试错误响应，不能通过篡改权限判断来制造通过结果。
- Node 缺少 `node:sqlite` 时明确提示测试环境要求，不静默跳过；若需声明 Node 最低版本，在 `package.json` 与运行文档同步，选择确实支持该 API 的版本。
- 此适配器验证 SQLite 语义与真实 Worker 调用，不代表完全模拟 Cloudflare 托管环境。D1 专有能力使用前查官方文档并补对应验证。

新增的测试建议分为 `tests/worker-table-security.mjs`、`tests/worker-error-boundary.mjs`、`tests/worker-session.mjs`，接入 `test:unit`。不要仅用“SQL 包含某字符串”的断言证明权限安全。

现有 `tests/mood-diary-worker.mjs` 有自己通过正则解释 SQL 的 fixture。本阶段先保留其既有覆盖；本次修改 SQL 后，应把受影响的权限/冲突用例转到真实 SQLite，不能不断追加正则猜测新 SQL。没有变化的其他测试不必全部重写。

关联核对：当前 Worker 配置和 `modules/secret-entry-preference-controller.js` 使用 `user_profiles.secret_default_folder_id`，但调查时 `schema.d1.sql` 未声明该列。建立真实 SQL fixture 时核对并修正本地 schema 的当前事实，增加秘藏默认文件夹读写测试；不能只在测试数据库偷偷补列来掩盖 schema 漂移。优先沿用现有可空文件夹 ID 语义，不擅加会改变现有数据行为的约束。本阶段不新增 migration 文件、不执行远程 DDL；线上是否缺列及发布前是否需要结构更新必须在交付中单独列明，不能假定线上已经更新。

### A2. 修复 Worker 异步分发

主要文件：`cloudflare-worker/src/worker.js`。

1. 找到 `fetch` 内所有返回异步处理器的分支，在错误边界内等待处理器完成。最小实现是相关分支 `return await handler(...)`；也可使用一个明确的异步 dispatch 边界，但不要借机重写全部路由。
2. 保留既有 `jsonResponse(request, env, ...)` 和精确 CORS 逻辑，错误响应也必须使用同一路径。
3. 已知参数错误返回 400，未登录返回 401，无权限返回 403，唯一键冲突返回 409，意外异常返回 500。允许使用一个小型状态错误类型，不建立通用错误框架。
4. 意外 500 的客户端正文使用稳定、可读信息，不把原始 SQL、绑定值、token 或内部堆栈返给客户端。服务端日志同样不得记录请求凭证和完整业务正文。
5. 保留已认证未知路由 404、未认证受保护路径 401 和 OPTIONS 行为；不要把所有异常都转换成 200。

验收至少覆盖：

- 登录处理器内部异步失败；已认证表查询内部异步失败；受保护 RPC/上传处理器内部异步失败。
- 失败发生在认证完成之后，确保测试确实经过异步分发边界。
- `worker.fetch()` resolve 为 Response，HTTP 500，JSON 可解析，精确 `Access-Control-Allow-Origin`、`Vary: Origin` 正确。
- 不允许的 origin 不会因为错误路径获得通配授权。
- 现有 `tests/worker-cors.mjs` 继续通过。

## 5. 阶段 B：通用表接口安全与正确写入

### B1. 先保留真实业务权限，再修改 SQL

现有代码不能改成“所有表都只能修改自己”。应保留 `TABLE_CONFIG` 已有写入范围：

| 数据类别 | 目标权限 |
| --- | --- |
| `photos`、`mood_diaries`、`user_profiles`、`secret_items`、`secret_folders`、通知、收藏和本人评论 | 按当前 own/writeScope 规则限制写入；家庭可读不等于家庭可写 |
| 菜谱、心愿、购物车、周末、纪念日及衣柜等当前家庭共享表 | 保留同家庭成员的共享编辑；非家庭成员禁止修改 |
| 管理员解除日记置顶 | 只保留既有明确例外，不能扩展成管理员通用绕权 |

根据配置和 schema 补全所有可写表的矩阵，不以这张简表替代源码枚举。

现有共享编辑依赖 `.upsert()`，已定位调用包括：

```text
modules/recipe-controller.js
modules/shopping-controller.js
modules/wishlist-controller.js
modules/weekend-controller.js
modules/anniversary-controller.js
modules/account-sync-controller.js
modules/mood-diary-repository.js
modules/household-repository.js
```

必须验证 A 编辑同家庭 B 的菜谱/购物车仍成功，并且 `user_id` 继续属于 B。

### B2. 插入、覆盖与不可变字段的确定契约

1. `insert` 只执行新增，不能遇到主键冲突就更新；已存在时返回 409，不改动已有记录。
2. `upsert` 对新记录使用当前登录用户作为所有者；对已有记录按当前 `writeScope` 授权。
3. 更新已有记录时，禁止通过 `excluded` 覆盖 `id`、owner 字段和 `created_at`。自然键冲突更新同样保留已有 ID。
4. 冲突更新只修改本次提供的、允许修改的业务字段；省略字段不能被归零、置空或恢复默认值。新增记录使用当前 schema 的默认值及必要服务端默认值。
5. 拒绝恶意 owner 转移；合法共享编辑携带原 owner 时不能误拒绝，也不能改成当前编辑者。
6. 成功响应返回数据库实际写入后的 canonical 行，`count` 反映真实结果，不能把未写入的 sanitized 输入当作成功返回。
7. 心情按 `(user_id, diary_date)` 命中已有行时，客户端本次新生成且尚未被使用的临时 ID 不替换已有 ID；返回原 canonical ID。如果提交的 ID 已经属于另一条记录，则拒绝，不覆盖另一条记录；越权目标返回 403，本人不同日期的冲突返回 409。以“同用户同日唯一、已有 ID 稳定”为统一判据。
8. 更新/删除 SQL 本身也带授权 scope；upsert 的冲突更新必须带等价授权条件。不能只用“先查询是否允许，然后无条件更新”作为安全边界。

批量输入先整体完成格式和已知权限预校验，再执行写入；混合合法项与已知越权项时，整批拒绝，合法项也不应被提前写入。使用真实数据库支持的事务/批处理避免 SQL 错误造成半批提交，并测试中途失败。对于并发变化造成的授权守卫不命中，必须返回真实结果且不越权；没有实现跨整批原子语义时，不得在接口文档中声称完全原子。

不要采用先删除再插入、`INSERT OR REPLACE`、先改 owner 再恢复、或出错后依靠人工恢复数据的实现。

### B3. 冲突目标由服务器唯一决定

删除客户端可自由指定 SQL 冲突列的能力：

- `mood_diaries` 固定为 `(user_id, diary_date)`。
- `photo_favorites` 固定为 `(user_id, photo_id)`。
- 其余表按真实 schema 的主键/唯一键在服务器配置中确定，不能将任意字符串拼进 SQL。
- 移除 `CloudflareQueryBuilder` 的 `onConflict` 成员、方法选项和请求字段，调整 `householdRepository.upsert()` 及上述调用点，保留 `select/single/maybeSingle` 的结果整形。
- 新接口收到旧 `onConflict` 请求字段时返回 400；不保留旧协议 fallback。修改客户端、Worker、fixture 和文档时保持同一契约。
- 不改变 `upsert()` 在 UI 中承担“新建或保存编辑”的用途。

`createDiaryRepository.setFavorite()` 当前使用 `insert`，重复请求过去会被覆盖 SQL 吞掉。将“设为已收藏”明确改为幂等的固定自然键 upsert；重复设置不重复产生收藏通知。不要为了兼容收藏而重新让所有 insert 静默覆盖。

注意通知副作用：只对实际新增且成功的记录创建新增通知；权限拒绝、唯一键冲突、重复收藏或覆盖保存不得误发新增通知。保留既有心愿、购物车、日记、评论通知能力，不在本阶段引入消息队列。

### B4. 筛选必须先验证，不能静默丢弃

统一验证 GET 查询和 POST 写入的 filters：

- 筛选 JSON 无法解析、顶层不是数组、元素不是对象、缺失列名、未知列、未知 op、值类型不支持：400。
- 支持现有 `eq`、`neq`、`gte`、`lt`、`in`；op 未提供时仍可按既有约定解释为 `eq`。
- 关联接口缺口：`household-repository.js` 的数组筛选和 `data-repositories.js` 的 `markManyRead()` 调用 `.in()`，而当前 `CloudflareQueryBuilder` 没有该方法。补充与现有其他筛选方法相同风格的 `in(column, values)`，并验证客户端序列化到真实 Worker 的整条路径；不扩展其他未使用的查询 DSL。
- `in` 必须是数组。空数组表达匹配零行，不能省略该条件后扩大范围。
- `null` 的等于/不等于如需支持，生成正确的 `IS NULL` / `IS NOT NULL`；其他不成立的组合明确拒绝。
- 布尔列按对应表进行值规范化，避免把字符串 `"false"` 当成真值。
- 任一条件无效即拒绝整个请求；不能“保留有效条件、忽略错误条件”。
- update/delete 必须至少有一个有效的客户端筛选条件，不能把自动附加的权限 scope 算作用户筛选。
- 管理员解除置顶例外也必须经过同样的筛选校验。
- 保留有明确条件的批量操作，例如通知 `user_id + is_read=false`，不要统一强制所有操作只能 `eq(id, ...)`。
- body 非合法 JSON 或写入 payload 不是预期对象/数组时返回 400，不能回退成 `{}` 再执行。

在 `buildFilterSql` 前完成校验，SQL 生成阶段只接受已经验证的输入；列名来自服务器白名单，所有值仍使用绑定参数。

### B5. 有限模块拆分

在回归测试保护下，把本阶段需要修改的 Worker 表逻辑移至明确职责模块，建议：

```text
cloudflare-worker/src/table-config.js       表、列、权限和固定冲突目标
cloudflare-worker/src/table-query.js        输入验证及参数化筛选/写入构造
cloudflare-worker/src/table-api.js          查询与写入执行、授权、canonical 结果
cloudflare-worker/src/http-response.js      如抽取有实际复用：状态错误及响应
```

文件数量可按实际职责合并，不能为了凑数拆空文件。家庭关系查询或通知需要跨模块时，传入明确依赖或提取小型共享函数，不能让新模块反向 import 整个 Worker 形成循环。删除旧函数实现，更新真实导入方；不要保留转发兼容文件。

Worker 的认证、备份、R2、邮件和 Cron 不在本阶段全面拆分。现有 `ensureEmailSchema`、旧密码哈希升级等历史机制不能在安全修复中无证据地连带删除。

### B6. 必须通过的回归矩阵

| 场景 | 预期 |
| --- | --- |
| A insert 使用 B 已有私密记录的 ID | 409；B 原记录完全不变 |
| A upsert B 的秘藏、日记或心情 | 403；内容、归属、主键不变 |
| 同家庭 A upsert B 的菜谱、购物车 | 成功；owner、created_at 不变 |
| 非同家庭 A upsert B 的共享表记录 | 403；无写入、无通知 |
| A 新建记录并伪造 B 的 owner | 不允许生成 B 名下记录 |
| 同用户同一天反复保存心情 | 一行；canonical ID/created_at 稳定 |
| 覆盖只提供部分业务字段 | 未提供字段不丢失 |
| 重复设置已收藏 | 一条收藏；不会重复通知 |
| 批量包含已知越权项或无效项 | 拒绝；前面合法项未提前落库 |
| 批量 SQL 中途约束失败 | 按已声明事务契约回滚，不能返回假成功 |
| 删除 `typo_id`、未知 op 或有效+无效混合条件 | 400；任何记录均未删除 |
| 无 filters、空 filters、无效 JSON | 400；无写入 |
| 空 `in` | 匹配零条；不会删除整个权限范围 |
| 正常条件批量标记通知已读 | 只命中当前用户符合条件的行 |
| 管理员解置顶传无效筛选 | 400；不触及其他日记 |
| 旧 `onConflict` 或注入式冲突字符串 | 400；无 SQL 标识符注入 |

回归以数据库最终记录、状态码和副作用次数为证据，不能只检查生成 SQL 的文本。

## 6. 阶段 C：退出登录与会话生命周期

### C1. Worker 注销接口

新增 `POST /api/auth/logout`：

- 只按当前 Bearer token 的哈希删除 `sessions` 对应行，不按客户端传入的 user_id 删除所有设备会话。
- 不要求先通过会自动续期的 `requireUser`；已失效/已删除的 token 再次注销返回成功，保证幂等。
- 无 token 同样返回成功，不暴露 token 是否存在。意外数据库失败仍为 500。
- 使用现有响应和 CORS 路径；不记录原始 token。
- 返回 `200 { data: true }`，作为客户端固定契约。

验证 A 的两个 session 中只删除目标 token；B 的 session 不变；删除后用旧 token 访问真实 Worker 受保护接口返回 401。注意 `/api/table/photos` 有公开读取路径，不能拿它的公开结果证明 session 失效。

### C2. 前端注销流程

主要文件：`modules/cloudflare-client.js`、`modules/auth-controller.js`；现有设置事件、auth view、账号状态 reset 按需使用。

确定行为如下：

1. `signOut()` 捕获本次要撤销的 token；同一会话的在途注销共用一个 Promise，防止重复点击发出多次请求。中途登录了另一账号后，对新账号的退出不能错误复用旧账号的 Promise。
2. 同步清理当前内存/本地可恢复 session，并触发一次 `SIGNED_OUT`，使界面立即退出；同步清理失败必须准确反馈。
3. 等待 IndexedDB 备份清理完成，不能只 `void writeSessionBackup(null)` 就宣告完成。当前 `writeSessionBackup()` 会吞掉错误，必须让注销路径拿到明确的清理结果；仅增加 `await` 不足以证明清理成功。检查已有备份写入顺序，保证注销前排队的写入不能在清理后恢复旧 session。
4. 使用捕获的 token 显式请求注销接口；禁止在请求发送时误用后来登录的新账号 token。
5. 注销请求使用有界超时，建议固定 8 秒；超时失败不能阻止本地退出。使用现有 `fetchApi` 注入与 AbortSignal，不增加配置系统。
6. 成功、401/已失效按服务器幂等契约处理；网络失败/500 返回区分本地清理和服务器撤销的结果。
7. `auth-controller.logout()` 消费结果：成功显示“已退出登录”；仅本地退出成功时显示“已在本机退出，服务器会话撤销未确认”。不要宣称离线时已撤销服务器 token。
8. 在线登录/注册的本地 session 写入是必要提交，IndexedDB 备份是非必要备份；备份失败不能把成功登录变成 error 或留下无事件的半登录状态。返回明确的 `backup` 结果，认证控制器显示可读提醒；本地 session 写入本身失败仍按登录失败处理。
9. 不为了后台重试把待注销 token 再写入 localStorage/IndexedDB；不新增持久化凭证队列。

`request()` 目前会在成功响应后给捕获的 activeSession 续期并再次持久化。必须同时防止以下情况：

- A 的旧请求在 A 退出后返回，恢复 A session。
- A 的旧请求在 B 登录后返回，把 B 的会话覆盖成 A。
- 正在执行的备份写入在注销清理之后写回旧 token。

使用本模块内最小的会话代次/身份检查和必要的备份写入串行化，只有“仍是当前会话”的响应才允许续期或持久化。注销接口自身不得触发旧 session 续期。不要建立跨全站的通用任务调度框架。

如确实需要抽取存储职责，可新增 `modules/auth-session-store.js`；否则在现有模块完成局部修复。不能把新业务逻辑写进 `app.js`。

### C3. 测试要求

- Worker：正常注销、重复注销、未知 token、仅撤销当前设备、数据库失败。
- 客户端：本地立即退出、正确 token、单次请求/单次事件、8 秒超时、服务器 500、无 session 不发多余请求。
- IndexedDB：旧写入迟到、清理失败、清理后刷新不恢复账号；登录/注册备份失败仍保持 localStorage、内存和 `SIGNED_IN` 一致，备份恢复可重试。
- 并发：退出后旧请求返回；退出 A 后登录 B 再返回 A 请求；新账号不受旧注销完成影响。
- 浏览器：正常退出回到登录入口、错误提示可见、刷新保持退出、无未处理 Promise rejection。
- 更新 `tests/fixtures/cloudflare-api-fixture.mjs` 的注销路由及状态行为；现有 `tests/release-smoke.mjs` 的 logout 场景继续通过。
- fixture 不能把任意 Bearer token 一律视为有效，否则无法证明撤销生效。

涉及新增提示时先读取 `DESIGN.md` 和 `ui-ux-pro-max`，沿用现有反馈组件，不增加新的弹窗流程。

## 7. 阶段 D：发布顺序与版本固定

### D1. 采用最小的发布顺序修复

不新增 staging Worker/D1/R2。本次保证“preview 失败或 preview-only 不修改正式 Worker”，不宣称 Cloudflare 多服务发布具有原子性。

新的固定流程：

```text
检查干净、已推送的 main
  → 安装锁定依赖
  → pnpm test（只生成一次发布构建）
  → 本地 release 验收
  → 再检查源码及构建指纹
  → 发布 codex-preview Pages
  → 固定 preview alias 就绪
  → preview Axe + 确定性 fixture release smoke
  → 若 Environment=preview：结束
  → 再检查源码及构建指纹
  → 发布正式 Worker
  → 正式 Worker CORS/只读在线门禁
  → 使用原构建发布 main Pages
  → production alias 就绪及正式站验收
```

已有线上 Worker 的只读 CORS 检查可以作为额外预检，但不能将它当作“候选 Worker 已验证”。候选 Worker 行为通过本地真实 Worker + 内存 SQL 测试覆盖；preview 的浏览器 fixture 验收验证的是前端及接口契约。

Worker 部署之前也必须运行源码/构建未变化检查；不能只在 Pages 上传前检查。失败输出明确指出最后完成的阶段：Worker 已变更但 Pages 未发布时，不能说“正式环境未改变”。

发布后的故障处理和回滚另按当次发布授权执行；本方案不新增未经验证的自动数据库回滚，也不使用兼容层掩盖前后端契约差异。取消外部 `onConflict` 字段后，旧的已打开页面可能需要刷新；发布说明必须记载该契约变化。

### D2. 固定 Wrangler

- 根 `package.json` 添加一个精确版本的 Wrangler 开发依赖，并更新根 `pnpm-lock.yaml`。
- 实施时查询 Cloudflare 官方安装/CLI 文档与实际 Node 要求，选定可验证版本；不能把本文编写时未查证的版本号写成事实。
- 发布脚本统一从仓库根目录调用锁定的 `pnpm exec wrangler`，Worker 通过明确配置路径/工作目录定位。
- 删除发布链路中的 `dlx wrangler@latest`，不新增 dlx fallback，不在根与 Worker 子项目分别维护两套 Wrangler 版本。
- 保留现有 `--frozen-lockfile`、token 环境恢复、同一构建复用和来源检查。

### D3. 发布模拟测试

调整 `tests/deployment-flow.ps1` 的真实顶层编排 fixture：

- preview-only 中 `worker` 和 `upload:main` 两种副作用都不能出现。
- preview 上传、alias、Axe、smoke 任一失败，正式 Worker 和正式 Pages 均未执行。
- 检查完整相对顺序，不只检查最终是否上传了 main。
- Worker/CORS 失败后不上传 main；main/正式验收失败必须报错。
- Worker 部署前源码/构建指纹变化必须停止。
- 现有脏工作区、错误分支、未推送、fetch 失败及环境变量恢复测试继续通过。
- 增加可发现的 `test:deployment` 命令，指向该模拟测试；它只在发布脚本修改和最终本方案验收时需要运行。

编写和验收脚本时不调用真实发布入口。模拟测试不得读取真实 token，也不得连接 Cloudflare。

## 8. 阶段 E：提高测试价值，减少实现耦合

### E1. 统一预缓存结果读取

当前 `tests/build-budget.mjs` 和 `scripts/release-metadata.mjs` 使用不同的字符串匹配方法。改为共用一个小型构建产物解析模块，例如 `scripts/workbox-manifest.mjs`：

- 读取实际生成的 `dist/sw.js`，不能仅返回 Vite 配置里的期望列表。
- 使用成熟 JS AST 解析能力定位调用参数中的预缓存对象数组，以 `{ url, revision }` 等真实数据结构识别，不依赖压缩函数名 `Ee`。
- 优先复用已直接声明的合适依赖；如需 Acorn 等解析库，明确声明为固定版本开发依赖，不依赖偶然可见的传递依赖，也不自己实现 JavaScript parser。
- 必须校验候选唯一、URL 类型、重复项和必要入口；未找到/有歧义时失败，不能返回空数组让检查误过。
- 构建预算和发布元数据都调用同一个解析结果。
- 验证数组内提到的资源真实存在；保留“首页资源应预缓存、延迟路由不能全量预缓存”的现有门禁。

为解析器添加小型有效测试：不同压缩变量名、空白/引号变化、带无关 URL 的代码、缺失清单、歧义清单。再对真实构建运行预算验证。不要通过放宽预算或删除预缓存检查让测试通过。

### E2. 精简结构断言

删除“runtime 模块至少八个”这类与正确性无关的数量下限。保留真实的边界、重复 HTML ID、资源存在性、入口体积和禁止遗留产物等检查。

对本次拆分直接影响到的源码文本断言，逐条决定：

- 能通过导入关系判断的架构边界，验证真实 import 依赖；不能只找某个函数名字。
- 能通过调用结果判断的逻辑，改成行为测试。
- 只是在重复“某文件包含某个名称”的断言，删除或替换为真实需求。
- 保护用户明确要求的视觉/资源约束的检查继续保留；不能把所有静态测试统称为冗余。

把新增模块加入语法检查。可以将 `check` 的长手写清单改为一个小脚本枚举 `app.js`、`modules/**/*.js`、`src/**/*.js`、`cloudflare-worker/src/**/*.js`，明确排除依赖、构建和历史目录；不扫描整个磁盘，不增加通用任务框架。

确认新建测试被命令入口实际执行，不能出现测试文件存在但 `test:unit` 永远不运行的情况。不要简单用 `node --test tests/*.mjs` 混入需要服务的浏览器测试。

## 9. 阶段 F：有限模块整理

### F1. 衣柜职责分离

先通过 `rg -n 'wardrobe\.js|createWardrobeController' modules tests docs/MODULE_MAP.md` 确认导入和测试位置。

将现有 `modules/wardrobe.js` 分为：

- `modules/wardrobe-domain.js`：数据规范化、筛选和纯计算，无 DOM、网络、localStorage。
- `modules/wardrobe-view.js`：现有 HTML/DOM 渲染和 view model 消费，保留 CSS 类名、data 属性、可访问名称。
- `modules/wardrobe-controller.js`：事件、当前页面状态、repository 调用、缓存和生命周期编排。
- 数据访问继续复用 `createWardrobeRepository()`，不另建同功能 repository。

迁移当前唯一入口并删除 `wardrobe.js`；不保留 re-export 兼容文件。复用项目已有的文本转义/日期工具时先核对行为，不能引入转义差异。

本阶段是结构整理，不修改衣柜布局、业务字段、筛选规则、图片流程或穿搭计数算法。发现独立业务缺陷时写入待办说明，不悄悄扩大这一阶段。

验收：纯 domain 用例覆盖当前筛选/规范化；已有浏览器回归覆盖衣柜入口、列表、编辑、收藏、穿着记录、位置管理、退出清空。只补缺失且有价值的路径。视图搬移按 UI 规则检查受影响页面，不全站重做视觉设计。

### F2. 删除确认无调用的旧存储接口

`modules/cloudflare-client.js` 末尾仍存在旧 storage API，其中 upload 返回“旧存储已停用”，remove 直接返回成功。再次搜索直接调用、别名和传递依赖；确认无调用后删除该接口及仅为其存在的参数/测试。

不要把网络离线处理、错误降级或仍服务真实数据的旧密码验证，误当作无用兼容代码全部删除。此处只清理有明确无调用证据的旧存储 API。

### F3. 本轮不全面重做装配

`app.js` 已很小。`app-runtime-controller-assembly.js` 和 route assembly 虽然偏大，但本轮只调整新增模块所需的 wiring，不以行数为由重写整个应用依赖图。

## 10. 阶段 G：前置手册与长期文档精简

### G1. 唯一职责分配

| 文档 | 保留内容 | 移除/改为引用 |
| --- | --- | --- |
| `AGENTS.md` | 项目硬性规则：简单实现、模块边界、UI 要求、fixture、main 与发布授权等 | 第 10 条重复的同步和日志细则改为文档入口/流程链接；不能削弱硬性要求 |
| `docs/README.md` | 任务阅读路由、文档职责、唯一同步判断表 | 重复解释和孤立专项背景；不增加本方案固定预读要求 |
| `docs/CHANGE_WORKFLOW.md` | 改动后的记录格式、风险对应测试、交付步骤和日志规则 | 删除同步判断表副本，引用 `docs/README.md` 的唯一版本 |
| `docs/release-checklist.md` | 当前发布流程、自动门禁、失败处理及必要手动验收 | 历次部署哈希、已完成专项、旧布局和旧通过日志移出 |
| `docs/TECHNICAL_OVERVIEW.md` | 本次实现后的架构、接口、安全、会话和发布事实 | 工程硬性规则重复段改为链接 |
| `docs/MODULE_MAP.md` | 当前模块定位和职责 | 修正 20:00 旧事实，更新本轮拆分模块 |
| `DESIGN.md` 与 design system | 当前视觉/交互事实及相关验收 | 不重复技术发布流程，不借机修改现有样式 |

启动规则仍是：读取当前 `AGENTS.md` 与 `docs/README.md`，检查工作区，搜索相关代码。普通任务不预读完整技术总览、模块表、历史、规划、发布清单。UI 任务追加当前设计入口和技能，发布任务追加发布清单。

同一任务已经读取且未变化的内容不要重复读取；发生上下文丢失时只恢复当前阶段必要信息。不要添加为了证明“读过文档”而要求填写的额外表格、打卡文件或固定长报告。

### G2. 历史归档与事实修正

- 将发布清单中的历次部署记录原样归档到 `docs/history/` 下一个明确日期文件，顶部标明它不是当前操作规范；保留可追溯的旧部署证据，不重写成新发布成功记录。
- 清单只留当前流程与历史链接；如需最新发布摘要，最多一处短摘要，不在数个文件重复复制哈希。
- 移动 `docs/mobile-comment-thread-and-jar-physics-plan.md` 前，先确认仍作为活跃计划还是历史记录；按实际状态放入 `docs/plans/` 或 `docs/history/`，更新所有指向旧路径的链接。默认任务入口不保留专项长描述。
- 明确区分 18:00 的当前心情提醒和历史 20:00 发布事实：修正当前说明，不篡改历史 CHANGELOG。
- 当前宽屏侧栏以源码最终层叠规则及有效回归测试为准。先定位 CSS/测试，再把清单中的旧“左右两侧栏”和当前“右侧上下堆叠”冲突修正为当前事实，不能改代码迎合旧文档。

### G3. 统一测试重跑规则

替换“任何修复都重新从第 1 步验收”为以下明确规则：

1. 普通修改运行受影响的测试与必要上游/下游回归。
2. 文档、拼写或无行为小整理不重跑全站浏览器矩阵，不部署。
3. 发布候选源码或产物在验收后发生变化，则旧验收不再证明新构建；必须重新生成并验收新的候选构建。
4. 发布门禁内的预览/正式顺序和必需门禁不因“精简流程”被跳过。
5. 成功日志保留摘要，失败日志保留足够定位信息；同一失败原因修复前不机械重跑全套。

用五个任务例子检查路由是否清晰：修拼写、修单模块 Bug、修改退出登录、修改发布脚本、只整理文档。若小任务仍被要求读完整总览/历史或运行所有浏览器测试，说明规则没有精简到位。

### G4. 文档同步范围

- `CHANGELOG.md` 的 `[Unreleased]` 记录权限、误删、异常响应、注销、发布顺序和重要结构变化；按结果归纳，不逐阶段复制执行日志。
- 技术总览更新通用写入契约、去除客户端 onConflict、注销/离线限制、测试运行条件和发布阶段。
- 模块表更新真实新增/删除模块；不要登记尚未实施的建议文件。
- 规则文件按 G1 去重，发布清单按实际脚本更新。
- 本方案的完成状态保留验证证据；它不接替长期系统文档。

## 11. 验证命令、发布限制与最终交付

阶段内优先运行对应测试。下列新文件名是推荐名称，若调整名称，必须同步命令和本文进度记录。

```powershell
# A/B
node --test tests/worker-table-security.mjs tests/worker-error-boundary.mjs

# C
node --test tests/worker-session.mjs tests/cloudflare-client-session.mjs

# 每个阶段相关语法与已有单元回归
pnpm run check
pnpm run test:unit

# D：完全模拟，不连接 Cloudflare
powershell -NoProfile -ExecutionPolicy Bypass -File tests/deployment-flow.ps1

# E/F 的针对性检查
pnpm run test:static
pnpm run test:structure
```

完成所有代码阶段后，进行一次最终综合验证：

```powershell
pnpm test
pnpm run test:release-local
powershell -NoProfile -ExecutionPolicy Bypass -File tests/deployment-flow.ps1
git diff --check
git status --short
```

`pnpm test` 已包含资源优化、构建、预算和浏览器测试；不要在它刚通过后无理由再跑相同 build。`test:release-local` 使用本地确定性 fixture，不需要真实测试账号。端口占用时定位自己的服务或让检查明确失败，不能关闭不属于当前任务的进程。

最终文档整理若不改行为，只补链接/一致性/diff 检查；无需再次机械重跑已通过的全部代码验证。若整理阶段又改了脚本或逻辑，则重跑受影响检查。

没有发布授权时，不运行 `deploy-cloudflare-pages.ps1`，不执行远程 D1 命令，不创建云资源。获得授权后，按 `docs/release-checklist.md` 从已提交并推送的 `main` 发布，并在 `CHANGELOG.md` 记录实际版本与门禁；本次发布结果见该日期小节。

交付报告至少包括：

- R1—R5 各自的修复结果及对应测试名。
- 共享编辑、收藏幂等、心情 canonical ID、离线注销限制是否保持约定。
- 当前修改文件、删除的旧实现、文档合并/归档位置。
- 实际运行的测试及结果；未运行的检查与原因。
- 工作区中是否还有不属于本任务的改动。
- 发布前尚需执行的步骤及真实限制，不隐瞒 Worker 与 Pages 非原子发布的事实。

## 12. 执行进度与完成标准

执行者在每个阶段完成后更新对应项，并用一两行记录实际测试结果；不要把大量 stdout 粘贴到本文。

最终本地验证完成于 2026-09-12（Asia/Tokyo）。

- [x] A：真实 SQLite fixture 可运行；异步异常转换与 CORS 回归通过。`worker-error-boundary`、`worker-cors` 及 schema fixture 契约通过。
- [x] B：insert/upsert 分离、固定冲突目标、最终 SQL 授权守卫、作用域 canonical 读取、归属不可变、严格筛选和权限矩阵通过。`worker-table-security`、`mood-diary-worker`、`cloudflare-repository-integration`、对象删除和管理员删除回归通过。
- [x] C：服务器单会话注销、本地备份清理、登录/注册备份失败一致性、恢复、失败提示和迟到请求隔离通过。`worker-session`、`cloudflare-client-session` 与带延迟 fixture 的 release smoke 通过。
- [x] D：preview-only 不部署 Worker；preview 失败不改正式后端；Wrangler 已锁定；发布模拟通过。Wrangler 固定 `4.131.0`，部署流程 PowerShell fixture 通过。
- [x] E：预缓存读取统一；压缩名/文件数量耦合移除；真实门禁仍然有效。Workbox AST、构建/资源预算和完整 `pnpm test` 通过。
- [x] F：衣柜有限拆分完成；无调用旧存储接口清理；原有功能回归通过。domain、static/structure、浏览器回归和 release smoke 通过，旧入口已删除。
- [x] G：规则唯一、历史归档、当前时间/布局事实一致、链接与 diff 检查通过。规则/清单/总览/模块表已同步，历史材料移至 `docs/history/`。
- [x] 综合：`pnpm test`、`test:release-local` 和发布模拟通过；没有新增失败测试或空实现。
- [x] 交付：更新长期文档和 CHANGELOG；已在用户授权后从干净、已推送的 `main` 完成 preview、Worker 和 production Pages 发布，线上 CORS、Axe 与确定性 release smoke 均通过。

## 13. 可直接交给执行任务的提示词

```text
请按 docs/plans/2026-09-11-project-hardening-and-workflow-plan.md 实施本项目修复和维护。

直接使用当前项目目录的 main，不新建分支或工作树。先读当前 AGENTS.md、docs/README.md 和该方案，检查 git status，保留其他任务已有修改。

依次完成 A—G：真实 SQL 测试与异常边界、写入权限和误删防护、注销与会话隔离、发布顺序及 Wrangler 锁定、测试去耦、衣柜有限拆分、文档规则精简。遵循方案中的接口契约、业务权限矩阵和验收条件。先修安全问题，再做结构整理，不跳过失败测试，不用兼容层或空实现凑完成。

源码有新变化时按符号复核并保留正确的新实现，更新方案中的过期定位。每阶段完成后更新方案的执行进度，只记录必要验证摘要。

实现与自动化验收全程使用确定性内存 fixture，不使用真实账户或业务数据；发布阶段仅按授权进行 D1 只读结构核查和统一发布脚本，不执行未授权的其他远程数据库操作，不另行委派。完成发布后，汇报实际版本、门禁和仍存在的非原子发布限制，留下可审查的工作区修改。
```

## 附录 A：调查时的最小内存复现

下面代码用于理解 R1—R3 原始问题，不是最终测试实现。它使用真实 Worker 与 schema，但简化适配器没有事务和故障隔离；正式测试应按 A1 建立 fixture。

在仓库根目录将 JavaScript 通过 PowerShell 单引号 here-string 管道传给 `node --input-type=module`，或创建本地临时脚本执行。所有账号和 token 都是合成值。修复完成后下面的“原始缺陷结果”应消失；不要为保留其旧输出修改正确代码。

```javascript
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import worker from './cloudflare-worker/src/worker.js';

const db = new DatabaseSync(':memory:');
db.exec(readFileSync('cloudflare-worker/schema.d1.sql', 'utf8'));
for (const id of ['fixture-a', 'fixture-b']) {
  db.prepare('insert into users(id,username,password_hash,password_salt) values(?,?,?,?)')
    .run(id, id, 'fixture-hash', 'fixture-salt');
}
const token = 'review-only-in-memory-token';
db.prepare('insert into sessions(id,user_id,token_hash,expires_at) values(?,?,?,?)')
  .run('fixture-session', 'fixture-a',
    createHash('sha256').update(token).digest('base64url'),
    '2099-01-01T00:00:00.000Z');
db.prepare('insert into secret_items(id,user_id,title) values(?,?,?)')
  .run('fixture-secret', 'fixture-b', 'Owner B private record');

const DB = {
  prepare(sql) {
    const wrap = (values = []) => ({
      bind(...next) { return wrap(next); },
      async run() { return db.prepare(sql).run(...values); },
      async first() { return db.prepare(sql).get(...values) || null; },
      async all() { return { results: db.prepare(sql).all(...values) }; },
    });
    return wrap();
  },
};
const env = { DB, ALLOWED_ORIGINS: 'https://life-vlog-site.pages.dev' };
const req = payload => new Request('https://fixture.invalid/api/table/secret_items', {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

try {
  const before = db.prepare('select * from secret_items where id=?').get('fixture-secret');
  const response = await worker.fetch(req({
    action: 'upsert', values: { ...before, title: 'Replaced by A' },
  }), env);
  console.log('R1', response.status,
    db.prepare('select user_id,title from secret_items where id=?').get('fixture-secret'));

  try {
    const failed = await worker.fetch(req({
      action: 'upsert', values: { ...before, id: 'fixture-invalid' },
      onConflict: 'nonexistent_column',
    }), env);
    console.log('R3 response', failed.status);
  } catch (error) {
    console.log('R3 rejected instead of Response', error.message);
  }

  db.prepare('insert into secret_items(id,user_id,title) values(?,?,?)')
    .run('fixture-own-2', 'fixture-a', 'Second own record');
  const deleted = await worker.fetch(req({
    action: 'delete', filters: [{ column: 'typo_id', op: 'eq', value: 'does-not-exist' }],
  }), env);
  console.log('R2', deleted.status,
    db.prepare('select count(*) as n from secret_items where user_id=?').get('fixture-a'));
} finally {
  db.close();
}
```

原始缺陷输出摘要：R1 为 200 且 owner 变为 `fixture-a`；R3 为 Promise reject；R2 为 200 且当前账号剩余记录数为 0。
