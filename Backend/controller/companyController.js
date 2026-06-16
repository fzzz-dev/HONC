const { Company } = require("../model");
const path = require("path");
const fs = require("fs");

exports.getCompany = async (req, res) => {
  try {
    let company = await Company.findOne();
    if (!company) {
      // Create a default one if none exists
      company = await Company.create({ companyName: "Test Company" });
    }
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    let company = await Company.findOne();
    const data = { ...req.body };
    
    if (req.file) {
      data.logo = `/uploads/${req.file.filename}`;
      // Optional: delete old logo
      if (company && company.logo && company.logo.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '..', company.logo);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
    }

    if (company) {
      await company.update(data);
    } else {
      company = await Company.create(data);
    }
    res.json(company);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
