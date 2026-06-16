const User = require("../model/User");

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    if (user.password !== password) {
      // In a real app, use bcrypt to compare hashed passwords
      return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        name: user.name,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
