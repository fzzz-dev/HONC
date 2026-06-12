// controllers/hrDesignationController.js
const { HrDesignation, HrSubDepartment, HrDepartment } = require('../../model');
const { Parser } = require('json2csv');
const { Op } = require('sequelize');

exports.getAll = async (req, res) => {
  try {
    const { search, subDepartmentId, isActive } = req.query;
    
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (subDepartmentId) where.subDepartmentId = subDepartmentId;
    
    const include = [
      {
        model: HrSubDepartment,
        as: 'subDepartment',
        include: [{
          model: HrDepartment,
          as: 'department',
          attributes: ['id', 'name', 'code']
        }],
        attributes: ['id', 'name', 'code']
      }
    ];
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { '$subDepartment.name$': { [Op.like]: `%${search}%` } }
      ];
    }
    
    const designations = await HrDesignation.findAll({
      where,
      include,
      order: [['level', 'ASC'], ['name', 'ASC']]
    });
    
    const formattedData = designations.map(d => ({
      id: d.id,
      name: d.name,
      level: d.level,
      responsibilities: d.responsibilities,
      isActive: d.isActive,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
      subDepartmentId: d.subDepartmentId,
      subDepartmentName: d.subDepartment?.name,
      subDepartmentCode: d.subDepartment?.code,
      departmentName: d.subDepartment?.department?.name
    }));
    
    res.json({
      success: true,
      data: formattedData,
      count: formattedData.length
    });
  } catch (error) {
    console.error('Error fetching designations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch designations',
      error: error.message
    });
  }
};

exports.getByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { onlyActive = 'true' } = req.query;
    
    const where = {};
    if (onlyActive === 'true') where.isActive = true;
    
    const designations = await HrDesignation.findAll({
      where,
      include: [{
        model: HrSubDepartment,
        as: 'subDepartment',
        where: { departmentId: departmentId },
        attributes: []
      }],
      attributes: ['id', 'name', 'level', 'isActive'],
      order: [['level', 'ASC'], ['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: designations
    });
  } catch (error) {
    console.error('Error fetching designations by department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch designations',
      error: error.message
    });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const designation = await HrDesignation.findByPk(id, {
      include: [{
        model: HrSubDepartment,
        as: 'subDepartment',
        include: [{
          model: HrDepartment,
          as: 'department',
          attributes: ['id', 'name', 'code']
        }],
        attributes: ['id', 'name', 'code']
      }]
    });
    
    if (!designation) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: designation.id,
        name: designation.name,
        level: designation.level,
        responsibilities: designation.responsibilities,
        isActive: designation.isActive,
        createdAt: designation.createdAt,
        updatedAt: designation.updatedAt,
        subDepartmentId: designation.subDepartmentId,
        subDepartmentName: designation.subDepartment?.name,
        subDepartmentCode: designation.subDepartment?.code,
        departmentName: designation.subDepartment?.department?.name
      }
    });
  } catch (error) {
    console.error('Error fetching designation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch designation',
      error: error.message
    });
  }
};

exports.getBySubDepartment = async (req, res) => {
  try {
    const { subDepartmentId } = req.params;
    const { onlyActive = 'true' } = req.query;
    
    const where = { subDepartmentId };
    if (onlyActive === 'true') where.isActive = true;
    
    const designations = await HrDesignation.findAll({
      where,
      attributes: ['id', 'name', 'level', 'isActive'],
      order: [['level', 'ASC'], ['name', 'ASC']]
    });
    
    res.json({
      success: true,
      data: designations
    });
  } catch (error) {
    console.error('Error fetching designations by sub-department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch designations',
      error: error.message
    });
  }
};

