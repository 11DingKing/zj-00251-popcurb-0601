const express = require("express");
const router = express.Router();
const {
  App,
  Batch,
  Appeal,
  Review,
  APPEAL_STATUS,
  REVIEW_RESULT,
} = require("../models/associations");
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

      const total = apps.length;
      const passed = apps.filter((a) => a.status === App.STATUS.PASSED);
      const onTimePassed = passed.filter((a) =>
        moment(a.updatedAt).isSameOrBefore(
          moment(a.rectificationDeadline),
          "day",
        ),
      );
      const removed = apps.filter(
        (a) => a.status === App.STATUS.FAILED_REMOVED,
      );
      const rectifying = apps.filter((a) => a.status === App.STATUS.RECTIFYING);
      const announced = apps.filter((a) => a.status === App.STATUS.ANNOUNCED);

      const reviews =
        appIds.length > 0
          ? await Review.findAll({ where: { appId: { [Op.in]: appIds } } })
          : [];
      const appeals =
        appIds.length > 0
          ? await Appeal.findAll({ where: { appId: { [Op.in]: appIds } } })
          : [];

      const onTimeRate =
        passed.length > 0
          ? Math.round((onTimePassed.length / passed.length) * 10000) / 100
          : 0;

      const overallRate =
        total > 0 ? Math.round((onTimePassed.length / total) * 10000) / 100 : 0;

      const appealStats = computeAppealStats(appeals);

      result.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        theme: batch.theme,
        announceDate: batch.announceDate,
        totalCount: total,
        statusBreakdown: {
          announced: announced.length,
          rectifying: rectifying.length,
          passed: passed.length,
          failedRemoved: removed.length,
        },
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

      const total = apps.length;
      const passed = apps.filter((a) => a.status === App.STATUS.PASSED);
      const onTimePassed = passed.filter((a) =>
        moment(a.updatedAt).isSameOrBefore(
          moment(a.rectificationDeadline),
          "day",
        ),
      );
      const removed = apps.filter(
        (a) => a.status === App.STATUS.FAILED_REMOVED,
      );

      const reviews =
        appIds.length > 0
          ? await Review.findAll({ where: { appId: { [Op.in]: appIds } } })
          : [];
      const appeals =
        appIds.length > 0
          ? await Appeal.findAll({ where: { appId: { [Op.in]: appIds } } })
          : [];

      const onTimeRate =
        passed.length > 0
          ? Math.round((onTimePassed.length / passed.length) * 10000) / 100
          : 0;

      const overallRate =
        total > 0 ? Math.round((onTimePassed.length / total) * 10000) / 100 : 0;

      const appealStats = computeAppealStats(appeals);

      result.push({
        problemType: item.problemType,
        totalCount: total,
        statusBreakdown: {
          announced: apps.filter((a) => a.status === App.STATUS.ANNOUNCED)
            .length,
          rectifying: apps.filter((a) => a.status === App.STATUS.RECTIFYING)
            .length,
          passed: passed.length,
          failedRemoved: removed.length,
        },
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

    const total = allApps.length;
    const passed = allApps.filter((a) => a.status === App.STATUS.PASSED);
    const onTimePassed = passed.filter((a) =>
      moment(a.updatedAt).isSameOrBefore(
        moment(a.rectificationDeadline),
        "day",
      ),
    );
    const removed = allApps.filter(
      (a) => a.status === App.STATUS.FAILED_REMOVED,
    );
    const rectifying = allApps.filter(
      (a) => a.status === App.STATUS.RECTIFYING,
    );
    const announced = allApps.filter((a) => a.status === App.STATUS.ANNOUNCED);
    const overdue = allApps.filter(
      (a) =>
        moment().isAfter(moment(a.rectificationDeadline), "day") &&
        a.status !== App.STATUS.PASSED &&
        a.status !== App.STATUS.FAILED_REMOVED,
    );

    const onTimeRate =
      passed.length > 0
        ? Math.round((onTimePassed.length / passed.length) * 10000) / 100
        : 0;

    const overallRate =
      total > 0 ? Math.round((onTimePassed.length / total) * 10000) / 100 : 0;

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
        totalApps: total,
        statusBreakdown: {
          announced: announced.length,
          rectifying: rectifying.length,
          passed: passed.length,
          failedRemoved: removed.length,
        },
        overdueCount: overdue.length,
        onTimeRectificationRate: onTimeRate,
        overallOnTimeRate: overallRate,
        removedCount: removed.length,
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
