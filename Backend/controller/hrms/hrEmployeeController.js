const { HrEmployee, HrDepartment, HrDesignation } = require('../../model');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');

// Helper function to calculate total salary
const calculateTotalSalary = (basicSalary, hra, allowances) => {
  const total = (parseFloat(basicSalary) || 0) + (parseFloat(hra) || 0) + (parseFloat(allowances) || 0);
  return total.toFixed(2);
};

// Get all employees
exports.getAll = async (req, res) => {
  try {
    const { search, isActive } = req.query;
    
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    const include = [
      { model: HrDepartment, as: 'department', attributes: ['id', 'name', 'code'] },
      { model: HrDesignation, as: 'designation', attributes: ['id', 'name', 'level'] }
    ];
    
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { employeeCode: { [Op.like]: `%${search}%` } },
        { contactPhone: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const employees = await HrEmployee.findAll({
      where,
      include,
      order: [['employeeCode', 'ASC']]
    });
    
    const formattedData = employees.map(emp => ({
      id: emp.id,
      employeeCode: emp.employeeCode,
      firstName: emp.firstName,
      lastName: emp.lastName,
      dateOfBirth: emp.dateOfBirth,
      gender: emp.gender,
      contactPhone: emp.contactPhone,
      contactEmail: emp.contactEmail,
      dateOfJoining: emp.dateOfJoining,
      designationId: emp.designationId,
      designationName: emp.designation?.name,
      departmentId: emp.departmentId,
      departmentName: emp.department?.name,
      employmentType: emp.employmentType,
      basicSalary: emp.basicSalary,
      hra: emp.hra,
      allowances: emp.allowances,
      totalSalary: calculateTotalSalary(emp.basicSalary, emp.hra, emp.allowances),
      panNumber: emp.panNumber,
      aadharNumber: emp.aadharNumber,
      pfNumber: emp.pfNumber,
      bankName: emp.bankName,
      bankAccountNo: emp.bankAccountNo,
      ifscCode: emp.ifscCode,
      accountHolderName: emp.accountHolderName,
      bankBranch: emp.bankBranch,
      presentAddress: emp.presentAddress,
      permanentAddress: emp.permanentAddress,
      remarks: emp.remarks,
      isActive: emp.isActive,
      // NEW FIELDS
      photoUrl: emp.photoUrl,
      managementStaff: emp.managementStaff,
      visitorsAllowed: emp.visitorsAllowed,
      guest: emp.guest,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt
    }));
    
    res.json({ success: true, data: formattedData, count: formattedData.length });
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employees', error: error.message });
  }
};

// Get employee by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await HrEmployee.findByPk(id, {
      include: [
        { model: HrDepartment, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: HrDesignation, as: 'designation', attributes: ['id', 'name', 'level'] }
      ]
    });
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    const employeeData = employee.toJSON();
    employeeData.totalSalary = calculateTotalSalary(employee.basicSalary, employee.hra, employee.allowances);
    
    res.json({ success: true, data: employeeData });
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch employee', error: error.message });
  }
};

// Get next employee code
exports.getNextCode = async (req, res) => {
  try {
    const lastEmployee = await HrEmployee.findOne({
      order: [['id', 'DESC']],
      attributes: ['employeeCode']
    });
    
    let nextNumber = 1;
    if (lastEmployee && lastEmployee.employeeCode) {
      const match = lastEmployee.employeeCode.match(/\d+$/);
      if (match) {
        nextNumber = parseInt(match[0]) + 1;
      }
    }
    
    const code = `EMP${String(nextNumber).padStart(3, '0')}`;
    res.json({ success: true, data: { code } });
  } catch (error) {
    console.error('Error generating next code:', error);
    res.status(500).json({ success: false, message: 'Failed to generate employee code', error: error.message });
  }
};

