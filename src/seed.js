const { Batch, App, sequelize } = require('./models/associations');
const moment = require('moment');

const seedData = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('数据库同步完成');

    const batches = await Batch.bulkCreate([
      {
        batchNumber: '第50批',
        theme: '开屏弹窗信息骚扰用户问题整治',
        announceDate: moment().subtract(90, 'days').toDate()
      },
      {
        batchNumber: '第51批',
        theme: 'APP强制、频繁、过度索取权限问题整治',
        announceDate: moment().subtract(60, 'days').toDate()
      },
      {
        batchNumber: '第52批',
        theme: '欺骗误导强迫用户、应用分发平台管理不到位问题整治',
        announceDate: moment().subtract(30, 'days').toDate()
      },
      {
        batchNumber: '第53批',
        theme: '关闭按钮过小、强制跳转下载等问题整治',
        announceDate: moment().toDate()
      }
    ]);

    console.log('批次数据创建完成');

    const apps = await App.bulkCreate([
      {
        name: '爱看视频',
        vendor: '星辰科技有限公司',
        problemType: '开屏弹窗信息骚扰用户',
        rectificationDeadline: moment().subtract(80, 'days').toDate(),
        status: App.STATUS.PASSED,
        batchId: batches[0].id,
        createdAt: moment().subtract(90, 'days').toDate(),
        updatedAt: moment().subtract(85, 'days').toDate()
      },
      {
        name: '趣玩游戏中心',
        vendor: '游乐网络科技',
        problemType: '开屏弹窗信息骚扰用户',
        rectificationDeadline: moment().subtract(80, 'days').toDate(),
        status: App.STATUS.PASSED,
        batchId: batches[0].id,
        createdAt: moment().subtract(90, 'days').toDate(),
        updatedAt: moment().subtract(82, 'days').toDate()
      },
      {
        name: '天气预报',
        vendor: '精准气象科技',
        problemType: '开屏弹窗信息骚扰用户',
        rectificationDeadline: moment().subtract(80, 'days').toDate(),
        status: App.STATUS.FAILED_REMOVED,
        batchId: batches[0].id,
        createdAt: moment().subtract(90, 'days').toDate(),
        updatedAt: moment().subtract(78, 'days').toDate()
      },
      {
        name: '美颜相机',
        vendor: '美图工坊',
        problemType: '开屏弹窗信息骚扰用户',
        rectificationDeadline: moment().subtract(80, 'days').toDate(),
        status: App.STATUS.PASSED,
        batchId: batches[0].id,
        createdAt: moment().subtract(90, 'days').toDate(),
        updatedAt: moment().subtract(79, 'days').toDate()
      },
      {
        name: '智慧阅读',
        vendor: '书香文化传播',
        problemType: '开屏弹窗信息骚扰用户',
        rectificationDeadline: moment().subtract(80, 'days').toDate(),
        status: App.STATUS.FAILED_REMOVED,
        batchId: batches[0].id,
        createdAt: moment().subtract(90, 'days').toDate(),
        updatedAt: moment().subtract(77, 'days').toDate()
      },
      {
        name: '顺风外卖',
        vendor: '快捷生活服务',
        problemType: '强制索取位置权限',
        rectificationDeadline: moment().subtract(50, 'days').toDate(),
        status: App.STATUS.PASSED,
        batchId: batches[1].id,
        createdAt: moment().subtract(60, 'days').toDate(),
        updatedAt: moment().subtract(55, 'days').toDate()
      },
      {
        name: '随心购',
        vendor: '易购电子商务',
        problemType: '频繁索取通讯录权限',
        rectificationDeadline: moment().subtract(50, 'days').toDate(),
        status: App.STATUS.PASSED,
        batchId: batches[1].id,
        createdAt: moment().subtract(60, 'days').toDate(),
        updatedAt: moment().subtract(52, 'days').toDate()
      },
      {
        name: '健康计步',
        vendor: '运动健康科技',
        problemType: '过度索取相机权限',
        rectificationDeadline: moment().subtract(50, 'days').toDate(),
        status: App.STATUS.RECTIFYING,
        batchId: batches[1].id,
        createdAt: moment().subtract(60, 'days').toDate(),
        updatedAt: moment().subtract(48, 'days').toDate()
      },
      {
        name: '音乐播放器',
        vendor: '悦动音乐',
        problemType: '强制索取存储权限',
        rectificationDeadline: moment().subtract(50, 'days').toDate(),
        status: App.STATUS.FAILED_REMOVED,
        batchId: batches[1].id,
        createdAt: moment().subtract(60, 'days').toDate(),
        updatedAt: moment().subtract(45, 'days').toDate()
      },
      {
        name: '在线翻译官',
        vendor: '语言通科技',
        problemType: '频繁索取麦克风权限',
        rectificationDeadline: moment().subtract(50, 'days').toDate(),
        status: App.STATUS.PASSED,
        batchId: batches[1].id,
        createdAt: moment().subtract(60, 'days').toDate(),
        updatedAt: moment().subtract(51, 'days').toDate()
      },
      {
        name: '理财助手',
        vendor: '金融智囊',
        problemType: '过度索取短信权限',
        rectificationDeadline: moment().subtract(50, 'days').toDate(),
        status: App.STATUS.ANNOUNCED,
        batchId: batches[1].id,
        createdAt: moment().subtract(60, 'days').toDate()
      },
      {
        name: '短视频极速版',
        vendor: '快视传媒',
        problemType: '欺骗误导用户下载',
        rectificationDeadline: moment().subtract(20, 'days').toDate(),
        status: App.STATUS.PASSED,
        batchId: batches[2].id,
        createdAt: moment().subtract(30, 'days').toDate(),
        updatedAt: moment().subtract(25, 'days').toDate()
      },
      {
        name: '极速清理大师',
        vendor: '系统优化专家',
        problemType: '欺骗误导用户点击广告',
        rectificationDeadline: moment().subtract(20, 'days').toDate(),
        status: App.STATUS.RECTIFYING,
        batchId: batches[2].id,
        createdAt: moment().subtract(30, 'days').toDate(),
        updatedAt: moment().subtract(18, 'days').toDate()
      },
      {
        name: '全民答题赢奖',
        vendor: '互动娱乐平台',
        problemType: '强迫用户分享',
        rectificationDeadline: moment().subtract(20, 'days').toDate(),
        status: App.STATUS.FAILED_REMOVED,
        batchId: batches[2].id,
        createdAt: moment().subtract(30, 'days').toDate(),
        updatedAt: moment().subtract(15, 'days').toDate()
      },
      {
        name: '应用市场Pro',
        vendor: '应用分发中心',
        problemType: '应用分发平台管理不到位',
        rectificationDeadline: moment().subtract(20, 'days').toDate(),
        status: App.STATUS.PASSED,
        batchId: batches[2].id,
        createdAt: moment().subtract(30, 'days').toDate(),
        updatedAt: moment().subtract(22, 'days').toDate()
      },
      {
        name: 'WiFi万能连',
        vendor: '网络连接助手',
        problemType: '欺骗误导用户下载',
        rectificationDeadline: moment().subtract(20, 'days').toDate(),
        status: App.STATUS.ANNOUNCED,
        batchId: batches[2].id,
        createdAt: moment().subtract(30, 'days').toDate()
      },
      {
        name: '小说阅读器',
        vendor: '文轩在线',
        problemType: '关闭按钮过小',
        rectificationDeadline: moment().add(10, 'days').toDate(),
        status: App.STATUS.ANNOUNCED,
        batchId: batches[3].id,
        createdAt: moment().toDate()
      },
      {
        name: '游戏盒子',
        vendor: '游乐汇',
        problemType: '强制跳转下载',
        rectificationDeadline: moment().add(10, 'days').toDate(),
        status: App.STATUS.ANNOUNCED,
        batchId: batches[3].id,
        createdAt: moment().toDate()
      },
      {
        name: '充电加速器',
        vendor: '电池优化专家',
        problemType: '关闭按钮过小',
        rectificationDeadline: moment().add(10, 'days').toDate(),
        status: App.STATUS.RECTIFYING,
        batchId: batches[3].id,
        createdAt: moment().toDate(),
        updatedAt: moment().toDate()
      },
      {
        name: '壁纸精选',
        vendor: '美化大师',
        problemType: '强制跳转下载',
        rectificationDeadline: moment().add(10, 'days').toDate(),
        status: App.STATUS.ANNOUNCED,
        batchId: batches[3].id,
        createdAt: moment().toDate()
      },
      {
        name: '铃声大全',
        vendor: '铃声工坊',
        problemType: '关闭按钮过小',
        rectificationDeadline: moment().add(10, 'days').toDate(),
        status: App.STATUS.ANNOUNCED,
        batchId: batches[3].id,
        createdAt: moment().toDate()
      },
      {
        name: '省电模式',
        vendor: '电池管家',
        problemType: '强制跳转下载',
        rectificationDeadline: moment().add(10, 'days').toDate(),
        status: App.STATUS.ANNOUNCED,
        batchId: batches[3].id,
        createdAt: moment().toDate()
      }
    ]);

    console.log(`初始数据创建完成：${batches.length} 个批次，${apps.length} 个应用`);
    
    const removedApps = apps.filter(a => a.status === App.STATUS.FAILED_REMOVED);
    for (const app of removedApps) {
      await app.update({ status: App.STATUS.FAILED_REMOVED });
    }
    console.log('已下架应用的下架日期已自动设置');

  } catch (err) {
    console.error('数据初始化失败:', err);
    throw err;
  }
};

if (require.main === module) {
  seedData()
    .then(() => {
      console.log('数据初始化成功');
      process.exit(0);
    })
    .catch(err => {
      console.error('数据初始化失败:', err);
      process.exit(1);
    });
}

module.exports = seedData;
