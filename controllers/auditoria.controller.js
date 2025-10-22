const AuditoriaService = require('../services/auditoriaService');
const ApiResponse = require('../utils/response');

const AuditoriaController = {
    getAll: async (req, res, next) => {
        try {
            const { tipo, accion, limite } = req.query;

            const filtros = {
                tipo,
                accion,
                limite: parseInt(limite) || 100
            };

            const registros = await AuditoriaService.obtenerRegistros(filtros);
            return ApiResponse.success(res, registros, 'Registros de auditoría obtenidos');
        } catch (error) {
            next(error);
        }
    }
};

module.exports = AuditoriaController;
