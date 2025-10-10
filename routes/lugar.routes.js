const express = require('express');
const router = express.Router();
const LugarController = require('../controllers/lugar.controller');

router.get('/', LugarController.getAll);
router.get('/:id', LugarController.getById);
router.post('/', LugarController.create);
router.put('/:id', LugarController.update);
router.delete('/:id', LugarController.delete);

module.exports = router;
