const express = require('express');
const router = express.Router();
const EncuestaController = require('../controllers/encuesta.controller');
const { auth, isAdminGerenteOrOrganizador, isAdminGerenteOrganizadorOrPonente } = require('../middlewares/auth');
const { 
    validarPermisoLecturaEncuestas, 
    validarPermiso,
    validarPermisoCreacionEncuesta
} = require('../validators/encuesta.validator');
router.post(
    '/',
    auth,
    isAdminGerenteOrganizadorOrPonente,
    validarPermisoCreacionEncuesta,
    EncuestaController.crearEncuesta
);

router.get(
    '/',
    auth,
    EncuestaController.obtenerEncuestas
);

router.get(
    '/:encuestaId',
    auth,
    validarPermiso,
    EncuestaController.obtenerEncuestaPorId
);

router.put(
    '/:encuestaId',
    auth,
    isAdminGerenteOrOrganizador,
    validarPermiso,
    EncuestaController.actualizarEncuesta
);

router.delete(
    '/:encuestaId',
    auth,
    isAdminGerenteOrOrganizador,
    validarPermiso,
    EncuestaController.eliminarEncuesta
);

router.post(
    '/:encuestaId/enviar',
    auth,
    isAdminGerenteOrOrganizador,
    validarPermiso,
    EncuestaController.enviarEncuesta
);

router.get(
    '/:encuestaId/estadisticas',
    auth,
    isAdminGerenteOrOrganizador,
    validarPermiso,
    EncuestaController.obtenerEstadisticas
);

router.post(
    '/completar',
    auth,
    EncuestaController.completarEncuesta
);

module.exports = router;
