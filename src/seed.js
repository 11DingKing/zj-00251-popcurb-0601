const {
  Batch,
  App,
  Review,
  Appeal,
  sequelize,
  APPEAL_STATUS,
  REVIEW_RESULT,
} = require("./models/associations");
const moment = require("moment");

const seedData = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log("数据库同步完成");

    const batches = await Batch.bulkCreate([
      {
        batchNumber: "第50批",
        theme: "开屏弹窗信息骚扰用户问题整治",
        announceDate: moment().subtract(90, "days").toDate(),
      },
      {
        batchNumber: "第51批",
        theme: "APP强制、频繁、过度索取权限问题整治",
        announceDate: moment().subtract(60, "days").toDate(),
      },
      {
        batchNumber: "第52批",
        theme: "欺骗误导强迫用户、应用分发平台管理不到位问题整治",
        announceDate: moment().subtract(30, "days").toDate(),
      },
      {
        batchNumber: "第53批",
        theme: "关闭按钮过小、强制跳转下载等问题整治",
        announceDate: moment().toDate(),
      },
    ]);

    console.log("批次数据创建完成");

    const apps = await App.bulkCreate([
      {
        name: "爱看视频",
        vendor: "星辰科技有限公司",
        problemType: "开屏弹窗信息骚扰用户",
        rectificationDeadline: moment().subtract(80, "days").toDate(),
        status: App.STATUS.PASSED,
        batchId: batches[0].id,
        createdAt: moment().subtract(90, "days").toDate(),
        updatedAt: moment().subtract(85, "days").toDate(),
      },
      {
        name: "趣玩游戏中心",
        vendor: "游乐网络科技",
        problemType: "开屏弹窗信息骚扰用户",
        rectificationDeadline: moment().subtract(80, "days").toDate(),
        status: App.STATUS.PASSED,
        batchId: batches[0].id,
        createdAt: moment().subtract(90, "days").toDate(),
        updatedAt: moment().subtract(82, "days").toDate(),
      },
      {
        name: "天气预报",
        vendor: "精准气象科技",
        problemType: "开屏弹窗信息骚扰用户",
        rectificationDeadline: moment().subtract(80, "days").toDate(),
        status: App.STATUS.FAILED_REMOVED,
        removedDate: moment().subtract(78, "days").toDate(),
        batchId: batches[0].id,
        createdAt: moment().subtract(90, "days").toDate(),
        updatedAt: moment().subtract(78, "days").toDate(),
      },
      {
        name: "美颜相机",
        vendor: "美图工坊",
        problemType: "开屏弹窗信息骚扰用户",
        rectificationDeadline: moment().subtract(80, "days").toDate(),
        status: App.STATUS.PASSED,
        batchId: batches[0].id,
        createdAt: moment().subtract(90, "days").toDate(),
        updatedAt: moment().subtract(79, "days").toDate(),
      },
      {
        name: "智慧阅读",
        vendor: "书香文化传播",
        problemType: "开屏弹窗信息骚扰用户",
        rectificationDeadline: moment().subtract(80, "days").toDate(),
        status: App.STATUS.FAILED_REMOVED,
        removedDate: moment().subtract(77, "days").toDate(),
        batchId: batches[0].id,
        createdAt: moment().subtract(90, "days").toDate(),
        updatedAt: moment().subtract(77, "days").toDate(),
      },
      {
        name: "顺风外卖",
        vendor: "快捷生活服务",
        problemType: "强制索取位置权限",
        rectificationDeadline: moment().subtract(50, "days").toDate(),
        status: App.STATUS.PASSED,
        batchId: batches[1].id,
        createdAt: moment().subtract(60, "days").toDate(),
        updatedAt: moment().subtract(55, "days").toDate(),
      },
      {
        name: "随心购",
        vendor: "易购电子商务",
        problemType: "频繁索取通讯录权限",
        rectificationDeadline: moment().subtract(50, "days").toDate(),
        status: App.STATUS.PASSED,
        batchId: batches[1].id,
        createdAt: moment().subtract(60, "days").toDate(),
        updatedAt: moment().subtract(52, "days").toDate(),
      },
      {
        name: "健康计步",
        vendor: "运动健康科技",
        problemType: "过度索取相机权限",
        rectificationDeadline: moment().subtract(50, "days").toDate(),
        status: App.STATUS.RECTIFYING,
        batchId: batches[1].id,
        createdAt: moment().subtract(60, "days").toDate(),
        updatedAt: moment().subtract(48, "days").toDate(),
      },
      {
        name: "音乐播放器",
        vendor: "悦动音乐",
        problemType: "强制索取存储权限",
        rectificationDeadline: moment().subtract(50, "days").toDate(),
        status: App.STATUS.FAILED_REMOVED,
        removedDate: moment().subtract(45, "days").toDate(),
        batchId: batches[1].id,
        createdAt: moment().subtract(60, "days").toDate(),
        updatedAt: moment().subtract(45, "days").toDate(),
      },
      {
        name: "在线翻译官",
        vendor: "语言通科技",
        problemType: "频繁索取麦克风权限",
        rectificationDeadline: moment().subtract(50, "days").toDate(),
        status: App.STATUS.PASSED,
        batchId: batches[1].id,
        createdAt: moment().subtract(60, "days").toDate(),
        updatedAt: moment().subtract(51, "days").toDate(),
      },
      {
        name: "理财助手",
        vendor: "金融智囊",
        problemType: "过度索取短信权限",
        rectificationDeadline: moment().subtract(50, "days").toDate(),
        status: App.STATUS.ANNOUNCED,
        batchId: batches[1].id,
        createdAt: moment().subtract(60, "days").toDate(),
      },
      {
        name: "短视频极速版",
        vendor: "快视传媒",
        problemType: "欺骗误导用户下载",
        rectificationDeadline: moment().subtract(20, "days").toDate(),
        status: App.STATUS.PASSED,
        batchId: batches[2].id,
        createdAt: moment().subtract(30, "days").toDate(),
        updatedAt: moment().subtract(25, "days").toDate(),
      },
      {
        name: "极速清理大师",
        vendor: "系统优化专家",
        problemType: "欺骗误导用户点击广告",
        rectificationDeadline: moment().subtract(20, "days").toDate(),
        status: App.STATUS.RECTIFYING,
        batchId: batches[2].id,
        createdAt: moment().subtract(30, "days").toDate(),
        updatedAt: moment().subtract(18, "days").toDate(),
      },
      {
        name: "全民答题赢奖",
        vendor: "互动娱乐平台",
        problemType: "强迫用户分享",
        rectificationDeadline: moment().subtract(20, "days").toDate(),
        status: App.STATUS.FAILED_REMOVED,
        removedDate: moment().subtract(15, "days").toDate(),
        batchId: batches[2].id,
        createdAt: moment().subtract(30, "days").toDate(),
        updatedAt: moment().subtract(15, "days").toDate(),
      },
      {
        name: "应用市场Pro",
        vendor: "应用分发中心",
        problemType: "应用分发平台管理不到位",
        rectificationDeadline: moment().subtract(20, "days").toDate(),
        status: App.STATUS.PASSED,
        batchId: batches[2].id,
        createdAt: moment().subtract(30, "days").toDate(),
        updatedAt: moment().subtract(22, "days").toDate(),
      },
      {
        name: "WiFi万能连",
        vendor: "网络连接助手",
        problemType: "欺骗误导用户下载",
        rectificationDeadline: moment().subtract(20, "days").toDate(),
        status: App.STATUS.ANNOUNCED,
        batchId: batches[2].id,
        createdAt: moment().subtract(30, "days").toDate(),
      },
      {
        name: "小说阅读器",
        vendor: "文轩在线",
        problemType: "关闭按钮过小",
        rectificationDeadline: moment().add(10, "days").toDate(),
        status: App.STATUS.ANNOUNCED,
        batchId: batches[3].id,
        createdAt: moment().toDate(),
      },
      {
        name: "游戏盒子",
        vendor: "游乐汇",
        problemType: "强制跳转下载",
        rectificationDeadline: moment().add(10, "days").toDate(),
        status: App.STATUS.ANNOUNCED,
        batchId: batches[3].id,
        createdAt: moment().toDate(),
      },
      {
        name: "充电加速器",
        vendor: "电池优化专家",
        problemType: "关闭按钮过小",
        rectificationDeadline: moment().add(10, "days").toDate(),
        status: App.STATUS.RECTIFYING,
        batchId: batches[3].id,
        createdAt: moment().toDate(),
        updatedAt: moment().toDate(),
      },
      {
        name: "壁纸精选",
        vendor: "美化大师",
        problemType: "强制跳转下载",
        rectificationDeadline: moment().add(10, "days").toDate(),
        status: App.STATUS.ANNOUNCED,
        batchId: batches[3].id,
        createdAt: moment().toDate(),
      },
      {
        name: "铃声大全",
        vendor: "铃声工坊",
        problemType: "关闭按钮过小",
        rectificationDeadline: moment().add(10, "days").toDate(),
        status: App.STATUS.ANNOUNCED,
        batchId: batches[3].id,
        createdAt: moment().toDate(),
      },
      {
        name: "省电模式",
        vendor: "电池管家",
        problemType: "强制跳转下载",
        rectificationDeadline: moment().add(10, "days").toDate(),
        status: App.STATUS.ANNOUNCED,
        batchId: batches[3].id,
        createdAt: moment().toDate(),
      },
    ]);

    console.log(
      `初始数据创建完成：${batches.length} 个批次，${apps.length} 个应用`,
    );

    const weatherApp = apps.find((a) => a.name === "天气预报");
    const musicApp = apps.find((a) => a.name === "音乐播放器");
    const quizApp = apps.find((a) => a.name === "全民答题赢奖");
    const smartreadApp = apps.find((a) => a.name === "智慧阅读");

    const reviews = await Review.bulkCreate([
      {
        reviewer: "李审核",
        result: REVIEW_RESULT.KEEP_REMOVED,
        basis:
          "经复查，开屏弹窗仍存在无关闭按钮、展示时长超5秒的问题，不符合《APP收集使用个人信息最小必要评估规范》要求",
        appId: weatherApp.id,
        reviewDate: moment().subtract(76, "days").toDate(),
      },
      {
        reviewer: "王审核",
        result: REVIEW_RESULT.KEEP_REMOVED,
        basis:
          "经复查，未获用户同意仍在后台频繁读写存储权限，违反《网络安全法》第四十一条",
        appId: musicApp.id,
        reviewDate: moment().subtract(43, "days").toDate(),
      },
      {
        reviewer: "赵审核",
        result: REVIEW_RESULT.KEEP_REMOVED,
        basis:
          "经复查，依然存在诱导分享、强制用户分享给好友才能解锁题目的问题，违反《APP违法违规收集使用个人信息行为认定方法》",
        appId: quizApp.id,
        reviewDate: moment().subtract(13, "days").toDate(),
      },
    ]);

    console.log(`复查记录创建完成：${reviews.length} 条`);

    const appeals = await Appeal.bulkCreate([
      {
        reason:
          "我司已于75天前发布v2.3.1热修版本，优化了开屏弹窗逻辑，所有弹窗均增加了可点击的关闭按钮，并将默认展示时长缩短至3秒。由于热修版本未触发应用商店审核，望复核。",
        submitter: "精准气象科技-周法务",
        submitDate: moment().subtract(74, "days").toDate(),
        appealStatus: APPEAL_STATUS.GRANT_RECTIFY,
        adjudicator: "陈主任",
        adjudicationReason:
          "经核查应用商店版本及热修包，v2.3.1版本确实修复了上述问题，且整改期限内已主动修复，符合给与整改机会的条件。",
        adjudicationDate: moment().subtract(72, "days").toDate(),
        result: REVIEW_RESULT.RELEASE,
        appId: weatherApp.id,
      },
      {
        reason:
          "用户反馈的后台读写存储权限问题系因离线音乐缓存组件设计缺陷，我司已重构缓存模块，只在用户进入播放页时才会按需读取。现提交v4.0.2版本供复核。",
        submitter: "悦动音乐-吴产品",
        submitDate: moment().subtract(41, "days").toDate(),
        appealStatus: APPEAL_STATUS.UPHOLD,
        adjudicator: "孙主任",
        adjudicationReason:
          "虽然v4.0.2版本已优化，但在实际测试中发现切换网络状态时仍会出现后台扫描存储的行为，整改不够彻底，维持下架。",
        adjudicationDate: moment().subtract(39, "days").toDate(),
        result: REVIEW_RESULT.KEEP_REMOVED,
        appId: musicApp.id,
      },
    ]);

    const grantedWeatherApp = appeals.find((a) => a.appId === weatherApp.id);
    if (
      grantedWeatherApp &&
      grantedWeatherApp.appealStatus === APPEAL_STATUS.GRANT_RECTIFY
    ) {
      await weatherApp.update({ status: App.STATUS.RECTIFYING });
    }

    console.log(`复议记录创建完成：${appeals.length} 条`);
    console.log(
      `种子数据全部完成：${batches.length} 个批次，${apps.length} 个应用，${reviews.length} 条复查，${appeals.length} 条复议`,
    );
  } catch (err) {
    console.error("数据初始化失败:", err);
    throw err;
  }
};

if (require.main === module) {
  seedData()
    .then(() => {
      console.log("数据初始化成功");
      process.exit(0);
    })
    .catch((err) => {
      console.error("数据初始化失败:", err);
      process.exit(1);
    });
}

module.exports = seedData;
