const { Permission } = require("../model");

exports.getPermissions = async (req, res) => {
  try {
    const permissions = await Permission.findAll();
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePermission = async (req, res) => {
  try {
    const { roleName, resourcePath, canAccess } = req.body;
    let permission = await Permission.findOne({ where: { roleName, resourcePath } });
    
    if (permission) {
      await permission.update({ canAccess });
    } else {
      permission = await Permission.create({ roleName, resourcePath, canAccess });
    }
    
    res.json(permission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
