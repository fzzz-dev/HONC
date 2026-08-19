const { Counts } = require('../../model');
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
    
    const counts = await Counts.findAll({
      where,
      order: [['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: counts,
      count: counts.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch counts',
      error: error.message
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const count = await Counts.findByPk(id);
    
    if (!count) {
      return res.status(404).json({
        success: false,
        message: 'Count not found'
      });
    }
    
    res.json({
      success: true,
      data: count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch count',
      error: error.message
    });
  }
};

exports.getActive = async (req, res) => {
  try {
    const counts = await Counts.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'code', 'value'],
      order: [['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: counts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active counts',
      error: error.message
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, code, value, description, isActive } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name and code are required fields'
      });
    }
    
    const existingByCode = await Counts.findOne({ where: { code } });
    if (existingByCode) {
      return res.status(409).json({
        success: false,
        message: `Count with code '${code}' already exists`
      });
    }
    
    const existingByName = await Counts.findOne({ where: { name } });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Count with name '${name}' already exists`
      });
    }
    
    const newCount = await Counts.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      value: value || null,
      description: description || null,
      isActive: isActive !== undefined ? isActive : true
    });
    
    res.status(201).json({
      success: true,
      message: 'Count created successfully',
      data: newCount
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create count',
      error: error.message
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, value, description, isActive } = req.body;
    
    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Name and code are required fields'
      });
    }
    
    const count = await Counts.findByPk(id);
    if (!count) {
      return res.status(404).json({
        success: false,
        message: 'Count not found'
      });
    }
    
    const existingByCode = await Counts.findOne({ 
      where: { code, id: { [Op.ne]: id } }
    });
    if (existingByCode) {
      return res.status(409).json({
        success: false,
        message: `Count with code '${code}' already exists`
      });
    }
    
    const existingByName = await Counts.findOne({ 
      where: { name, id: { [Op.ne]: id } }
    });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Count with name '${name}' already exists`
      });
    }
    
    await count.update({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      value: value || null,
      description: description || null,
      isActive
    });
    
    res.json({
      success: true,
      message: 'Count updated successfully',
      data: count
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update count',
      error: error.message
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const count = await Counts.findByPk(id);
    if (!count) {
      return res.status(404).json({
        success: false,
        message: 'Count not found'
      });
    }
    
    await count.update({ isActive: false });
    
    res.json({
      success: true,
      message: 'Count deactivated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete count',
      error: error.message
    });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const count = await Counts.findByPk(id);
    if (!count) {
      return res.status(404).json({
        success: false,
        message: 'Count not found'
      });
    }
    
    await count.destroy();
    
    res.json({
      success: true,
      message: 'Count permanently deleted'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete count',
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
    
    const counts = await Counts.findAll({
      where,
      order: [['name', 'ASC']]
    });
    
    const exportData = counts.map(item => ({
      'Code': item.code,
      'Name': item.name,
      'Value': item.value || '',
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
      fields: ['Code', 'Name', 'Value', 'Description', 'Status', 'Created Date'],
      delimiter: ','
    });
    
    const csv = parser.parse(exportData);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`counts_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to export counts',
      error: error.message
    });
  }
};