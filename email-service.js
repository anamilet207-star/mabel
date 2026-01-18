// email-service.js
const nodemailer = require('nodemailer');
const cron = require('node-cron');

class EmailService {
    constructor() {
        // Configurar el transportador de email
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: process.env.EMAIL_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });

        // Verificar conexión
        this.verifyConnection();
    }

    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Servicio de email configurado correctamente');
        } catch (error) {
            console.error('❌ Error configurando servicio de email:', error.message);
        }
    }

    // Enviar email de bienvenida
    async sendWelcomeEmail(user) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'Mabel Activewear',
                to: user.email,
                subject: `¡Bienvenida a Mabel Activewear, ${user.nombre}! 🎉`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            body { font-family: 'Montserrat', Arial, sans-serif; color: #333; line-height: 1.6; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: #000; color: white; padding: 30px; text-align: center; }
                            .header h1 { margin: 0; font-weight: 300; letter-spacing: 2px; }
                            .content { padding: 30px; background: #f8f8f8; }
                            .button { 
                                display: inline-block; 
                                background: #000; 
                                color: white; 
                                padding: 15px 30px; 
                                text-decoration: none; 
                                border-radius: 4px; 
                                margin: 20px 0; 
                                font-weight: 500;
                                letter-spacing: 1px;
                            }
                            .footer { 
                                text-align: center; 
                                padding: 20px; 
                                color: #666; 
                                font-size: 12px; 
                                border-top: 1px solid #eee;
                            }
                            .social-icons { margin: 20px 0; }
                            .social-icons a { 
                                display: inline-block; 
                                margin: 0 10px; 
                                color: #000; 
                                font-size: 20px; 
                            }
                            .product-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
                            .product-card { background: white; padding: 15px; border-radius: 8px; text-align: center; }
                            .product-card img { max-width: 100%; height: auto; border-radius: 4px; }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>MABEL ACTIVEWEAR</h1>
                            </div>
                            
                            <div class="content">
                                <h2>¡Bienvenida a nuestra comunidad, ${user.nombre}! 🎉</h2>
                                
                                <p>Estamos emocionados de que te unas a Mabel Activewear. Tu viaje hacia un estilo de vida activo y elegante comienza aquí.</p>
                                
                                <p>Como miembro de nuestra comunidad, ahora puedes:</p>
                                <ul>
                                    <li>✔️ Acceder a ofertas exclusivas para miembros</li>
                                    <li>✔️ Guardar tus productos favoritos</li>
                                    <li>✔️ Realizar compras más rápidas</li>
                                    <li>✔️ Recibir notificaciones de nuevos productos</li>
                                    <li>✔️ Seguir tu historial de pedidos</li>
                                </ul>
                                
                                <p style="text-align: center;">
                                    <a href="${process.env.SITE_URL || 'http://localhost:3000'}/shop" class="button">
                                        🛍️ EXPLORAR COLECCIÓN
                                    </a>
                                </p>
                                
                                <p>Para comenzar, te regalamos un <strong>10% de descuento</strong> en tu primera compra usando el código:</p>
                                <div style="background: white; padding: 15px; text-align: center; border-radius: 8px; border: 2px dashed #000;">
                                    <h3 style="margin: 0; color: #000; letter-spacing: 3px;">BIENVENIDA10</h3>
                                </div>
                                
                                <p><strong>Productos destacados que te pueden interesar:</strong></p>
                                <div class="product-grid">
                                    <div class="product-card">
                                        <div style="background: #f0f0f0; height: 150px; border-radius: 8px; margin-bottom: 10px;"></div>
                                        <strong>Leggings High-Waist</strong>
                                        <p>Alta compresión y máximo confort</p>
                                    </div>
                                    <div class="product-card">
                                        <div style="background: #f0f0f0; height: 150px; border-radius: 8px; margin-bottom: 10px;"></div>
                                        <strong>Sports Bra Essential</strong>
                                        <p>Soporte perfecto para tu entrenamiento</p>
                                    </div>
                                </div>
                                
                                <div class="social-icons">
                                    <p>Síguenos en nuestras redes:</p>
                                    <a href="https://www.instagram.com/mabelactivewear" target="_blank">📸 Instagram</a>
                                    <a href="https://www.tiktok.com/@mabelactivewear" target="_blank">🎵 TikTok</a>
                                </div>
                                
                                <p>¿Tienes preguntas? Estamos aquí para ayudarte.</p>
                                <p><strong>Equipo Mabel Activewear</strong></p>
                            </div>
                            
                            <div class="footer">
                                <p>© ${new Date().getFullYear()} Mabel Activewear. Todos los derechos reservados.</p>
                                <p>Este email fue enviado a ${user.email} porque te registraste en Mabel Activewear</p>
                                <p><a href="${process.env.SITE_URL || 'http://localhost:3000'}/unsubscribe" style="color: #666;">Cancelar suscripción</a></p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email de bienvenida enviado a: ${user.email}`);
            return info;
        } catch (error) {
            console.error(`❌ Error enviando email de bienvenida a ${user.email}:`, error);
            throw error;
        }
    }

    // Enviar notificación de nuevos productos
    async sendNewProductsNotification(users, newProducts) {
        try {
            if (!users.length || !newProducts.length) {
                console.log('⚠️ No hay usuarios o productos para enviar notificación');
                return;
            }

            console.log(`📧 Enviando notificación de nuevos productos a ${users.length} usuarios`);

            // Enviar a cada usuario
            for (const user of users) {
                try {
                    const mailOptions = {
                        from: process.env.EMAIL_FROM || 'Mabel Activewear',
                        to: user.email,
                        subject: `🚀 ¡Nuevos Productos en Mabel Activewear!`,
                        html: `
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <meta charset="UTF-8">
                                <style>
                                    body { font-family: 'Montserrat', Arial, sans-serif; color: #333; line-height: 1.6; }
                                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                                    .header { background: #000; color: white; padding: 30px; text-align: center; }
                                    .header h1 { margin: 0; font-weight: 300; letter-spacing: 2px; }
                                    .content { padding: 30px; background: #f8f8f8; }
                                    .button { 
                                        display: inline-block; 
                                        background: #000; 
                                        color: white; 
                                        padding: 15px 30px; 
                                        text-decoration: none; 
                                        border-radius: 4px; 
                                        margin: 20px 0; 
                                        font-weight: 500;
                                        letter-spacing: 1px;
                                    }
                                    .product-grid { 
                                        display: grid; 
                                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
                                        gap: 20px; 
                                        margin: 30px 0;
                                    }
                                    .product-card { 
                                        background: white; 
                                        padding: 15px; 
                                        border-radius: 8px; 
                                        text-align: center;
                                        border: 1px solid #eee;
                                        transition: transform 0.3s;
                                    }
                                    .product-card:hover { transform: translateY(-5px); }
                                    .product-card img { 
                                        width: 100%; 
                                        height: 200px; 
                                        object-fit: cover; 
                                        border-radius: 4px; 
                                        margin-bottom: 10px;
                                        background: #f0f0f0;
                                    }
                                    .product-price { 
                                        font-weight: bold; 
                                        color: #000; 
                                        margin: 10px 0;
                                        font-size: 18px;
                                    }
                                    .badge { 
                                        background: #000; 
                                        color: white; 
                                        padding: 5px 10px; 
                                        border-radius: 3px; 
                                        font-size: 12px;
                                        display: inline-block;
                                        margin-bottom: 10px;
                                    }
                                    .footer { 
                                        text-align: center; 
                                        padding: 20px; 
                                        color: #666; 
                                        font-size: 12px; 
                                        border-top: 1px solid #eee;
                                    }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <div class="header">
                                        <h1>NUEVA COLECCIÓN</h1>
                                    </div>
                                    
                                    <div class="content">
                                        <h2>¡Hola ${user.nombre}! 👋</h2>
                                        
                                        <p>Tenemos <strong>${newProducts.length} nuevos productos</strong> que sabemos que te van a encantar. 
                                           Diseñados pensando en tu comodidad y estilo.</p>
                                        
                                        <div class="product-grid">
                                            ${newProducts.slice(0, 4).map(product => `
                                                <div class="product-card">
                                                    ${product.tiene_descuento ? '<span class="badge">-' + product.descuento_porcentaje + '%</span>' : ''}
                                                    <div style="height: 200px; background: #f0f0f0; border-radius: 8px; margin-bottom: 15px;"></div>
                                                    <strong>${product.nombre}</strong>
                                                    <p style="color: #666; font-size: 14px; margin: 10px 0;">${product.categoria}</p>
                                                    <div class="product-price">
                                                        ${product.tiene_descuento ? 
                                                            `<span style="text-decoration: line-through; color: #999; font-size: 14px;">${product.precio_original_formateado}</span><br>` : ''}
                                                        ${product.precio_formateado}
                                                    </div>
                                                    <a href="${process.env.SITE_URL || 'http://localhost:3000'}/product-detail.html?id=${product.id}" 
                                                       style="color: #000; text-decoration: none; font-weight: 500; font-size: 14px;">
                                                        VER PRODUCTO →
                                                    </a>
                                                </div>
                                            `).join('')}
                                        </div>
                                        
                                        ${newProducts.length > 4 ? 
                                            `<p style="text-align: center; margin-top: 20px;">
                                                <small>... y ${newProducts.length - 4} productos más</small>
                                            </p>` : ''}
                                        
                                        <p style="text-align: center;">
                                            <a href="${process.env.SITE_URL || 'http://localhost:3000'}/shop" class="button">
                                                VER TODOS LOS NUEVOS PRODUCTOS
                                            </a>
                                        </p>
                                        
                                        <p><strong>No te lo pierdas:</strong></p>
                                        <ul>
                                            <li>🚚 Envío a la paquetería de tu elección</li>
                                            <li>💰 Precios especiales para la nueva colección</li>
                                            <li>⭐ Garantía de calidad Mabel Activewear</li>
                                        </ul>
                                        
                                        <p>¡Esperamos que te gusten tanto como a nosotros!</p>
                                        <p><strong>El equipo de Mabel Activewear</strong></p>
                                    </div>
                                    
                                    <div class="footer">
                                        <p>© ${new Date().getFullYear()} Mabel Activewear. Todos los derechos reservados.</p>
                                        <p><a href="${process.env.SITE_URL || 'http://localhost:3000'}/unsubscribe?email=${user.email}" 
                                              style="color: #666;">No quiero recibir estas notificaciones</a></p>
                                    </div>
                                </div>
                            </body>
                            </html>
                        `
                    };

                    await this.transporter.sendMail(mailOptions);
                    console.log(`✅ Notificación enviada a: ${user.email}`);
                    
                    // Pequeña pausa para no saturar el servidor SMTP
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error(`❌ Error enviando notificación a ${user.email}:`, error.message);
                    // Continuar con el siguiente usuario
                    continue;
                }
            }
            
            console.log('✅ Todas las notificaciones enviadas');
            
        } catch (error) {
            console.error('❌ Error en sendNewProductsNotification:', error);
            throw error;
        }
    }

    // Enviar email de confirmación de pedido
    async sendOrderConfirmation(order, user) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || 'Mabel Activewear',
                to: user.email,
                subject: `✅ Confirmación de Pedido #${order.id} - Mabel Activewear`,
                html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <style>
                            body { font-family: 'Montserrat', Arial, sans-serif; color: #333; line-height: 1.6; }
                            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                            .header { background: #000; color: white; padding: 30px; text-align: center; }
                            .header h1 { margin: 0; font-weight: 300; letter-spacing: 2px; }
                            .content { padding: 30px; background: #f8f8f8; }
                            .order-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
                            .order-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
                            .order-total { text-align: right; font-weight: bold; font-size: 18px; margin-top: 20px; }
                            .status { 
                                display: inline-block; 
                                padding: 5px 15px; 
                                border-radius: 20px; 
                                font-weight: 500;
                                background: #e8f5e9;
                                color: #2e7d32;
                            }
                            .footer { 
                                text-align: center; 
                                padding: 20px; 
                                color: #666; 
                                font-size: 12px; 
                                border-top: 1px solid #eee;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="container">
                            <div class="header">
                                <h1>CONFIRMACIÓN DE PEDIDO</h1>
                            </div>
                            
                            <div class="content">
                                <h2>¡Gracias por tu compra, ${user.nombre}! 🎉</h2>
                                
                                <p>Tu pedido <strong>#${order.id}</strong> ha sido confirmado y está siendo procesado.</p>
                                
                                <div style="margin: 20px 0;">
                                    <span class="status">${order.estado || 'PROCESANDO'}</span>
                                </div>
                                
                                <div class="order-info">
                                    <p><strong>Fecha:</strong> ${new Date(order.fecha_orden).toLocaleDateString('es-DO')}</p>
                                    <p><strong>Total:</strong> ${order.total}</p>
                                    <p><strong>Envío:</strong> ${order.metodo_envio || 'Paquetería estándar'}</p>
                                    ${order.tracking_number ? `<p><strong>Número de seguimiento:</strong> ${order.tracking_number}</p>` : ''}
                                    ${order.direccion_envio ? `<p><strong>Dirección:</strong> ${order.direccion_envio}</p>` : ''}
                                </div>
                                
                                <p>Puedes seguir el estado de tu pedido desde tu cuenta:</p>
                                <p style="text-align: center;">
                                    <a href="${process.env.SITE_URL || 'http://localhost:3000'}/account" 
                                       style="color: #000; text-decoration: none; font-weight: 500;">
                                        VER MI PEDIDO →
                                    </a>
                                </p>
                                
                                <p>Si tienes alguna pregunta sobre tu pedido, no dudes en contactarnos.</p>
                                
                                <p><strong>Equipo Mabel Activewear</strong></p>
                            </div>
                            
                            <div class="footer">
                                <p>© ${new Date().getFullYear()} Mabel Activewear. Todos los derechos reservados.</p>
                                <p>Este es un email automático de confirmación. Por favor no responder.</p>
                            </div>
                        </div>
                    </body>
                    </html>
                `
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Confirmación de pedido enviada: #${order.id}`);
            return info;
            
        } catch (error) {
            console.error(`❌ Error enviando confirmación de pedido ${order.id}:`, error);
            throw error;
        }
    }

    // Método para probar el servicio
    async testEmail(to) {
        try {
            const testUser = {
                email: to,
                nombre: 'Usuario de Prueba'
            };
            
            await this.sendWelcomeEmail(testUser);
            console.log(`✅ Email de prueba enviado a: ${to}`);
            return true;
        } catch (error) {
            console.error(`❌ Error enviando email de prueba:`, error);
            return false;
        }
    }
}

// Exportar instancia única
module.exports = new EmailService();