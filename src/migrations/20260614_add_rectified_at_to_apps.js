const { App, sequelize } = require("../models/associations");

const migration = async () => {
  try {
    const result = await sequelize.query("PRAGMA table_info(apps)");
    const columns = Array.isArray(result) ? result[0] : result;

    const hasRectifiedAt = columns.some((col) => col.name === "rectifiedAt");

    if (!hasRectifiedAt) {
      console.log("正在为 apps 表添加 rectifiedAt 字段...");
      await sequelize.query(`
        ALTER TABLE apps ADD COLUMN rectifiedAt DATETIME
      `);
      console.log("rectifiedAt 字段添加成功");
    } else {
      console.log("rectifiedAt 字段已存在，跳过添加");
    }

    console.log("正在为已完成整改的应用回填 rectifiedAt 数据...");
    const updateResult = await sequelize.query(`
      UPDATE apps 
      SET rectifiedAt = updatedAt 
      WHERE status = '复查通过' AND rectifiedAt IS NULL
    `);

    const updatedCount = updateResult[0]?.changes || 0;
    console.log(`回填完成，共更新 ${updatedCount} 条记录`);

    process.exit(0);
  } catch (err) {
    console.error("迁移执行失败:", err);
    process.exit(1);
  }
};

if (require.main === module) {
  migration();
}

module.exports = migration;
