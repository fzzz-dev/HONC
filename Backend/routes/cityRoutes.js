const createCRUDController = require("../controller/Crudcontroller");
const createRoutes = require("./factoryRoutes");
const City = require("../model/city");

const controller = createCRUDController(City);
module.exports = createRoutes(controller);
