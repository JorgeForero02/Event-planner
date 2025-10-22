const express = require('express');
const router = express.Router();

router.use('/empresas', require('./empresa.routes'));
router.use('/paises', require('./pais.routes'));
router.use('/ciudades', require('./ciudad.routes'));
router.use('/auth', require('./auth.routes'));
router.use('/gestion-usuarios', require('./gestion_usuarios.routes'));
router.use('/auditoria', require('./auditoria.routes'));

module.exports = router;
