const express = require('express');
const router = express.Router();

const costsController = require('../controllers/costs_controller');
const usersController = require('../controllers/users_controller');

// Setting up the endpoints routes
router.post('/add', costsController.addCost);
router.get('/report', costsController.getReport);
router.get('/users/:id', usersController.getUser);
router.get('/about', usersController.aboutUs);

router.get('/deletecosts', costsController.deleteAll);


module.exports = router;
