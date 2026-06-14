const express = require("express");
const router = express.Router();
const {
  App,
  Batch,
  Review,
  Appeal,
  APPEAL_STATUS,
  REVIEW_RESULT,
} = require("../models/associations");
const {
  STATUS,
  isStatusTransitionAllowed,
  getStatusTransitionError,
  computeTransitionSideEffects,
  isOverdue,
  wasRectifiedOnTime,
} = require("../rules");
const { Op } = require("sequelize");

const VALID_STATUSES = Object.values(STATUS);
const VALID_REVIEW_RESULTS = Object.values(REVIEW_RESULT);
const VALID_APPEAL_STATUSES = Object.values(APPEAL_STATUS);

router.get("/", async (req, res, next) => {
  try {
    const {
      page = 1,
      pageSize = 10,
      status,
      batchId,
      problemType,
      keyword,
      includeBatch = "false",
      includeCounts = "false",
    } = req.query;

    const offset = (page - 1) * pageSize;
    const where = {};

    if (status) where.status = status;
    if (batchId) where.batchId = batchId;
    if (problemType) where.problemType = problemType;
    if (keyword) {
      where[Op.or] = [
        { name: { [Op.like]: `%${keyword}%` } },
        { vendor: { [Op.like]: `%${keyword}%` } },
      ];
    }

    const options = {
      where,
      offset: parseInt(offset),
      limit: parseInt(pageSize),
      order: [["createdAt", "DESC"]],
    };

    if (includeBatch === "true") {
      options.include = [
        {
          model: Batch,
          as: "batch",
          attributes: ["id", "batchNumber", "theme"],
        },
      ];
    }

    const { count, rows } = await App.findAndCountAll(options);

    const listWithExtra = [];
    for (const app of rows) {
      const json = app.toJSON();
      const item = {
        ...json,
        isOverdue: isOverdue(app),
      };

      if (includeCounts === "true") {
        const reviewCount = await Review.count({ where: { appId: app.id } });
        const appealCount = await Appeal.count({ where: { appId: app.id } });
        item.reviewCount = reviewCount;
        item.appealCount = appealCount;
        item.canAppeal = reviewCount > 0 && appealCount === 0;
      }

      listWithExtra.push(item);
    }

    res.json({
      success: true,
      data: {
        list: listWithExtra,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    const { includeBatch = "false", includeHistory = "false" } = req.query;
    const options = {};

    if (includeBatch === "true") {
      options.include = [
        {
          model: Batch,
          as: "batch",
        },
      ];
    }

    if (includeHistory === "true") {
      if (!options.include) options.include = [];
      options.include.push(
        {
          model: Review,
          as: "reviews",
          order: [["reviewDate", "DESC"]],
        },
        {
          model: Appeal,
          as: "appeals",
          order: [["submitDate", "DESC"]],
        },
      );
      options.order = [];
    }

    const app = await App.findByPk(req.params.id, options);

    if (!app) {
      return res.status(404).json({
        success: false,
        message: "应用不存在",
      });
    }

    const json = app.toJSON();

    const resData = {
      ...json,
      isOverdue: isOverdue(app),
      wasRectifiedOnTime: wasRectifiedOnTime(app),
    };

    if (includeHistory === "true" && json.reviews && json.appeals) {
      const appealCount = json.appeals.length;
      const reviewCount = json.reviews.length;
      resData.reviewCount = reviewCount;
      resData.appealCount = appealCount;
      resData.canAppeal = reviewCount > 0 && appealCount === 0;
      resData.pendingAppeal = json.appeals.some(
        (a) => a.appealStatus === APPEAL_STATUS.PENDING,
      );
    }

    res.json({
      success: true,
      data: resData,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/timeline", async (req, res, next) => {
  try {
    const app = await App.findByPk(req.params.id, {
      include: [
        {
          model: Batch,
          as: "batch",
          attributes: ["id", "batchNumber", "theme", "announceDate"],
        },
        {
          model: Review,
          as: "reviews",
        },
        {
          model: Appeal,
          as: "appeals",
        },
      ],
    });

    if (!app) {
      return res.status(404).json({
        success: false,
        message: "应用不存在",
      });
    }

    const json = app.toJSON();
    const timeline = [];

    const batch = json.batch;
    if (batch) {
      timeline.push({
        type: "announcement",
        typeLabel: "通报列入批次",
        time: batch.announceDate,
        content: {
          batchNumber: batch.batchNumber,
          theme: batch.theme,
          appCreatedAt: json.createdAt,
        },
      });
    }

    timeline.push({
      type: "app_created",
      typeLabel: "应用信息登记",
      time: json.createdAt,
      content: {
        name: json.name,
        vendor: json.vendor,
        problemType: json.problemType,
        rectificationDeadline: json.rectificationDeadline,
        initialStatus: json.status,
      },
    });

    if (
      json.updatedAt &&
      new Date(json.updatedAt).getTime() !== new Date(json.createdAt).getTime()
    ) {
      timeline.push({
        type: "status_update",
        typeLabel: "状态更新",
        time: json.updatedAt,
        content: {
          currentStatus: json.status,
          removedDate: json.removedDate,
        },
      });
    }

    if (json.reviews) {
      for (const review of json.reviews) {
        timeline.push({
          type: "review",
          typeLabel: "复查",
          time: review.reviewDate,
          content: {
            reviewId: review.id,
            reviewer: review.reviewer,
            result: review.result,
            basis: review.basis,
          },
        });
      }
    }

    if (json.appeals) {
      for (const appeal of json.appeals) {
        timeline.push({
          type: "appeal_submit",
          typeLabel: "复议申请提交",
          time: appeal.submitDate,
          content: {
            appealId: appeal.id,
            submitter: appeal.submitter,
            reason: appeal.reason,
          },
        });

        if (
          appeal.appealStatus !== APPEAL_STATUS.PENDING &&
          appeal.adjudicationDate
        ) {
          timeline.push({
            type: "appeal_adjudication",
            typeLabel: "复议裁定",
            time: appeal.adjudicationDate,
            content: {
              appealId: appeal.id,
              adjudicator: appeal.adjudicator,
              appealStatus: appeal.appealStatus,
              result: appeal.result,
              adjudicationReason: appeal.adjudicationReason,
            },
          });
        }
      }
    }

    timeline.sort((a, b) => new Date(a.time) - new Date(b.time));

    const reviewCount = json.reviews ? json.reviews.length : 0;
    const appealCount = json.appeals ? json.appeals.length : 0;
    const pendingAppeal = json.appeals
      ? json.appeals.some((a) => a.appealStatus === APPEAL_STATUS.PENDING)
      : false;

    res.json({
      success: true,
      data: {
        app: {
          id: json.id,
          name: json.name,
          vendor: json.vendor,
          problemType: json.problemType,
          status: json.status,
          rectificationDeadline: json.rectificationDeadline,
          removedDate: json.removedDate,
          isOverdue: isOverdue(app),
          wasRectifiedOnTime: wasRectifiedOnTime(app),
        },
        batch,
        reviewCount,
        appealCount,
        canAppeal: reviewCount > 0 && appealCount === 0,
        pendingAppeal,
        timeline,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post("/", async (req, res, next) => {
  try {
    const {
      name,
      vendor,
      problemType,
      rectificationDeadline,
      batchId,
      status = STATUS.ANNOUNCED,
    } = req.body;

    if (
      !name ||
      !vendor ||
      !problemType ||
      !rectificationDeadline ||
      !batchId
    ) {
      return res.status(400).json({
        success: false,
        message: "应用名称、所属厂商、问题类型、整改期限、批次ID不能为空",
      });
    }

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `状态必须是以下之一：${VALID_STATUSES.join("、")}`,
      });
    }

    const batch = await Batch.findByPk(batchId);
    if (!batch) {
      return res.status(400).json({
        success: false,
        message: "批次不存在",
      });
    }

    const app = await App.create({
      name,
      vendor,
      problemType,
      rectificationDeadline: new Date(rectificationDeadline),
      batchId,
      status,
    });

    res.status(201).json({
      success: true,
      data: app,
      message: "应用添加成功",
    });
  } catch (err) {
    next(err);
  }
});

router.put("/:id", async (req, res, next) => {
  try {
    const {
      name,
      vendor,
      problemType,
      rectificationDeadline,
      batchId,
      status,
    } = req.body;

    const app = await App.findByPk(req.params.id);
    if (!app) {
      return res.status(404).json({
        success: false,
        message: "应用不存在",
      });
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `状态必须是以下之一：${VALID_STATUSES.join("、")}`,
      });
    }

    if (status && !isStatusTransitionAllowed(app.status, status)) {
      if (status !== STATUS.RECTIFYING) {
        return res.status(400).json({
          success: false,
          message: getStatusTransitionError(app.status, status),
        });
      }
      const pendingAppeal = await Appeal.findOne({
        where: {
          appId: app.id,
          appealStatus: APPEAL_STATUS.GRANT_RECTIFY,
        },
      });
      if (!pendingAppeal) {
        return res.status(400).json({
          success: false,
          message: "已下架的应用仅能通过复议裁定恢复为整改中，请先走复议流程",
        });
      }
    }

    if (batchId && batchId !== app.batchId) {
      const batch = await Batch.findByPk(batchId);
      if (!batch) {
        return res.status(400).json({
          success: false,
          message: "批次不存在",
        });
      }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (vendor) updateData.vendor = vendor;
    if (problemType) updateData.problemType = problemType;
    if (rectificationDeadline)
      updateData.rectificationDeadline = new Date(rectificationDeadline);
    if (batchId) updateData.batchId = batchId;
    if (status) {
      updateData.status = status;
      const sideEffects = computeTransitionSideEffects(
        app.status,
        status,
        app.removedDate,
        app.rectifiedAt,
      );
      Object.assign(updateData, sideEffects);
    }

    await app.update(updateData);

    res.json({
      success: true,
      data: app,
      message: "应用更新成功",
    });
  } catch (err) {
    if (
      err.message &&
      (err.message.includes("已下架") || err.name === "StatusTransitionError")
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
});

router.patch("/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `状态必须是以下之一：${VALID_STATUSES.join("、")}`,
      });
    }

    const app = await App.findByPk(req.params.id);
    if (!app) {
      return res.status(404).json({
        success: false,
        message: "应用不存在",
      });
    }

    if (!isStatusTransitionAllowed(app.status, status)) {
      if (status !== STATUS.RECTIFYING) {
        return res.status(400).json({
          success: false,
          message: getStatusTransitionError(app.status, status),
        });
      }
      const granted = await Appeal.findOne({
        where: {
          appId: app.id,
          appealStatus: APPEAL_STATUS.GRANT_RECTIFY,
        },
      });
      if (!granted) {
        return res.status(400).json({
          success: false,
          message: "已下架的应用仅能通过复议裁定恢复为整改中，请先走复议流程",
        });
      }
    }

    const updateData = { status };
    const sideEffects = computeTransitionSideEffects(
      app.status,
      status,
      app.removedDate,
      app.rectifiedAt,
    );
    Object.assign(updateData, sideEffects);

    await app.update(updateData);

    let message = "状态更新成功";
    if (status === STATUS.FAILED_REMOVED) {
      message =
        "复查未通过，应用已自动下架。建议同时创建复查记录以留存过程信息";
    }
    if (status === STATUS.RECTIFYING && app.status === STATUS.FAILED_REMOVED) {
      message = "依据复议裁定结果，应用已恢复为整改中状态";
    }

    res.json({
      success: true,
      data: app,
      message,
    });
  } catch (err) {
    if (
      err.message &&
      (err.message.includes("已下架") || err.name === "StatusTransitionError")
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
});

router.post("/:id/reviews", async (req, res, next) => {
  try {
    const app = await App.findByPk(req.params.id);
    if (!app) {
      return res.status(404).json({
        success: false,
        message: "应用不存在",
      });
    }

    const { reviewer, result, basis, reviewDate } = req.body;

    if (!reviewer || !result || !basis) {
      return res.status(400).json({
        success: false,
        message: "复查人、复查结论、复查依据不能为空",
      });
    }

    if (!VALID_REVIEW_RESULTS.includes(result)) {
      return res.status(400).json({
        success: false,
        message: `复查结论必须是以下之一：${VALID_REVIEW_RESULTS.join("、")}`,
      });
    }

    if (app.status !== STATUS.FAILED_REMOVED) {
      return res.status(400).json({
        success: false,
        message: "仅处于「复查未过下架」状态的应用才可进行复查",
      });
    }

    const review = await Review.create({
      reviewer,
      result,
      basis,
      appId: app.id,
      reviewDate: reviewDate ? new Date(reviewDate) : new Date(),
    });

    if (result === REVIEW_RESULT.RELEASE) {
      await app.update({ status: STATUS.RECTIFYING });
    }

    res.status(201).json({
      success: true,
      data: {
        review,
        appCurrentStatus: app.status,
      },
      message:
        result === REVIEW_RESULT.RELEASE
          ? "复查记录已保存，应用已恢复为整改中状态"
          : "复查记录已保存，维持下架状态",
    });
  } catch (err) {
    if (
      err.message &&
      (err.message.includes("已下架") || err.name === "StatusTransitionError")
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
});

router.post("/:id/appeals", async (req, res, next) => {
  try {
    const app = await App.findByPk(req.params.id);
    if (!app) {
      return res.status(404).json({
        success: false,
        message: "应用不存在",
      });
    }

    const { reason, submitter, submitDate } = req.body;

    if (!reason || !submitter) {
      return res.status(400).json({
        success: false,
        message: "复议申请理由、申请人不能为空",
      });
    }

    const appealCount = await Appeal.count({ where: { appId: app.id } });
    if (appealCount >= 1) {
      return res.status(400).json({
        success: false,
        message: "每款应用仅允许提出一次复议",
      });
    }

    const reviewCount = await Review.count({ where: { appId: app.id } });
    if (reviewCount === 0) {
      return res.status(400).json({
        success: false,
        message: "仅对已进行过复查（且结论为维持下架）的应用可提起复议",
      });
    }

    const lastReview = await Review.findOne({
      where: { appId: app.id },
      order: [["reviewDate", "DESC"]],
    });
    if (lastReview && lastReview.result !== REVIEW_RESULT.KEEP_REMOVED) {
      return res.status(400).json({
        success: false,
        message: "复查结论非「维持下架」的应用无需复议（已恢复整改中）",
      });
    }

    if (app.status !== STATUS.FAILED_REMOVED) {
      return res.status(400).json({
        success: false,
        message: "仅处于「复查未过下架」状态的应用可提起复议",
      });
    }

    const appeal = await Appeal.create({
      reason,
      submitter,
      submitDate: submitDate ? new Date(submitDate) : new Date(),
      appId: app.id,
      appealStatus: APPEAL_STATUS.PENDING,
    });

    res.status(201).json({
      success: true,
      data: appeal,
      message: "复议申请已提交，请等待专人裁定",
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/appeals/:appealId/adjudicate", async (req, res, next) => {
  try {
    const app = await App.findByPk(req.params.id);
    if (!app) {
      return res.status(404).json({
        success: false,
        message: "应用不存在",
      });
    }

    const appeal = await Appeal.findByPk(req.params.appealId);
    if (!appeal) {
      return res.status(404).json({
        success: false,
        message: "复议申请不存在",
      });
    }

    if (String(appeal.appId) !== String(app.id)) {
      return res.status(400).json({
        success: false,
        message: "该复议申请不属于当前应用",
      });
    }

    if (appeal.appealStatus !== APPEAL_STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        message: "该复议已完成裁定，不可重复裁定",
      });
    }

    const { adjudicator, result, adjudicationReason, adjudicationDate } =
      req.body;

    if (!adjudicator || !result || !adjudicationReason) {
      return res.status(400).json({
        success: false,
        message: "裁定人、裁定结果、裁定理由不能为空",
      });
    }

    if (!VALID_REVIEW_RESULTS.includes(result)) {
      return res.status(400).json({
        success: false,
        message: `裁定结果必须是以下之一：${VALID_REVIEW_RESULTS.join("、")}`,
      });
    }

    let appealStatus;
    if (result === REVIEW_RESULT.KEEP_REMOVED) {
      appealStatus = APPEAL_STATUS.UPHOLD;
    } else {
      appealStatus = APPEAL_STATUS.GRANT_RECTIFY;
    }

    await appeal.update({
      adjudicator,
      result,
      adjudicationReason,
      adjudicationDate: adjudicationDate
        ? new Date(adjudicationDate)
        : new Date(),
      appealStatus,
    });

    if (result === REVIEW_RESULT.RELEASE) {
      await app.update({ status: STATUS.RECTIFYING });
    }

    res.json({
      success: true,
      data: {
        appeal,
        appCurrentStatus: app.status,
      },
      message:
        result === REVIEW_RESULT.RELEASE
          ? "复议裁定完成：给予整改机会，应用已恢复整改中"
          : "复议裁定完成：维持下架状态",
    });
  } catch (err) {
    if (
      err.message &&
      (err.message.includes("已下架") || err.name === "StatusTransitionError")
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
});

router.get("/:id/reviews", async (req, res, next) => {
  try {
    const app = await App.findByPk(req.params.id);
    if (!app) {
      return res.status(404).json({
        success: false,
        message: "应用不存在",
      });
    }

    const reviews = await Review.findAll({
      where: { appId: app.id },
      order: [["reviewDate", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        list: reviews,
        total: reviews.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get("/:id/appeals", async (req, res, next) => {
  try {
    const app = await App.findByPk(req.params.id);
    if (!app) {
      return res.status(404).json({
        success: false,
        message: "应用不存在",
      });
    }

    const appeals = await Appeal.findAll({
      where: { appId: app.id },
      order: [["submitDate", "DESC"]],
    });

    res.json({
      success: true,
      data: {
        list: appeals,
        total: appeals.length,
        canAppeal: appeals.length === 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", async (req, res, next) => {
  try {
    const app = await App.findByPk(req.params.id);
    if (!app) {
      return res.status(404).json({
        success: false,
        message: "应用不存在",
      });
    }

    await app.destroy();

    res.json({
      success: true,
      message: "应用删除成功",
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
