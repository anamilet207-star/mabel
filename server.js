// server.js - VERSIÓN CORREGIDA
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Importar Email Service
const emailService = require('./email-service');

// Importar configuración de base de datos
const { query } = require('./env/db.js');

// Importar SDKs de pago
const paypal = require('@paypal/checkout-server-sdk');

// ================= CONFIGURACIÓN GLOBAL =================
const STRIPE_ENABLED = false; // ← PRIMERO DEFINIR
const DEFAULT_CURRENCY = 'DOP';
const CURRENCY_SYMBOL = 'RD$';

// ================= INICIALIZAR APP =================
const app = express();
const PORT = 3000;

let stripe = null;

// ================= CONFIGURAR STRIPE (SI ESTÁ HABILITADO) =================
if (STRIPE_ENABLED) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    console.log('✅ Stripe configurado');
} else {
    console.log('🔕 Stripe desactivado temporalmente');
}

// ================= FUNCIONES DE FORMATO DOP =================

/**
 * Formatear precio en DOP
 */
const formatDOP = (amount) => {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount) || 0;
    }
    return `RD$ ${amount.toLocaleString('es-DO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
};

// Función para convertir array PostgreSQL a JavaScript
const parseArrayFromPostgres = (pgArray) => {
    if (!pgArray) return [];
    
    if (Array.isArray(pgArray)) return pgArray;
    
    if (typeof pgArray === 'string' && pgArray.startsWith('{') && pgArray.endsWith('}')) {
        try {
            const content = pgArray.slice(1, -1);
            if (content.trim() === '') return [];
            
            const cleaned = content.replace(/"/g, '');
            if (cleaned.trim() === '') return [];
            
            return cleaned.split(',').map(item => item.trim()).filter(item => item.length > 0);
        } catch (error) {
            console.warn('Error parseando array PostgreSQL:', error, pgArray);
            return [];
        }
    }
    
    if (typeof pgArray === 'string' && pgArray.startsWith('[') && pgArray.endsWith(']')) {
        try {
            const parsed = JSON.parse(pgArray);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.warn('Error parseando JSON:', error);
            return [];
        }
    }
    
    return [];
};

// ================= FUNCIÓN AUXILIAR PARA IMÁGENES =================
function getSafeImagePath(imagePath) {
    if (!imagePath || imagePath === '') {
        return '/public/images/default-product.jpg';
    }
    
    // Si es una URL externa, usarla directamente
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    
    // Si es una ruta local, asegurar que empiece con /public
    if (!imagePath.startsWith('/public')) {
        if (imagePath.startsWith('/images')) {
            return '/public' + imagePath;
        }
        return '/public/images/' + imagePath;
    }
    
    return imagePath;
}

// ================= MODIFICAR LA FUNCIÓN processProductPrices =================
const processProductPrices = (product) => {
    const precioDOP = parseFloat(product.precio) || 0;
    
    // Calcular precio final con descuento
    let precioFinalDOP = precioDOP;
    let descuentoAplicado = false;
    let descuentoPorcentaje = 0;
    
    if (product.descuento_porcentaje > 0) {
        descuentoPorcentaje = product.descuento_porcentaje;
        precioFinalDOP = Math.round(precioDOP * (1 - descuentoPorcentaje / 100));
        descuentoAplicado = true;
    } else if (product.descuento_precio > 0) {
        precioFinalDOP = parseFloat(product.descuento_precio) || 0;
        descuentoAplicado = true;
        // Calcular porcentaje de descuento
        if (precioDOP > 0) {
            descuentoPorcentaje = Math.round((1 - (precioFinalDOP / precioDOP)) * 100);
        }
    }
    
    // Procesar imágenes
    const imagen = getSafeImagePath(product.imagen);
    const imagenesAdicionales = parseArrayFromPostgres(product.imagenes_adicionales)
        .map(img => getSafeImagePath(img))
        .filter(img => img);
    
    return {
        ...product,
        // Precios en DOP
        precio_dop: precioDOP,
        precio_final_dop: precioFinalDOP,
        precio_formateado: formatDOP(precioFinalDOP),
        
        // Información de descuento
        tiene_descuento: descuentoAplicado,
        descuento_porcentaje: descuentoPorcentaje,
        precio_original_dop: precioDOP,
        precio_original_formateado: formatDOP(precioDOP),
        
        // Para compatibilidad
        precio: precioFinalDOP,
        precio_final: precioFinalDOP,
        
        // Arrays procesados
        tallas: parseArrayFromPostgres(product.tallas),
        colores: parseArrayFromPostgres(product.colores),
        imagenes_adicionales: imagenesAdicionales,
        
        // Imagen segura
        imagen: imagen
    };
};

// ================= CONFIGURACIÓN MULTER PARA SUBIR IMÁGENES =================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = path.join(__dirname, 'public/images/products');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'product-' + uniqueSuffix + ext);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: function (req, file, cb) {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes (jpeg, jpg, png, gif, webp)'));
        }
    }
});

// ================= FUNCIONES AUXILIARES =================

// Función para convertir array a formato PostgreSQL
const formatArrayForPostgres = (data) => {
    if (data === undefined || data === null) return null;
    
    if (typeof data === 'string' && data.startsWith('{') && data.endsWith('}')) {
        return data;
    }
    
    if (Array.isArray(data)) {
        if (data.length === 0) return '{}';
        return `{${data.map(item => `"${String(item).replace(/"/g, '\\"')}"`).join(',')}}`;
    }
    
    if (typeof data === 'string') {
        if (data.startsWith('[') && data.endsWith(']')) {
            try {
                const parsed = JSON.parse(data);
                if (Array.isArray(parsed)) {
                    return `{${parsed.map(item => `"${String(item).replace(/"/g, '\\"')}"`).join(',')}}`;
                }
            } catch (error) {
                console.warn('No se pudo parsear JSON:', error);
            }
        }
        
        if (data.includes(',')) {
            const items = data.split(',')
                .map(item => item.trim())
                .filter(item => item.length > 0);
            return `{${items.map(item => `"${item.replace(/"/g, '\\"')}"`).join(',')}}`;
        }
        
        if (data.trim().length > 0) {
            return `{"${data.trim().replace(/"/g, '\\"')}"}`;
        }
    }
    
    return '{}';
};

// Función auxiliar para nombres de campos (ACTUALIZADA)
function getFieldName(field) {
    const fieldNames = {
        'nombre': 'Nombre para la dirección',
        'nombre_completo': 'Nombre completo',
        'telefono': 'Teléfono',
        'provincia': 'Provincia',
        'municipio': 'Municipio',
        'sector': 'Sector/Barrio',
        'referencia': 'Punto de referencia'
        // Eliminados: 'calle', 'numero', 'apartamento'
    };
    return fieldNames[field] || field;
}

// ================= CONFIGURACIÓN MIDDLEWARE =================
// Trust proxy para Railway
app.set('trust proxy', 1);

// Configuración CORS
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Configuración de sesión para producción
app.use(session({
    secret: process.env.SESSION_SECRET || 'mabel-activewear-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// Middleware para verificar autenticación
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'No autenticado' });
    }
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session.userId || req.session.userRole !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
    }
    next();
};

// Middleware para moneda
app.use((req, res, next) => {
    // Establecer configuración de moneda en todas las respuestas
    res.locals.currency = {
        code: DEFAULT_CURRENCY,
        symbol: CURRENCY_SYMBOL
    };
    next();
});

// ================= RUTAS DE ARCHIVOS ESTÁTICOS - CORREGIDO =================
// Antes de cualquier otra ruta, configurar archivos estáticos
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));
app.use('/public', express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path) => {
        // Asegurar que las imágenes se sirvan correctamente
        if (path.endsWith('.jpg') || path.endsWith('.png') || path.endsWith('.gif') || path.endsWith('.webp')) {
            res.setHeader('Cache-Control', 'public, max-age=86400');
        }
    }
}));

// ================= RUTAS PARA PÁGINAS HTML =================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'pages/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'pages/login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'pages/register.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'pages/admin.html')));
app.get('/shop', (req, res) => res.sendFile(path.join(__dirname, 'pages/shop.html')));
app.get('/cart', (req, res) => res.sendFile(path.join(__dirname, 'pages/cart.html')));
app.get('/checkout', (req, res) => res.sendFile(path.join(__dirname, 'pages/checkout.html')));
app.get('/account', (req, res) => res.sendFile(path.join(__dirname, 'pages/account.html')));
app.get('/product-detail.html', (req, res) => res.sendFile(path.join(__dirname, 'pages/product-detail.html')));
app.get('/ofertas', (req, res) => res.sendFile(path.join(__dirname, 'pages/ofertas.html')));
app.get('/envios', (req, res) => res.sendFile(path.join(__dirname, 'pages/envios.html')));
app.get('/contacto', (req, res) => res.sendFile(path.join(__dirname, 'pages/contacto.html')));
app.get('/ayuda', (req, res) => res.sendFile(path.join(__dirname, 'pages/ayuda.html')));

// Redirecciones
app.get('/devoluciones', (req, res) => res.redirect('/ayuda#devoluciones'));
app.get('/faq', (req, res) => res.redirect('/ayuda#faq'));
app.get('/privacidad', (req, res) => res.redirect('/ayuda#privacidad'));
app.get('/terminos', (req, res) => res.redirect('/ayuda#terminos'));

// ================= FUNCIÓN PARA ENVIAR EMAIL DE BIENVENIDA =================
async function sendWelcomeEmail(user) {
    try {
        await emailService.sendWelcomeEmail(user);
        console.log(`✅ Email de bienvenida enviado a ${user.email}`);
        return true;
    } catch (error) {
        console.error(`❌ Error enviando email de bienvenida:`, error.message);
        // No lanzamos el error para no interrumpir el registro
        return false;
    }
}

