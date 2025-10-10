const { body } = require('express-validator');

const eventoValidator = {
  create: [
    body('titulo').notEmpty().withMessage('El título es requerido'),
    body('fecha_inicio').isDate().withMessage('Fecha de inicio inválida'),
    body('fecha_fin').isDate().withMessage('Fecha de fin inválida')
  ],
  update: [
    body('fecha_inicio').optional().isDate().withMessage('Fecha inválida')
  ]
};

module.exports = eventoValidator;