// Create employee
exports.create = async (req, res) => {
  try {
    const { 
      employeeCode, firstName, lastName, dateOfBirth, gender, contactPhone, contactEmail,
      dateOfJoining, designationId, departmentId, employmentType, basicSalary, hra,
      allowances, panNumber, aadharNumber, pfNumber, bankName, bankAccountNo,
      ifscCode, accountHolderName, bankBranch, presentAddress, permanentAddress, remarks, isActive,
      // NEW FIELDS
      photoUrl, managementStaff, visitorsAllowed, guest
    } = req.body;
    
    if (!employeeCode || !firstName) {
      return res.status(400).json({ success: false, message: 'Employee code and first name are required' });
    }
    
    const existing = await HrEmployee.findOne({ where: { employeeCode } });
    if (existing) {
      return res.status(409).json({ success: false, message: `Employee code '${employeeCode}' already exists` });
    }
    
    const newEmployee = await HrEmployee.create({
      employeeCode, firstName, lastName, dateOfBirth, gender, contactPhone, contactEmail,
      dateOfJoining, designationId, departmentId, employmentType, basicSalary, hra,
      allowances, panNumber, aadharNumber, pfNumber, bankName, bankAccountNo,
      ifscCode, accountHolderName, bankBranch, presentAddress, permanentAddress, remarks, 
      isActive: isActive !== undefined ? isActive : true,
      // NEW FIELDS
      photoUrl: photoUrl || null,
      managementStaff: managementStaff || 'No',
      visitorsAllowed: visitorsAllowed || 'No',
      guest: guest || 'No'
    });
    
    const savedEmployee = await HrEmployee.findByPk(newEmployee.id, {
      include: [
        { model: HrDepartment, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: HrDesignation, as: 'designation', attributes: ['id', 'name', 'level'] }
      ]
    });
    
    const formattedData = {
      id: savedEmployee.id,
      employeeCode: savedEmployee.employeeCode,
      firstName: savedEmployee.firstName,
      lastName: savedEmployee.lastName,
      dateOfBirth: savedEmployee.dateOfBirth,
      gender: savedEmployee.gender,
      contactPhone: savedEmployee.contactPhone,
      contactEmail: savedEmployee.contactEmail,
      dateOfJoining: savedEmployee.dateOfJoining,
      designationId: savedEmployee.designationId,
      designationName: savedEmployee.designation?.name,
      departmentId: savedEmployee.departmentId,
      departmentName: savedEmployee.department?.name,
      employmentType: savedEmployee.employmentType,
      basicSalary: savedEmployee.basicSalary,
      hra: savedEmployee.hra,
      allowances: savedEmployee.allowances,
      totalSalary: calculateTotalSalary(savedEmployee.basicSalary, savedEmployee.hra, savedEmployee.allowances),
      panNumber: savedEmployee.panNumber,
      aadharNumber: savedEmployee.aadharNumber,
      pfNumber: savedEmployee.pfNumber,
      bankName: savedEmployee.bankName,
      bankAccountNo: savedEmployee.bankAccountNo,
      ifscCode: savedEmployee.ifscCode,
      accountHolderName: savedEmployee.accountHolderName,
      bankBranch: savedEmployee.bankBranch,
      presentAddress: savedEmployee.presentAddress,
      permanentAddress: savedEmployee.permanentAddress,
      remarks: savedEmployee.remarks,
      isActive: savedEmployee.isActive,
      photoUrl: savedEmployee.photoUrl,
      managementStaff: savedEmployee.managementStaff,
      visitorsAllowed: savedEmployee.visitorsAllowed,
      guest: savedEmployee.guest,
      createdAt: savedEmployee.createdAt,
      updatedAt: savedEmployee.updatedAt
    };
    
    res.status(201).json({ success: true, message: 'Employee created successfully', data: formattedData });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ success: false, message: 'Failed to create employee', error: error.message });
  }
};

// Update employee
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    const employee = await HrEmployee.findByPk(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    if (updateData.employeeCode && updateData.employeeCode !== employee.employeeCode) {
      const existing = await HrEmployee.findOne({ where: { employeeCode: updateData.employeeCode } });
      if (existing) {
        return res.status(409).json({ success: false, message: `Employee code '${updateData.employeeCode}' already exists` });
      }
    }
    
    await employee.update(updateData);
    
    const updatedEmployee = await HrEmployee.findByPk(id, {
      include: [
        { model: HrDepartment, as: 'department', attributes: ['id', 'name', 'code'] },
        { model: HrDesignation, as: 'designation', attributes: ['id', 'name', 'level'] }
      ]
    });
    
    const formattedData = {
      id: updatedEmployee.id,
      employeeCode: updatedEmployee.employeeCode,
      firstName: updatedEmployee.firstName,
      lastName: updatedEmployee.lastName,
      dateOfBirth: updatedEmployee.dateOfBirth,
      gender: updatedEmployee.gender,
      contactPhone: updatedEmployee.contactPhone,
      contactEmail: updatedEmployee.contactEmail,
      dateOfJoining: updatedEmployee.dateOfJoining,
      designationId: updatedEmployee.designationId,
      designationName: updatedEmployee.designation?.name,
      departmentId: updatedEmployee.departmentId,
      departmentName: updatedEmployee.department?.name,
      employmentType: updatedEmployee.employmentType,
      basicSalary: updatedEmployee.basicSalary,
      hra: updatedEmployee.hra,
      allowances: updatedEmployee.allowances,
      totalSalary: calculateTotalSalary(updatedEmployee.basicSalary, updatedEmployee.hra, updatedEmployee.allowances),
      panNumber: updatedEmployee.panNumber,
      aadharNumber: updatedEmployee.aadharNumber,
      pfNumber: updatedEmployee.pfNumber,
      bankName: updatedEmployee.bankName,
      bankAccountNo: updatedEmployee.bankAccountNo,
      ifscCode: updatedEmployee.ifscCode,
      accountHolderName: updatedEmployee.accountHolderName,
      bankBranch: updatedEmployee.bankBranch,
      presentAddress: updatedEmployee.presentAddress,
      permanentAddress: updatedEmployee.permanentAddress,
      remarks: updatedEmployee.remarks,
      isActive: updatedEmployee.isActive,
      photoUrl: updatedEmployee.photoUrl,
      managementStaff: updatedEmployee.managementStaff,
      visitorsAllowed: updatedEmployee.visitorsAllowed,
      guest: updatedEmployee.guest,
      createdAt: updatedEmployee.createdAt,
      updatedAt: updatedEmployee.updatedAt
    };
    
    res.json({ success: true, message: 'Employee updated successfully', data: formattedData });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ success: false, message: 'Failed to update employee', error: error.message });
  }
};

