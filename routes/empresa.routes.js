const express = require('express');
const router = express.Router();
const EmpresaController = require('../controllers/empresa.controller');
const UbicacionController = require('../controllers/ubicacion.controller');
const LugarController = require('../controllers/lugar.controller');
const { auth, isAdministrador, isGerenteOrAdmin, isAdminGerenteOrOrganizador, isAsistenteAdministrador, isOrganizadorOGerente } = require('../middlewares/auth');
const auditoriaMiddleware = require('../middlewares/auditoria.middleware'); 

router.get('/', auth, isAdminGerenteOrOrganizador, EmpresaController.getAll);
router.get('/pendientes', auth, isAdministrador, EmpresaController.getPendientes);
router.get('/:id', auth, isAdminGerenteOrOrganizador, EmpresaController.getById);
router.post('/', auth, isAsistenteAdministrador, EmpresaController.create);
router.patch('/:id/aprobar', auth, isAdministrador, EmpresaController.aprobarEmpresa);
router.put('/:id', auth, isGerenteOrAdmin, EmpresaController.update);
router.delete('/:id', auth, isAdministrador, EmpresaController.delete);
router.get('/:id/equipo', auth, isAdminGerenteOrOrganizador, EmpresaController.getEquipo);

// --- RUTAS NUEVAS PARA UBICACIONES ANIDADAS ---
router.post(
    '/:empresaId/ubicaciones',
    auth,
    isOrganizadorOGerente,
    auditoriaMiddleware('POST'),
    UbicacionController.crearUbicacion
);

router.get(
    '/:empresaId/ubicaciones',
    auth,
    isAdminGerenteOrOrganizador, 
    auditoriaMiddleware('GET'),
    UbicacionController.obtenerUbicacionesEmpresa
);

router.post(
    '/:empresaId/lugares',
    auth,
    isOrganizadorOGerente,
    auditoriaMiddleware('POST'),
    LugarController.crearLugar
);

router.get(
    '/:empresaId/lugares',
    auth,
    isAdminGerenteOrOrganizador,
    auditoriaMiddleware('GET'),
    LugarController.obtenerLugaresEmpresa
);


module.exports = router;