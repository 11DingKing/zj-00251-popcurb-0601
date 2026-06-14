const { DataTypes } = require("sequelize");
const sequelize = require("./index");
const {
  STATUS,
  REVIEW_RESULT,
  APPEAL_STATUS,
  getStatusTransitionError,
  computeTransitionSideEffects,
  isOverdue,
  wasRectifiedOnTime,
} = require("../rules");

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
        const sideEffects = computeTransitionSideEffects(
          null,
          app.status,
          app.removedDate,
          app.rectifiedAt,
        );
        Object.assign(app, sideEffects);
      },
      beforeUpdate: (app) => {
        if (!app.changed("status")) return;

        const oldStatus = app.previous("status");
        const newStatus = app.status;

        const error = getStatusTransitionError(oldStatus, newStatus);
        if (error) {
          const err = new Error(error);
          err.name = "StatusTransitionError";
          throw err;
        }

        const sideEffects = computeTransitionSideEffects(
          oldStatus,
          newStatus,
          app.removedDate,
          app.rectifiedAt,
        );
        Object.assign(app, sideEffects);
      },
    },
  },
);

App.STATUS = STATUS;

App.prototype.isOverdue = function () {
  return isOverdue(this);
};

App.prototype.wasRectifiedOnTime = function () {
  return wasRectifiedOnTime(this);
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
