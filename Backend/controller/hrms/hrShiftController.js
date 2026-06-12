// controllers/hrShiftController.js
const { HrShift } = require('../../model');
const { Parser } = require('json2csv');
const { Op } = require('sequelize');

exports.getAll = async (req, res) => {
  try {
    const { search, isActive } = req.query;
    
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }
    
    const shifts = await HrShift.findAll({
      where,
      order: [['startTime', 'ASC']]
    });
    
    res.json({
      success: true,
      data: shifts,
      count: shifts.length
    });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shifts',
      error: error.message
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const shift = await HrShift.findByPk(id);
    
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    res.json({
      success: true,
      data: shift
    });
  } catch (error) {
    console.error('Error fetching shift:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch shift',
      error: error.message
    });
  }
};

exports.getActive = async (req, res) => {
  try {
    const shifts = await HrShift.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'startTime', 'endTime'],
      order: [['startTime', 'ASC']]
    });
    
    res.json({
      success: true,
      data: shifts
    });
  } catch (error) {
    console.error('Error fetching active shifts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active shifts',
      error: error.message
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, startTime, endTime, graceMinutes, isActive } = req.body;
    
    if (!name || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Name, start time, and end time are required fields'
      });
    }
    
    const existingByName = await HrShift.findOne({ where: { name } });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Shift with name '${name}' already exists`
      });
    }
    
    const newShift = await HrShift.create({
      name: name.trim(),
      startTime,
      endTime,
      graceMinutes: graceMinutes || 0,
      isActive: isActive !== undefined ? isActive : true
    });
    
    res.status(201).json({
      success: true,
      message: 'Shift created successfully',
      data: newShift
    });
  } catch (error) {
    console.error('Error creating shift:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create shift',
      error: error.message
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startTime, endTime, graceMinutes, isActive } = req.body;
    
    if (!name || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Name, start time, and end time are required fields'
      });
    }
    
    const shift = await HrShift.findByPk(id);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    const existingByName = await HrShift.findOne({ 
      where: { name, id: { [Op.ne]: id } }
    });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Shift with name '${name}' already exists`
      });
    }
    
    await shift.update({
      name: name.trim(),
      startTime,
      endTime,
      graceMinutes: graceMinutes || 0,
      isActive
    });
    
    res.json({
      success: true,
      message: 'Shift updated successfully',
      data: shift
    });
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update shift',
      error: error.message
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const shift = await HrShift.findByPk(id);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    // HARD DELETE - permanently remove from database
    await shift.destroy();
    
    res.json({
      success: true,
      message: 'Shift permanently deleted'
    });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete shift',
      error: error.message
    });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const shift = await HrShift.findByPk(id);
    if (!shift) {
      return res.status(404).json({
        success: false,
        message: 'Shift not found'
      });
    }
    
    await shift.destroy();
    
    res.json({
      success: true,
      message: 'Shift permanently deleted'
    });
  } catch (error) {
    console.error('Error hard deleting shift:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete shift',
      error: error.message
    });
  }
};

exports.exportToCSV = async (req, res) => {
  try {
    const { search, isActive } = req.query;
    
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    if (search) {
      where.name = { [Op.like]: `%${search}%` };
    }
    
    const shifts = await HrShift.findAll({
      where,
      order: [['startTime', 'ASC']]
    });
    
    const exportData = shifts.map(shift => ({
      'Shift Name': shift.name,
      'Start Time': shift.startTime,
      'End Time': shift.endTime,
      'Grace Minutes': shift.graceMinutes,
      'Status': shift.isActive ? 'Active' : 'Inactive',
      'Created Date': new Date(shift.createdAt).toLocaleDateString('en-IN')
    }));
    
    if (exportData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data to export'
      });
    }
    
    const parser = new Parser({
      fields: ['Shift Name', 'Start Time', 'End Time', 'Grace Minutes', 'Status', 'Created Date'],
      delimiter: ','
    });
    
    const csv = parser.parse(exportData);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`hr_shifts_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting shifts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export shifts',
      error: error.message
    });
  }
};