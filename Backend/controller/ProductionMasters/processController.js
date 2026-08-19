// controllers/ProductionMasters/processController.js
const { ProductionProcess } = require('../../model');
const { Parser } = require('json2csv');
const { Op } = require('sequelize');

exports.getAll = async (req, res) => {
  try {
    const { search, isActive } = req.query;
    
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const processes = await ProductionProcess.findAll({
      where,
      order: [['name', 'ASC']]  // ← Remove 'sequence' from here
    });
    
    res.json({
      success: true,
      data: processes,
      count: processes.length
    });
  } catch (error) {
    console.error('Error in getAll:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch processes',
      error: error.message
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const process = await ProductionProcess.findByPk(id);
    
    if (!process) {
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }
    
    res.json({
      success: true,
      data: process
    });
  } catch (error) {
    console.error('Error in getById:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch process',
      error: error.message
    });
  }
};

exports.getActive = async (req, res) => {
  try {
    const processes = await ProductionProcess.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'code'],
      order: [['name', 'ASC']]  // ← Remove 'sequence' from here
    });
    
    res.json({
      success: true,
      data: processes
    });
  } catch (error) {
    console.error('Error in getActive:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active processes',
      error: error.message
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, code, sequence, description, isActive } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name and code are required fields'
      });
    }
    
    const existingByCode = await ProductionProcess.findOne({ where: { code } });
    if (existingByCode) {
      return res.status(409).json({
        success: false,
        message: `Process with code '${code}' already exists`
      });
    }
    
    const existingByName = await ProductionProcess.findOne({ where: { name } });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Process with name '${name}' already exists`
      });
    }
    
    const newProcess = await ProductionProcess.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      sequence: sequence || null,
      description: description || null,
      isActive: isActive !== undefined ? isActive : true
    });
    
    res.status(201).json({
      success: true,
      message: 'Process created successfully',
      data: newProcess
    });
  } catch (error) {
    console.error('Error in create:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create process',
      error: error.message
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, sequence, description, isActive } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name and code are required fields'
      });
    }
    
    const process = await ProductionProcess.findByPk(id);
    if (!process) {
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }
    
    const existingByCode = await ProductionProcess.findOne({ 
      where: { code, id: { [Op.ne]: id } }
    });
    if (existingByCode) {
      return res.status(409).json({
        success: false,
        message: `Process with code '${code}' already exists`
      });
    }
    
    const existingByName = await ProductionProcess.findOne({ 
      where: { name, id: { [Op.ne]: id } }
    });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Process with name '${name}' already exists`
      });
    }
    
    await process.update({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      sequence: sequence || null,
      description: description || null,
      isActive
    });
    
    res.json({
      success: true,
      message: 'Process updated successfully',
      data: process
    });
  } catch (error) {
    console.error('Error in update:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update process',
      error: error.message
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const process = await ProductionProcess.findByPk(id);
    if (!process) {
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }
    
    await process.update({ isActive: false });
    
    res.json({
      success: true,
      message: 'Process deactivated successfully'
    });
  } catch (error) {
    console.error('Error in delete:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete process',
      error: error.message
    });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const process = await ProductionProcess.findByPk(id);
    if (!process) {
      return res.status(404).json({
        success: false,
        message: 'Process not found'
      });
    }
    
    await process.destroy();
    
    res.json({
      success: true,
      message: 'Process permanently deleted'
    });
  } catch (error) {
    console.error('Error in hardDelete:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete process',
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
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const processes = await ProductionProcess.findAll({
      where,
      order: [['name', 'ASC']]  // ← Remove 'sequence' from here
    });
    
    const exportData = processes.map(item => ({
      'Code': item.code,
      'Name': item.name,
      'Sequence': item.sequence || '',
      'Description': item.description || '',
      'Status': item.isActive ? 'Active' : 'Inactive',
      'Created Date': new Date(item.createdAt).toLocaleDateString('en-IN')
    }));
    
    if (exportData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data to export'
      });
    }
    
    const parser = new Parser({
      fields: ['Code', 'Name', 'Sequence', 'Description', 'Status', 'Created Date'],
      delimiter: ','
    });
    
    const csv = parser.parse(exportData);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`processes_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error in exportToCSV:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export processes',
      error: error.message
    });
  }
};