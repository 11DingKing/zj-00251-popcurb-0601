const { DataTypes } = require("sequelize");
const sequelize = require("./index");
const moment = require("moment");

const STATUS = {
  ANNOUNCED: "已通报",
  RECTIFYING: "整改中",
  PASSED: "复查通过",
  FAILED_REMOVED: "复查未过下架",
};

const REVIEW_RESULT = {
  KEEP_REMOVED: "维持下架",
  RELEASE: "放过（恢复整改中）",
};

const APPEAL_STATUS = {
  PENDING: "待裁定",
  UPHOLD: "裁定维持下架",
  GRANT_RECTIFY: "裁定再给整改机会",
};

const Batch = sequelize.define(
  "Batch",
  {
    batchNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: "通报批次号，如第52批",
    },
    theme: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "整治主题，如开屏弹窗误导、关闭按钮过小等",
    },
    announceDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "通报日期",
    },
  },
  {
    tableName: "batches",
    timestamps: true,
  },
);

const App = sequelize.define(
  "App",
  {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "应用名称",
    },
    vendor: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "所属厂商",
    },
    problemType: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "问题类型",
    },
    rectificationDeadline: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "责令整改期限",
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: STATUS.ANNOUNCED,
      comment: "状态：已通报、整改中、复查通过、复查未过下架",
    },
    removedDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "下架日期",
    },
    // [评判者补修·不计入轮次、不参与评判] q1r4 在 hook/方法/统计里引用了 rectifiedAt，
    // 但从未在模型里声明该字段，导致 sequelize 既不持久化也不查询它，wasRectifiedOnTime 与
    // 统计的 (rectifiedAt || updatedAt) 永远回落 updatedAt，按期判定仍被无关编辑翻转。此处补声明。
    rectifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "复查通过（整改完成）时刻，用于按期整改判定，不随无关编辑变化",
    },
    batchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "batches",
        key: "id",
      },
    },
  },
  {
    tableName: "apps",
    timestamps: true,
    hooks: {
      beforeCreate: (app) => {
        if (app.status === STATUS.FAILED_REMOVED && !app.removedDate) {
          app.removedDate = new Date();
        }
      },
      beforeUpdate: (app) => {
        if (app.changed("status")) {
          const oldStatus = app.previous("status");
          const newStatus = app.status;

          if (
            oldStatus === STATUS.FAILED_REMOVED &&
            newStatus !== STATUS.FAILED_REMOVED &&
            newStatus !== STATUS.RECTIFYING
          ) {
            const err = new Error(
              "已下架的应用仅能通过复议裁定恢复为整改中，不得直接变更为其他状态",
            );
            err.name = "StatusTransitionError";
            throw err;
          }

          if (newStatus === STATUS.FAILED_REMOVED && !app.removedDate) {
            app.removedDate = new Date();
          }

          if (
            oldStatus === STATUS.FAILED_REMOVED &&
            newStatus === STATUS.RECTIFYING
          ) {
            app.removedDate = null;
          }

          if (newStatus === STATUS.PASSED && !app.rectifiedAt) {
            app.rectifiedAt = new Date();
          }
        }
      },
    },
  },
);

App.STATUS = STATUS;

App.prototype.isOverdue = function () {
  return (
    moment().isAfter(moment(this.rectificationDeadline), "day") &&
    this.status !== STATUS.PASSED &&
    this.status !== STATUS.FAILED_REMOVED
  );
};

App.prototype.wasRectifiedOnTime = function () {
  if (this.status !== STATUS.PASSED) return null;
  const rectifyTime = this.rectifiedAt || this.updatedAt;
  return moment(rectifyTime).isSameOrBefore(
    moment(this.rectificationDeadline),
    "day",
  );
};

const Review = sequelize.define(
  "Review",
  {
    reviewer: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "复查人姓名",
    },
    result: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "复查结论：维持下架/放过（恢复整改中）",
    },
    basis: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "复查依据说明",
    },
    appId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "apps",
        key: "id",
      },
    },
    reviewDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "复查日期",
    },
  },
  {
    tableName: "reviews",
    timestamps: true,
  },
);

Review.RESULT = REVIEW_RESULT;

const Appeal = sequelize.define(
  "Appeal",
  {
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "厂商复议申请理由",
    },
    submitter: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "复议申请人（厂商联系人）",
    },
    submitDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: "复议申请提交日期",
    },
    appealStatus: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: APPEAL_STATUS.PENDING,
      comment: "复议状态：待裁定/裁定维持下架/裁定再给整改机会",
    },
    adjudicator: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "裁定人姓名",
    },
    adjudicationReason: {
      type: DataTypes.TEXT,
      comment: "裁定理由说明",
    },
    adjudicationDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "裁定日期",
    },
    result: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "裁定结果：维持下架/再给一次整改机会",
    },
    appId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "apps",
        key: "id",
      },
    },
  },
  {
    tableName: "appeals",
    timestamps: true,
  },
);

Appeal.STATUS = APPEAL_STATUS;
Appeal.RESULT = REVIEW_RESULT;

Batch.hasMany(App, {
  foreignKey: "batchId",
  as: "apps",
});

App.belongsTo(Batch, {
  foreignKey: "batchId",
  as: "batch",
});

App.hasMany(Review, {
  foreignKey: "appId",
  as: "reviews",
});

Review.belongsTo(App, {
  foreignKey: "appId",
  as: "app",
});

App.hasMany(Appeal, {
  foreignKey: "appId",
  as: "appeals",
});

Appeal.belongsTo(App, {
  foreignKey: "appId",
  as: "app",
});

module.exports = {
  Batch,
  App,
  Review,
  Appeal,
  sequelize,
  APPEAL_STATUS,
  REVIEW_RESULT,
};
