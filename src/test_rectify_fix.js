const { App, Batch, sequelize } = require("./models/associations");
const moment = require("moment");

const testFix = async () => {
  try {
    console.log("=== 测试按期整改率修复 ===\n");

    await sequelize.sync({ alter: true });

    const batch = await Batch.create({
      batchNumber: "测试批次",
      theme: "测试整改率修复",
      announceDate: moment().subtract(60, "days").toDate(),
    });

    const deadline = moment().add(30, "days").toDate();

    console.log("1. 创建一个整改中应用...");
    const app = await App.create({
      name: "测试应用",
      vendor: "原厂商名",
      problemType: "测试问题",
      rectificationDeadline: deadline,
      status: App.STATUS.RECTIFYING,
      batchId: batch.id,
    });

    console.log("   应用初始状态:", app.status);
    console.log("   整改期限:", moment(deadline).format("YYYY-MM-DD"));
    console.log();

    console.log("2. 将应用状态改为复查通过（今天完成，离期限还有30天，属于按期）...");
    await app.update({ status: App.STATUS.PASSED }, {
      hooks: true,
      individualHooks: true,
    });

    await app.reload();
    console.log("   应用状态:", app.status);
    console.log("   整改完成时间 rectifiedAt:", app.rectifiedAt ? moment(app.rectifiedAt).format("YYYY-MM-DD HH:mm:ss") : "null");
    console.log("   最后更新时间 updatedAt:", moment(app.updatedAt).format("YYYY-MM-DD HH:mm:ss"));
    console.log("   是否按期:", app.wasRectifiedOnTime());
    console.log();

    const originalRectifiedAt = app.rectifiedAt;
    const originalOnTime = app.wasRectifiedOnTime();

    console.log("3. 等待1秒后修改厂商名字（模拟无关编辑动作）...");
    await new Promise(resolve => setTimeout(resolve, 1000));

    await app.update({ vendor: "修改后的厂商名" }, {
      hooks: true,
      individualHooks: true,
    });

    await app.reload();
    console.log("   修改后的厂商名:", app.vendor);
    console.log("   整改完成时间 rectifiedAt:", app.rectifiedAt ? moment(app.rectifiedAt).format("YYYY-MM-DD HH:mm:ss") : "null");
    console.log("   最后更新时间 updatedAt:", moment(app.updatedAt).format("YYYY-MM-DD HH:mm:ss"));
    console.log("   是否按期:", app.wasRectifiedOnTime());
    console.log();

    console.log("=== 测试结果 ===");
    console.log("整改完成时间是否未变:", originalRectifiedAt && app.rectifiedAt &&
      originalRectifiedAt.getTime() === app.rectifiedAt.getTime() ? "✅ 通过" : "❌ 失败");
    console.log("按期判定结果是否未变:", originalOnTime === app.wasRectifiedOnTime() ? "✅ 通过" : "❌ 失败");

    if (originalOnTime === app.wasRectifiedOnTime() && originalOnTime === true) {
      console.log("\n🎉 修复成功！修改厂商名字不会影响按期整改判定。");
    } else {
      console.log("\n❌ 修复失败，问题仍然存在。");
    }

    await app.destroy();
    await batch.destroy();

    process.exit(0);
  } catch (err) {
    console.error("测试失败:", err);
    process.exit(1);
  }
};

if (require.main === module) {
  testFix();
}

module.exports = testFix;
