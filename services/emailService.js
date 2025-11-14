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
    },

    enviarEmpresaRegistrada: async (destinatario, nombreUsuario, nombreEmpresa, nit) => {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: destinatario,
            subject: 'Empresa registrada - Pendiente de aprobación',
            html: `
        <h2>Hola ${nombreUsuario},</h2>
        <p>Has registrado exitosamente la empresa <strong>${nombreEmpresa}</strong> (NIT: ${nit}) en nuestra plataforma.</p>
        <p><strong>Estado actual:</strong> Pendiente de aprobación por el administrador.</p>
        <p>Recibirás un correo de confirmación una vez que tu empresa sea aprobada.</p>
        <br>
        <p>Esto puede tomar entre 24-48 horas hábiles.</p>
        <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
      `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Correo de empresa registrada enviado a:', destinatario);
        } catch (error) {
            console.error('Error enviando correo de empresa registrada:', error);
        }
    },

    enviarEmpresaAprobada: async (destinatario, nombreUsuario, nombreEmpresa) => {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: destinatario,
            subject: '¡Felicidades! Tu empresa ha sido aprobada',
            html: `
        <h2>¡Excelentes noticias, ${nombreUsuario}!</h2>
        <p>Tu empresa <strong>${nombreEmpresa}</strong> ha sido <strong>aprobada</strong> por nuestro equipo de administración.</p>
        <p><strong>¿Qué sigue?</strong></p>
        <ul>
          <li>Tu empresa ahora está activa en la plataforma</li>
          <li>Pronto serás contactado para ser asignado como gerente de la empresa</li>
          <li>Podrás crear organizadores y gestionar eventos para tu empresa</li>
        </ul>
        <p><a href="${process.env.FRONTEND_URL}/empresas">Ver mi empresa</a></p>
        <br>
        <p>¡Bienvenido a nuestra comunidad empresarial!</p>
      `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Correo de empresa aprobada enviado a:', destinatario);
        } catch (error) {
            console.error('Error enviando correo de empresa aprobada:', error);
        }
    },

    enviarEmpresaRechazada: async (destinatario, nombreUsuario, nombreEmpresa, motivo) => {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: destinatario,
            subject: 'Empresa no aprobada - Información adicional requerida',
            html: `
        <h2>Hola ${nombreUsuario},</h2>
        <p>Lamentamos informarte que tu empresa <strong>${nombreEmpresa}</strong> no ha sido aprobada.</p>
        <p><strong>Motivo:</strong></p>
        <p>${motivo}</p>
        <br>
        <p>Si deseas apelar esta decisión o proporcionar información adicional, por favor contacta a nuestro equipo de soporte.</p>
        <p>Estamos aquí para ayudarte.</p>
      `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Correo de empresa rechazada enviado a:', destinatario);
        } catch (error) {
            console.error('Error enviando correo de empresa rechazada:', error);
        }
    },

    enviarNotificacionCancelacion: async (
        destinatario,
        nombreUsuario,
        nombreEvento,
        correoCreador 
    ) => {

        const infoContacto = correoCreador
            ? `<p>Si tienes alguna consulta, por favor, ponte en contacto con el creador del evento a través de su correo:</p>
               <p><strong><a href="mailto:${correoCreador}">${correoCreador}</a></strong></p>`
            : `<p>Si tienes alguna consulta, por favor, ponte en contacto con el organizador del evento.</p>`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: destinatario,
            subject: `Notificación: El evento "${nombreEvento}" ha sido cancelado`,
            html: `
                <h2>Hola ${nombreUsuario},</h2>
                <p>Lamentamos informarte que el evento:</p>
                <h3 style="color: #dc3545;">${nombreEvento}</h3>
                <p>al cual estabas inscrito, ha sido <strong>cancelado</strong>.</p>
                <br>
                ${infoContacto} <!-- <-- MENSAJE ACTUALIZADO -->
                <p>Atentamente,<br>El equipo de Event Planner</p>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Correo de cancelación (asistente) enviado a:', destinatario);
        } catch (error) {
            console.error('Error enviando correo de cancelación (asistente):', error);
        }
    },

    enviarConfirmacionCancelacionCreador: async (
        destinatario,
        nombreUsuario,
        nombreEvento
    ) => {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: destinatario,
            subject: `Confirmación: Cancelación del evento "${nombreEvento}"`,
            html: `
                <h2>Hola ${nombreUsuario},</h2>
                <p>Te confirmamos que el evento:</p>
                <h3 style="color: #dc3545;">${nombreEvento}</h3>
                <p>del cual eres el creador, ha sido <strong>cancelado exitosamente</strong> en la plataforma.</p>
                <br>
                <p>Se ha notificado a los usuarios inscritos.</p>
                <p>Atentamente,<br>El equipo de Event Planner</p>
            `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Correo de confirmación de cancelación (creador) enviado a:', destinatario);
        } catch (error) {
            console.error('Error enviando correo de confirmación (creador):', error);
        }
    },

    enviarConfirmacionInscripcion: async (
        destinatario,
        nombreUsuario,
        nombreEvento,
        fechaEvento,
        codigoInscripcion
    ) => {
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: destinatario,
            subject: `¡Confirmación de inscripción: ${nombreEvento}!`,
            html: `
        <h2>¡Hola ${nombreUsuario}!</h2>
        <p>Has completado exitosamente tu inscripción para el evento:</p>
        <h3 style="color: #007bff;">${nombreEvento}</h3>
        
        <p><strong>Detalles del Evento:</strong></p>
        <ul>
          <li><strong>Fecha:</strong> ${fechaEvento}</li>
          <li><strong>Código de Inscripción:</strong> <code>${codigoInscripcion}</code></li>
        </ul>
        
        <p>Guarda este correo, ya que contiene tu código de inscripción, el cual podría ser solicitado para verificar tu asistencia.</p>
        <p>¡Esperamos verte allí!</p>
        <br>
        <p>Atentamente,<br>El equipo de Event Planner</p>
      `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Correo de confirmación de inscripción enviado a:', destinatario);
        } catch (error) {
            console.error('Error enviando correo de confirmación de inscripción:', error);
        }
    },

    enviarInvitacionInscripcion: async (
        destinatario,
        nombreUsuario,
        nombreGerente,
        nombreEvento,
        codigoConfirmacion
    ) => {
        // En producción, esto debería ser la URL del frontend
        // Por ahora, apuntará directamente a la API para la prueba
        const urlConfirmacion = `${process.env.BASE_URL || 'http://localhost:3000'}/api/inscripciones/confirmar/${codigoConfirmacion}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: destinatario,
            subject: `¡Has sido invitado al evento: ${nombreEvento}!`,
            html: `
        <h2>¡Hola ${nombreUsuario}!</h2>
        <p>Tu gerente/organizador, <strong>${nombreGerente}</strong>, te ha pre-inscrito en el siguiente evento:</p>
        <h3 style="color: #007bff;">${nombreEvento}</h3>
        
        <p>Tu inscripción está actualmente <strong>Pendiente</strong>. Por favor, haz clic en el siguiente enlace para confirmar tu asistencia:</p>
        
        <a href="${urlConfirmacion}" style="display: inline-block; padding: 12px 20px; margin: 15px 0; font-size: 16px; color: white; background-color: #28a745; text-decoration: none; border-radius: 5px;">
            Confirmar mi Asistencia
        </a>
        
        <p>Si no puedes hacer clic en el botón, copia y pega esta URL en tu navegador:</p>
        <p><code>${urlConfirmacion}</code></p>
        
        <p>Si no deseas asistir, simplemente ignora este correo.</p>
        <br>
        <p>Atentamente,<br>El equipo de Event Planner</p>
      `
        };

        try {
            await transporter.sendMail(mailOptions);
            console.log('Correo de invitación de inscripción enviado a:', destinatario);
        } catch (error) {
            console.error('Error enviando correo de invitación de inscripción:', error);
            throw error; // Lanzamos el error para que el controlador decida qué hacer
        }
    },

    enviarCreacionUsuarioPorAdmin: async (destinatario, nombre, rol, contraseñaTemporal, creadorNombre, empresaNombre = null) => {
        const empresaInfo = empresaNombre ? ` en **${empresaNombre}**` : '';
        
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: destinatario,
            subject: `Tu cuenta de ${rol} ha sido creada`,
            html: `
                <h2>¡Bienvenido ${nombre}!</h2>
                <p>El administrador <strong>${creadorNombre}</strong> ha creado una cuenta de <strong>${rol}</strong> para ti${empresaInfo}.</p>
                
                <h3>📧 Credenciales de acceso:</h3>
                <ul>
                    <li><strong>Correo:</strong> ${destinatario}</li>
                    <li><strong>Contraseña temporal:</strong> <code>${contraseñaTemporal}</code></li>
                </ul>
                
                <p><strong>⚠️ IMPORTANTE:</strong> Por seguridad, cambia tu contraseña en tu primer inicio de sesión.</p>
                
                <a href="${process.env.FRONTEND_URL}/login" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                    Iniciar sesión ahora
                </a>
            `
        };
        
        try {
            await transporter.sendMail(mailOptions);
            console.log('Correo de creación de usuario enviado a:', destinatario);
        } catch (error) {
            console.error('Error enviando correo de creación de usuario:', error);
        }
    }

};

module.exports = EmailService;
