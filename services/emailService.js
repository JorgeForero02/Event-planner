const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    },
    tls: {
        rejectUnauthorized: false  
    }
});

const EmailService = {
    enviarBienvenida: async (destinatario, nombre, rol) => {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: destinatario,
            subject: '¡Bienvenido a la plataforma!',
            html: `
        <h2>Hola ${nombre},</h2>
        <p>Te has registrado exitosamente en nuestra plataforma como <strong>${rol}</strong>.</p>
        <p>Ya puedes iniciar sesión con tu correo: <strong>${destinatario}</strong></p>
        <br>
        <p>¡Gracias por unirte!</p>
      `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Correo de bienvenida enviado a:', destinatario);
        } catch (error) {
            console.error('Error enviando correo de bienvenida:', error);
        }
    },

    enviarPromocionGerente: async (destinatario, nombre, nombreEmpresa) => {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: destinatario,
            subject: '¡Felicidades! Has sido promovido a Gerente',
            html: `
        <h2>Felicidades ${nombre},</h2>
        <p>Has sido promovido a <strong>Gerente</strong> de <strong>${nombreEmpresa}</strong>.</p>
        <p>Ahora tienes permisos adicionales para:</p>
        <ul>
          <li>Crear organizadores para tu empresa</li>
          <li>Gestionar eventos de tu empresa</li>
          <li>Administrar el equipo de trabajo</li>
        </ul>
        <p>Inicia sesión para empezar a usar tus nuevos permisos.</p>
      `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Correo de promoción enviado a:', destinatario);
        } catch (error) {
            console.error('Error enviando correo de promoción:', error);
        }
    },

    enviarCreacionOrganizador: async (destinatario, nombre, nombreEmpresa, contraseñaTemporal) => {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: destinatario,
            subject: 'Tu cuenta de Organizador ha sido creada',
            html: `
        <h2>Hola ${nombre},</h2>
        <p>Se ha creado una cuenta de <strong>Organizador</strong> para ti en <strong>${nombreEmpresa}</strong>.</p>
        <p><strong>Credenciales de acceso:</strong></p>
        <ul>
          <li>Correo: ${destinatario}</li>
          <li>Contraseña temporal: <code>${contraseñaTemporal}</code></li>
        </ul>
        <p><strong>⚠️ IMPORTANTE:</strong> Por seguridad, cambia tu contraseña en tu primer inicio de sesión.</p>
        <p><a href="${process.env.FRONTEND_URL}/login">Iniciar sesión ahora</a></p>
      `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Correo de creación de organizador enviado a:', destinatario);
        } catch (error) {
            console.error('Error enviando correo:', error);
        }
    }
};

module.exports = EmailService;