exports.create = async (req, res) => {
  try {
    const { subDepartmentId, name, level, responsibilities, isActive } = req.body;
    
    if (!subDepartmentId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Sub-department and name are required fields'
      });
    }
    
    const subDepartment = await HrSubDepartment.findByPk(subDepartmentId);
    if (!subDepartment) {
      return res.status(404).json({
        success: false,
        message: 'Parent sub-department not found'
      });
    }
    
    const existingByName = await HrDesignation.findOne({ 
      where: { name, subDepartmentId }
    });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Designation with name '${name}' already exists in this sub-department`
      });
    }
    
    const newDesignation = await HrDesignation.create({
      subDepartmentId: parseInt(subDepartmentId),
      name: name.trim(),
      level: level ? parseInt(level) : null,
      responsibilities: responsibilities || null,
      isActive: isActive !== undefined ? isActive : true
    });
    
    res.status(201).json({
      success: true,
      message: 'Designation created successfully',
      data: newDesignation
    });
  } catch (error) {
    console.error('Error creating designation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create designation',
      error: error.message
    });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { subDepartmentId, name, level, responsibilities, isActive } = req.body;
    
    if (!subDepartmentId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Sub-department and name are required fields'
      });
    }
    
    const designation = await HrDesignation.findByPk(id);
    if (!designation) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }
    
    const subDepartment = await HrSubDepartment.findByPk(subDepartmentId);
    if (!subDepartment) {
      return res.status(404).json({
        success: false,
        message: 'Parent sub-department not found'
      });
    }
    
    const existingByName = await HrDesignation.findOne({ 
      where: { name, subDepartmentId, id: { [Op.ne]: id } }
    });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Designation with name '${name}' already exists in this sub-department`
      });
    }
    
    await designation.update({
      subDepartmentId: parseInt(subDepartmentId),
      name: name.trim(),
      level: level ? parseInt(level) : null,
      responsibilities: responsibilities || null,
      isActive
    });
    
    res.json({
      success: true,
      message: 'Designation updated successfully',
      data: designation
    });
  } catch (error) {
    console.error('Error updating designation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update designation',
      error: error.message
    });
  }
};

exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const designation = await HrDesignation.findByPk(id);
    if (!designation) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }
    
    // Check if has employees using this designation
    const employees = await HrEmployee.count({ where: { designationId: id } });
    if (employees > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete designation assigned to employees. Remove from employees first.'
      });
    }
    
    // HARD DELETE - permanently remove from database
    await designation.destroy();
    
    res.json({
      success: true,
      message: 'Designation permanently deleted'
    });
  } catch (error) {
    console.error('Error deleting designation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete designation',
      error: error.message
    });
  }
};

exports.hardDelete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const designation = await HrDesignation.findByPk(id);
    if (!designation) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }
    
    await designation.destroy();
    
    res.json({
      success: true,
      message: 'Designation permanently deleted'
    });
  } catch (error) {
    console.error('Error hard deleting designation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete designation',
      error: error.message
    });
  }
};

exports.exportToCSV = async (req, res) => {
  try {
    const { search, subDepartmentId, isActive } = req.query;
    
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (subDepartmentId) where.subDepartmentId = subDepartmentId;
    
    const include = [
      {
        model: HrSubDepartment,
        as: 'subDepartment',
        include: [{
          model: HrDepartment,
          as: 'department',
          attributes: ['name']
        }],
        attributes: ['name']
      }
    ];
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { '$subDepartment.name$': { [Op.like]: `%${search}%` } }
      ];
    }
    
    const designations = await HrDesignation.findAll({
      where,
      include,
      order: [[{ model: HrSubDepartment, as: 'subDepartment' }, 'name', 'ASC'], ['level', 'ASC'], ['name', 'ASC']]
    });
    
    const exportData = designations.map(d => ({
      'Department': d.subDepartment?.department?.name || '',
      'Sub Department': d.subDepartment?.name || '',
      'Designation': d.name,
      'Level': d.level || '',
      'Responsibilities': d.responsibilities || '',
      'Status': d.isActive ? 'Active' : 'Inactive',
      'Created Date': new Date(d.createdAt).toLocaleDateString('en-IN')
    }));
    
    if (exportData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data to export'
      });
    }
    
    const parser = new Parser({
      fields: ['Department', 'Sub Department', 'Designation', 'Level', 'Responsibilities', 'Status', 'Created Date'],
      delimiter: ','
    });
    
    const csv = parser.parse(exportData);
    
    res.header('Content-Type', 'text/csv');
    res.attachment(`hr_designations_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting designations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export designations',
      error: error.message
    });
  }
};