const { Mill } = require('../../model');
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
    
    const mills = await Mill.findAll({
      where,
      order: [['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: mills,
      count: mills.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mills',
      error: error.message
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const mill = await Mill.findByPk(id);
    
    if (!mill) {
      return res.status(404).json({
        success: false,
        message: 'Mill not found'
      });
    }
    
    res.json({
      success: true,
      data: mill
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mill',
      error: error.message
    });
  }
};

exports.getActive = async (req, res) => {
  try {
    const mills = await Mill.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'code', 'location'],
      order: [['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: mills
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active mills',
      error: error.message
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, code, location, contact, description, isActive } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name and code are required fields'
      });
    }
    
    const existingByCode = await Mill.findOne({ where: { code } });
    if (existingByCode) {
      return res.status(409).json({
        success: false,
        message: `Mill with code '${code}' already exists`
      });
    }
    
    const existingByName = await Mill.findOne({ where: { name } });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Mill with name '${name}' already exists`
      });
    }
    
    const newMill = await Mill.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      location: location || null,
      contact: contact || null,
      description: description || null,
      isActive: isActive !== undefined ? isActive : true
    });
    
    res.status(201).json({
      success: true,
      message: 'Mill created successfully',
      data: newMill
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create mill',
      error: error.message
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, location, contact, description, isActive } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name and code are required fields'
      });
    }
    
    const mill = await Mill.findByPk(id);
    if (!mill) {
      return res.status(404).json({
        success: false,
        message: 'Mill not found'
      });
    }
    
    const existingByCode = await Mill.findOne({ 
      where: { code, id: { [Op.ne]: id } }
    });
    if (existingByCode) {
      return res.status(409).json({
        success: false,
        message: `Mill with code '${code}' already exists`
      });
    }
    
    const existingByName = await Mill.findOne({ 
      where: { name, id: { [Op.ne]: id } }
    });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Mill with name '${name}' already exists`
      });
    }
    
    await mill.update({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      location: location || null,
      contact: contact || null,
      description: description || null,
      isActive
    });
    
    res.json({
      success: true,
      message: 'Mill updated successfully',
      data: mill
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update mill',
      error: error.message
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const mill = await Mill.findByPk(id);
    if (!mill) {
      return res.status(404).json({
        success: false,
        message: 'Mill not found'
      });
    }
    
    await mill.update({ isActive: false });
    
    res.json({
      success: true,
      message: 'Mill deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete mill',
      error: error.message
    });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const mill = await Mill.findByPk(id);
    if (!mill) {
      return res.status(404).json({
        success: false,
        message: 'Mill not found'
      });
    }
    
    await mill.destroy();
    
    res.json({
      success: true,
      message: 'Mill permanently deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete mill',
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
    
    const mills = await Mill.findAll({
      where,
      order: [['name', 'ASC']]
    });
    
    const exportData = mills.map(item => ({
      'Code': item.code,
      'Name': item.name,
      'Location': item.location || '',
      'Contact': item.contact || '',
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
      fields: ['Code', 'Name', 'Location', 'Contact', 'Description', 'Status', 'Created Date'],
      delimiter: ','
    });
    
    const csv = parser.parse(exportData);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`mills_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export mills',
      error: error.message
    });
  }
};