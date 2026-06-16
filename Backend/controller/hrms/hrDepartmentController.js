// controllers/hrDepartmentController.js
const { HrDepartment, HrSubDepartment } = require('../../model');
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
    
    const departments = await HrDepartment.findAll({
      where,
      order: [['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: departments,
      count: departments.length
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
      error: error.message
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await HrDepartment.findByPk(id);
    
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }
    
    res.json({
      success: true,
      data: department
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to fetch department',
      error: error.message
    });
  }
};

exports.getActive = async (req, res) => {
  try {
    const departments = await HrDepartment.findAll({
      where: { isActive: true },
      attributes: ['id', 'name', 'code'],
      order: [['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: departments
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to fetch active departments',
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
    
    const existingByCode = await HrDepartment.findOne({ where: { code } });
    if (existingByCode) {
      return res.status(409).json({
        success: false,
        message: `Department with code '${code}' already exists`
      });
    }
    
    const existingByName = await HrDepartment.findOne({ where: { name } });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Department with name '${name}' already exists`
      });
    }
    
    const newDepartment = await HrDepartment.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description || null,
      isActive: isActive !== undefined ? isActive : true
    });
    
    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: newDepartment
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to create department',
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
    
    const department = await HrDepartment.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }
    
    const existingByCode = await HrDepartment.findOne({ 
      where: { code, id: { [Op.ne]: id } }
    });
    if (existingByCode) {
      return res.status(409).json({
        success: false,
        message: `Department with code '${code}' already exists`
      });
    }
    
    const existingByName = await HrDepartment.findOne({ 
      where: { name, id: { [Op.ne]: id } }
    });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Department with name '${name}' already exists`
      });
    }
    
    await department.update({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description || null,
      isActive
    });
    
    res.json({
      success: true,
      message: 'Department updated successfully',
      data: department
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to update department',
      error: error.message
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const department = await HrDepartment.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }
    
    await department.update({ isActive: false });
    
    res.json({
      success: true,
      message: 'Department deactivated successfully'
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to delete department',
      error: error.message
    });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const department = await HrDepartment.findByPk(id);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }
    
    const subDepartments = await HrSubDepartment.count({ where: { departmentId: id } });
    if (subDepartments > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete department with existing sub-departments'
      });
    }
    
    await department.destroy();
    
    res.json({
      success: true,
      message: 'Department permanently deleted'
    });
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete department',
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
    
    const departments = await HrDepartment.findAll({
      where,
      order: [['name', 'ASC']]
    });
    
    const exportData = departments.map(dept => ({
      'Code': dept.code,
      'Department Name': dept.name,
      'Description': dept.description || '',
      'Status': dept.isActive ? 'Active' : 'Inactive',
      'Created Date': new Date(dept.createdAt).toLocaleDateString('en-IN')
    }));
    
    if (exportData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data to export'
      });
    }
    
    const parser = new Parser({
      fields: ['Code', 'Department Name', 'Description', 'Status', 'Created Date'],
      delimiter: ','
    });
    
    const csv = parser.parse(exportData);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`hr_departments_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {

    res.status(500).json({
      success: false,
      message: 'Failed to export departments',
      error: error.message
    });
  }
};