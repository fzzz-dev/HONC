const { Color } = require('../../model');
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
    
    const colors = await Color.findAll({
      where,
      order: [['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: colors,
      count: colors.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch colors',
      error: error.message
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const color = await Color.findByPk(id);
    
    if (!color) {
      return res.status(404).json({
        success: false,
        message: 'Color not found'
      });
    }
    
    res.json({
      success: true,
      data: color
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch color',
      error: error.message
    });
  }
};

exports.getActive = async (req, res) => {
  try {
    const colors = await Color.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'code', 'hexCode'],
      order: [['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: colors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active colors',
      error: error.message
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, code, hexCode, description, isActive } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name and code are required fields'
      });
    }
    
    const existingByCode = await Color.findOne({ where: { code } });
    if (existingByCode) {
      return res.status(409).json({
        success: false,
        message: `Color with code '${code}' already exists`
      });
    }
    
    const existingByName = await Color.findOne({ where: { name } });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Color with name '${name}' already exists`
      });
    }
    
    const newColor = await Color.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      hexCode: hexCode || null,
      description: description || null,
      isActive: isActive !== undefined ? isActive : true
    });
    
    res.status(201).json({
      success: true,
      message: 'Color created successfully',
      data: newColor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create color',
      error: error.message
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, hexCode, description, isActive } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name and code are required fields'
      });
    }
    
    const color = await Color.findByPk(id);
    if (!color) {
      return res.status(404).json({
        success: false,
        message: 'Color not found'
      });
    }
    
    const existingByCode = await Color.findOne({ 
      where: { code, id: { [Op.ne]: id } }
    });
    if (existingByCode) {
      return res.status(409).json({
        success: false,
        message: `Color with code '${code}' already exists`
      });
    }
    
    const existingByName = await Color.findOne({ 
      where: { name, id: { [Op.ne]: id } }
    });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Color with name '${name}' already exists`
      });
    }
    
    await color.update({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      hexCode: hexCode || null,
      description: description || null,
      isActive
    });
    
    res.json({
      success: true,
      message: 'Color updated successfully',
      data: color
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update color',
      error: error.message
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const color = await Color.findByPk(id);
    if (!color) {
      return res.status(404).json({
        success: false,
        message: 'Color not found'
      });
    }
    
    await color.update({ isActive: false });
    
    res.json({
      success: true,
      message: 'Color deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete color',
      error: error.message
    });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const color = await Color.findByPk(id);
    if (!color) {
      return res.status(404).json({
        success: false,
        message: 'Color not found'
      });
    }
    
    // Check if color is being used anywhere (add your relationship checks)
    // Example: const usedCount = await SomeModel.count({ where: { colorId: id } });
    // if (usedCount > 0) { return res.status(400).json({ ... }); }
    
    await color.destroy();
    
    res.json({
      success: true,
      message: 'Color permanently deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete color',
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
    
    const colors = await Color.findAll({
      where,
      order: [['name', 'ASC']]
    });
    
    const exportData = colors.map(item => ({
      'Code': item.code,
      'Name': item.name,
      'Hex Code': item.hexCode || '',
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
      fields: ['Code', 'Name', 'Hex Code', 'Description', 'Status', 'Created Date'],
      delimiter: ','
    });
    
    const csv = parser.parse(exportData);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`colors_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export colors',
      error: error.message
    });
  }
};