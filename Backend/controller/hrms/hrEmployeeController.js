const { HrEmployee, HrDepartment, HrDesignation, HrSubDepartment } = require('../../model');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx'); // Make sure to install: npm install xlsx

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
        { contactPhone: { [Op.like]: `%${search}%` } },
        { panNumber: { [Op.like]: `%${search}%` } },
        { aadharNumber: { [Op.like]: `%${search}%` } }
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
      bloodGroup: emp.bloodGroup, // ADDED
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
      photoUrl: emp.photoUrl,
      managementStaff: emp.managementStaff,
      visitorsAllowed: emp.visitorsAllowed,
      guest: emp.guest,
      createdAt: emp.createdAt,
      updatedAt: emp.updatedAt
    }));
    
    res.json({ success: true, data: formattedData, count: formattedData.length });
  } catch (error) {

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

    res.status(500).json({ success: false, message: 'Failed to generate employee code', error: error.message });
  }
};

// Create employee
exports.create = async (req, res) => {
  try {
    const { 
      employeeCode, firstName, lastName, dateOfBirth, gender, bloodGroup, // ADDED bloodGroup
      contactPhone, contactEmail, dateOfJoining, designationId, departmentId, 
      employmentType, basicSalary, hra, allowances, panNumber, aadharNumber, 
      pfNumber, bankName, bankAccountNo, ifscCode, accountHolderName, bankBranch, 
      presentAddress, permanentAddress, remarks, isActive,
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
      employeeCode, firstName, lastName, dateOfBirth, gender, bloodGroup, // ADDED bloodGroup
      contactPhone, contactEmail, dateOfJoining, designationId, departmentId, 
      employmentType, basicSalary, hra, allowances, panNumber, aadharNumber, 
      pfNumber, bankName, bankAccountNo, ifscCode, accountHolderName, bankBranch, 
      presentAddress, permanentAddress, remarks, 
      isActive: isActive !== undefined ? isActive : true,
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
      bloodGroup: savedEmployee.bloodGroup, // ADDED
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
      bloodGroup: updatedEmployee.bloodGroup, // ADDED
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

    res.status(500).json({ success: false, message: 'Failed to delete photo', error: error.message });
  }
};

// Bulk Upload Employees - COMPLETE WORKING VERSION
exports.bulkUpload = async (req, res) => {
  try {

    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded. Please select an Excel or CSV file.' 
      });
    }

    let data = [];
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    try {
      if (fileExt === '.csv') {
        const csvData = fs.readFileSync(req.file.path, 'utf8');
        const lines = csvData.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/["']/g, '').trim());
        
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.replace(/["']/g, '').trim());
            const row = {};
            headers.forEach((header, idx) => {
              row[header] = values[idx] || '';
            });
            data.push(row);
          }
        }
      } else {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      }
    } catch (parseError) {

      return res.status(400).json({ 
        success: false, 
        message: 'Failed to parse the file.',
        error: parseError.message 
      });
    }

    if (!data || data.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No data found in the uploaded file.' 
      });
    }

    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [],
      employees: []
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        const employeeCode = row.EmployeeCode || row['EmployeeCode*'];
        const firstName = row.FirstName || row['FirstName*'];
        const lastName = row.LastName;
        const dateOfBirth = row.DateOfBirth;
        const gender = row.Gender || 'Male';
        const bloodGroup = row.BloodGroup;
        const contactPhone = row.ContactPhone;
        const contactEmail = row.ContactEmail;
        const dateOfJoining = row.DateOfJoining;
        const departmentName = row.DepartmentName || row['DepartmentName*'];
        const subDepartmentName = row.SubDepartmentName || row['SubDepartmentName*'];
        const designationName = row.DesignationName || row['DesignationName*'];
        const employmentType = row.EmploymentType || 'Permanent';
        const basicSalary = row.BasicSalary || 0;
        const hra = row.HRA || 0;
        const allowances = row.Allowances || 0;
        const panNumber = row.PANNumber;
        const aadharNumber = row.AadharNumber;
        const pfNumber = row.PFNumber;
        const bankName = row.BankName;
        const bankAccountNo = row.BankAccountNo;
        const ifscCode = row.IFSCCode;
        const accountHolderName = row.AccountHolderName;
        const bankBranch = row.BankBranch;
        const presentAddress = row.PresentAddress;
        const permanentAddress = row.PermanentAddress;
        const remarks = row.Remarks;
        const managementStaff = row.ManagementStaff === 'Yes' ? 'Yes' : 'No';
        const visitorsAllowed = row.VisitorsAllowed === 'Yes' ? 'Yes' : 'No';
        const guest = row.Guest === 'Yes' ? 'Yes' : 'No';

        // Validate required fields
        if (!employeeCode) throw new Error('Employee Code is required');
        if (!firstName) throw new Error('First Name is required');
        if (!departmentName) throw new Error('Department Name is required');

        // Step 1: Find department
        const department = await HrDepartment.findOne({ 
          where: { name: departmentName.trim() } 
        });
        
        if (!department) {
          throw new Error(`Department "${departmentName}" not found. Available: Information Technology, Admin`);
        }

        // Step 2: Find sub-department (if provided)
        let subDepartmentId = null;
        if (subDepartmentName && subDepartmentName.trim()) {
          const subDepartment = await HrSubDepartment.findOne({ 
            where: { 
              name: subDepartmentName.trim(),
              department_id: department.id
            } 
          });
          
          if (!subDepartment) {
            throw new Error(`Sub-department "${subDepartmentName}" not found under department "${departmentName}". For IT use "Frontend", for Admin use "purchase"`);
          }
          subDepartmentId = subDepartment.id;
        }

        // Step 3: Find designation (if provided)
        let designationId = null;
        if (designationName && designationName.trim()) {
          const whereClause = { 
            name: designationName.trim()
          };
          
          // If subDepartmentId exists, use it; otherwise try to find by department_id
          if (subDepartmentId) {
            whereClause.sub_department_id = subDepartmentId;
          } else {
            // Try to find designation directly by name (fallback)
            const designation = await HrDesignation.findOne({ 
              where: { name: designationName.trim() }
            });
            if (designation) {
              designationId = designation.id;
            }
          }
          
          if (!designationId) {
            const designation = await HrDesignation.findOne({ where: whereClause });
            if (designation) {
              designationId = designation.id;
            } else {
              throw new Error(`Designation "${designationName}" not found. For Frontend sub-department use "Frontend Developer", for purchase sub-department use "Manages"`);
            }
          }
        }

        // Check existing employee
        const existingEmployee = await HrEmployee.findOne({
          where: { employeeCode: employeeCode.trim() }
        });

        if (existingEmployee) {
          throw new Error(`Employee code "${employeeCode}" already exists`);
        }

        // Create employee
        const employee = await HrEmployee.create({
          employeeCode: employeeCode.trim(),
          firstName: firstName.trim(),
          lastName: lastName ? lastName.trim() : '',
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          gender: gender,
          bloodGroup: bloodGroup || null,
          contactPhone: contactPhone ? contactPhone.toString() : null,
          contactEmail: contactEmail || null,
          dateOfJoining: dateOfJoining ? new Date(dateOfJoining) : null,
          designationId: designationId,
          departmentId: department.id,
          employmentType: employmentType,
          basicSalary: parseFloat(basicSalary) || 0,
          hra: parseFloat(hra) || 0,
          allowances: parseFloat(allowances) || 0,
          panNumber: panNumber ? panNumber.toUpperCase() : null,
          aadharNumber: aadharNumber ? aadharNumber.toString() : null,
          pfNumber: pfNumber ? pfNumber.toUpperCase() : null,
          bankName: bankName || null,
          bankAccountNo: bankAccountNo ? bankAccountNo.toString() : null,
          ifscCode: ifscCode ? ifscCode.toUpperCase() : null,
          accountHolderName: accountHolderName || null,
          bankBranch: bankBranch || null,
          presentAddress: presentAddress || null,
          permanentAddress: permanentAddress || null,
          remarks: remarks || null,
          isActive: true,
          managementStaff: managementStaff,
          visitorsAllowed: visitorsAllowed,
          guest: guest
        });

        results.successCount++;
        results.employees.push(employee);


      } catch (err) {

        results.failedCount++;
        results.errors.push({
          row: i + 2,
          message: err.message,
          data: row
        });
      }
    }

    // Clean up uploaded file
    try {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (unlinkError) {

    }

    res.json({
      success: true,
      message: `Processed ${data.length} records. ${results.successCount} successful, ${results.failedCount} failed.`,
      data: results
    });

  } catch (error) {

    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {

      }
    }
    res.status(500).json({ success: false, message: error.message });
  }
};


// Delete employee (soft delete - if you want to implement)
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
    
    res.json({ success: true, message: 'Employee deleted successfully' });
  } catch (error) {

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
    
    await employee.destroy({ force: true });
    res.json({ success: true, message: 'Employee permanently deleted' });
  } catch (error) {

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
    
    const csvRows = [['Employee Code', 'First Name', 'Last Name', 'Blood Group', 'Department', 'Designation', 'Phone', 'Email', 'Total Salary', 'Management Staff', 'Visitors Allowed', 'Guest', 'Status']];
    
    employees.forEach(emp => {
      csvRows.push([
        emp.employeeCode,
        emp.firstName,
        emp.lastName || '',
        emp.bloodGroup || '', // ADDED Blood Group
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

    res.status(500).json({ success: false, message: 'Failed to export employees', error: error.message });
  }
};