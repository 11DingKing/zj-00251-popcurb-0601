const express = require("express");
const router = express.Router();
const { App, Batch } = require("../models/associations");
const { Op } = require("sequelize");
const moment = require("moment");

const VALID_STATUSES = Object.values(App.STATUS);

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

    const listWithExtra = rows.map((app) => {
      const json = app.toJSON();
      return {
        ...json,
        isOverdue: app.isOverdue(),
      };
    });

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
    const { includeBatch = "false" } = req.query;
    const options = {};

    if (includeBatch === "true") {
      options.include = [
        {
          model: Batch,
          as: "batch",
        },
      ];
    }

    const app = await App.findByPk(req.params.id, options);

    if (!app) {
      return res.status(404).json({
        success: false,
        message: "应用不存在",
      });
    }

    const json = app.toJSON();

    res.json({
      success: true,
      data: {
        ...json,
        isOverdue: app.isOverdue(),
        wasRectifiedOnTime: app.wasRectifiedOnTime(),
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
      status = App.STATUS.ANNOUNCED,
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
      removedDate: status === App.STATUS.FAILED_REMOVED ? new Date() : null,
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

    if (status && app.status === App.STATUS.FAILED_REMOVED) {
      return res.status(400).json({
        success: false,
        message: "已下架的应用不能再变更状态",
      });
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
      if (status === App.STATUS.FAILED_REMOVED && !app.removedDate) {
        updateData.removedDate = new Date();
      }
    }

    await app.update(updateData);

    res.json({
      success: true,
      data: app,
      message: "应用更新成功",
    });
  } catch (err) {
    if (
      err.message === "已下架的应用不能再变更状态" ||
      err.name === "StatusTransitionError"
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

    if (app.status === App.STATUS.FAILED_REMOVED) {
      return res.status(400).json({
        success: false,
        message: "已下架的应用不能再变更状态",
      });
    }

    const updateData = { status };
    if (status === App.STATUS.FAILED_REMOVED && !app.removedDate) {
      updateData.removedDate = new Date();
    }

    await app.update(updateData);

    let message = "状态更新成功";
    if (status === App.STATUS.FAILED_REMOVED) {
      message = "复查未通过，应用已自动下架";
    }

    res.json({
      success: true,
      data: app,
      message,
    });
  } catch (err) {
    if (
      err.message === "已下架的应用不能再变更状态" ||
      err.name === "StatusTransitionError"
    ) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
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
