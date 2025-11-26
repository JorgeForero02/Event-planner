const express = require('express');
const router = express.Router();
const EncuestaController = require('../controllers/encuesta.controller');
const { auth, isAdminGerenteOrOrganizador } = require('../middlewares/auth');

router.post(
    '/',
    auth,
    isAdminGerenteOrOrganizador,
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
    EncuestaController.obtenerEncuestaPorId
);

router.put(
    '/:encuestaId',
    auth,
    isAdminGerenteOrOrganizador,
    EncuestaController.actualizarEncuesta
);

router.delete(
    '/:encuestaId',
    auth,
    isAdminGerenteOrOrganizador,
    EncuestaController.eliminarEncuesta
);

router.post(
    '/:encuestaId/enviar',
    auth,
    isAdminGerenteOrOrganizador,
    EncuestaController.enviarEncuesta
);

router.get(
    '/:encuestaId/estadisticas',
    auth,
    isAdminGerenteOrOrganizador,
    EncuestaController.obtenerEstadisticas
);

router.post(
    '/completar',
    auth,
    EncuestaController.completarEncuesta
);

module.exports = router;
