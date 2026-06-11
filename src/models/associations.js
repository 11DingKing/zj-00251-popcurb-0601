const { DataTypes } = require('sequelize');
const sequelize = require('./index');
const moment = require('moment');

const STATUS = {
  ANNOUNCED: '已通报',
  RECTIFYING: '整改中',
  PASSED: '复查通过',
  FAILED_REMOVED: '复查未过下架'
};

const Batch = sequelize.define('Batch', {
  batchNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '通报批次号，如第52批'
  },
  theme: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '整治主题，如开屏弹窗误导、关闭按钮过小等'
  },
  announceDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '通报日期'
  }
}, {
  tableName: 'batches',
  timestamps: true
});

const App = sequelize.define('App', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '应用名称'
  },
  vendor: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '所属厂商'
  },
  problemType: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '问题类型'
  },
  rectificationDeadline: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '责令整改期限'
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: STATUS.ANNOUNCED,
    comment: '状态：已通报、整改中、复查通过、复查未过下架'
  },
  removedDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '下架日期'
  },
  batchId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'batches',
      key: 'id'
    }
  }
}, {
  tableName: 'apps',
  timestamps: true,
  hooks: {
    beforeUpdate: (app) => {
      if (app.changed('status')) {
        const oldStatus = app.previous('status');
        const newStatus = app.status;

        if (oldStatus === STATUS.FAILED_REMOVED && newStatus === STATUS.RECTIFYING) {
          throw new Error('已下架的应用不能改回整改中');
        }

        if (newStatus === STATUS.FAILED_REMOVED && oldStatus !== STATUS.FAILED_REMOVED) {
          app.removedDate = new Date();
        }

        if (newStatus !== STATUS.FAILED_REMOVED) {
          app.removedDate = null;
        }
      }
    }
  }
});

App.STATUS = STATUS;

App.prototype.isOverdue = function() {
  return moment().isAfter(moment(this.rectificationDeadline), 'day') && 
         this.status !== STATUS.PASSED && 
         this.status !== STATUS.FAILED_REMOVED;
};

App.prototype.wasRectifiedOnTime = function() {
  if (this.status !== STATUS.PASSED) return null;
  return moment(this.updatedAt).isSameOrBefore(moment(this.rectificationDeadline), 'day');
};

Batch.hasMany(App, {
  foreignKey: 'batchId',
  as: 'apps'
});

App.belongsTo(Batch, {
  foreignKey: 'batchId',
  as: 'batch'
});

module.exports = { Batch, App, sequelize };
