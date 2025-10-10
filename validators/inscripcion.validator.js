const { body } = require('express-validator');

const inscripcionValidator = {
  create: [
    body('id_asistente').isInt().withMessage('Asistente inválido'),
    body('id_evento').isInt().withMessage('Evento inválido'),
    body('fecha').isDate().withMessage('Fecha inválida')
  ],
  update: [
    body('estado').optional().isString().withMessage('Estado inválido')
  ]
};

module.exports = inscripcionValidator;