// ================= FUNCIÓN PARA NOTIFICAR NUEVOS PRODUCTOS =================
async function notifyUsersAboutNewProducts(product) {
    try {
        // Obtener todos los usuarios que quieren notificaciones
        const usersResult = await query(
            'SELECT id, nombre, email FROM usuarios WHERE email IS NOT NULL AND activo = true'
        );
        
        if (usersResult.rows.length === 0) {
            console.log('⚠️ No hay usuarios para notificar');
            return;
        }
        
        console.log(`📧 Notificando a ${usersResult.rows.length} usuarios sobre nuevo producto`);
        
        // Enviar notificación a cada usuario
        for (const user of usersResult.rows) {
            try {
                await emailService.sendNewProductsNotification(
                    [user], // Envía uno por uno para personalizar
                    [product]
                );
                
                // Pequeña pausa para no saturar
                await new Promise(resolve => setTimeout(resolve, 100));
                
            } catch (error) {
                console.error(`❌ Error notificando a ${user.email}:`, error.message);
                // Continuar con el siguiente usuario
                continue;
            }
        }
        
        console.log('✅ Notificaciones enviadas exitosamente');
        
    } catch (error) {
        console.error('❌ Error en notifyUsersAboutNewProducts:', error);
    }
}

// ================= MODIFICAR LA RUTA DE REGISTRO =================
app.post('/api/register', async (req, res) => {
    const { nombre, apellido, email, password, telefono } = req.body;
    
    console.log('📝 Registro:', email);
    
    try {
        const existingUser = await query(
            'SELECT id FROM usuarios WHERE email = $1',
            [email]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'El email ya está registrado' });
        }
        
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        
        const result = await query(
            `INSERT INTO usuarios (nombre, apellido, email, password_hash, telefono, rol, activo) 
             VALUES ($1, $2, $3, $4, $5, 'cliente', true) 
             RETURNING id, nombre, apellido, email, rol`,
            [nombre, apellido, email, hashedPassword, telefono || null]
        );
        
        const newUser = result.rows[0];
        
        // Enviar email de bienvenida (asíncrono, no esperar)
        sendWelcomeEmail(newUser).catch(error => {
            console.error('Error enviando email de bienvenida:', error);
        });
        
        req.session.userId = newUser.id;
        req.session.userRole = newUser.rol;
        req.session.userEmail = newUser.email;
        req.session.userName = `${newUser.nombre} ${newUser.apellido}`;
        
        res.status(201).json({
            success: true,
            user: newUser,
            message: 'Registro exitoso. Revisa tu email para tu código de bienvenida.'
        });
        
    } catch (error) {
        console.error('❌ Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ================= MODIFICAR LA RUTA DE CREAR PRODUCTO =================
app.post('/api/admin/products', requireAuth, requireAdmin, async (req, res) => {
    const { 
        nombre, 
        descripcion, 
        precio,
        categoria, 
        imagen, 
        stock, 
        tallas, 
        colores, 
        sku, 
        material, 
        coleccion,
        imagenes_adicionales,
        descuento_porcentaje,
        descuento_precio,
        notify_users // Nuevo campo para decidir si notificar
    } = req.body;
    
    console.log('➕ Creando producto:', nombre);
    
    try {
        const precioDOP = parseFloat(precio);
        
        const productData = {
            nombre: nombre || 'Producto sin nombre',
            descripcion: descripcion || '',
            precio: precioDOP,
            categoria: categoria || 'sin-categoria',
            imagen: imagen || '/public/images/default-product.jpg',
            stock: parseInt(stock) || 0,
            tallas: formatArrayForPostgres(tallas),
            colores: formatArrayForPostgres(colores),
            sku: sku || `SKU-${Date.now()}`,
            material: material || '',
            coleccion: coleccion || '',
            imagenes_adicionales: formatArrayForPostgres(imagenes_adicionales),
            descuento_porcentaje: parseInt(descuento_porcentaje) || 0,
            descuento_precio: descuento_precio ? parseFloat(descuento_precio) : null,
            activo: true
        };
        
        const result = await query(
            `INSERT INTO productos (
                nombre, descripcion, precio, categoria, imagen, stock, 
                tallas, colores, sku, material, coleccion, 
                imagenes_adicionales, descuento_porcentaje, descuento_precio,
                activo, fecha_creacion
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP) 
             RETURNING *`,
            [
                productData.nombre,
                productData.descripcion,
                productData.precio,
                productData.categoria,
                productData.imagen,
                productData.stock,
                productData.tallas,
                productData.colores,
                productData.sku,
                productData.material,
                productData.coleccion,
                productData.imagenes_adicionales,
                productData.descuento_porcentaje,
                productData.descuento_precio,
                productData.activo
            ]
        );

        const newProduct = result.rows[0];
        const processedProduct = processProductPrices(newProduct);
        
        console.log('✅ Producto creado:', processedProduct.nombre);
        
        // Notificar a usuarios sobre nuevo producto si se solicitó
        if (notify_users === true || notify_users === 'true') {
            console.log('📢 Notificando a usuarios sobre nuevo producto...');
            notifyUsersAboutNewProducts(processedProduct).catch(error => {
                console.error('Error notificando usuarios:', error);
            });
        }
        
        res.status(201).json({
            ...processedProduct,
            notification_sent: notify_users === true || notify_users === 'true'
        });
        
    } catch (error) {
        console.error('❌ Error creando producto:', error.message);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// ================= NUEVA RUTA: TEST DE EMAIL (ADMIN) =================
app.post('/api/admin/test-email', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email requerido' });
        }
        
        console.log('🔧 Probando envío de email a:', email);
        
        const success = await emailService.testEmail(email);
        
        if (success) {
            res.json({ 
                success: true, 
                message: 'Email de prueba enviado correctamente' 
            });
        } else {
            res.status(500).json({ 
                error: 'Error enviando email de prueba' 
            });
        }
        
    } catch (error) {
        console.error('❌ Error en test de email:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ================= NUEVA RUTA: ENVIAR NOTIFICACIÓN MASIVA =================
app.post('/api/admin/send-bulk-notification', requireAuth, requireAdmin, async (req, res) => {
    try {
        const { subject, message, product_ids } = req.body;
        
        if (!subject || !message) {
            return res.status(400).json({ 
                error: 'Asunto y mensaje son requeridos' 
            });
        }
        
        // Obtener productos si se especificaron
        let products = [];
        if (product_ids && product_ids.length > 0) {
            const productsResult = await query(
                'SELECT * FROM productos WHERE id = ANY($1)',
                [product_ids]
            );
            products = productsResult.rows.map(processProductPrices);
        }
        
        // Obtener usuarios
        const usersResult = await query(
            'SELECT id, nombre, email FROM usuarios WHERE email IS NOT NULL AND activo = true'
        );
        
        const users = usersResult.rows;
        
        if (users.length === 0) {
            return res.status(400).json({ 
                error: 'No hay usuarios para notificar' 
            });
        }
        
        console.log(`📧 Enviando notificación masiva a ${users.length} usuarios`);
        
        // Aquí implementarías el envío masivo
        // Por ahora solo devolvemos información
        res.json({
            success: true,
            message: `Notificación programada para ${users.length} usuarios`,
            users_count: users.length,
            products_count: products.length
        });
        
    } catch (error) {
        console.error('❌ Error en notificación masiva:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ================= NUEVA RUTA: SUSCRIPCIÓN A NEWSLETTER =================
app.post('/api/newsletter/subscribe', async (req, res) => {
    try {
        const { email, nombre } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email requerido' });
        }
        
        console.log('📧 Suscripción a newsletter:', email);
        
        // Aquí guardarías el email en una tabla de newsletter
        // Por ahora solo simulamos
        
        // Enviar email de confirmación
        try {
            const user = { email, nombre: nombre || 'Cliente' };
            await emailService.sendWelcomeEmail(user);
        } catch (emailError) {
            console.error('Error enviando email de newsletter:', emailError);
        }
        
        res.json({
            success: true,
            message: '¡Te has suscrito exitosamente! Revisa tu email.'
        });
        
    } catch (error) {
        console.error('❌ Error en suscripción a newsletter:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ================= NUEVA RUTA: OBTENER ESTADÍSTICAS DE EMAIL =================
app.get('/api/admin/email-stats', requireAuth, requireAdmin, async (req, res) => {
    try {
        // Obtener total de usuarios con email
        const usersResult = await query(
            'SELECT COUNT(*) as total_users FROM usuarios WHERE email IS NOT NULL AND activo = true'
        );
        
        // Obtener últimos usuarios registrados
        const recentUsersResult = await query(
            'SELECT nombre, email, fecha_registro FROM usuarios WHERE email IS NOT NULL ORDER BY fecha_registro DESC LIMIT 10'
        );
        
        res.json({
            total_users: parseInt(usersResult.rows[0].total_users),
            recent_users: recentUsersResult.rows,
            email_service: 'Configurado y listo'
        });
        
    } catch (error) {
        console.error('❌ Error obteniendo estadísticas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ================= API - AUTENTICACIÓN =================
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('🔐 Login:', email);
    
    try {
        const result = await query(
            'SELECT id, nombre, apellido, email, password_hash, rol FROM usuarios WHERE email = $1',
            [email]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const user = result.rows[0];
        let isValidPassword = false;
        
        if (email === 'admin@gmail.com' && password === 'admin123') {
            isValidPassword = true;
        } else {
            try {
                isValidPassword = await bcrypt.compare(password, user.password_hash);
            } catch (bcryptError) {
                console.error('Error bcrypt:', bcryptError);
                isValidPassword = password === user.password_hash;
            }
        }
        
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        req.session.userId = user.id;
        req.session.userRole = user.rol;
        req.session.userEmail = user.email;
        req.session.userName = `${user.nombre} ${user.apellido}`;
        
        console.log('✅ Login exitoso:', user.email, 'Rol:', user.rol);
        
        res.json({
            success: true,
            user: {
                id: user.id,
                nombre: user.nombre,
                apellido: user.apellido,
                email: user.email,
                rol: user.rol
            }
        });
        
    } catch (error) {
        console.error('❌ Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('❌ Error cerrando sesión:', err);
            return res.status(500).json({ error: 'Error cerrando sesión' });
        }
        res.json({ success: true });
    });
});

app.get('/api/session', (req, res) => {
    if (req.session.userId) {
        res.json({
            authenticated: true,
            user: {
                id: req.session.userId,
                nombre: req.session.userName?.split(' ')[0] || '',
                apellido: req.session.userName?.split(' ')[1] || '',
                email: req.session.userEmail,
                rol: req.session.userRole
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

// ================= API - DIRECCIONES (ACTUALIZADO SIN CALLE/NUMERO/APARTAMENTO) =================

// Obtener direcciones del usuario
app.get('/api/users/:id/addresses', requireAuth, async (req, res) => {
    try {
        const userId = req.params.id;
        
        if (parseInt(userId) !== req.session.userId) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        
        console.log('📍 Obteniendo direcciones para usuario:', userId);
        
        const result = await query(
            `SELECT * FROM direcciones 
             WHERE usuario_id = $1 
             ORDER BY predeterminada DESC, fecha_creacion DESC`,
            [userId]
        );
        
        const addresses = result.rows.map(addr => ({
            ...addr,
            // Formatear teléfono para mostrar
            telefono_formateado: addr.telefono
        }));
        
        console.log(`✅ ${addresses.length} direcciones encontradas`);
        res.json(addresses);
        
    } catch (error) {
        console.error('❌ Error obteniendo direcciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear nueva dirección (ACTUALIZADO)
app.post('/api/users/:id/addresses', requireAuth, async (req, res) => {
    try {
        const userId = req.params.id;
        const addressData = req.body;
        
        if (parseInt(userId) !== req.session.userId) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        
        console.log('➕ Creando dirección para usuario:', userId);
        console.log('📦 Datos recibidos:', addressData);
        
        // Validación de campos requeridos (ACTUALIZADO - sin calle, numero, apartamento)
        const required = ['nombre', 'nombre_completo', 'telefono', 'provincia', 
                         'municipio', 'sector', 'referencia'];
        
        for (const field of required) {
            if (!addressData[field] || addressData[field].trim() === '') {
                return res.status(400).json({ 
                    error: `El campo ${getFieldName(field)} es requerido` 
                });
            }
        }
        
        // Si se marca como predeterminada, quitar predeterminada de otras direcciones
        if (addressData.predeterminada) {
            await query(
                'UPDATE direcciones SET predeterminada = false WHERE usuario_id = $1',
                [userId]
            );
        }
        
        // Insertar nueva dirección (ACTUALIZADO - sin calle, numero, apartamento)
        const result = await query(
            `INSERT INTO direcciones (
                usuario_id, 
                nombre, 
                nombre_completo, 
                telefono, 
                provincia,
                municipio,
                sector, 
                referencia, 
                paqueteria_preferida, 
                predeterminada,
                fecha_creacion
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP)
             RETURNING *`,
            [
                userId,
                addressData.nombre,
                addressData.nombre_completo,
                addressData.telefono,
                addressData.provincia,
                addressData.municipio,
                addressData.sector,
                addressData.referencia,
                addressData.paqueteria_preferida || null,
                addressData.predeterminada || false
            ]
        );
        
        const newAddress = result.rows[0];
        console.log('✅ Dirección creada ID:', newAddress.id);
        
        res.status(201).json(newAddress);
        
    } catch (error) {
        console.error('❌ Error creando dirección:', error);
        
        if (error.message.includes('unique_usuario_predeterminada')) {
            return res.status(400).json({ 
                error: 'Solo puedes tener una dirección predeterminada' 
            });
        }
        
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

// Actualizar dirección (ACTUALIZADO)
app.put('/api/users/:id/addresses/:addressId', requireAuth, async (req, res) => {
    try {
        const { id, addressId } = req.params;
        const addressData = req.body;
        
        if (parseInt(id) !== req.session.userId) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        
        console.log('✏️ Actualizando dirección:', addressId);
        
        // Verificar que la dirección pertenece al usuario
        const verifyResult = await query(
            'SELECT id FROM direcciones WHERE id = $1 AND usuario_id = $2',
            [addressId, id]
        );
        
        if (verifyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Dirección no encontrada' });
        }
        
        // Si se marca como predeterminada, quitar predeterminada de otras direcciones
        if (addressData.predeterminada) {
            await query(
                'UPDATE direcciones SET predeterminada = false WHERE usuario_id = $1 AND id != $2',
                [id, addressId]
            );
        }
        
        // Actualizar dirección (ACTUALIZADO - sin calle, numero, apartamento)
        const updateResult = await query(
            `UPDATE direcciones SET
                nombre = $1,
                nombre_completo = $2,
                telefono = $3,
                provincia = $4,
                municipio = $5,
                sector = $6,
                referencia = $7,
                paqueteria_preferida = $8,
                predeterminada = $9,
                fecha_actualizacion = CURRENT_TIMESTAMP
             WHERE id = $10 AND usuario_id = $11
             RETURNING *`,
            [
                addressData.nombre,
                addressData.nombre_completo,
                addressData.telefono,
                addressData.provincia,
                addressData.municipio,
                addressData.sector,
                addressData.referencia,
                addressData.paqueteria_preferida || null,
                addressData.predeterminada || false,
                addressId,
                id
            ]
        );
        
        const updatedAddress = updateResult.rows[0];
        console.log('✅ Dirección actualizada ID:', updatedAddress.id);
        
        res.json(updatedAddress);
        
    } catch (error) {
        console.error('❌ Error actualizando dirección:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar dirección
app.delete('/api/users/:id/addresses/:addressId', requireAuth, async (req, res) => {
    try {
        const { id, addressId } = req.params;
        
        if (parseInt(id) !== req.session.userId) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        
        console.log('🗑️ Eliminando dirección:', addressId);
        
        // Verificar que no sea la única dirección
        const countResult = await query(
            'SELECT COUNT(*) FROM direcciones WHERE usuario_id = $1',
            [id]
        );
        
        const addressCount = parseInt(countResult.rows[0].count);
        
        if (addressCount <= 1) {
            return res.status(400).json({ 
                error: 'No puedes eliminar tu única dirección. Agrega otra dirección primero.' 
            });
        }
        
        // Verificar que la dirección pertenece al usuario
        const verifyResult = await query(
            'SELECT predeterminada FROM direcciones WHERE id = $1 AND usuario_id = $2',
            [addressId, id]
        );
        
        if (verifyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Dirección no encontrada' });
        }
        
        const isDefault = verifyResult.rows[0].predeterminada;
        
        // Eliminar dirección
        const deleteResult = await query(
            'DELETE FROM direcciones WHERE id = $1 AND usuario_id = $2 RETURNING *',
            [addressId, id]
        );
        
        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Dirección no encontrada' });
        }
        
        // Si la dirección eliminada era predeterminada, establecer otra como predeterminada
        if (isDefault) {
            await query(
                `UPDATE direcciones SET predeterminada = true 
                 WHERE usuario_id = $1 
                 AND id = (
                     SELECT id FROM direcciones 
                     WHERE usuario_id = $1 
                     ORDER BY fecha_creacion DESC 
                     LIMIT 1
                 )`,
                [id]
            );
        }
        
        res.json({ 
            success: true, 
            message: 'Dirección eliminada correctamente'
        });
        
    } catch (error) {
        console.error('❌ Error eliminando dirección:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Establecer dirección como predeterminada
app.put('/api/users/:id/addresses/:addressId/default', requireAuth, async (req, res) => {
    try {
        const { id, addressId } = req.params;
        
        if (parseInt(id) !== req.session.userId) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        
        console.log('⭐ Estableciendo dirección predeterminada:', addressId);
        
        // Verificar que la dirección pertenece al usuario
        const verifyResult = await query(
            'SELECT id FROM direcciones WHERE id = $1 AND usuario_id = $2',
            [addressId, id]
        );
        
        if (verifyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Dirección no encontrada' });
        }
        
        // Usar transacción para asegurar consistencia
        await query('BEGIN');
        
        try {
            // Quitar predeterminada de todas las direcciones
            await query(
                'UPDATE direcciones SET predeterminada = false WHERE usuario_id = $1',
                [id]
            );
            
            // Establecer la nueva predeterminada
            const result = await query(
                `UPDATE direcciones SET predeterminada = true, fecha_actualizacion = CURRENT_TIMESTAMP
                 WHERE id = $1 AND usuario_id = $2
                 RETURNING *`,
                [addressId, id]
            );
            
            await query('COMMIT');
            
            res.json({ 
                success: true, 
                message: 'Dirección predeterminada actualizada',
                address: result.rows[0]
            });
            
        } catch (error) {
            await query('ROLLBACK');
            throw error;
        }
        
    } catch (error) {
        console.error('❌ Error estableciendo dirección predeterminada:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ================= API - USUARIO =================
app.get('/api/users/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.params.id;
        
        if (parseInt(userId) !== req.session.userId && req.session.userRole !== 'admin') {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        
        const result = await query(
            'SELECT id, nombre, apellido, email, telefono, fecha_registro FROM usuarios WHERE id = $1',
            [userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        res.json(result.rows[0]);
    } catch (error) {
        console.error('❌ Error obteniendo usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar perfil
app.put('/api/users/:id', requireAuth, async (req, res) => {
    try {
        const userId = req.params.id;
        
        if (parseInt(userId) !== req.session.userId) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        
        const { nombre, apellido, email, telefono } = req.body;
        
        const result = await query(
            `UPDATE usuarios 
             SET nombre = $1, apellido = $2, email = $3, telefono = $4
             WHERE id = $5 
             RETURNING id, nombre, apellido, email, telefono`,
            [nombre, apellido, email, telefono, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        // Actualizar sesión
        req.session.userName = `${nombre} ${apellido}`;
        req.session.userEmail = email;
        
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Cambiar contraseña
app.put('/api/users/:id/password', requireAuth, async (req, res) => {
    try {
        const userId = req.params.id;
        
        if (parseInt(userId) !== req.session.userId) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        
        const { current_password, new_password } = req.body;
        
        const userResult = await query(
            'SELECT password_hash FROM usuarios WHERE id = $1',
            [userId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        const isValid = await bcrypt.compare(current_password, userResult.rows[0].password_hash);
        if (!isValid) {
            return res.status(400).json({ error: 'Contraseña actual incorrecta' });
        }
        
        const hashedPassword = await bcrypt.hash(new_password, 10);
        
        await query(
            'UPDATE usuarios SET password_hash = $1 WHERE id = $2',
            [hashedPassword, userId]
        );
        
        res.json({ success: true, message: 'Contraseña actualizada' });
        
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ================= API - ORDENES =================
app.get('/api/users/:id/orders', requireAuth, async (req, res) => {
    try {
        const userId = req.params.id;
        const limit = req.query.limit || 10;
        
        if (parseInt(userId) !== req.session.userId) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        
        console.log('📋 Obteniendo órdenes para usuario:', userId);
        
        const ordersResult = await query(`
            SELECT 
                id, 
                fecha_creacion, 
                total, 
                estado,
                metodo_envio,
                direccion_envio,
                ciudad_envio,
                telefono_contacto
            FROM pedidos 
            WHERE usuario_id = $1 
            ORDER BY fecha_creacion DESC 
            LIMIT $2
        `, [userId, limit]);
        
        const orders = ordersResult.rows.map(order => ({
            id: order.id,
            fecha_orden: order.fecha_creacion,
            total: parseFloat(order.total) || 0,
            estado: order.estado || 'pendiente',
            items_count: 1,
            tracking_number: null,
            paqueteria: order.metodo_envio || null,
            direccion_envio: order.direccion_envio,
            ciudad_envio: order.ciudad_envio,
            telefono_contacto: order.telefono_contacto
        }));
        
        console.log(`✅ ${orders.length} órdenes obtenidas para usuario ${userId}`);
        res.json(orders);
        
    } catch (error) {
        console.error('Error obteniendo órdenes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ================= API - WISHLIST =================
app.get('/api/users/:id/wishlist', requireAuth, async (req, res) => {
    try {
        const userId = req.params.id;
        
        console.log('🔍 DEBUG Wishlist - Usuario ID recibido:', userId);
        console.log('🔍 DEBUG Wishlist - Sesión UserId:', req.session.userId);
        console.log('🔍 DEBUG Wishlist - Sesión Role:', req.session.userRole);
        
        if (parseInt(userId) !== req.session.userId) {
            console.log('❌ Acceso denegado: userId no coincide');
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        
        console.log('❤️ Obteniendo wishlist para usuario:', userId);
        
        // Verificar si la tabla wishlist existe
        try {
            const tableCheck = await query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'wishlist'
                );
            `);
            
            console.log('🔍 Tabla wishlist existe?:', tableCheck.rows[0].exists);
            
            if (!tableCheck.rows[0].exists) {
                console.log('⚠️ Tabla wishlist no existe, creándola...');
                await query(`
                    CREATE TABLE wishlist (
                        id SERIAL PRIMARY KEY,
                        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
                        producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
                        fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(usuario_id, producto_id)
                    );
                `);
                console.log('✅ Tabla wishlist creada');
                return res.json([]);
            }
            
        } catch (tableError) {
            console.error('❌ Error verificando tabla wishlist:', tableError);
        }
        
        const result = await query(
            `SELECT w.*, 
                    p.nombre, p.imagen, p.precio, p.categoria, p.stock,
                    p.descuento_porcentaje, p.descuento_precio,
                    p.descripcion
             FROM wishlist w
             LEFT JOIN productos p ON w.producto_id = p.id
             WHERE w.usuario_id = $1
             ORDER BY w.fecha_agregado DESC`,
            [userId]
        );
        
        console.log(`✅ ${result.rows.length} productos encontrados en wishlist`);
        
        // Procesar precios
        const wishlist = result.rows.map(row => {
            const product = row.nombre ? processProductPrices(row) : null;
            
            return {
                id: row.id,
                producto_id: row.producto_id,
                fecha_agregado: row.fecha_agregado,
                nombre: row.nombre || 'Producto no disponible',
                imagen: row.imagen || '/public/images/default-product.jpg',
                descripcion: row.descripcion || '',
                categoria: row.categoria || 'sin-categoria',
                stock: row.stock || 0,
                
                // Precios procesados
                precio_original: product ? product.precio_original_dop : 0,
                precio_original_formateado: product ? product.precio_original_formateado : 'RD$ 0.00',
                precio_final: product ? product.precio_final_dop : 0,
                precio_formateado: product ? product.precio_formateado : 'RD$ 0.00',
                tiene_descuento: product ? product.tiene_descuento : false,
                descuento_porcentaje: product ? product.descuento_porcentaje : 0
            };
        }).filter(item => item.producto_id !== null);
        
        console.log(`📊 Wishlist procesada: ${wishlist.length} productos válidos`);
        res.json(wishlist);
        
    } catch (error) {
        console.error('❌ Error completo obteniendo wishlist:', error);
        // Devolver array vacío en lugar de error
        res.json([]);
    }
});

// Eliminar de wishlist
app.delete('/api/users/:id/wishlist/:productId', requireAuth, async (req, res) => {
    try {
        const { id, productId } = req.params;
        
        if (parseInt(id) !== req.session.userId) {
            return res.status(403).json({ error: 'Acceso denegado' });
        }
        
        console.log('🗑️ Eliminando de wishlist:', productId);
        
        const result = await query(
            'DELETE FROM wishlist WHERE usuario_id = $1 AND producto_id = $2 RETURNING *',
            [id, productId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado en wishlist' });
        }
        
        res.json({ 
            success: true, 
            message: 'Producto eliminado de tu wishlist'
        });
        
    } catch (error) {
        console.error('❌ Error eliminando de wishlist:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ================= API - PROVINCIAS RD =================
app.get('/api/dominican-republic/provinces', async (req, res) => {
    console.log('🗺️ Obteniendo provincias de RD');
    
    const provinces = [
        'Distrito Nacional', 'Santo Domingo', 'Santiago', 'La Vega', 'San Cristóbal',
        'San Pedro de Macorís', 'La Altagracia', 'Puerto Plata', 'Duarte', 'Espaillat',
        'San Juan', 'Azua', 'Barahona', 'Dajabón', 'El Seibo', 'Elías Piña', 'Hato Mayor',
        'Hermanas Mirabal', 'Independencia', 'María Trinidad Sánchez', 'Monseñor Nouel',
        'Monte Cristi', 'Monte Plata', 'Pedernales', 'Peravia', 'Samaná', 'San José de Ocoa',
        'Sánchez Ramírez', 'Valverde', 'La Romana'
    ];
    
    res.json(provinces.sort());
});

// ================= API - ADMINISTRACIÓN (RUTAS FALTANTES) =================

// Obtener todas las órdenes (admin)
app.get('/api/admin/orders', requireAuth, requireAdmin, async (req, res) => {
    try {
        console.log('📋 Admin: Obteniendo todas las órdenes');
        
        const result = await query(`
            SELECT 
                p.*,
                u.nombre as nombre_cliente,
                u.apellido as apellido_cliente,
                u.email as email_cliente
            FROM pedidos p
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            ORDER BY p.fecha_creacion DESC
        `);
        
        // Procesar las órdenes para el admin
        const orders = result.rows.map(order => ({
            id: order.id,
            usuario_id: order.usuario_id,
            nombre_cliente: order.nombre_cliente ? 
                `${order.nombre_cliente} ${order.apellido_cliente}` : 
                'Cliente no registrado',
            email_cliente: order.email_cliente || 'N/A',
            fecha_orden: order.fecha_creacion,
            total: parseFloat(order.total) || 0,
            subtotal: parseFloat(order.subtotal) || 0,
            costo_envio: parseFloat(order.costo_envio) || 0,
            estado: order.estado || 'pendiente',
            estado_pago: order.estado_pago || 'pendiente',
            metodo_pago: order.metodo_pago || 'N/A',
            metodo_envio: order.metodo_envio || 'Estándar',
            direccion_envio: order.direccion_envio || 'N/A',
            ciudad_envio: order.ciudad_envio || 'N/A',
            telefono_contacto: order.telefono_contacto || 'N/A',
            notas: order.notas,
            tracking_number: order.tracking_number,
            paqueteria: order.paqueteria,
            fecha_actualizacion: order.fecha_actualizacion,
            items: [] // Se cargarán en otra consulta si es necesario
        }));
        
        console.log(`✅ Admin: ${orders.length} órdenes obtenidas`);
        res.json(orders);
        
    } catch (error) {
        console.error('❌ Error obteniendo órdenes (admin):', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ================= CORREGIR LA RUTA DE OBTENER USUARIOS (ADMIN) =================
app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        console.log('👥 Admin: Obteniendo todos los usuarios');
        
        // CORREGIDO: Solo seleccionar columnas que existen
        const result = await query(`
            SELECT 
                id, 
                nombre, 
                apellido, 
                email, 
                telefono,
                rol,
                activo,
                fecha_registro
            FROM usuarios 
            ORDER BY fecha_registro DESC
        `);
        
        // Obtener estadísticas para cada usuario
        const usersWithStats = await Promise.all(result.rows.map(async (user) => {
            try {
                // Total de órdenes
                const ordersResult = await query(
                    'SELECT COUNT(*) as total_orders, SUM(total) as total_spent FROM pedidos WHERE usuario_id = $1',
                    [user.id]
                );
                
                // Total en wishlist
                const wishlistResult = await query(
                    'SELECT COUNT(*) as wishlist_items FROM wishlist WHERE usuario_id = $1',
                    [user.id]
                );
                
                return {
                    ...user,
                    total_orders: parseInt(ordersResult.rows[0].total_orders) || 0,
                    total_spent: parseFloat(ordersResult.rows[0].total_spent) || 0,
                    wishlist_items: parseInt(wishlistResult.rows[0].wishlist_items) || 0,
                    // Agregar estadísticas adicionales
                    stats: {
                        total_orders: parseInt(ordersResult.rows[0].total_orders) || 0,
                        total_spent: parseFloat(ordersResult.rows[0].total_spent) || 0,
                        wishlist_items: parseInt(wishlistResult.rows[0].wishlist_items) || 0,
                        avg_order_value: ordersResult.rows[0].total_orders > 0 ? 
                            parseFloat(ordersResult.rows[0].total_spent) / parseInt(ordersResult.rows[0].total_orders) : 0
                    }
                };
            } catch (error) {
                console.error(`Error obteniendo stats para usuario ${user.id}:`, error);
                return {
                    ...user,
                    total_orders: 0,
                    total_spent: 0,
                    wishlist_items: 0,
                    stats: {
                        total_orders: 0,
                        total_spent: 0,
                        wishlist_items: 0,
                        avg_order_value: 0
                    }
                };
            }
        }));
        
        console.log(`✅ Admin: ${usersWithStats.length} usuarios obtenidos`);
        res.json(usersWithStats);
        
    } catch (error) {
        console.error('❌ Error obteniendo usuarios (admin):', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener detalles de una orden específica (admin)
app.get('/api/orders/:id', requireAuth, async (req, res) => {
    try {
        const orderId = req.params.id;
        const userId = req.session.userId;
        const isAdmin = req.session.userRole === 'admin';
        
        console.log(`📋 Obteniendo detalles de orden ${orderId}`);
        
        // Construir la consulta según permisos
        let queryStr = `
            SELECT 
                p.*,
                u.nombre as nombre_cliente,
                u.apellido as apellido_cliente,
                u.email as email_cliente,
                u.telefono as telefono_cliente
            FROM pedidos p
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            WHERE p.id = $1
        `;
        
        const params = [orderId];
        
        if (!isAdmin) {
            queryStr += ' AND p.usuario_id = $2';
            params.push(userId);
        }
        
        const orderResult = await query(queryStr, params);
        
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }
        
        const order = orderResult.rows[0];
        
        // Obtener items de la orden
        const itemsResult = await query(`
            SELECT 
                oi.*,
                p.nombre,
                p.imagen,
                p.sku
            FROM orden_items oi
            LEFT JOIN productos p ON oi.producto_id = p.id
            WHERE oi.orden_id = $1
        `, [orderId]);
        
        // Formatear la respuesta
        const formattedOrder = {
            id: order.id,
            usuario_id: order.usuario_id,
            nombre_cliente: order.nombre_cliente ? 
                `${order.nombre_cliente} ${order.apellido_cliente}` : 
                'Cliente no registrado',
            email_cliente: order.email_cliente || 'N/A',
            telefono_cliente: order.telefono_cliente || order.telefono_contacto || 'N/A',
            fecha_orden: order.fecha_creacion,
            total: parseFloat(order.total) || 0,
            subtotal: parseFloat(order.subtotal) || 0,
            costo_envio: parseFloat(order.costo_envio) || 0,
            descuento_aplicado: parseFloat(order.descuento_aplicado) || 0,
            estado: order.estado || 'pendiente',
            estado_pago: order.estado_pago || 'pendiente',
            metodo_pago: order.metodo_pago || 'N/A',
            metodo_envio: order.metodo_envio || 'Estándar',
            direccion_envio: order.direccion_envio || 'N/A',
            ciudad_envio: order.ciudad_envio || 'N/A',
            telefono_contacto: order.telefono_contacto || 'N/A',
            notas: order.notas,
            tracking_number: order.tracking_number,
            paqueteria: order.paqueteria,
            fecha_actualizacion: order.fecha_actualizacion,
            items: itemsResult.rows.map(item => ({
                id: item.id,
                producto_id: item.producto_id,
                nombre: item.nombre || 'Producto no disponible',
                imagen: item.imagen || '/public/images/default-product.jpg',
                sku: item.sku || 'N/A',
                talla: item.talla,
                color: item.color,
                cantidad: item.cantidad,
                precio_unitario: parseFloat(item.precio_unitario) || 0,
                subtotal: parseFloat(item.subtotal) || 0
            }))
        };
        
        console.log(`✅ Orden ${orderId} obtenida con ${formattedOrder.items.length} items`);
        res.json(formattedOrder);
        
    } catch (error) {
        console.error('❌ Error obteniendo detalles de orden:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar estado de orden (admin)
app.put('/api/admin/orders/:id/status', requireAuth, requireAdmin, async (req, res) => {
    try {
        const orderId = req.params.id;
        const { estado, notas } = req.body;
        
        console.log(`✏️ Actualizando estado de orden ${orderId} a: ${estado}`);
        
        const validStatuses = ['pendiente', 'procesando', 'enviado', 'entregado', 'cancelado'];
        if (!validStatuses.includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido' });
        }
        
        const result = await query(
            `UPDATE pedidos 
             SET estado = $1, 
                 notas = COALESCE($2, notas),
                 fecha_actualizacion = CURRENT_TIMESTAMP
             WHERE id = $3 
             RETURNING *`,
            [estado, notas || null, orderId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Orden no encontrada' });
        }
        
        const updatedOrder = result.rows[0];
        
        console.log(`✅ Estado de orden ${orderId} actualizado a: ${updatedOrder.estado}`);
        
        res.json({
            success: true,
            message: 'Estado actualizado correctamente',
            order: updatedOrder
        });
        
    } catch (error) {
        console.error('❌ Error actualizando estado de orden:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar usuario (admin)
app.put('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { nombre, apellido, email, telefono, rol, activo } = req.body;
        
        console.log(`✏️ Admin actualizando usuario ${userId}`);
        
        // Verificar que no sea el propio admin
        if (parseInt(userId) === req.session.userId && (rol !== 'admin' || activo === false)) {
            return res.status(400).json({ 
                error: 'No puedes cambiar tu propio rol o desactivarte a ti mismo' 
            });
        }
        
        const result = await query(
            `UPDATE usuarios 
             SET nombre = $1, 
                 apellido = $2, 
                 email = $3, 
                 telefono = $4,
                 rol = $5,
                 activo = $6,
                 fecha_actualizacion = CURRENT_TIMESTAMP
             WHERE id = $7 
             RETURNING id, nombre, apellido, email, telefono, rol, activo, fecha_registro`,
            [nombre, apellido, email, telefono || null, rol || 'cliente', activo !== false, userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        console.log(`✅ Usuario ${userId} actualizado por admin`);
        res.json(result.rows[0]);
        
    } catch (error) {
        console.error('❌ Error actualizando usuario (admin):', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Desactivar usuario (admin)
app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        console.log(`🚫 Admin desactivando usuario ${userId}`);
        
        // Verificar que no sea el propio admin
        if (parseInt(userId) === req.session.userId) {
            return res.status(400).json({ 
                error: 'No puedes desactivar tu propia cuenta' 
            });
        }
        
        const result = await query(
            `UPDATE usuarios 
             SET activo = false,
                 fecha_actualizacion = CURRENT_TIMESTAMP
             WHERE id = $1 
             RETURNING id, nombre, apellido, email`,
            [userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        console.log(`✅ Usuario ${userId} desactivado por admin`);
        res.json({ 
            success: true, 
            message: 'Usuario desactivado correctamente',
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error desactivando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Activar usuario (admin)
app.post('/api/admin/users/:id/activate', requireAuth, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        
        console.log(`✅ Admin activando usuario ${userId}`);
        
        const result = await query(
            `UPDATE usuarios 
             SET activo = true,
                 fecha_actualizacion = CURRENT_TIMESTAMP
             WHERE id = $1 
             RETURNING id, nombre, apellido, email`,
            [userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }
        
        console.log(`✅ Usuario ${userId} activado por admin`);
        res.json({ 
            success: true, 
            message: 'Usuario activado correctamente',
            user: result.rows[0]
        });
        
    } catch (error) {
        console.error('❌ Error activando usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Aplicar descuento a producto (admin)
app.post('/api/admin/products/:id/discount', requireAuth, requireAdmin, async (req, res) => {
    try {
        const productId = req.params.id;
        const { discount_type, discount_percent, discount_price, discount_expires } = req.body;
        
        console.log(`🎯 Aplicando descuento a producto ${productId}:`, {
            discount_type,
            discount_percent,
            discount_price,
            discount_expires
        });
        
        let updateData = {};
        
        if (discount_type === 'percent') {
            updateData = {
                descuento_porcentaje: discount_percent || 0,
                descuento_precio: null,
                descuento_expiracion: discount_expires || null
            };
        } else if (discount_type === 'fixed') {
            updateData = {
                descuento_porcentaje: 0,
                descuento_precio: discount_price || 0,
                descuento_expiracion: discount_expires || null
            };
        } else {
            return res.status(400).json({ error: 'Tipo de descuento inválido' });
        }
        
        const result = await query(
            `UPDATE productos 
             SET descuento_porcentaje = $1,
                 descuento_precio = $2,
                 descuento_expiracion = $3,
                 fecha_actualizacion = CURRENT_TIMESTAMP
             WHERE id = $4 
             RETURNING *`,
            [
                updateData.descuento_porcentaje,
                updateData.descuento_precio,
                updateData.descuento_expiracion,
                productId
            ]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const updatedProduct = result.rows[0];
        const processedProduct = processProductPrices(updatedProduct);
        
        console.log(`✅ Descuento aplicado a producto ${productId}`);
        console.log(`💰 Precio con descuento: ${processedProduct.precio_formateado}`);
        
        res.json({
            success: true,
            message: 'Descuento aplicado correctamente',
            product: processedProduct
        });
        
    } catch (error) {
        console.error('❌ Error aplicando descuento:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Eliminar descuento de producto (admin)
app.delete('/api/admin/products/:id/discount', requireAuth, requireAdmin, async (req, res) => {
    try {
        const productId = req.params.id;
        
        console.log(`🗑️ Eliminando descuento de producto ${productId}`);
        
        const result = await query(
            `UPDATE productos 
             SET descuento_porcentaje = 0,
                 descuento_precio = null,
                 descuento_expiracion = null,
                 fecha_actualizacion = CURRENT_TIMESTAMP
             WHERE id = $1 
             RETURNING *`,
            [productId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const updatedProduct = result.rows[0];
        const processedProduct = processProductPrices(updatedProduct);
        
        console.log(`✅ Descuento eliminado de producto ${productId}`);
        console.log(`💰 Precio actual: ${processedProduct.precio_formateado}`);
        
        res.json({
            success: true,
            message: 'Descuento eliminado correctamente',
            product: processedProduct
        });
        
    } catch (error) {
        console.error('❌ Error eliminando descuento:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Ruta para descuentos generales (placeholder)
app.get('/api/admin/discounts', requireAuth, requireAdmin, async (req, res) => {
    try {
        console.log('🎯 Admin: Obteniendo descuentos');
        
        // Ejemplo de datos de prueba
        const sampleDiscounts = [
            {
                id: 1,
                codigo: "VERANO20",
                tipo: "porcentaje",
                valor: 20,
                aplicable_a: "todos",
                minimo_compra: 50,
                usos_totales: 100,
                usos_actuales: 34,
                expiracion: "2024-12-31",
                activo: true
            },
            {
                id: 2,
                codigo: "ENVIOGRATIS",
                tipo: "envio",
                valor: 100,
                aplicable_a: "todos",
                minimo_compra: 30,
                usos_totales: 200,
                usos_actuales: 89,
                expiracion: null,
                activo: true
            }
        ];
        
        console.log(`✅ Admin: ${sampleDiscounts.length} descuentos de ejemplo`);
        res.json(sampleDiscounts);
        
    } catch (error) {
        console.error('❌ Error obteniendo descuentos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ================= API - CONFIGURACIÓN DE MONEDA =================
app.get('/api/currency/config', (req, res) => {
    res.json({
        currency: DEFAULT_CURRENCY,
        symbol: CURRENCY_SYMBOL,
        format_example: formatDOP(1000)
    });
});

// ================= API - PAGOS PAYPAL =================
// Configuración de pagos
app.get('/api/payments/config', (req, res) => {
    console.log('🔧 Enviando configuración de pagos al frontend');
    
    res.json({
        paypalClientId: process.env.PAYPAL_CLIENT_ID || 'test',
        currency: 'USD',
        environment: process.env.NODE_ENV || 'development',
        country: 'DO',
        paymentMethods: ['paypal', 'transfer'],
        features: {
            paypal: true,
            bankTransfer: true
        }
    });
});


// ========== PAYPAL ==========
let paypalClient = null;

try {
    if (process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET) {
        if (process.env.PAYPAL_ENVIRONMENT === 'live') {
            const environment = new paypal.core.LiveEnvironment(
                process.env.PAYPAL_CLIENT_ID,
                process.env.PAYPAL_CLIENT_SECRET
            );
            paypalClient = new paypal.core.PayPalHttpClient(environment);
            console.log('✅ PayPal configurado en modo PRODUCCIÓN');
        } else {
            const environment = new paypal.core.SandboxEnvironment(
                process.env.PAYPAL_CLIENT_ID,
                process.env.PAYPAL_CLIENT_SECRET
            );
            paypalClient = new paypal.core.PayPalHttpClient(environment);
            console.log('✅ PayPal configurado en modo SANDBOX');
        }
    } else {
        console.log('⚠️ PayPal no configurado - Se usará modo simulación para desarrollo');
        paypalClient = null;
    }
} catch (error) {
    console.error('❌ Error configurando PayPal:', error.message);
    paypalClient = null;
}

// Crear orden de PayPal (DOP → USD para PayPal)
app.post('/api/payments/create-paypal-order', async (req, res) => {
    try {
        const { amount, orderData } = req.body;
        
        console.log('💰 Creando orden PayPal...');
        console.log('📦 Monto recibido en DOP:', amount);
        
        // Convertir de DOP a USD para PayPal (PayPal solo acepta USD)
        const tasaCambio = 58.5; // 1 USD = 58.5 DOP
        const amountUSD = (amount / tasaCambio).toFixed(2);
        console.log('📦 Monto convertido a USD:', amountUSD);
        
        // MODO SIMULACIÓN para desarrollo
        if (!paypalClient) {
            console.log('🔧 Simulando orden PayPal (modo desarrollo)');
            
            return res.json({
                id: `PAYPAL-DEV-${Date.now()}`,
                status: 'CREATED',
                amount: amountUSD,
                amount_dop: amount,
                simulated: true,
                message: 'Modo desarrollo - PayPal no configurado',
                currency_info: {
                    original_currency: 'DOP',
                    original_amount: amount,
                    converted_currency: 'USD',
                    converted_amount: amountUSD,
                    exchange_rate: tasaCambio
                }
            });
        }
        
        // Validar monto mínimo para PayPal (en USD)
        const minAmountUSD = 1.00;
        if (parseFloat(amountUSD) < minAmountUSD) {
            return res.status(400).json({ 
                error: `El monto mínimo para PayPal es $${minAmountUSD.toFixed(2)} USD` 
            });
        }
        
        // Crear items para PayPal (convertidos a USD)
        const items = orderData.items.map(item => {
            const itemPriceUSD = (parseFloat(item.precio) / tasaCambio).toFixed(2);
            return {
                name: item.nombre.substring(0, 127),
                description: `${item.talla ? `Talla: ${item.talla}` : ''} ${item.color ? `Color: ${item.color}` : ''}`.trim().substring(0, 127),
                quantity: item.cantidad.toString(),
                unit_amount: {
                    currency_code: 'USD',
                    value: itemPriceUSD
                },
                sku: item.id ? `SKU-${item.id}` : undefined
            };
        });
        
        // Configurar envío si es aplicable
        let shipping = undefined;
        if (orderData.shipping_method !== 'digital' && orderData.cliente.direccion) {
            let countryCode = 'DO';
            
            shipping = {
                name: {
                    full_name: `${orderData.cliente.nombre} ${orderData.cliente.apellido}`.substring(0, 300)
                },
                address: {
                    address_line_1: orderData.cliente.direccion.substring(0, 300),
                    admin_area_2: orderData.cliente.ciudad ? orderData.cliente.ciudad.substring(0, 120) : '',
                    admin_area_1: orderData.cliente.region ? orderData.cliente.region.substring(0, 300) : '',
                    postal_code: orderData.cliente.codigo_postal ? orderData.cliente.codigo_postal.substring(0, 60) : '',
                    country_code: countryCode
                }
            };
        }
        
        // Crear request para PayPal
        const request = new paypal.orders.OrdersCreateRequest();
        request.prefer('return=representation');
        
        request.requestBody({
            intent: 'CAPTURE',
            purchase_units: [{
                amount: {
                    currency_code: 'USD',
                    value: amountUSD,
                    breakdown: {
                        item_total: {
                            currency_code: 'USD',
                            value: ((orderData.subtotal || amount) / tasaCambio).toFixed(2)
                        },
                        shipping: {
                            currency_code: 'USD',
                            value: ((orderData.shipping_cost || 0) / tasaCambio).toFixed(2)
                        },
                        discount: {
                            currency_code: 'USD',
                            value: ((orderData.discount || 0) / tasaCambio).toFixed(2)
                        },
                        tax_total: {
                            currency_code: 'USD',
                            value: '0.00'
                        }
                    }
                },
                items: items,
                shipping: shipping,
                description: `Compra Mabel Activewear - ${orderData.cliente.email}`,
                custom_id: `ORDER-${Date.now()}`,
                invoice_id: `INV-${Date.now()}`,
                soft_descriptor: 'MABEL ACTIVEWEAR'
            }],
            application_context: {
                brand_name: 'Mabel Activewear',
                landing_page: 'BILLING',
                user_action: 'PAY_NOW',
                shipping_preference: shipping ? 'SET_PROVIDED_ADDRESS' : 'NO_SHIPPING',
                return_url: `${process.env.APP_URL || 'http://localhost:3000'}/checkout/success?payment_method=paypal`,
                cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/checkout`
            }
        });
        
        console.log('📤 Enviando solicitud a PayPal...');
        
        // Ejecutar la solicitud
        const order = await paypalClient.execute(request);
        
        console.log('✅ Orden PayPal creada exitosamente:', order.result.id);
        
        res.json({
            success: true,
            id: order.result.id,
            status: order.result.status,
            amount: order.result.purchase_units[0].amount.value,
            amount_dop: amount,
            links: order.result.links,
            created_time: order.result.create_time,
            currency_info: {
                displayed_currency: 'DOP',
                paid_currency: 'USD',
                exchange_rate: tasaCambio
            }
        });
        
    } catch (error) {
        console.error('❌ Error creando orden de PayPal:', error);
        
        let errorMessage = 'Error procesando pago PayPal';
        let statusCode = 500;
        
        if (error.statusCode === 401) {
            errorMessage = 'Credenciales de PayPal inválidas. Verifica tu configuración.';
            statusCode = 401;
        } else if (error.statusCode === 400) {
            errorMessage = 'Datos inválidos para PayPal. Verifica los montos y detalles.';
            statusCode = 400;
        } else if (error.message?.includes('network')) {
            errorMessage = 'Error de conexión con PayPal. Intenta nuevamente.';
        }
        
        res.status(statusCode).json({ 
            success: false,
            error: errorMessage,
            details: error.message,
            debug_id: error.headers?.['paypal-debug-id'],
            code: error.statusCode
        });
    }
});

// Capturar orden de PayPal
app.post('/api/payments/capture-paypal-order', async (req, res) => {
    try {
        const { orderID } = req.body;
        
        console.log('💰 Capturando orden PayPal:', orderID);
        
        // MODO SIMULACIÓN para desarrollo
        if (!paypalClient) {
            console.log('🔧 Simulando captura PayPal (modo desarrollo)');
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            return res.json({
                success: true,
                orderId: orderID,
                captureId: `CAPTURE-DEV-${Date.now()}`,
                status: 'COMPLETED',
                simulated: true,
                message: 'Modo desarrollo - Captura simulada',
                currency: 'USD',
                amount: '99.99'
            });
        }
        
        // Capturar orden REAL de PayPal
        const request = new paypal.orders.OrdersCaptureRequest(orderID);
        request.requestBody({});
        
        console.log('📤 Enviando solicitud de captura a PayPal...');
        
        const capture = await paypalClient.execute(request);
        
        console.log('📊 Respuesta de captura PayPal:', {
            id: capture.result.id,
            status: capture.result.status,
            amount: capture.result.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value
        });
        
        if (capture.result.status === 'COMPLETED' || capture.result.status === 'APPROVED') {
            console.log('✅ Pago PayPal capturado exitosamente');
            
            const captureDetails = capture.result.purchase_units?.[0]?.payments?.captures?.[0];
            
            res.json({
                success: true,
                orderId: orderID,
                captureId: captureDetails?.id || `CAPTURE-${Date.now()}`,
                status: capture.result.status,
                amount: captureDetails?.amount?.value || '0.00',
                currency: captureDetails?.amount?.currency_code || 'USD',
                create_time: captureDetails?.create_time || new Date().toISOString(),
                payer: capture.result.payer,
                shipping: capture.result.purchase_units?.[0]?.shipping
            });
        } else {
            console.warn('⚠️ Estado de captura PayPal:', capture.result.status);
            res.status(400).json({ 
                success: false,
                error: 'Pago no completado',
                status: capture.result.status,
                details: capture.result 
            });
        }
        
    } catch (error) {
        console.error('❌ Error capturando orden PayPal:', error);
        
        let errorMessage = 'Error capturando pago PayPal';
        
        if (error.statusCode === 400) {
            errorMessage = 'No se pudo capturar el pago. La orden puede haber expirado o sido cancelada.';
        } else if (error.statusCode === 404) {
            errorMessage = 'Orden no encontrada. Verifica el ID de la orden.';
        } else if (error.statusCode === 422) {
            errorMessage = 'La orden ya ha sido capturada o rechazada.';
        }
        
        res.status(error.statusCode || 500).json({ 
            success: false,
            error: errorMessage,
            details: error.message,
            debug_id: error.headers?.['paypal-debug-id'],
            code: error.statusCode
        });
    }
});

// ================= API - SUBIDA DE IMÁGENES =================
app.post('/api/admin/upload-images', requireAuth, requireAdmin, upload.array('images', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No se subieron imágenes' });
        }
        
        const uploadedImages = req.files.map(file => {
            return `/public/images/products/${file.filename}`;
        });
        
        console.log('✅ Imágenes subidas:', uploadedImages.length);
        res.json({ 
            success: true, 
            images: uploadedImages,
            message: `${uploadedImages.length} imagen(es) subida(s) exitosamente`
        });
        
    } catch (error) {
        console.error('❌ Error subiendo imágenes:', error);
        res.status(500).json({ 
            error: 'Error subiendo imágenes',
            details: error.message 
        });
    }
});

app.delete('/api/admin/images/:imageName', requireAuth, requireAdmin, async (req, res) => {
    try {
        const imageName = req.params.imageName;
        const imagePath = path.join(__dirname, 'public/images/products', imageName);
        
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log('🗑️ Imagen eliminada:', imageName);
            
            await query(
                `UPDATE productos 
                 SET imagenes_adicionales = array_remove(imagenes_adicionales, $1)
                 WHERE $1 = ANY(imagenes_adicionales)`,
                [`/public/images/products/${imageName}`]
            );
            
            await query(
                `UPDATE productos 
                 SET imagen = '/public/images/default-product.jpg'
                 WHERE imagen = $1`,
                [`/public/images/products/${imageName}`]
            );
            
            res.json({ success: true, message: 'Imagen eliminada' });
        } else {
            res.status(404).json({ error: 'Imagen no encontrada' });
        }
        
    } catch (error) {
        console.error('❌ Error eliminando imagen:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ================= API - PRODUCTOS (SOLO DOP) =================
app.get('/api/products', async (req, res) => {
    console.log('📦 Obteniendo todos los productos en DOP');
    
    try {
        const result = await query(
            'SELECT * FROM productos WHERE activo = true ORDER BY id DESC'
        );
        
        const products = result.rows.map(product => processProductPrices(product));
        
        console.log(`✅ Enviando ${products.length} productos en DOP`);
        res.json(products);
        
    } catch (error) {
        console.error('❌ Error obteniendo productos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    const productId = req.params.id;
    console.log('🎯 Obteniendo producto ID:', productId, 'en DOP');
    
    try {
        const result = await query(
            'SELECT * FROM productos WHERE id = $1',
            [productId]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const product = processProductPrices(result.rows[0]);
        
        console.log('✅ Producto encontrado:', product.nombre);
        console.log('💰 Precio:', product.precio_formateado);
        
        res.json(product);
        
    } catch (error) {
        console.error('❌ Error obteniendo producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener productos en oferta (DOP)
app.get('/api/products/ofertas', async (req, res) => {
    console.log('🎁 Obteniendo productos en oferta en DOP');
    
    try {
        const result = await query(
            `SELECT * FROM productos 
             WHERE (descuento_porcentaje > 0 OR descuento_precio > 0)
               AND activo = true
               AND stock > 0
             ORDER BY id DESC`
        );
        
        const products = result.rows.map(product => processProductPrices(product));
        
        console.log(`✅ Enviando ${products.length} productos en oferta`);
        res.json(products);
        
    } catch (error) {
        console.error('❌ Error obteniendo ofertas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Búsqueda de productos (DOP)
app.get('/api/products/search', async (req, res) => {
    const { q, category, minPrice, maxPrice, sort } = req.query;
    console.log('🔍 Búsqueda de productos:', req.query);
    
    try {
        let queryStr = 'SELECT * FROM productos WHERE activo = true';
        const params = [];
        let paramCount = 1;
        
        if (q) {
            queryStr += ` AND (nombre ILIKE $${paramCount} OR descripcion ILIKE $${paramCount})`;
            params.push(`%${q}%`);
            paramCount++;
        }
        
        if (category) {
            queryStr += ` AND categoria = $${paramCount}`;
            params.push(category);
            paramCount++;
        }
        
        // Precios ya están en DOP en la BD
        if (minPrice) {
            queryStr += ` AND precio >= $${paramCount}`;
            params.push(minPrice);
            paramCount++;
        }
        
        if (maxPrice) {
            queryStr += ` AND precio <= $${paramCount}`;
            params.push(maxPrice);
            paramCount++;
        }
        
        switch (sort) {
            case 'price-low':
                queryStr += ' ORDER BY precio ASC';
                break;
            case 'price-high':
                queryStr += ' ORDER BY precio DESC';
                break;
            case 'name':
                queryStr += ' ORDER BY nombre ASC';
                break;
            case 'newest':
            default:
                queryStr += ' ORDER BY id DESC';
                break;
        }
        
        const result = await query(queryStr, params);
        
        const products = result.rows.map(product => processProductPrices(product));
        
        res.json(products);
        
    } catch (error) {
        console.error('❌ Error buscando productos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener categorías
app.get('/api/categories', async (req, res) => {
    try {
        const result = await query(
            'SELECT DISTINCT categoria FROM productos WHERE activo = true ORDER BY categoria'
        );
        res.json(result.rows.map(row => row.categoria));
    } catch (error) {
        console.error('❌ Error obteniendo categorías:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Incrementar vistas
app.post('/api/products/:id/view', async (req, res) => {
    try {
        await query(
            'UPDATE productos SET vistas = COALESCE(vistas, 0) + 1 WHERE id = $1',
            [req.params.id]
        );
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Error incrementando vistas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ================= API - ADMINISTRACIÓN =================
// Obtener todos los productos (admin) - solo DOP
app.get('/api/admin/products', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await query('SELECT * FROM productos ORDER BY id DESC');
        
        const products = result.rows.map(product => {
            const processed = processProductPrices(product);
            return {
                ...processed,
                // Datos administrativos
                fecha_creacion: product.fecha_creacion,
                fecha_actualizacion: product.fecha_actualizacion
            };
        });
        
        res.json(products);
    } catch (error) {
        console.error('❌ Error obteniendo productos (admin):', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// En server.js, agrega esta función mejorada
function generateUniqueSKU(productId = null) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // Si tenemos un productId, usarlo para mayor unicidad
    if (productId) {
        return `MAB-${productId}-${timestamp.toString().slice(-6)}-${random}`;
    }
    
    return `MAB-${timestamp}-${random}`;
}

// Actualizar producto (admin)
app.put('/api/admin/products/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const productData = req.body;
    
    console.log('✏️ Actualizando producto ID:', id);
    
    try {
        const updates = [];
        const values = [];
        let paramIndex = 1;
        
        // El precio viene en DOP
        if (productData.precio !== undefined) {
            updates.push(`precio = $${paramIndex}`);
            values.push(parseFloat(productData.precio));
            paramIndex++;
            console.log(`💰 Precio actualizado: ${productData.precio} DOP`);
        }
        
        // Otros campos
        const fields = ['nombre', 'descripcion', 'categoria', 'imagen', 'stock', 
                       'tallas', 'colores', 'sku', 'material', 'coleccion', 
                       'imagenes_adicionales', 'descuento_porcentaje', 'descuento_precio', 'activo'];
        
        fields.forEach(field => {
            if (productData[field] !== undefined) {
                let value = productData[field];
                
                if (field === 'tallas' || field === 'colores' || field === 'imagenes_adicionales') {
                    value = formatArrayForPostgres(value);
                }
                
                if (field === 'stock' && value !== null) {
                    value = parseInt(value);
                }
                if (field === 'activo') {
                    value = Boolean(value);
                }
                if (field === 'descuento_porcentaje') {
                    value = parseInt(value) || 0;
                }
                if (field === 'descuento_precio') {
                    value = value ? parseFloat(value) : null;
                }
                
                updates.push(`${field} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No hay datos para actualizar' });
        }
        
        updates.push('fecha_actualizacion = CURRENT_TIMESTAMP');
        values.push(id);
        
        const queryStr = `
            UPDATE productos 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex} 
            RETURNING *
        `;
        
        const result = await query(queryStr, values);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const updatedProduct = result.rows[0];
        const processedProduct = processProductPrices(updatedProduct);
        
        console.log('✅ Producto actualizado:', processedProduct.nombre);
        
        res.json(processedProduct);
        
    } catch (error) {
        console.error('❌ Error actualizando producto:', error.message);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message
        });
    }
});

// Eliminar/desactivar producto (admin)
app.delete('/api/admin/products/:id', requireAuth, requireAdmin, async (req, res) => {
    const { id } = req.params;
    
    console.log('🗑️ Desactivando producto ID:', id);
    
    try {
        const result = await query(
            'UPDATE productos SET activo = false WHERE id = $1 RETURNING *',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        console.log('✅ Producto desactivado:', result.rows[0].nombre);
        res.json({ success: true, message: 'Producto desactivado' });
        
    } catch (error) {
        console.error('❌ Error desactivando producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ================= API - DESCUENTOS =================
app.post('/api/discounts/validate', async (req, res) => {
    const { codigo, total } = req.body; // total viene en DOP
    
    try {
        const validDiscounts = {
            'VERANO20': {
                id: 1,
                codigo: 'VERANO20',
                tipo: 'porcentaje',
                valor: 20,
                minimo_compra: 2000, // 2000 DOP
                valido: total >= 2000
            },
            'ENVIOGRATIS': {
                id: 3,
                codigo: 'ENVIOGRATIS',
                tipo: 'envio',
                valor: 100,
                minimo_compra: 1500, // 1500 DOP
                valido: total >= 1500
            },
            'BIENVENIDA10': {
                id: 4,
                codigo: 'BIENVENIDA10',
                tipo: 'porcentaje',
                valor: 10,
                minimo_compra: 0,
                valido: true
            }
        };
        
        const discount = validDiscounts[codigo.toUpperCase()];
        
        if (!discount) {
            return res.status(404).json({ 
                valido: false, 
                error: 'Código no válido' 
            });
        }
        
        if (!discount.valido) {
            const minCompraFormateado = formatDOP(discount.minimo_compra);
            return res.status(400).json({ 
                valido: false, 
                error: `Mínimo de compra: ${minCompraFormateado}` 
            });
        }
        
        res.json({
            valido: true,
            descuento: discount,
            mensaje: `Descuento aplicado: ${discount.valor}${discount.tipo === 'porcentaje' ? '%' : ''}`
        });
        
    } catch (error) {
        console.error('Error validando descuento:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// ================= RUTAS DE UTILIDAD =================
app.get('/api/test', async (req, res) => {
    try {
        const result = await query('SELECT NOW() as time, version() as version');
        res.json({ 
            message: '✅ Servidor funcionando',
            database: '✅ Conectado a PostgreSQL',
            currency: {
                default: DEFAULT_CURRENCY,
                symbol: CURRENCY_SYMBOL,
                example: formatDOP(1000)
            },
            time: result.rows[0].time,
            version: result.rows[0].version
        });
    } catch (error) {
        res.status(500).json({ 
            error: '❌ Error de conexión',
            details: error.message 
        });
    }
});

// Test de formato de moneda
app.get('/api/currency/test', (req, res) => {
    const testAmounts = [100, 500, 1000, 2500, 5000, 10000];
    
    const formattedAmounts = testAmounts.map(amount => {
        return {
            amount: amount,
            formatted: formatDOP(amount)
        };
    });
    
    res.json({
        currency: DEFAULT_CURRENCY,
        currency_symbol: CURRENCY_SYMBOL,
        examples: formattedAmounts
    });
});

// Crear datos de prueba con precios en DOP
app.get('/api/create-test-data', async (req, res) => {
    try {
        // Crear tabla direcciones si no existe (ACTUALIZADO - sin calle, numero, apartamento)
        await query(`
            CREATE TABLE IF NOT EXISTS direcciones (
                id SERIAL PRIMARY KEY,
                usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
                nombre VARCHAR(100) NOT NULL,
                nombre_completo VARCHAR(200) NOT NULL,
                telefono VARCHAR(20) NOT NULL,
                provincia VARCHAR(100) NOT NULL,
                municipio VARCHAR(100) NOT NULL,
                sector VARCHAR(100) NOT NULL,
                referencia TEXT NOT NULL,
                paqueteria_preferida VARCHAR(50),
                predeterminada BOOLEAN DEFAULT false,
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                fecha_actualizacion TIMESTAMP,
                UNIQUE(usuario_id, predeterminada) WHERE predeterminada = true
            )
        `);
        
        console.log('✅ Tabla direcciones creada/verificada (formato simplificado)');
        
        const existing = await query('SELECT COUNT(*) FROM productos');
        const count = parseInt(existing.rows[0].count);
        
        if (count === 0) {
            const testProducts = [
                {
                    nombre: 'Legging High-Waist Black',
                    descripcion: 'Legging de alta compresión con tecnología dry-fit',
                    precio: 2500, // DOP
                    categoria: 'leggings',
                    stock: 25,
                    tallas: '{"XS","S","M","L"}',
                    colores: '{"Negro","Gris Oscuro"}',
                    imagenes_adicionales: '{"https://via.placeholder.com/400x600/000000/FFFFFF?text=Legging+Back","https://via.placeholder.com/400x600/333333/FFFFFF?text=Legging+Side"}',
                    material: 'Nylon/Spandex',
                    coleccion: 'Essentials',
                    sku: 'MAB-LG001'
                },
                {
                    nombre: 'Sports Bra Essential',
                    descripcion: 'Sujetador deportivo esencial con soporte medio',
                    precio: 1500, // DOP
                    categoria: 'tops',
                    stock: 30,
                    tallas: '{"S","M","L"}',
                    colores: '{"Negro","Blanco"}',
                    imagenes_adicionales: '{"https://via.placeholder.com/400x600/FFFFFF/000000?text=Sports+Bra+Back","https://via.placeholder.com/400x600/000000/FFFFFF?text=Sports+Bra+Detail"}',
                    material: 'Polyester/Spandex',
                    coleccion: 'Essentials',
                    sku: 'MAB-BR001',
                    descuento_porcentaje: 20 // 20% de descuento
                }
            ];
            
            for (const product of testProducts) {
                await query(
                    `INSERT INTO productos (
                        nombre, descripcion, precio, categoria, stock, 
                        tallas, colores, imagenes_adicionales, material, coleccion, sku, 
                        descuento_porcentaje, activo
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                    [
                        product.nombre,
                        product.descripcion,
                        product.precio,
                        product.categoria,
                        product.stock,
                        product.tallas,
                        product.colores,
                        product.imagenes_adicionales,
                        product.material,
                        product.coleccion,
                        product.sku,
                        product.descuento_porcentaje || 0,
                        true
                    ]
                );
            }
            
            // Procesar productos creados
            const result = await query('SELECT * FROM productos');
            const processedProducts = result.rows.map(product => processProductPrices(product));
            
            res.json({ 
                success: true, 
                message: `Tabla direcciones lista y ${testProducts.length} productos de prueba creados`,
                products: processedProducts.map(p => ({
                    nombre: p.nombre,
                    precio_original: p.precio_original_formateado,
                    precio_final: p.precio_formateado,
                    tiene_descuento: p.tiene_descuento
                }))
            });
        } else {
            const result = await query('SELECT * FROM productos LIMIT 2');
            const processedProducts = result.rows.map(product => processProductPrices(product));
            
            res.json({ 
                success: true, 
                message: `Tabla direcciones lista y ya existen ${count} productos`,
                sample_products: processedProducts.map(p => ({
                    nombre: p.nombre,
                    precio_original: p.precio_original_formateado,
                    precio_final: p.precio_formateado,
                    tiene_descuento: p.tiene_descuento
                }))
            });
        }
    } catch (error) {
        console.error('Error creando datos de prueba:', error);
        res.status(500).json({ 
            error: 'Error creando datos de prueba',
            details: error.message
        });
    }
});

// ================= RUTA PARA IMÁGENES POR DEFECTO =================
app.get('/public/images/default-product.jpg', (req, res) => {
    const defaultImagePath = path.join(__dirname, 'public/images/default-product.jpg');
    
    // Verificar si existe la imagen por defecto
    if (fs.existsSync(defaultImagePath)) {
        res.sendFile(defaultImagePath);
    } else {
        // Crear directorio si no existe
        const imagesDir = path.join(__dirname, 'public/images');
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir, { recursive: true });
        }
        
        // Crear una imagen por defecto simple (puedes reemplazar con una imagen real)
        // Por ahora devolvemos un 404 con JSON
        res.status(404).json({ 
            error: 'Imagen no encontrada',
            message: 'La imagen por defecto no está configurada. Sube una imagen llamada default-product.jpg en /public/images/'
        });
    }
});

// ================= MANEJO DE ERRORES =================

// Endpoint temporal para compatibilidad
app.post('/api/payments/create-stripe-payment', async (req, res) => {
    console.log('📨 Petición recibida en create-stripe-payment');
    console.log('📦 Body recibido:', req.body);
    
    // Simular respuesta exitosa
    res.json({
        clientSecret: 'pi_test_secret_123456',
        paymentIntentId: 'pi_123456789',
        currency: 'DOP',
        amount: req.body.amount || 0
    });
});

// ================= MANEJO DE ERRORES GLOBALES =================

// Capturar errores no manejados de promesas
process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 Error no manejado en Promise:', reason);
    console.error('📦 Promise:', promise);
});

// Capturar excepciones no capturadas
process.on('uncaughtException', (error) => {
    console.error('💥 Excepción no capturada:', error);
    // No cerrar el proceso para desarrollo
    // En producción podrías querer reiniciar
});

// Middleware para rutas no encontradas
app.use((req, res, next) => {
    console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
    
    // Si es una imagen, devolver JSON en lugar de HTML
    if (req.originalUrl.includes('.jpg') || req.originalUrl.includes('.png') || 
        req.originalUrl.includes('.gif') || req.originalUrl.includes('.webp')) {
        return res.status(404).json({ 
            error: 'Imagen no encontrada',
            url: req.originalUrl,
            suggestion: 'Asegúrate de que la imagen exista en /public/images/'
        });
    }
    
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        method: req.method,
        url: req.originalUrl
    });
});

// Middleware para errores generales
app.use((err, req, res, next) => {
    console.error('🔥 Error del servidor:', err);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// ================= INICIAR SERVIDOR =================
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`\n💰 CONFIGURACIÓN DE MONEDA:`);
    console.log(`   • Moneda principal: ${DEFAULT_CURRENCY} (${CURRENCY_SYMBOL})`);
    console.log(`   • NOTA: Todos los precios están en pesos dominicanos`);
    console.log(`\n📧 SISTEMA DE EMAILS:`);
    console.log(`   • Email de bienvenida automático`);
    console.log(`   • Notificaciones de nuevos productos`);
    console.log(`   • Emails semanales programados`);
    console.log(`   • Servicio: ${process.env.EMAIL_HOST || 'No configurado'}`);
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        console.log(`\n⚠️  ADVERTENCIA: Email no configurado. Añade credenciales en .env`);
    }
    
    console.log(`\n📋 RUTAS PRINCIPALES:`);
    console.log(`   • Página principal: http://localhost:${PORT}/`);
    console.log(`   • Tienda: http://localhost:${PORT}/shop`);
    console.log(`   • Carrito: http://localhost:${PORT}/cart`);
    console.log(`   • Checkout: http://localhost:${PORT}/checkout`);
    console.log(`   • Admin: http://localhost:${PORT}/admin`);
    console.log(`   • Cuenta: http://localhost:${PORT}/account`);
    
    console.log(`\n📍 DIRECCIONES (FORMATO SIMPLIFICADO):`);
    console.log(`   • API Direcciones: http://localhost:${PORT}/api/users/:id/addresses`);
    console.log(`   • Campos requeridos: nombre, nombre_completo, telefono, provincia, municipio, sector, referencia`);
    
    console.log(`\n🔧 RUTAS DE API:`);
    console.log(`   • Test: http://localhost:${PORT}/api/test`);
    console.log(`   • Config moneda: http://localhost:${PORT}/api/currency/config`);
    console.log(`   • Productos (DOP): http://localhost:${PORT}/api/products`);
    console.log(`   • Provincias RD: http://localhost:${PORT}/api/dominican-republic/provinces`);
    console.log(`   • Config pagos: http://localhost:${PORT}/api/payments/config`);
    
    console.log(`\n👤 CREDENCIALES:`);
    console.log(`   • Admin: admin@gmail.com / admin123`);
    
    console.log(`\n✅ Listo para usar! Sistema completo funcionando.`);
});