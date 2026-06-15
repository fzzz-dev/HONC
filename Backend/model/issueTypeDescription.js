const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const IssueType = require("./issueType");

const IssueTypeDescription = sequelize.define("IssueTypeDescription", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  issueTypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "issue_types",
      key: "id",
    },
    onDelete: "CASCADE",
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: false,
    validate: {
      notEmpty: true,
    },
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
  tableName: "issue_type_descriptions",
});

// Define association
IssueType.hasMany(IssueTypeDescription, { 
  as: "descriptions", 
  foreignKey: "issueTypeId",
  onDelete: "CASCADE",
});
IssueTypeDescription.belongsTo(IssueType, { 
  foreignKey: "issueTypeId" 
});

module.exports = IssueTypeDescription;