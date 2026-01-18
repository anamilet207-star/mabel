// email-scheduler.js
const cron = require('node-cron');
const { query } = require('./env/db.js');
const emailService = require('./email-service');

class EmailScheduler {
    constructor() {
        this.initSchedules();
    }
    
    initSchedules() {
        // Programar email semanal de productos destacados (Lunes a las 10 AM)
        cron.schedule('0 10 * * 1', async () => {
            console.log('📅 Ejecutando email semanal de productos destacados...');
            await this.sendWeeklyFeaturedProducts();
        });
        
        // Programar recordatorio de carrito abandonado (diario a las 2 PM)
        cron.schedule('0 14 * * *', async () => {
            console.log('📅 Buscando carritos abandonados...');
            await this.sendAbandonedCartReminders();
        });
        
        // Programar email mensual de ofertas (día 1 de cada mes a las 9 AM)
        cron.schedule('0 9 1 * *', async () => {
            console.log('📅 Enviando ofertas del mes...');
            await this.sendMonthlyOffers();
        });
        
        console.log('✅ Programador de emails inicializado');
    }
    
    async sendWeeklyFeaturedProducts() {
        try {
            // Obtener productos destacados de la semana
            const productsResult = await query(`
                SELECT * FROM productos 
                WHERE activo = true 
                AND stock > 0 
                AND fecha_creacion >= NOW() - INTERVAL '7 days'
                ORDER BY fecha_creacion DESC 
                LIMIT 6
            `);
            
            const featuredProducts = productsResult.rows;
            
            if (featuredProducts.length === 0) {
                console.log('⚠️ No hay productos nuevos esta semana');
                return;
            }
            
            // Obtener usuarios suscritos
            const usersResult = await query(`
                SELECT DISTINCT u.id, u.nombre, u.email 
                FROM usuarios u
                WHERE u.email IS NOT NULL 
                AND u.activo = true
                ORDER BY u.fecha_registro DESC
            `);
            
            const users = usersResult.rows;
            
            if (users.length === 0) {
                console.log('⚠️ No hay usuarios para enviar email semanal');
                return;
            }
            
            console.log(`📧 Enviando productos destacados a ${users.length} usuarios`);
            
            // Aquí implementarías el envío del email semanal
            // Por simplicidad, enviaremos uno por uno
            for (const user of users) {
                try {
                    // Crear contenido personalizado
                    const mailOptions = {
                        from: process.env.EMAIL_FROM || 'Mabel Activewear',
                        to: user.email,
                        subject: '🚀 Productos Destacados de la Semana - Mabel Activewear',
                        html: `
                            <div style="font-family: 'Montserrat', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                                <div style="background: #000; color: white; padding: 30px; text-align: center;">
                                    <h1 style="margin: 0; font-weight: 300; letter-spacing: 3px;">PRODUCTOS DESTACADOS</h1>
                                    <p style="opacity: 0.8; margin-top: 10px;">Esta semana en Mabel Activewear</p>
                                </div>
                                
                                <div style="padding: 30px; background: #f8f8f8;">
                                    <h2 style="color: #333;">Hola ${user.nombre},</h2>
                                    <p>Estos son los productos más destacados de esta semana:</p>
                                    
                                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 30px 0;">
                                        ${featuredProducts.slice(0, 4).map(product => `
                                            <div style="background: white; padding: 15px; border-radius: 8px; text-align: center;">
                                                <div style="height: 150px; background: #f0f0f0; border-radius: 8px; margin-bottom: 15px;"></div>
                                                <strong>${product.nombre}</strong>
                                                <p style="color: #666; margin: 10px 0;">${product.categoria}</p>
                                                <a href="${process.env.SITE_URL || 'http://localhost:3000'}/product-detail.html?id=${product.id}" 
                                                   style="color: #000; text-decoration: none; font-weight: 500;">
                                                    VER PRODUCTO →
                                                </a>
                                            </div>
                                        `).join('')}
                                    </div>
                                    
                                    <div style="text-align: center; margin: 30px 0;">
                                        <a href="${process.env.SITE_URL || 'http://localhost:3000'}/shop" 
                                           style="display: inline-block; background: #000; color: white; padding: 15px 30px; 
                                                  text-decoration: none; border-radius: 4px; font-weight: 500;">
                                            VER TODOS LOS PRODUCTOS
                                        </a>
                                    </div>
                                    
                                    <p style="color: #666; font-size: 14px; text-align: center;">
                                        No te pierdas nuestras ofertas especiales esta semana.
                                    </p>
                                </div>
                                
                                <div style="text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee;">
                                    <p>© ${new Date().getFullYear()} Mabel Activewear</p>
                                    <p><a href="${process.env.SITE_URL || 'http://localhost:3000'}/unsubscribe?email=${user.email}" 
                                          style="color: #666;">Cancelar suscripción</a></p>
                                </div>
                            </div>
                        `
                    };
                    
                    await emailService.transporter.sendMail(mailOptions);
                    console.log(`✅ Email semanal enviado a: ${user.email}`);
                    
                    // Pequeña pausa
                    await new Promise(resolve => setTimeout(resolve, 100));
                    
                } catch (error) {
                    console.error(`❌ Error enviando email semanal a ${user.email}:`, error.message);
                    continue;
                }
            }
            
            console.log('✅ Emails semanales enviados');
            
        } catch (error) {
            console.error('❌ Error en sendWeeklyFeaturedProducts:', error);
        }
    }
    
    async sendAbandonedCartReminders() {
        try {
            // Buscar carritos abandonados (creados hace más de 1 día pero menos de 3 días)
            const abandonedCarts = []; // Aquí implementarías la lógica para buscar carritos
            
            if (abandonedCarts.length > 0) {
                console.log(`📧 Enviando recordatorios de carrito a ${abandonedCarts.length} usuarios`);
                // Implementar envío de recordatorios
            }
            
        } catch (error) {
            console.error('❌ Error en sendAbandonedCartReminders:', error);
        }
    }
    
    async sendMonthlyOffers() {
        try {
            // Buscar productos en oferta
            const offersResult = await query(`
                SELECT * FROM productos 
                WHERE activo = true 
                AND stock > 0 
                AND (descuento_porcentaje > 0 OR descuento_precio > 0)
                ORDER BY descuento_porcentaje DESC 
                LIMIT 8
            `);
            
            const offers = offersResult.rows;
            
            if (offers.length === 0) {
                console.log('⚠️ No hay ofertas este mes');
                return;
            }
            
            // Obtener usuarios
            const usersResult = await query(`
                SELECT id, nombre, email FROM usuarios 
                WHERE email IS NOT NULL AND activo = true
            `);
            
            const users = usersResult.rows;
            
            console.log(`📧 Enviando ofertas del mes a ${users.length} usuarios`);
            
            // Implementar envío de ofertas mensuales
            // Similar a sendWeeklyFeaturedProducts
            
        } catch (error) {
            console.error('❌ Error en sendMonthlyOffers:', error);
        }
    }
}

module.exports = new EmailScheduler();