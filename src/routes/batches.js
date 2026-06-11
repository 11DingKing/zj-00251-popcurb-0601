const express = require('express');
const router = express.Router();
const { Batch, App } = require('../models/associations');
const moment = require('moment');

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, pageSize = 10, includeApps = 'false' } = req.query;
    const offset = (page - 1) * pageSize;
    
    const options = {
      offset: parseInt(offset),
      limit: parseInt(pageSize),
      order: [['announceDate', 'DESC']]
    };
    
    if (includeApps === 'true') {
      options.include = [{
        model: App,
        as: 'apps',
        attributes: ['id', 'name', 'vendor', 'problemType', 'status', 'rectificationDeadline']
      }];
    }
    
    const { count, rows } = await Batch.findAndCountAll(options);
    
    res.json({
      success: true,
      data: {
        list: rows,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { includeApps = 'false' } = req.query;
    const options = {};
    
    if (includeApps === 'true') {
      options.include = [{
        model: App,
        as: 'apps'
      }];
    }
    
    const batch = await Batch.findByPk(req.params.id, options);
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: '批次不存在'
      });
    }
    
    res.json({
      success: true,
      data: batch
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { batchNumber, theme, announceDate } = req.body;
    
    if (!batchNumber || !theme) {
      return res.status(400).json({
        success: false,
        message: '批次号和整治主题不能为空'
      });
    }
    
    const existing = await Batch.findOne({ where: { batchNumber } });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: '批次号已存在'
      });
    }
    
    const batch = await Batch.create({
      batchNumber,
      theme,
      announceDate: announceDate ? new Date(announceDate) : new Date()
    });
    
    res.status(201).json({
      success: true,
      data: batch,
      message: '批次创建成功'
    });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { batchNumber, theme, announceDate } = req.body;
    
    const batch = await Batch.findByPk(req.params.id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: '批次不存在'
      });
    }
    
    if (batchNumber && batchNumber !== batch.batchNumber) {
      const existing = await Batch.findOne({ where: { batchNumber } });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: '批次号已存在'
        });
      }
    }
    
    await batch.update({
      batchNumber: batchNumber || batch.batchNumber,
      theme: theme || batch.theme,
      announceDate: announceDate ? new Date(announceDate) : batch.announceDate
    });
    
    res.json({
      success: true,
      data: batch,
      message: '批次更新成功'
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const batch = await Batch.findByPk(req.params.id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: '批次不存在'
      });
    }
    
    const appCount = await App.count({ where: { batchId: batch.id } });
    if (appCount > 0) {
      return res.status(400).json({
        success: false,
        message: '该批次下还有应用，无法删除'
      });
    }
    
    await batch.destroy();
    
    res.json({
      success: true,
      message: '批次删除成功'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
