const express = require('express');
const router = express.Router();
const EmpresaController = require('../controllers/empresa.controller');

router.get('/', EmpresaController.getAll);
router.get('/:id', EmpresaController.getById);
router.post('/', EmpresaController.create);
router.put('/:id', EmpresaController.update);
router.delete('/:id', EmpresaController.delete);

module.exports = router;
