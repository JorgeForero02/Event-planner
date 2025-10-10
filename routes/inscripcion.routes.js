const express = require('express');
const router = express.Router();
const InscripcionController = require('../controllers/inscripcion.controller');

router.get('/', InscripcionController.getAll);
router.get('/:id', InscripcionController.getById);
router.post('/', InscripcionController.create);
router.put('/:id', InscripcionController.update);
router.delete('/:id', InscripcionController.delete);

module.exports = router;
