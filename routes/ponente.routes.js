const express = require('express');
const router = express.Router();
const PonenteController = require('../controllers/ponente.controller');

router.get('/', PonenteController.getAll);
router.get('/:id', PonenteController.getById);
router.post('/', PonenteController.create);
router.put('/:id', PonenteController.update);
router.delete('/:id', PonenteController.delete);

module.exports = router;
