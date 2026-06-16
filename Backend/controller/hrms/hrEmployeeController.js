const { HrEmployee, HrDepartment, HrDesignation } = require('../../model');
const { Op } = require('sequelize');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

// Helper function to calculate total salary
const calculateTotalSalary = (basicSalary, hra, allowances) => {
  const total = (parseFloat(basicSalary) || 0) + (parseFloat(hra) || 0) + (parseFloat(allowances) || 0);
  return total.toFixed(2);
};

// Helper function to parse dates in multiple formats (DD-MM-YYYY preferred)
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  // If it's a Date object already
  if (dateStr instanceof Date) {
    return isNaN(dateStr.getTime()) ? null : dateStr;
  }
  
  // 🔥 HANDLE EXCEL SERIAL NUMBER (e.g., 28773)
  if (typeof dateStr === 'number' || !isNaN(parseFloat(dateStr))) {
    const num = parseFloat(dateStr);
    // Excel serial dates are typically between 1 and 100000
    if (num > 0 && num < 100000) {
      // Excel serial date: days since 1900-01-01 (with a bug for 1900 leap year)
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + num * 24 * 60 * 60 * 1000);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
  }
  
  // Convert to string and trim
  dateStr = String(dateStr).trim();
  
  // Handle YYYY-MM-DD HH:MM:SS format (from Excel export)
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
    const parts = dateStr.split(' ')[0].split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
      return date;
    }
    return null;
  }
  
  // Handle YYYY-MM-DD format (without time)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
      return date;
    }
    return null;
  }
  
  // 🔥 PARSE DD-MM-YYYY (Indian/European format - YOUR PREFERRED FORMAT)
  if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('-');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
      return date;
    }
    return null;
  }
  
  // Parse DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (date.getDate() === day && date.getMonth() === month && date.getFullYear() === year) {
      return date;
    }
    return null;
  }
  
  // Fallback - let JavaScript try to parse it
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
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
        { fatherName: { [Op.like]: `%${search}%` } },
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
      fatherName: emp.fatherName || '',
      dateOfBirth: emp.dateOfBirth,
      gender: emp.gender,
      bloodGroup: emp.bloodGroup,
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
      totalSalary: emp.totalSalary || 0,
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
    employeeData.totalSalary = employee.totalSalary || calculateTotalSalary(employee.basicSalary, employee.hra, employee.allowances);
    
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
      const match = lastEmployee.employeeCode.match(/-(\d+)$/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      } else {
        const numberMatch = lastEmployee.employeeCode.match(/\d+$/);
        if (numberMatch) {
          nextNumber = parseInt(numberMatch[0]) + 1;
        }
      }
    }
    
    const code = `HG-RE-TPR-${String(nextNumber).padStart(3, '0')}`;
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
      employeeCode, firstName, lastName, fatherName, dateOfBirth, gender, bloodGroup,
      contactPhone, contactEmail, dateOfJoining, designationId, departmentId, 
      employmentType, basicSalary, hra, allowances, totalSalary, panNumber, aadharNumber, 
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
      employeeCode, 
      firstName, 
      lastName,
      fatherName: fatherName || null,
      dateOfBirth: dateOfBirth ? parseDate(dateOfBirth) : null,
      gender, 
      bloodGroup,
      contactPhone, 
      contactEmail, 
      dateOfJoining: dateOfJoining ? parseDate(dateOfJoining) : null,
      designationId, 
      departmentId, 
      employmentType, 
      basicSalary: parseFloat(basicSalary) || 0,
      hra: parseFloat(hra) || 0,
      allowances: parseFloat(allowances) || 0,
      totalSalary: parseFloat(totalSalary) || 0,
      panNumber, 
      aadharNumber, 
      pfNumber, 
      bankName, 
      bankAccountNo, 
      ifscCode, 
      accountHolderName, 
      bankBranch, 
      presentAddress, 
      permanentAddress, 
      remarks, 
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
      fatherName: savedEmployee.fatherName || '',
      dateOfBirth: savedEmployee.dateOfBirth,
      gender: savedEmployee.gender,
      bloodGroup: savedEmployee.bloodGroup,
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
      totalSalary: savedEmployee.totalSalary || 0,
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
    
    if (updateData.dateOfBirth) {
      updateData.dateOfBirth = parseDate(updateData.dateOfBirth);
    }
    if (updateData.dateOfJoining) {
      updateData.dateOfJoining = parseDate(updateData.dateOfJoining);
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
      fatherName: updatedEmployee.fatherName || '',
      dateOfBirth: updatedEmployee.dateOfBirth,
      gender: updatedEmployee.gender,
      bloodGroup: updatedEmployee.bloodGroup,
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
      totalSalary: updatedEmployee.totalSalary || 0,
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
    
    if (employee.photoUrl) {
      const oldPhotoPath = path.join(__dirname, '../../public', employee.photoUrl);
      if (fs.existsSync(oldPhotoPath)) {
        fs.unlinkSync(oldPhotoPath);
      }
    }
    
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

// Bulk Upload
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
        let csvData = fs.readFileSync(req.file.path, 'utf8');
        
        if (csvData.charCodeAt(0) === 0xFEFF) {
          csvData = csvData.slice(1);
        }
        
        const lines = csvData.split('\n').filter(line => line.trim());
        
        if (lines.length === 0) {
          throw new Error('CSV file is empty');
        }
        
        const headers = lines[0].split(',').map(h => 
          h.replace(/["']/g, '').trim()
        );
        
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
        const workbook = XLSX.readFile(req.file.path, { 
          cellDates: false,
          raw: true
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
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

    const getColumnValue = (row, ...possibleNames) => {
      for (const name of possibleNames) {
        if (row[name] !== undefined && row[name] !== '') {
          return row[name];
        }
        const foundKey = Object.keys(row).find(
          key => key.trim().toLowerCase() === name.trim().toLowerCase()
        );
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== '') {
          return row[foundKey];
        }
      }
      return undefined;
    };

    const employmentTypeMap = {
      'Full Time': 'Permanent',
      'Full time': 'Permanent',
      'Full-Time': 'Permanent',
      'Fulltime': 'Permanent',
      'Part Time': 'Contract',
      'Part time': 'Contract',
      'Part-Time': 'Contract',
      'Contract': 'Contract',
      'Contractual': 'Contract',
      'Temporary': 'Temporary',
      'Temp': 'Temporary',
      'Probation': 'Probation',
      'Probationary': 'Probation',
      'Permanent': 'Permanent',
      'Perm': 'Permanent'
    };

    const results = {
      successCount: 0,
      failedCount: 0,
      errors: [],
      employees: []
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      try {
        const employeeCode = getColumnValue(row, 'Employee Code', 'EmployeeCode', 'EmployeeCode*', 'Employee Code*');
        const firstName = getColumnValue(row, 'First Name', 'FirstName', 'FirstName*', 'First Name*');
        const lastName = getColumnValue(row, 'Last Name', 'LastName');
        const fatherName = getColumnValue(row, 'Father Name', 'FatherName');
        const dateOfBirth = getColumnValue(row, 'Date of Birth', 'DateOfBirth');
        const gender = getColumnValue(row, 'Gender', 'gender') || 'Male';
        const bloodGroup = getColumnValue(row, 'Blood Group', 'BloodGroup');
        const contactPhone = getColumnValue(row, 'Contact Phone', 'ContactPhone');
        const contactEmail = getColumnValue(row, 'Contact Email', 'ContactEmail');
        const dateOfJoining = getColumnValue(row, 'Date of Joining', 'DateOfJoining');
        const departmentName = getColumnValue(row, 'Department Name', 'DepartmentName', 'Department', 'DepartmentName*', 'Department Name*');
        const designationName = getColumnValue(row, 'Designation Name', 'DesignationName', 'Designation', 'DesignationName*', 'Designation Name*');
        
        let employmentType = getColumnValue(row, 'Employment Type', 'EmploymentType') || 'Permanent';
        employmentType = employmentTypeMap[employmentType] || 'Permanent';
        
        const basicSalary = parseFloat(getColumnValue(row, 'Basic Salary', 'BasicSalary')) || 0;
        const hra = parseFloat(getColumnValue(row, 'HRA', 'hra')) || 0;
        const allowances = parseFloat(getColumnValue(row, 'Allowances', 'allowances')) || 0;
        
        // 🔥 FIX: Get Total Salary from CSV or auto-calculate
        let totalSalary = parseFloat(getColumnValue(row, 'Total Salary', 'TotalSalary', 'Total Salary (₹)')) || 0;
        
        // Check if Total Salary column exists in the CSV
        const hasTotalSalaryColumn = Object.keys(row).some(key => 
          key.trim().toLowerCase() === 'total salary' || 
          key.trim().toLowerCase() === 'totalsalary' ||
          key.trim().toLowerCase() === 'total salary (₹)'
        );
        
        // Only auto-calculate if the column doesn't exist at all
        // If column exists, use the value from CSV (even if 0)
        if (!hasTotalSalaryColumn) {
          totalSalary = basicSalary + hra + allowances;
        }
        
        const panNumber = getColumnValue(row, 'PAN Number', 'PANNumber');
        const aadharNumber = getColumnValue(row, 'Aadhar Number', 'AadharNumber');
        const pfNumber = getColumnValue(row, 'PF Number', 'PFNumber');
        const bankName = getColumnValue(row, 'Bank Name', 'BankName');
        const bankAccountNo = getColumnValue(row, 'Bank Account No', 'BankAccountNo', 'Account Number', 'AccountNumber');
        const ifscCode = getColumnValue(row, 'IFSC Code', 'IFSCCode');
        const accountHolderName = getColumnValue(row, 'Account Holder Name', 'AccountHolderName');
        const bankBranch = getColumnValue(row, 'Bank Branch', 'BankBranch');
        const presentAddress = getColumnValue(row, 'Present Address', 'PresentAddress');
        const permanentAddress = getColumnValue(row, 'Permanent Address', 'PermanentAddress');
        const remarks = getColumnValue(row, 'Remarks', 'remarks');
        const managementStaff = getColumnValue(row, 'Management Staff', 'ManagementStaff') === 'Yes' ? 'Yes' : 'No';
        const visitorsAllowed = getColumnValue(row, 'Visitors Allowed', 'VisitorsAllowed') === 'Yes' ? 'Yes' : 'No';
        const guest = getColumnValue(row, 'Guest', 'guest') === 'Yes' ? 'Yes' : 'No';

        if (!employeeCode) {
          throw new Error(`Employee Code is required. Available columns: ${Object.keys(row).join(', ')}`);
        }
        if (!firstName) throw new Error('First Name is required');
        if (!departmentName) throw new Error('Department Name is required');

        const department = await HrDepartment.findOne({ 
          where: { name: departmentName.trim() } 
        });
        
        if (!department) {
          const allDepts = await HrDepartment.findAll({ attributes: ['name'] });
          const deptNames = allDepts.map(d => d.name);
          throw new Error(`Department "${departmentName}" not found. Available: ${deptNames.join(', ')}`);
        }

        let designationId = null;
        if (designationName && designationName.trim()) {
          const designation = await HrDesignation.findOne({ 
            where: { 
              name: designationName.trim(),
              department_id: department.id
            } 
          });
          
          if (!designation) {
            const allDesignations = await HrDesignation.findAll({
              where: { department_id: department.id },
              attributes: ['name']
            });
            const desigNames = allDesignations.map(d => d.name);
            throw new Error(`Designation "${designationName}" not found in department "${departmentName}". Available: ${desigNames.join(', ') || 'No designations found'}`);
          }
          designationId = designation.id;
        }

        const existingEmployee = await HrEmployee.findOne({
          where: { employeeCode: employeeCode.trim() }
        });

        if (existingEmployee) {
          throw new Error(`Employee code "${employeeCode}" already exists`);
        }

        const employee = await HrEmployee.create({
          employeeCode: employeeCode.trim(),
          firstName: firstName.trim(),
          lastName: lastName ? lastName.trim() : '',
          fatherName: fatherName ? fatherName.trim() : '',
          dateOfBirth: dateOfBirth ? parseDate(dateOfBirth) : null,
          gender: gender,
          bloodGroup: bloodGroup || null,
          contactPhone: contactPhone ? contactPhone.toString() : null,
          contactEmail: contactEmail || null,
          dateOfJoining: dateOfJoining ? parseDate(dateOfJoining) : null,
          designationId: designationId,
          departmentId: department.id,
          employmentType: employmentType,
          basicSalary: basicSalary,
          hra: hra,
          allowances: allowances,
          totalSalary: totalSalary,  // ← Uses CSV value or calculated
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
        console.error(`Error in row ${i + 2}:`, err.message);
        results.failedCount++;
        results.errors.push({
          row: i + 2,
          message: err.message,
          data: row
        });
      }
    }

    try {
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (unlinkError) {
      // Silent fail
    }

    res.json({
      success: true,
      message: `Processed ${data.length} records. ${results.successCount} successful, ${results.failedCount} failed.`,
      data: results
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        // Silent fail
      }
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete employee (soft delete)
exports.delete = async (req, res) => {
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
    
    res.json({ success: true, message: 'Employee deleted successfully' });
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
    
    await employee.destroy({ force: true });
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
    
    const csvRows = [
      ['Employee Code', 'First Name', 'Last Name', 'Father Name', 'Blood Group', 
       'Department', 'Designation', 'Phone', 'Email', 'Total Salary', 
       'Management Staff', 'Visitors Allowed', 'Guest', 'Status']
    ];
    
    employees.forEach(emp => {
      csvRows.push([
        emp.employeeCode,
        emp.firstName,
        emp.lastName || '',
        emp.fatherName || '',
        emp.bloodGroup || '',
        emp.department?.name || '',
        emp.designation?.name || '',
        emp.contactPhone || '',
        emp.contactEmail || '',
        emp.totalSalary || calculateTotalSalary(emp.basicSalary, emp.hra, emp.allowances),
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