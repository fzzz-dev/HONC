const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");

const EnquiryDetail = sequelize.define("EnquiryDetail",{

    id:{
        type:DataTypes.INTEGER,
        autoIncrement:true,
        primaryKey:true
    },

    colour:{
        type:DataTypes.STRING,
        defaultValue:""
    },

    counts:{
        type:DataTypes.STRING,
        defaultValue:""
    },

    yarnType:{
        type:DataTypes.STRING,
        defaultValue:""
    },

    enqQty:{
        type:DataTypes.DECIMAL(12,3),
        defaultValue:0
    },

    exShadeNo:{
        type:DataTypes.STRING,
        defaultValue:""
    }

},{
    timestamps:true
});

module.exports = EnquiryDetail;