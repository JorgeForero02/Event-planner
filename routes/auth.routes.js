const express = require('express');
const router = express.Router();
const { login, register, refresh, getProfile } = require('../controllers/auth.controller');
const { auth } = require('../middlewares/auth');

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Autenticación]
 *     summary: Registrar un nuevo usuario
 *     description: Crea un nuevo usuario en el sistema con el rol especificado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Usuario'
 *           examples:
 *             administrador:
 *               summary: Registrar Administrador
 *               value:
 *                 nombre: "Juan Pérez García"
 *                 cedula: "1234567890"
 *                 telefono: "3001234567"
 *                 correo: "admin@sistema.com"
 *                 contraseña: "Admin123!"
 *                 rol: "administrador"
 *             gerente:
 *               summary: Registrar Gerente
 *               value:
 *                 nombre: "Carlos Rodríguez"
 *                 cedula: "2345678901"
 *                 telefono: "3012345678"
 *                 correo: "gerente@techcorp.com"
 *                 contraseña: "Gerente123!"
 *                 rol: "gerente"
 *                 id_empresa: 1
 *             organizador:
 *               summary: Registrar Organizador
 *               value:
 *                 nombre: "María González"
 *                 cedula: "3456789012"
 *                 telefono: "3023456789"
 *                 correo: "organizador@techcorp.com"
 *                 contraseña: "Organizador123!"
 *                 rol: "organizador"
 *                 id_empresa: 1
 *             ponente:
 *               summary: Registrar Ponente
 *               value:
 *                 nombre: "Dr. Roberto Sánchez"
 *                 cedula: "4567890123"
 *                 telefono: "3034567890"
 *                 correo: "ponente@universidad.edu.co"
 *                 contraseña: "Ponente123!"
 *                 rol: "ponente"
 *                 especialidad: "Inteligencia Artificial"
 *             asistente:
 *               summary: Registrar Asistente
 *               value:
 *                 nombre: "Ana Ramírez"
 *                 cedula: "5678901234"
 *                 telefono: "3045678901"
 *                 correo: "asistente@email.com"
 *                 contraseña: "Asistente123!"
 *                 rol: "asistente"
 *     responses:
 *       201:
 *         description: Usuario registrado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Usuario registrado exitosamente como administrador"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     nombre:
 *                       type: string
 *                       example: "Juan Pérez García"
 *                     correo:
 *                       type: string
 *                       example: "admin@sistema.com"
 *                     rol:
 *                       type: string
 *                       example: "administrador"
 *       400:
 *         description: Error de validación
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', register);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Autenticación]
 *     summary: Iniciar sesión
 *     description: Autentica un usuario y devuelve tokens JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Login'
 *           examples:
 *             ejemplo1:
 *               summary: Login de ejemplo
 *               value:
 *                 correo: "admin@sistema.com"
 *                 contraseña: "Admin123!"
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Credenciales inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     tags: [Autenticación]
 *     summary: Renovar token de acceso
 *     description: Genera un nuevo access token usando el refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RefreshToken'
 *     responses:
 *       200:
 *         description: Token renovado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Token renovado exitosamente"
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       401:
 *         description: Refresh token inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/refresh', refresh);

/**
 * @swagger
 * /api/auth/profile:
 *   get:
 *     tags: [Usuarios]
 *     summary: Obtener perfil del usuario autenticado
 *     description: Retorna la información del usuario actual basado en el token JWT
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     usuario:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         nombre:
 *                           type: string
 *                           example: "Juan Pérez García"
 *                         cedula:
 *                           type: string
 *                           example: "1234567890"
 *                         telefono:
 *                           type: string
 *                           example: "3001234567"
 *                         correo:
 *                           type: string
 *                           example: "admin@sistema.com"
 *                         rol:
 *                           type: string
 *                           example: "administrador"
 *                         rolData:
 *                           type: object
 *                           description: "Información específica del rol"
 *       401:
 *         description: Token inválido o no proporcionado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', auth, getProfile);

module.exports = router;
