// controllers/hrDesignationController.js
const { HrDesignation, HrDepartment, HrEmployee } = require('../../model');
const { Parser } = require('json2csv');
const { Op } = require('sequelize');

// Get all designations
exports.getAll = async (req, res) => {
  try {
    console.log('📊 GET ALL DESIGNATIONS CALLED');
    const { search, departmentId, isActive } = req.query;
    
    const where = {};
    if (isActive !== undefined) where.is_active = isActive === 'true';
    if (departmentId) where.department_id = departmentId;
    
    const include = [
      {
        model: HrDepartment,
        as: 'department',
        attributes: ['id', 'name', 'code']
      }
    ];
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { '$department.name$': { [Op.like]: `%${search}%` } }
      ];
    }
    
    const designations = await HrDesignation.findAll({
      where,
      include,
      order: [['level', 'ASC'], ['name', 'ASC']]
    });
    
    console.log('📊 Raw designations count:', designations.length);
    
    const formattedData = designations.map(d => {
      console.log(`🔍 Designation ${d.id}: is_active =`, d.is_active);
      
      return {
        id: d.id,
        name: d.name,
        level: d.level,
        responsibilities: d.responsibilities,
        isActive: d.is_active === 1 || d.is_active === true,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        departmentId: d.department_id,
        departmentName: d.department?.name,
        departmentCode: d.department?.code
      };
    });
    
    console.log('📊 Returning data with isActive:', formattedData.map(d => ({ id: d.id, isActive: d.isActive })));
    
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

// Get designations by department ID
exports.getByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    const { onlyActive = 'true' } = req.query;
    
    const where = { 
      department_id: departmentId 
    };
    if (onlyActive === 'true') where.is_active = true;
    
    const designations = await HrDesignation.findAll({
      where,
      attributes: ['id', 'name', 'level', 'is_active'],
      order: [['level', 'ASC'], ['name', 'ASC']]
    });
    
    // Format the response to include isActive as boolean
    const formattedData = designations.map(d => ({
      id: d.id,
      name: d.name,
      level: d.level,
      isActive: d.is_active === 1 || d.is_active === true
    }));
    
    res.json({
      success: true,
      data: formattedData
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

// Get designation by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const designation = await HrDesignation.findByPk(id, {
      include: [{
        model: HrDepartment,
        as: 'department',
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
        isActive: designation.is_active === 1 || designation.is_active === true,
        createdAt: designation.createdAt,
        updatedAt: designation.updatedAt,
        departmentId: designation.department_id,
        departmentName: designation.department?.name,
        departmentCode: designation.department?.code
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

// Create designation
exports.create = async (req, res) => {
  try {
    const { departmentId, name, level, responsibilities, isActive } = req.body;
    
    if (!departmentId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Department and name are required fields'
      });
    }
    
    const department = await HrDepartment.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Parent department not found'
      });
    }
    
    const existingByName = await HrDesignation.findOne({ 
      where: { 
        name: name.trim(), 
        department_id: departmentId 
      }
    });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Designation with name '${name}' already exists in this department`
      });
    }
    
    const newDesignation = await HrDesignation.create({
      department_id: parseInt(departmentId),
      name: name.trim(),
      level: level ? parseInt(level) : null,
      responsibilities: responsibilities || null,
      is_active: isActive !== undefined ? isActive : true
    });
    
    // Fetch created designation with department info
    const createdDesignation = await HrDesignation.findByPk(newDesignation.id, {
      include: [{
        model: HrDepartment,
        as: 'department',
        attributes: ['id', 'name', 'code']
      }]
    });
    
    res.status(201).json({
      success: true,
      message: 'Designation created successfully',
      data: {
        id: createdDesignation.id,
        name: createdDesignation.name,
        level: createdDesignation.level,
        responsibilities: createdDesignation.responsibilities,
        isActive: createdDesignation.is_active === 1 || createdDesignation.is_active === true,
        departmentId: createdDesignation.department_id,
        departmentName: createdDesignation.department?.name,
        departmentCode: createdDesignation.department?.code
      }
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

// Update designation
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const { departmentId, name, level, responsibilities, isActive } = req.body;
    
    if (!departmentId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Department and name are required fields'
      });
    }
    
    const designation = await HrDesignation.findByPk(id);
    if (!designation) {
      return res.status(404).json({
        success: false,
        message: 'Designation not found'
      });
    }
    
    const department = await HrDepartment.findByPk(departmentId);
    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Parent department not found'
      });
    }
    
    const existingByName = await HrDesignation.findOne({ 
      where: { 
        name: name.trim(), 
        department_id: departmentId, 
        id: { [Op.ne]: id } 
      }
    });
    if (existingByName) {
      return res.status(409).json({
        success: false,
        message: `Designation with name '${name}' already exists in this department`
      });
    }
    
    await designation.update({
      department_id: parseInt(departmentId),
      name: name.trim(),
      level: level ? parseInt(level) : null,
      responsibilities: responsibilities || null,
      is_active: isActive !== undefined ? isActive : true
    });
    
    // Fetch updated designation with department info
    const updatedDesignation = await HrDesignation.findByPk(id, {
      include: [{
        model: HrDepartment,
        as: 'department',
        attributes: ['id', 'name', 'code']
      }]
    });
    
    res.json({
      success: true,
      message: 'Designation updated successfully',
      data: {
        id: updatedDesignation.id,
        name: updatedDesignation.name,
        level: updatedDesignation.level,
        responsibilities: updatedDesignation.responsibilities,
        isActive: updatedDesignation.is_active === 1 || updatedDesignation.is_active === true,
        departmentId: updatedDesignation.department_id,
        departmentName: updatedDesignation.department?.name,
        departmentCode: updatedDesignation.department?.code
      }
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

// Delete designation
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
    
    await designation.destroy();
    
    res.json({
      success: true,
      message: 'Designation deleted successfully'
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

// Hard delete designation
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
    
    await designation.destroy({ force: true });
    
    res.json({
      success: true,
      message: 'Designation permanently deleted'
    });
  } catch (error) {
    console.error('Error permanently deleting designation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to permanently delete designation',
      error: error.message
    });
  }
};

// Export to CSV
exports.exportToCSV = async (req, res) => {
  try {
    const { search, departmentId, isActive } = req.query;
    
    const where = {};
    if (isActive !== undefined) where.is_active = isActive === 'true';
    if (departmentId) where.department_id = departmentId;
    
    const include = [
      {
        model: HrDepartment,
        as: 'department',
        attributes: ['name']
      }
    ];
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { '$department.name$': { [Op.like]: `%${search}%` } }
      ];
    }
    
    const designations = await HrDesignation.findAll({
      where,
      include,
      order: [
        [{ model: HrDepartment, as: 'department' }, 'name', 'ASC'],
        ['level', 'ASC'], 
        ['name', 'ASC']
      ]
    });
    
    const exportData = designations.map(d => ({
      'Department': d.department?.name || '',
      'Designation': d.name,
      'Level': d.level || '',
      'Responsibilities': d.responsibilities || '',
      'Status': d.is_active ? 'Active' : 'Inactive',
      'Created Date': new Date(d.createdAt).toLocaleDateString('en-IN')
    }));
    
    if (exportData.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No data to export'
      });
    }
    
    const parser = new Parser({
      fields: ['Department', 'Designation', 'Level', 'Responsibilities', 'Status', 'Created Date'],
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