// controllers/hrSubDepartmentController.js
const { HrSubDepartment, HrDepartment } = require('../../model');
const { Parser } = require('json2csv');
const { Op } = require('sequelize');

exports.getAll = async (req, res) => {
  try {
    const { search, departmentId, isActive } = req.query;
    
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (departmentId) where.departmentId = departmentId;
    
    const include = [{
      model: HrDepartment,
      as: 'department',
      attributes: ['id', 'name', 'code']
    }];
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
        { '$department.name$': { [Op.like]: `%${search}%` } }
      ];
    }
    
    const subDepartments = await HrSubDepartment.findAll({
      where,
      include,
      order: [[{ model: HrDepartment, as: 'department' }, 'name', 'ASC'], ['name', 'ASC']]
    });
    
    const formattedData = subDepartments.map(sd => ({
      id: sd.id,
      name: sd.name,
      code: sd.code,
      description: sd.description,
      isActive: sd.isActive,
      createdAt: sd.createdAt,
      updatedAt: sd.updatedAt,
      departmentId: sd.departmentId,
      departmentName: sd.department?.name,
      departmentCode: sd.department?.code
    }));
    
    res.json({
      success: true,
      data: formattedData,
      count: formattedData.length
    });
  } catch (error) {
    console.error('Error fetching sub-departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sub-departments',
      error: error.message
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const subDepartment = await HrSubDepartment.findByPk(id, {
      include: [{
        model: HrDepartment,
        as: 'department',
        attributes: ['id', 'name', 'code']
      }]
    });
    
    if (!subDepartment) {
      return res.status(404).json({
        success: false,
        message: 'Sub-department not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: subDepartment.id,
        name: subDepartment.name,
        code: subDepartment.code,
        description: subDepartment.description,
        isActive: subDepartment.isActive,
        createdAt: subDepartment.createdAt,
        updatedAt: subDepartment.updatedAt,
        departmentId: subDepartment.departmentId,
        departmentName: subDepartment.department?.name,
        departmentCode: subDepartment.department?.code
      }
    });
  } catch (error) {
    console.error('Error fetching sub-department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sub-department',
      error: error.message
    });
  }
};

exports.getByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { onlyActive = 'true' } = req.query;
    
    const where = { departmentId };
    if (onlyActive === 'true') where.isActive = true;
    
    const subDepartments = await HrSubDepartment.findAll({
      where,
      attributes: ['id', 'name', 'code', 'isActive'],
      order: [['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: subDepartments
    });
  } catch (error) {
    console.error('Error fetching sub-departments by department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sub-departments',
      error: error.message
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { departmentId, name, code, description, isActive } = req.body;
    
    if (!departmentId || !name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Department, name, and code are required fields'
      });
    }
    
    const department = await HrDepartment.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Parent department not found'
      });
    }
    
    const existingByCode = await HrSubDepartment.findOne({ where: { code } });
    if (existingByCode) {
      return res.status(409).json({
        success: false,
        message: `Sub-department with code '${code}' already exists`
      });
    }
    
    const existingByName = await HrSubDepartment.findOne({ 
      where: { name, departmentId }
    });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Sub-department with name '${name}' already exists in this department`
      });
    }
    
    const newSubDepartment = await HrSubDepartment.create({
      departmentId: parseInt(departmentId),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description || null,
      isActive: isActive !== undefined ? isActive : true
    });
    
    res.status(201).json({
      success: true,
      message: 'Sub-department created successfully',
      data: newSubDepartment
    });
  } catch (error) {
    console.error('Error creating sub-department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create sub-department',
      error: error.message
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { departmentId, name, code, description, isActive } = req.body;
    
    if (!departmentId || !name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Department, name, and code are required fields'
      });
    }
    
    const subDepartment = await HrSubDepartment.findByPk(id);
    if (!subDepartment) {
      return res.status(404).json({
        success: false,
        message: 'Sub-department not found'
      });
    }
    
    const department = await HrDepartment.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Parent department not found'
      });
    }
    
    const existingByCode = await HrSubDepartment.findOne({ 
      where: { code, id: { [Op.ne]: id } }
    });
    if (existingByCode) {
      return res.status(409).json({
        success: false,
        message: `Sub-department with code '${code}' already exists`
      });
    }
    
    const existingByName = await HrSubDepartment.findOne({ 
      where: { name, departmentId, id: { [Op.ne]: id } }
    });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Sub-department with name '${name}' already exists in this department`
      });
    }
    
    await subDepartment.update({
      departmentId: parseInt(departmentId),
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description || null,
      isActive
    });
    
    res.json({
      success: true,
      message: 'Sub-department updated successfully',
      data: subDepartment
    });
  } catch (error) {
    console.error('Error updating sub-department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update sub-department',
      error: error.message
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const subDepartment = await HrSubDepartment.findByPk(id);
    if (!subDepartment) {
      return res.status(404).json({
        success: false,
        message: 'Sub-department not found'
      });
    }
    
    // Check if has designations
    const designations = await HrDesignation.count({ where: { subDepartmentId: id } });
    if (designations > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete sub-department with existing designations. Delete designations first.'
      });
    }
    
    // HARD DELETE - permanently remove from database
    await subDepartment.destroy();
    
    res.json({
      success: true,
      message: 'Sub-department permanently deleted'
    });
  } catch (error) {
    console.error('Error deleting sub-department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete sub-department',
      error: error.message
    });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const subDepartment = await HrSubDepartment.findByPk(id);
    if (!subDepartment) {
      return res.status(404).json({
        success: false,
        message: 'Sub-department not found'
      });
    }
    
    await subDepartment.destroy();
    
    res.json({
      success: true,
      message: 'Sub-department permanently deleted'
    });
  } catch (error) {
    console.error('Error hard deleting sub-department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete sub-department',
      error: error.message
    });
  }
};

exports.exportToCSV = async (req, res) => {
  try {
    const { search, departmentId, isActive } = req.query;
    
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (departmentId) where.departmentId = departmentId;
    
    const include = [{
      model: HrDepartment,
      as: 'department',
      attributes: ['name']
    }];
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } },
        { '$department.name$': { [Op.like]: `%${search}%` } }
      ];
    }
    
    const subDepartments = await HrSubDepartment.findAll({
      where,
      include,
      order: [[{ model: HrDepartment, as: 'department' }, 'name', 'ASC'], ['name', 'ASC']]
    });
    
    const exportData = subDepartments.map(sd => ({
      'Department': sd.department?.name || '',
      'Sub Dept Code': sd.code,
      'Sub Department Name': sd.name,
      'Description': sd.description || '',
      'Status': sd.isActive ? 'Active' : 'Inactive',
      'Created Date': new Date(sd.createdAt).toLocaleDateString('en-IN')
    }));
    
    if (exportData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data to export'
      });
    }
    
    const parser = new Parser({
      fields: ['Department', 'Sub Dept Code', 'Sub Department Name', 'Description', 'Status', 'Created Date'],
      delimiter: ','
    });
    
    const csv = parser.parse(exportData);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`hr_sub_departments_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting sub-departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export sub-departments',
      error: error.message
    });
  }
};