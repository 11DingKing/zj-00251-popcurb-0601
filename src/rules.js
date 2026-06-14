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

function isStatusTransitionAllowed(oldStatus, newStatus) {
  if (oldStatus === STATUS.FAILED_REMOVED) {
    return newStatus === STATUS.RECTIFYING;
  }
  return true;
}

function getStatusTransitionError(oldStatus, newStatus) {
  if (!isStatusTransitionAllowed(oldStatus, newStatus)) {
    return "已下架的应用仅能通过复议裁定恢复为整改中，不得直接变更为其他状态";
  }
  return null;
}

function computeTransitionSideEffects(
  oldStatus,
  newStatus,
  currentRemovedDate,
  currentRectifiedAt,
) {
  const sideEffects = {};

  if (newStatus === STATUS.FAILED_REMOVED && !currentRemovedDate) {
    sideEffects.removedDate = new Date();
  }

  if (oldStatus === STATUS.FAILED_REMOVED && newStatus === STATUS.RECTIFYING) {
    sideEffects.removedDate = null;
  }

  if (newStatus === STATUS.PASSED && !currentRectifiedAt) {
    sideEffects.rectifiedAt = new Date();
  }

  return sideEffects;
}

function getRectifyTime(app) {
  return app.rectifiedAt || app.updatedAt;
}

function isOverdue(app) {
  return (
    moment().isAfter(moment(app.rectificationDeadline), "day") &&
    app.status !== STATUS.PASSED &&
    app.status !== STATUS.FAILED_REMOVED
  );
}

function wasRectifiedOnTime(app) {
  if (app.status !== STATUS.PASSED) return null;
  const rectifyTime = getRectifyTime(app);
  return moment(rectifyTime).isSameOrBefore(
    moment(app.rectificationDeadline),
    "day",
  );
}

module.exports = {
  STATUS,
  REVIEW_RESULT,
  APPEAL_STATUS,
  isStatusTransitionAllowed,
  getStatusTransitionError,
  computeTransitionSideEffects,
  getRectifyTime,
  isOverdue,
  wasRectifiedOnTime,
};
