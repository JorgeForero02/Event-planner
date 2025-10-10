const express = require('express');
const router = express.Router();
const PaisController = require('../controllers/pais.controller');

router.get('/', PaisController.getAll);
router.get('/:id', PaisController.getById);
router.post('/', PaisController.create);
router.put('/:id', PaisController.update);
router.delete('/:id', PaisController.delete);

module.exports = router;