// Upload employee photo
exports.uploadPhoto = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }
    
    const employee = await HrEmployee.findByPk(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    // Delete old photo if exists
    if (employee.photoUrl) {
      const oldPhotoPath = path.join(__dirname, '../../public', employee.photoUrl);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }
    
    // Generate URL for the uploaded photo
    const photoUrl = `/uploads/employees/${req.file.filename}`;
    
    await employee.update({ photoUrl });
    
    res.json({
      success: true,
      message: 'Photo uploaded successfully',
      data: { photoUrl }
    });
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ success: false, message: 'Failed to upload photo', error: error.message });
  }
};

// Delete employee photo
exports.deletePhoto = async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await HrEmployee.findByPk(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    if (employee.photoUrl) {
      const photoPath = path.join(__dirname, '../../public', employee.photoUrl);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
      await employee.update({ photoUrl: null });
    }
    
    res.json({ success: true, message: 'Photo deleted successfully' });
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ success: false, message: 'Failed to delete photo', error: error.message });
  }
};

// Delete employee
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;
    
    const employee = await HrEmployee.findByPk(id);
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    // Delete photo if exists
    if (employee.photoUrl) {
      const photoPath = path.join(__dirname, '../../public', employee.photoUrl);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
    
    await employee.destroy();
    
    res.json({ success: true, message: 'Employee permanently deleted' });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ success: false, message: 'Failed to delete employee', error: error.message });
  }
};

// Hard delete
exports.hardDelete = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await HrEmployee.findByPk(id);
    
    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }
    
    if (employee.photoUrl) {
      const photoPath = path.join(__dirname, '../../public', employee.photoUrl);
      if (fs.existsSync(photoPath)) {
        fs.unlinkSync(photoPath);
      }
    }
    
    await employee.destroy();
    res.json({ success: true, message: 'Employee permanently deleted' });
  } catch (error) {
    console.error('Error hard deleting employee:', error);
    res.status(500).json({ success: false, message: 'Failed to permanently delete employee', error: error.message });
  }
};

// Export to CSV
exports.exportToCSV = async (req, res) => {
  try {
    const employees = await HrEmployee.findAll({
      include: [
        { model: HrDepartment, as: 'department', attributes: ['name'] },
        { model: HrDesignation, as: 'designation', attributes: ['name'] }
      ]
    });
    
    const csvRows = [['Employee Code', 'First Name', 'Last Name', 'Department', 'Designation', 'Phone', 'Email', 'Total Salary', 'Management Staff', 'Visitors Allowed', 'Guest', 'Status']];
    
    employees.forEach(emp => {
      csvRows.push([
        emp.employeeCode,
        emp.firstName,
        emp.lastName || '',
        emp.department?.name || '',
        emp.designation?.name || '',
        emp.contactPhone || '',
        emp.contactEmail || '',
        calculateTotalSalary(emp.basicSalary, emp.hra, emp.allowances),
        emp.managementStaff || 'No',
        emp.visitorsAllowed || 'No',
        emp.guest || 'No',
        emp.isActive ? 'Active' : 'Inactive'
      ]);
    });
    
    const csv = csvRows.map(row => row.join(',')).join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment(`hr_employees_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exporting employees:', error);
    res.status(500).json({ success: false, message: 'Failed to export employees', error: error.message });
  }
};