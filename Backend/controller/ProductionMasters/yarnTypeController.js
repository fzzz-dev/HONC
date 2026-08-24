const { YarnType } = require('../../model');
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
    
    const yarnTypes = await YarnType.findAll({
      where,
      order: [['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: yarnTypes,
      count: yarnTypes.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch yarn types',
      error: error.message
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const yarnType = await YarnType.findByPk(id);
    
    if (!yarnType) {
      return res.status(404).json({
        success: false,
        message: 'Yarn type not found'
      });
    }
    
    res.json({
      success: true,
      data: yarnType
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch yarn type',
      error: error.message
    });
  }
};

exports.getActive = async (req, res) => {
  try {
    const yarnTypes = await YarnType.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'code'],
      order: [['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: yarnTypes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active yarn types',
      error: error.message
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, code, description, isActive } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name and code are required fields'
      });
    }
    
    const existingByCode = await YarnType.findOne({ where: { code } });
    if (existingByCode) {
      return res.status(409).json({
        success: false,
        message: `Yarn type with code '${code}' already exists`
      });
    }
    
    const existingByName = await YarnType.findOne({ where: { name } });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Yarn type with name '${name}' already exists`
      });
    }
    
    const newYarnType = await YarnType.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description || null,
      isActive: isActive !== undefined ? isActive : true
    });
    
    res.status(201).json({
      success: true,
      message: 'Yarn type created successfully',
      data: newYarnType
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create yarn type',
      error: error.message
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, description, isActive } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name and code are required fields'
      });
    }
    
    const yarnType = await YarnType.findByPk(id);
    if (!yarnType) {
      return res.status(404).json({
        success: false,
        message: 'Yarn type not found'
      });
    }
    
    const existingByCode = await YarnType.findOne({ 
      where: { code, id: { [Op.ne]: id } }
    });
    if (existingByCode) {
      return res.status(409).json({
        success: false,
        message: `Yarn type with code '${code}' already exists`
      });
    }
    
    const existingByName = await YarnType.findOne({ 
      where: { name, id: { [Op.ne]: id } }
    });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Yarn type with name '${name}' already exists`
      });
    }
    
    await yarnType.update({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description || null,
      isActive
    });
    
    res.json({
      success: true,
      message: 'Yarn type updated successfully',
      data: yarnType
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update yarn type',
      error: error.message
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const yarnType = await YarnType.findByPk(id);
    if (!yarnType) {
      return res.status(404).json({
        success: false,
        message: 'Yarn type not found'
      });
    }
    
    await yarnType.update({ isActive: false });
    
    res.json({
      success: true,
      message: 'Yarn type deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete yarn type',
      error: error.message
    });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const yarnType = await YarnType.findByPk(id);
    if (!yarnType) {
      return res.status(404).json({
        success: false,
        message: 'Yarn type not found'
      });
    }
    
    await yarnType.destroy();
    
    res.json({
      success: true,
      message: 'Yarn type permanently deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete yarn type',
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
    
    const yarnTypes = await YarnType.findAll({
      where,
      order: [['name', 'ASC']]
    });
    
    const exportData = yarnTypes.map(item => ({
      'Code': item.code,
      'Name': item.name,
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
      fields: ['Code', 'Name', 'Description', 'Status', 'Created Date'],
      delimiter: ','
    });
    
    const csv = parser.parse(exportData);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`yarn_types_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export yarn types',
      error: error.message
    });
  }
};