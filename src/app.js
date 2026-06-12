const express = require("express");
const cors = require("cors");
const { sequelize, App } = require("./models/associations");
const { Op } = require("sequelize");
const seedData = require("./seed");

const batchesRouter = require("./routes/batches");
const appsRouter = require("./routes/apps");
const statsRouter = require("./routes/stats");

const fixDirtyRemovedDates = async () => {
  try {
    const dirtyApps = await App.findAll({
      where: {
        status: App.STATUS.FAILED_REMOVED,
        removedDate: { [Op.is]: null },
      },
    });

    if (dirtyApps.length > 0) {
      console.log(
        `发现 ${dirtyApps.length} 条已下架但无下架日期的脏数据，正在修复...`,
      );
      for (const app of dirtyApps) {
        app.removedDate = app.updatedAt || app.createdAt || new Date();
        await app.save({ silent: true });
      }
      console.log(`脏数据修复完成，共修复 ${dirtyApps.length} 条记录`);
    } else {
      console.log("已下架日期数据校验通过，无脏数据");
    }
  } catch (err) {
    console.error("脏数据修复失败:", err.message);
  }
};

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "工信部侵害用户权益应用通报管理系统运行正常",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/batches", batchesRouter);
app.use("/api/apps", appsRouter);
app.use("/api/stats", statsRouter);

app.use((err, req, res, next) => {
  console.error("服务器错误:", err);
  res.status(500).json({
    success: false,
    message: "服务器内部错误",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "接口不存在",
  });
});

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log("数据库连接成功");

    const fs = require("fs");
    const path = require("path");
    const dbPath = path.join(__dirname, "../database.sqlite");

    if (!fs.existsSync(dbPath)) {
      console.log("数据库不存在，开始初始化数据...");
      await seedData();
      await fixDirtyRemovedDates();
    } else {
      await sequelize.sync();
      console.log("数据库同步完成");
      await fixDirtyRemovedDates();
    }

    app.listen(PORT, () => {
      console.log(`\n========================================`);
      console.log(`  工信部应用通报管理系统已启动`);
      console.log(`  服务地址: http://localhost:${PORT}`);
      console.log(`  健康检查: http://localhost:${PORT}/api/health`);
      console.log(`========================================\n`);
      console.log(`可用接口:`);
      console.log(`  GET    /api/health          - 健康检查`);
      console.log(`  GET    /api/batches         - 批次列表`);
      console.log(`  POST   /api/batches         - 创建批次`);
      console.log(`  GET    /api/batches/:id     - 批次详情`);
      console.log(`  PUT    /api/batches/:id     - 更新批次`);
      console.log(`  DELETE /api/batches/:id     - 删除批次`);
      console.log(`  GET    /api/apps            - 应用列表`);
      console.log(`  POST   /api/apps            - 添加应用`);
      console.log(`  GET    /api/apps/:id        - 应用详情`);
      console.log(`  PUT    /api/apps/:id        - 更新应用`);
      console.log(`  PATCH  /api/apps/:id/status - 状态流转`);
      console.log(`  DELETE /api/apps/:id        - 删除应用`);
      console.log(`  GET    /api/stats/overview  - 总览统计`);
      console.log(`  GET    /api/stats/by-batch  - 按批次统计`);
      console.log(`  GET    /api/stats/by-problem-type - 按问题类型统计`);
      console.log(`\n`);
    });
  } catch (err) {
    console.error("启动失败:", err);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = app;
