const { DataTypes } = require('sequelize');
const sequelize = require('../../config/database');

const HrEmployee = sequelize.define('HrEmployee', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true
  },
  employeeCode: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    field: 'employee_code'
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'first_name'
  },
  lastName: {
    type: DataTypes.STRING(100),
    field: 'last_name'
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    field: 'date_of_birth'
  },
  gender: {
    type: DataTypes.ENUM('Male', 'Female', 'Other'),
    defaultValue: 'Male'
  },
  bloodGroup: {
    type: DataTypes.STRING(5),
    field: 'blood_group',
    allowNull: true,
    comment: 'Employee blood group (A+, A-, B+, B-, O+, O-, AB+, AB-)'
  },
  contactPhone: {
    type: DataTypes.STRING(20),
    field: 'contact_phone'
  },
  contactEmail: {
    type: DataTypes.STRING(100),
    field: 'contact_email'
  },
  dateOfJoining: {
    type: DataTypes.DATEONLY,
    field: 'date_of_joining'
  },
  designationId: {
    type: DataTypes.BIGINT.UNSIGNED,
    field: 'designation_id'
  },
  departmentId: {
    type: DataTypes.BIGINT.UNSIGNED,
    field: 'department_id'
  },
  employmentType: {
    type: DataTypes.ENUM('Permanent', 'Contract', 'Temporary', 'Probation'),
    defaultValue: 'Permanent',
    field: 'employment_type'
  },
  basicSalary: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
    field: 'basic_salary'
  },
  hra: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  allowances: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0
  },
  accountHolderName: {
    type: DataTypes.STRING(100),
    field: 'account_holder_name'
  },
  bankBranch: {
    type: DataTypes.STRING(100),
    field: 'bank_branch'
  },
  panNumber: {
    type: DataTypes.STRING(20),
    field: 'pan_number'
  },
  aadharNumber: {
    type: DataTypes.STRING(20),
    field: 'aadhar_number'
  },
  pfNumber: {
    type: DataTypes.STRING(30),
    field: 'pf_number'
  },
  bankName: {
    type: DataTypes.STRING(100),
    field: 'bank_name'
  },
  bankAccountNo: {
    type: DataTypes.STRING(50),
    field: 'bank_account_no'
  },
  ifscCode: {
    type: DataTypes.STRING(20),
    field: 'ifsc_code'
  },
  presentAddress: {
    type: DataTypes.TEXT,
    field: 'present_address'
  },
  permanentAddress: {
    type: DataTypes.TEXT,
    field: 'permanent_address'
  },
  remarks: {
    type: DataTypes.TEXT
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active'
  },
  photoUrl: {
    type: DataTypes.STRING(500),
    field: 'photo_url',
    allowNull: true,
    comment: 'Employee photograph URL/path'
  },
  managementStaff: {
    type: DataTypes.ENUM('Yes', 'No'),
    defaultValue: 'No',
    field: 'management_staff',
    allowNull: false
  },
  visitorsAllowed: {
    type: DataTypes.ENUM('Yes', 'No'),
    defaultValue: 'No',
    field: 'visitors_allowed',
    allowNull: false
  },
  guest: {
    type: DataTypes.ENUM('Yes', 'No'),
    defaultValue: 'No',
    allowNull: false
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at',
    defaultValue: DataTypes.NOW
  },
  fatherName: {
  type: DataTypes.STRING(100),
  field: 'father_name',
  allowNull: true
},
totalSalary: {
  type: DataTypes.DECIMAL(12, 2),
  defaultValue: 0.00,
  field: 'total_salary'
},
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at',
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'hr_employee_master',
  timestamps: true,
  underscored: true
});


module.exports = HrEmployee;