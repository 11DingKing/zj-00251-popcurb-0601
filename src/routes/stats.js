const express = require("express");
const router = express.Router();
const {
  App,
  Batch,
  Appeal,
  Review,
  APPEAL_STATUS,
} = require("../models/associations");
const {
  STATUS,
  isOverdue,
  wasRectifiedOnTime,
  getRectifyTime,
} = require("../rules");
const { Op, fn, col, literal } = require("sequelize");
const moment = require("moment");

function computeAppealStats(appeals) {
  const totalAppeals = appeals.length;
  const pendingAppeals = appeals.filter(
    (a) => a.appealStatus === APPEAL_STATUS.PENDING,
  );
  const adjudicatedAppeals = appeals.filter(
    (a) => a.appealStatus !== APPEAL_STATUS.PENDING,
  );
  const grantedAppeals = appeals.filter(
    (a) => a.appealStatus === APPEAL_STATUS.GRANT_RECTIFY,
  );
  const upheldAppeals = appeals.filter(
    (a) => a.appealStatus === APPEAL_STATUS.UPHOLD,
  );

  const passRate =
    adjudicatedAppeals.length > 0
      ? Math.round(
          (grantedAppeals.length / adjudicatedAppeals.length) * 10000,
        ) / 100
      : 0;

  return {
    totalAppeals,
    pendingAppeals: pendingAppeals.length,
    adjudicatedAppeals: adjudicatedAppeals.length,
    grantedAppeals: grantedAppeals.length,
    upheldAppeals: upheldAppeals.length,
    appealPassRate: passRate,
  };
}

function computeOnTimeRates(apps) {
  const passed = apps.filter((a) => a.status === STATUS.PASSED);
  const onTimePassed = passed.filter((a) => wasRectifiedOnTime(a) === true);

  const onTimeRate =
    passed.length > 0
      ? Math.round((onTimePassed.length / passed.length) * 10000) / 100
      : 0;

  const overallRate =
    apps.length > 0
      ? Math.round((onTimePassed.length / apps.length) * 10000) / 100
      : 0;

  return { onTimeRate, overallRate, passed };
}

function computeStatusBreakdown(apps) {
  return {
    announced: apps.filter((a) => a.status === STATUS.ANNOUNCED).length,
    rectifying: apps.filter((a) => a.status === STATUS.RECTIFYING).length,
    passed: apps.filter((a) => a.status === STATUS.PASSED).length,
    failedRemoved: apps.filter((a) => a.status === STATUS.FAILED_REMOVED)
      .length,
  };
}

router.get("/by-batch", async (req, res, next) => {
  try {
    const batches = await Batch.findAll({
      order: [["announceDate", "DESC"]],
      include: [
        {
          model: App,
          as: "apps",
          attributes: [],
        },
      ],
      attributes: [
        "id",
        "batchNumber",
        "theme",
        "announceDate",
        [fn("COUNT", col("apps.id")), "totalCount"],
      ],
      group: ["Batch.id"],
    });

    const result = [];
    for (const batch of batches) {
      const apps = await App.findAll({ where: { batchId: batch.id } });
      const appIds = apps.map((a) => a.id);

      const { onTimeRate, overallRate, passed } = computeOnTimeRates(apps);
      const removed = apps.filter((a) => a.status === STATUS.FAILED_REMOVED);

      const reviews =
        appIds.length > 0
          ? await Review.findAll({ where: { appId: { [Op.in]: appIds } } })
          : [];
      const appeals =
        appIds.length > 0
          ? await Appeal.findAll({ where: { appId: { [Op.in]: appIds } } })
          : [];

      const appealStats = computeAppealStats(appeals);

      result.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        theme: batch.theme,
        announceDate: batch.announceDate,
        totalCount: apps.length,
        statusBreakdown: computeStatusBreakdown(apps),
        onTimeRectificationRate: onTimeRate,
        overallOnTimeRate: overallRate,
        removedCount: removed.length,
        reviewCount: reviews.length,
        ...appealStats,
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/by-problem-type", async (req, res, next) => {
  try {
    const problemTypes = await App.findAll({
      attributes: ["problemType", [fn("COUNT", col("id")), "totalCount"]],
      group: ["problemType"],
      order: [[fn("COUNT", col("id")), "DESC"]],
    });

    const result = [];
    for (const item of problemTypes) {
      const apps = await App.findAll({
        where: { problemType: item.problemType },
      });
      const appIds = apps.map((a) => a.id);

      const { onTimeRate, overallRate, passed } = computeOnTimeRates(apps);
      const removed = apps.filter((a) => a.status === STATUS.FAILED_REMOVED);

      const reviews =
        appIds.length > 0
          ? await Review.findAll({ where: { appId: { [Op.in]: appIds } } })
          : [];
      const appeals =
        appIds.length > 0
          ? await Appeal.findAll({ where: { appId: { [Op.in]: appIds } } })
          : [];

      const appealStats = computeAppealStats(appeals);

      result.push({
        problemType: item.problemType,
        totalCount: apps.length,
        statusBreakdown: computeStatusBreakdown(apps),
        onTimeRectificationRate: onTimeRate,
        overallOnTimeRate: overallRate,
        removedCount: removed.length,
        reviewCount: reviews.length,
        ...appealStats,
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/overview", async (req, res, next) => {
  try {
    const allApps = await App.findAll();
    const allBatches = await Batch.findAll();
    const allReviews = await Review.findAll();
    const allAppeals = await Appeal.findAll();

    const { onTimeRate, overallRate } = computeOnTimeRates(allApps);
    const overdue = allApps.filter((a) => isOverdue(a));

    const batchCounts = await Batch.findAll({
      attributes: [
        [fn("strftime", "%Y-%m", col("announceDate")), "month"],
        [fn("COUNT", col("id")), "count"],
      ],
      group: [fn("strftime", "%Y-%m", col("announceDate"))],
      order: [[fn("strftime", "%Y-%m", col("announceDate")), "DESC"]],
    });

    const appealStats = computeAppealStats(allAppeals);

    res.json({
      success: true,
      data: {
        totalBatches: allBatches.length,
        totalApps: allApps.length,
        statusBreakdown: computeStatusBreakdown(allApps),
        overdueCount: overdue.length,
        onTimeRectificationRate: onTimeRate,
        overallOnTimeRate: overallRate,
        removedCount: allApps.filter((a) => a.status === STATUS.FAILED_REMOVED)
          .length,
        monthlyBatchTrend: batchCounts.map((b) => ({
          month: b.dataValues.month,
          count: b.dataValues.count,
        })),
        reviewCount: allReviews.length,
        ...appealStats,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
