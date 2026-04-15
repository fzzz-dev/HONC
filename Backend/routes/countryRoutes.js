const createCRUDController = require('../controller/Crudcontroller');
const createRoutes = require('./factoryRoutes');
const Country = require('../model/country');

const controller = createCRUDController(Country);
module.exports = createRoutes(controller);