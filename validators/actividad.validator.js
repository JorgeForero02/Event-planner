const { body } = require('express-validator');

const actividadValidator = {
  create: [
    body('titulo').notEmpty().withMessage('El título es requerido'),
    body('hora_inicio').notEmpty().withMessage('Hora de inicio requerida'),
    body('hora_fin').notEmpty().withMessage('Hora de fin requerida'),
    body('fecha_actividad').isDate().withMessage('Fecha inválida'),
    body('id_evento').isInt().withMessage('Evento inválido')
  ],
  update: [
    body('fecha_actividad').optional().isDate().withMessage('Fecha inválida')
  ]
};

module.exports = actividadValidator;
