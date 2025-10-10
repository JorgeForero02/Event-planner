const express = require('express');
const router = express.Router();
const CiudadController = require('../controllers/ciudad.controller');

router.get('/', CiudadController.getAll);
router.get('/:id', CiudadController.getById);
router.post('/', CiudadController.create);
router.put('/:id', CiudadController.update);
router.delete('/:id', CiudadController.delete);

module.exports = router;
