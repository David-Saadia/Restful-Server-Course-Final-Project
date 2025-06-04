const express = require('express');
const router = express.Router();

const costsController = require('../controllers/costsController');
const usersController = require('../controllers/usersController');

router.post('/add', costsController.addCost);
router.get('/report', costsController.getReport);
router.get('/users/:id', usersController.getUser);
router.get('/about', usersController.aboutUs);

router.get('/deletecosts', costsController.deleteAll);


module.exports = router;
