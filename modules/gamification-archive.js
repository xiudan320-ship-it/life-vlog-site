import { parseDiaryStoredImages } from "./media-metadata.js";
import { normalizeSecretImages } from "./secret-domain.js";

function isCurrentUserItem(item, currentUserId) {
  const ownerId = item?.user_id || item?.userId || "";
  return !ownerId || ownerId === currentUserId;
}

function isDateInCurrentMonth(value, now) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function getDiaryImageCount(photo) {
  return Math.max(1, parseDiaryStoredImages(photo?.note).filter((image) => image?.image_url).length);
}

function makeBadge(category, icon, title, detail, current, target, lore = "") {
  return {
    id: `${category}-${title}`,
    category,
    icon,
    title,
    detail,
    lore,
    current,
    target,
    unlocked: current >= target,
    percent: Math.min(100, Math.round((current / Math.max(1, target)) * 100)),
  };
}

export function buildCultivationArchive({
  photos = [],
  recipes = [],
  wishes = [],
  weekendPlans = [],
  secretItems = [],
  comments = [],
  gratitudeNotes = [],
  currentUserId = "",
  streak = 0,
  favoriteCount = 0,
  now = new Date(),
} = {}) {
  const ownPhotos = photos.filter((item) => isCurrentUserItem(item, currentUserId));
  const ownRecipes = recipes.filter((item) => isCurrentUserItem(item, currentUserId));
  const ownWishes = wishes.filter((item) => isCurrentUserItem(item, currentUserId));
  const ownWeekendPlans = weekendPlans.filter((item) =>
    isCurrentUserItem(item, currentUserId)
  );
  const ownSecrets = secretItems.filter((item) => isCurrentUserItem(item, currentUserId));
  const ownComments = comments.filter((comment) => comment?.user_id === currentUserId);
  const completedWishes = ownWishes.filter((wish) => wish.is_done || wish.isDone).length;
  const secretPhotoCount = ownSecrets.reduce(
    (total, album) => total + normalizeSecretImages(album.images).length,
    0
  );
  const travelCount =
    ownPhotos.filter((photo) => ["旅行", "城市", "卢浮宫"].includes(photo.category)).length +
    ownWeekendPlans.length;
  const collectedCount = favoriteCount + secretPhotoCount;
  const photoHour = (photo) =>
    new Date(photo.created_at || photo.createdAt || 0).getHours();
  const nightDiaryCount = ownPhotos.filter((photo) => {
    const hour = photoHour(photo);
    return hour >= 0 && hour < 5;
  }).length;
  const earlyDiaryCount = ownPhotos.filter((photo) => {
    const hour = photoHour(photo);
    return hour >= 5 && hour < 8;
  }).length;
  const catDiaryCount = ownPhotos.filter((photo) =>
    /猫|呱呱|噗噗|喵/i.test(`${photo.title || ""} ${photo.note || ""}`)
  ).length;
  const longDiaryCount = ownPhotos.filter(
    (photo) => String(photo.note || "").length >= 800
  ).length;
  const nineImageCount = ownPhotos.filter((photo) => getDiaryImageCount(photo) >= 9).length;
  const multipleImageCount = ownPhotos.filter((photo) => getDiaryImageCount(photo) >= 2).length;
  const pinnedCount = ownPhotos.filter((photo) => photo.is_pinned).length;
  const featuredCount = ownPhotos.filter((photo) => photo.is_featured).length;
  const foodDiaryCount = ownPhotos.filter((photo) => photo.category === "食物").length;
  const completedWeekendCount = ownWeekendPlans.filter(
    (plan) => plan.is_done || plan.isDone
  ).length;
  const activeMonths = new Set(
    ownPhotos
      .map((photo) => String(photo.created_at || photo.taken_at || "").slice(0, 7))
      .filter(Boolean)
  ).size;

  const badges = [
    makeBadge("记录", "初", "初次落笔", "发布第一篇日记", ownPhotos.length, 1),
    makeBadge("记录", "记", "执笔人", "发布 10 篇日记", ownPhotos.length, 10),
    makeBadge("记录", "卷", "生活编年史", "发布 50 篇日记", ownPhotos.length, 50),
    makeBadge("记录", "典", "人间典藏", "发布 100 篇日记", ownPhotos.length, 100),
    makeBadge("陪伴", "恒", "恒心修士", "连续签到 7 天", streak, 7),
    makeBadge("陪伴", "月", "月轮不息", "连续签到 30 天", streak, 30),
    makeBadge("陪伴", "年", "百日同心", "连续签到 100 天", streak, 100),
    makeBadge("陪伴", "愿", "初次圆梦", "完成第一个心愿", completedWishes, 1),
    makeBadge("陪伴", "圆", "圆梦者", "完成 10 个心愿", completedWishes, 10),
    makeBadge("陪伴", "声", "有来有往", "留下 10 条评论", ownComments.length, 10),
    makeBadge("陪伴", "知", "知音常伴", "留下 50 条评论", ownComments.length, 50),
    makeBadge("料理", "味", "初尝百味", "记录第一道菜谱", ownRecipes.length, 1),
    makeBadge("料理", "膳", "百味仙", "记录 10 道菜谱", ownRecipes.length, 10),
    makeBadge("料理", "宴", "家宴宗师", "记录 30 道菜谱", ownRecipes.length, 30),
    makeBadge("探索", "游", "云游者", "留下 10 次探索记录", travelCount, 10),
    makeBadge("探索", "迹", "行遍山河", "留下 30 次探索记录", travelCount, 30),
    makeBadge("收藏", "藏", "藏珍客", "收藏 20 张影像", collectedCount, 20),
    makeBadge("收藏", "阁", "万象阁主", "收藏 100 张影像", collectedCount, 100),
    makeBadge("记录", "夜", "凌晨修仙", "在凌晨记录 3 篇日记", nightDiaryCount, 3),
    makeBadge("记录", "晨", "早起采气", "在早晨 8 点前记录 5 篇日记", earlyDiaryCount, 5),
    makeBadge("记录", "言", "千字真言", "写下 3 篇八百字长日记", longDiaryCount, 3),
    makeBadge("记录", "阵", "九图阵法", "发布 3 篇九图日记", nineImageCount, 3),
    makeBadge("陪伴", "喵", "猫德圆满", "留下 20 篇猫咪记录", catDiaryCount, 20),
    makeBadge("陪伴", "谢", "感恩有你", "写下 10 条感谢留言", gratitudeNotes.length, 10),
    makeBadge("探索", "周", "周末行动派", "完成 10 个周末计划", completedWeekendCount, 10),
    makeBadge("料理", "食", "深夜食堂", "留下 20 篇食物日记", foodDiaryCount, 20),
    makeBadge("收藏", "星", "精选策展人", "设置 7 篇精选日记", featuredCount, 7),
    makeBadge("收藏", "顶", "镇馆之宝", "置顶 5 篇日记", pinnedCount, 5),
  ];

  const extraBadgeSpecs = [
    ["记录","芽","第一颗种子","发布 3 篇日记",ownPhotos.length,3,"生活从第三次认真按下发布开始长出根。"],
    ["记录","灯","窗边小灯","发布 20 篇日记",ownPhotos.length,20,"有人持续替普通日子留灯。"],
    ["记录","潮","时间涨潮","发布 75 篇日记",ownPhotos.length,75,"回忆涨到足以淹没一整个坏心情。"],
    ["记录","山","纸上群山","发布 150 篇日记",ownPhotos.length,150,"翻页时已经能看见山脉。"],
    ["记录","墨","墨水不睡","发布 300 篇日记",ownPhotos.length,300,"这一家的编年史开始拥有自己的气候。"],
    ["记录","双","双镜头","发布 10 篇多图日记",multipleImageCount,10,"一张装不下的日子，就多留几扇窗。"],
    ["记录","册","九宫秘术","发布 10 篇九图日记",nineImageCount,10,"九张图刚好摆下一次完整出逃。"],
    ["记录","书","长信未寄","写下 10 篇八百字长日记",longDiaryCount,10,"写给未来的长信，已经攒成一摞。"],
    ["记录","曙","黎明记录员","早晨 8 点前记录 15 篇日记",earlyDiaryCount,15,"太阳还没完全醒，你先替今天签了到。"],
    ["记录","月","月光打字机","凌晨记录 15 篇日记",nightDiaryCount,15,"世界安静以后，键盘替你说话。"],
    ["陪伴","手","第一次回应","留下第一条评论",ownComments.length,1,"回忆被另一个人接住了。"],
    ["陪伴","桥","纸飞机往返","留下 25 条评论",ownComments.length,25,"你们在日记之间搭起了一座小桥。"],
    ["陪伴","铃","回声收藏家","留下 100 条评论",ownComments.length,100,"每一句回应都让旧照片重新有声音。"],
    ["陪伴","暖","七日炉火","连续签到 14 天",streak,14,"炉火连续亮了两个星期。"],
    ["陪伴","季","一季不缺席","连续签到 90 天",streak,90,"整整一季，门口每天都有脚印。"],
    ["陪伴","星","周年守夜人","连续签到 365 天",streak,365,"一年没有把这间小屋忘在身后。"],
    ["陪伴","愿","愿望开花","完成 25 个心愿",completedWishes,25,"想做的事不再只是停在句号前。"],
    ["陪伴","谢","谢谢星球","写下 30 条感谢留言",gratitudeNotes.length,30,"这颗星球由很多句谢谢维持运转。"],
    ["陪伴","家","家书往来","完成 50 次评论或感谢",ownComments.length+gratitudeNotes.length,50,"你们把这里用成了真正的家书箱。"],
    ["陪伴","喵","双猫观察站","留下 50 篇猫咪记录",catDiaryCount,50,"呱呱和噗噗拥有了专属观测档案。"],
    ["探索","鞋","鞋底有风","留下 3 次探索记录",travelCount,3,"地图上出现了第一串脚印。"],
    ["探索","车","周末逃跑计划","完成 3 个周末计划",completedWeekendCount,3,"周末没有被沙发全部没收。"],
    ["探索","门","出门即副本","完成 20 个周末计划",completedWeekendCount,20,"推开门，普通街道也能刷新副本。"],
    ["探索","票","车票夹","留下 50 次探索记录",travelCount,50,"去过的地方开始挤满一只车票夹。"],
    ["探索","馆","卢浮宫常客","留下 5 篇卢浮宫分类日记",ownPhotos.filter((p)=>p.category==="卢浮宫").length,5,"自己的珍藏也值得一间卢浮宫。"],
    ["探索","城","城市拾荒者","留下 20 篇城市日记",ownPhotos.filter((p)=>p.category==="城市").length,20,"你捡回了城市遗漏的小光点。"],
    ["探索","路","路线收藏家","留下 100 次探索记录",travelCount,100,"不是迷路，只是在扩充私人地图。"],
    ["探索","周","周末满勤","完成 30 个周末计划",completedWeekendCount,30,"日历里的周末很少再是空白。"],
    ["探索","岛","生活群岛","记录 8 个不同月份",activeMonths,8,"每个月份都是一座气候不同的小岛。"],
    ["探索","年","四季巡游","记录满 12 个不同月份",activeMonths,12,"春夏秋冬都留下了通关印章。"],
    ["料理","锅","锅里有光","记录 3 道菜谱",ownRecipes.length,3,"厨房第一次像一间会发光的实验室。"],
    ["料理","勺","一勺成名","记录 5 道菜谱",ownRecipes.length,5,"这把勺子已经有了代表作。"],
    ["料理","桌","两人食堂","记录 20 道菜谱",ownRecipes.length,20,"菜单不大，但每一道都有人等。"],
    ["料理","册","家庭味觉志","记录 50 道菜谱",ownRecipes.length,50,"味道也拥有了可以翻阅的家谱。"],
    ["料理","火","灶台修仙","留下 5 篇食物日记",foodDiaryCount,5,"灵气有时闻起来就是锅气。"],
    ["料理","碗","碗底见月","留下 50 篇食物日记",foodDiaryCount,50,"每只空碗都证明这一顿很成功。"],
    ["料理","宴","家宴开席","记录 80 道菜谱",ownRecipes.length,80,"已经可以开一桌跨季节的家宴。"],
    ["料理","签","今晚不纠结","累计记录 10 道菜谱或食物日记",ownRecipes.length+foodDiaryCount,10,"今天吃什么终于不再是一道哲学题。"],
    ["料理","香","香气档案","累计记录 40 道菜谱或食物日记",ownRecipes.length+foodDiaryCount,40,"闻不到的香气也被好好存档。"],
    ["料理","神","胃袋导航员","累计记录 100 道菜谱或食物日记",ownRecipes.length+foodDiaryCount,100,"闭眼转盘，也总能转到家的方向。"],
    ["收藏","袋","口袋珍藏","收藏 5 张影像",collectedCount,5,"口袋里已经装了几块舍不得丢的小石头。"],
    ["收藏","柜","秘密抽屉","秘藏保存 20 张图片",secretPhotoCount,20,"抽屉拉开时，里面是一间小展厅。"],
    ["收藏","展","周末策展人","秘藏保存 50 张图片",secretPhotoCount,50,"你为喜欢的东西安排了灯光和顺序。"],
    ["收藏","星","星标巡逻员","收藏 25 篇日记",favoriteCount,25,"值得重看的日子都被钉上了星星。"],
    ["收藏","库","私人博物馆","秘藏保存 200 张图片",secretPhotoCount,200,"藏品多到足以拥有自己的闭馆日。"],
    ["收藏","冠","首席策展人","设置 20 篇精选日记",featuredCount,20,"精选不是最好，是最舍不得忘。"],
    ["收藏","锚","时间锚点","置顶 10 篇日记",pinnedCount,10,"十个锚点让时间流不再漂走。"],
    ["收藏","页","收藏夹发烫","累计收藏 300 张影像",collectedCount,300,"收藏夹已经热得像刚打印完的书。"],
    ["收藏","门","里世界住民","创建 5 个秘藏相册",ownSecrets.length,5,"你为不同的秘密各造了一扇门。"],
    ["收藏","宇","私人宇宙","累计收藏 500 张影像",collectedCount,500,"这里已经不是相册，而是一套私人星系。"],
  ];
  badges.push(...extraBadgeSpecs.map((spec) => makeBadge(...spec)));

  const roots = [
    { key: "记录", score: ownPhotos.length * 3 + ownComments.length },
    {
      key: "料理",
      score:
        ownRecipes.length * 4 +
        ownPhotos.filter((photo) => photo.category === "食物").length * 2,
    },
    { key: "探索", score: travelCount * 3 },
    { key: "收藏", score: favoriteCount * 2 + secretPhotoCount },
    {
      key: "陪伴",
      score:
        completedWishes * 2 + ownComments.length * 2 + gratitudeNotes.length,
    },
  ];
  const rootTotal = Math.max(1, roots.reduce((sum, root) => sum + root.score, 0));
  const primaryRoot = [...roots].sort((a, b) => b.score - a.score)[0];
  const monthDate = (item, keys) =>
    keys.map((key) => item?.[key]).find(Boolean);

  return {
    badges,
    roots: roots.map((root) => ({
      ...root,
      percent: Math.round((root.score / rootTotal) * 100),
    })),
    primaryRoot: primaryRoot?.score ? primaryRoot.key : "尚未显现",
    month: {
      diaries: ownPhotos.filter((item) =>
        isDateInCurrentMonth(monthDate(item, ["created_at", "createdAt"]), now)
      ).length,
      comments: ownComments.filter((item) =>
        isDateInCurrentMonth(monthDate(item, ["created_at", "createdAt"]), now)
      ).length,
      wishes: ownWishes.filter(
        (item) =>
          (item.is_done || item.isDone) &&
          isDateInCurrentMonth(
            monthDate(item, ["completed_at", "completedAt", "updated_at", "updatedAt"]),
            now
          )
      ).length,
      recipes: ownRecipes.filter((item) =>
        isDateInCurrentMonth(monthDate(item, ["created_at", "createdAt"]), now)
      ).length,
      secrets: ownSecrets.reduce(
        (total, album) =>
          total +
          normalizeSecretImages(album.images).filter((image) =>
            isDateInCurrentMonth(
              monthDate(image, ["created_at", "createdAt", "uploadedAt"]),
              now
            )
          ).length,
        0
      ),
    },
  };
}
