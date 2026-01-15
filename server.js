require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Importar configuración de base de datos
const { query } = require('./env/db.js');

// Importar SDKs de pago
const paypal = require('@paypal/checkout-server-sdk');

// ← PRIMERO INICIALIZAR LA APP
const app = express();
const PORT = 3000;

let stripe = null;

if (STRIPE_ENABLED) {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

// ================= CONFIGURACIÓN MIDDLEWARE =================

// Trust proxy para Railway
app.set('trust proxy', 1);

// ← AHORA SÍ PUEDES USAR app.use()
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

// Configuración de sesión para Railway
app.use(session({
    secret: process.env.SESSION_SECRET || 'mabel-activewear-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // true en Railway
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    }
}));

// ... resto de tu código ...
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

/**
 * Procesar productos para mostrar precios en DOP
 * NOTA: Asume que los precios en la BD están en DOP
 */
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
        imagenes_adicionales: parseArrayFromPostgres(product.imagenes_adicionales),
        
        // Imagen por defecto si no existe
        imagen: product.imagen || '/public/images/default-product.jpg'
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

// ================= CONFIGURACIÓN MIDDLEWARE =================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(__dirname));

// Configuración de sesión
app.use(session({
    secret: 'mabel-activewear-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000
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

// ================= RUTAS DE ARCHIVOS ESTÁTICOS =================
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Servir imágenes placeholder si no existen
app.get('/public/images/products/:imageName', (req, res) => {
    const imageName = req.params.imageName;
    const imagePath = path.join(__dirname, 'public/images/products', imageName);
    
    if (fs.existsSync(imagePath)) {
        res.sendFile(imagePath);
    } else {
        const placeholder = `
            <svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
                <rect width="400" height="600" fill="#f5f5f5"/>
                <text x="200" y="300" font-family="Arial" font-size="20" text-anchor="middle" fill="#666">
                    ${imageName.replace('.jpg', '').replace(/[_-]/g, ' ')}
                </text>
            </svg>
        `;
        res.set('Content-Type', 'image/svg+xml');
        res.send(placeholder);
    }
});

// Imagen por defecto
app.get('/public/images/default-product.jpg', (req, res) => {
    const placeholder = `
        <svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">
            <rect width="400" height="500" fill="#f8f8f8"/>
            <text x="200" y="250" font-family="Arial" font-size="24" text-anchor="middle" fill="#666">
                MABEL ACTIVEWEAR
            </text>
        </svg>
    `;
    res.set('Content-Type', 'image/svg+xml');
    res.send(placeholder);
});

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

// ================= API - CONFIGURACIÓN DE MONEDA =================
app.get('/api/currency/config', (req, res) => {
    res.json({
        currency: DEFAULT_CURRENCY,
        symbol: CURRENCY_SYMBOL,
        format_example: formatDOP(1000)
    });
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
        
        req.session.userId = newUser.id;
        req.session.userRole = newUser.rol;
        req.session.userEmail = newUser.email;
        req.session.userName = `${newUser.nombre} ${newUser.apellido}`;
        
        res.status(201).json({
            success: true,
            user: newUser
        });
        
    } catch (error) {
        console.error('❌ Error en registro:', error);
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

// ================= RUTAS DE PAGOS =================
app.get('/api/payments/config', (req, res) => {
    console.log('🔧 Enviando configuración de pagos al frontend');
    
    res.json({
        stripePublicKey: process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_TYooMQauvdEDq54NiTphI7jx',
        paypalClientId: process.env.PAYPAL_CLIENT_ID || 'test',
        currency: DEFAULT_CURRENCY,
        currency_symbol: CURRENCY_SYMBOL,
        environment: process.env.NODE_ENV || 'development',
        country: 'DO',
        paymentMethods: ['card', 'paypal', 'transfer'],
        features: {
            stripe: true,
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

// Luego en la ruta POST /api/admin/products:
app.post('/api/admin/products', requireAuth, requireAdmin, async (req, res) => {
    // ... tu código existente ...
    
    try {
        // PRIMERO insertar para obtener el ID
        const result = await query(
            `INSERT INTO productos (
                nombre, descripcion, precio, categoria, imagen, stock, 
                tallas, colores, sku, material, coleccion, 
                imagenes_adicionales, descuento_porcentaje, descuento_precio, activo, fecha_creacion
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'TEMP-SKU', $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP) 
             RETURNING id`,
            [
                // ... parámetros ...
            ]
        );
        
        const newId = result.rows[0].id;
        
        // AHORA generar SKU único basado en el ID
        const uniqueSku = generateUniqueSKU(newId);
        
        // Actualizar con SKU real
        await query(
            'UPDATE productos SET sku = $1 WHERE id = $2',
            [uniqueSku, newId]
        );
        
        // Obtener producto completo
        const finalResult = await query(
            'SELECT * FROM productos WHERE id = $1',
            [newId]
        );
        
        res.status(201).json(finalResult.rows[0]);
        
    } catch (error) {
        // ... manejo de errores ...
    }
});

// Crear producto (admin) - Precio se ingresa en DOP
app.post('/api/admin/products', requireAuth, requireAdmin, async (req, res) => {
    const { 
        nombre, 
        descripcion, 
        precio, // Recibido en DOP desde el frontend
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
        descuento_precio // En DOP
    } = req.body;
    
    console.log('➕ Creando producto:', nombre);
    console.log('💰 Precio recibido en DOP:', precio);
    
    try {
        // El precio ya viene en DOP, lo guardamos directamente
        const precioDOP = parseFloat(precio);
        
        const productData = {
            nombre: nombre || 'Producto sin nombre',
            descripcion: descripcion || '',
            precio: precioDOP, // Guardamos en DOP
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
        console.log('💰 Precio:', processedProduct.precio_formateado);
        
        res.status(201).json(processedProduct);
        
    } catch (error) {
        console.error('❌ Error creando producto:', error.message);
        
        let errorMessage = 'Error interno del servidor';
        if (error.message.includes('null value')) {
            errorMessage = 'Faltan campos requeridos';
        } else if (error.message.includes('unique constraint')) {
            errorMessage = 'El SKU ya existe';
        }
        
        res.status(500).json({ 
            error: errorMessage,
            details: error.message
        });
    }
});

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

// ================= API - USUARIOS =================
app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await query(`
            SELECT 
                u.id, 
                u.nombre, 
                u.apellido, 
                u.email, 
                u.telefono, 
                u.direccion,
                u.rol, 
                u.fecha_registro,
                u.activo,
                COUNT(DISTINCT p.id) as total_ordenes,
                COALESCE(SUM(p.total), 0) as total_gastado
            FROM usuarios u
            LEFT JOIN pedidos p ON p.usuario_id = u.id
            GROUP BY u.id
            ORDER BY u.fecha_registro DESC
        `);
        
        const users = result.rows.map(user => ({
            id: user.id,
            nombre: user.nombre,
            apellido: user.apellido,
            email: user.email,
            telefono: user.telefono || '-',
            direccion: user.direccion || '-',
            rol: user.rol,
            fecha_registro: user.fecha_registro,
            activo: user.activo,
            total_orders: parseInt(user.total_ordenes) || 0,
            total_spent: parseFloat(user.total_gastado) || 0,
            total_spent_formatted: formatDOP(parseFloat(user.total_gastado) || 0)
        }));
        
        console.log(`✅ Enviando ${users.length} usuarios`);
        res.json(users);
        
    } catch (error) {
        console.error('❌ Error obteniendo usuarios:', error);
        
        try {
            const result = await query(`
                SELECT 
                    u.id, 
                    u.nombre, 
                    u.apellido, 
                    u.email, 
                    u.telefono, 
                    u.direccion,
                    u.rol, 
                    u.fecha_registro,
                    u.activo
                FROM usuarios u
                ORDER BY u.fecha_registro DESC
            `);
            
            const usersWithStats = await Promise.all(result.rows.map(async (user) => {
                const ordersResult = await query(
                    'SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM pedidos WHERE usuario_id = $1',
                    [user.id]
                );
                
                return {
                    ...user,
                    telefono: user.telefono || '-',
                    direccion: user.direccion || '-',
                    total_orders: parseInt(ordersResult.rows[0]?.count) || 0,
                    total_spent: parseFloat(ordersResult.rows[0]?.total) || 0,
                    total_spent_formatted: formatDOP(parseFloat(ordersResult.rows[0]?.total) || 0),
                    wishlist_items: 0
                };
            }));
            
            console.log(`✅ Enviando ${usersWithStats.length} usuarios`);
            res.json(usersWithStats);
            
        } catch (fallbackError) {
            console.error('❌ Error en consulta alternativa:', fallbackError);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    }
});

// ================= API - ÓRDENES =================
app.get('/api/admin/orders', requireAuth, requireAdmin, async (req, res) => {
    try {
        const result = await query(`
            SELECT p.*, 
                   u.nombre as nombre_cliente, 
                   u.email as email_cliente,
                   u.telefono as telefono_contacto
            FROM pedidos p
            LEFT JOIN usuarios u ON p.usuario_id = u.id
            ORDER BY p.fecha_creacion DESC
        `);
        
        const orders = result.rows.map(order => {
            const totalDOP = parseFloat(order.total) || 0;
            
            return {
                id: order.id,
                fecha_orden: order.fecha_creacion,
                total: totalDOP,
                total_formateado: formatDOP(totalDOP),
                estado: order.estado || 'pendiente',
                metodo_pago: order.metodo_pago,
                metodo_envio: order.metodo_envio,
                direccion_envio: order.direccion_envio,
                ciudad_envio: order.ciudad_envio,
                telefono_contacto: order.telefono_contacto,
                nombre_cliente: order.nombre_cliente,
                email_cliente: order.email_cliente,
                // Items simulados
                items: [
                    {
                        nombre: 'Producto de ejemplo',
                        cantidad: 1,
                        precio_unitario: totalDOP,
                        precio_unitario_formateado: formatDOP(totalDOP),
                        imagen: '/public/images/default-product.jpg'
                    }
                ]
            };
        });
        
        console.log(`✅ Enviando ${orders.length} órdenes en DOP`);
        res.json(orders);
        
    } catch (error) {
        console.error('❌ Error obteniendo órdenes:', error);
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
                message: `${testProducts.length} productos de prueba creados`,
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
                message: `Ya existen ${count} productos`,
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

// ================= MANEJO DE ERRORES =================
app.use((req, res, next) => {
    console.log(`❌ 404: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        method: req.method,
        url: req.originalUrl
    });
});

app.use((err, req, res, next) => {
    console.error('🔥 Error del servidor:', err);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: err.message
    });
});

// ================= INICIAR SERVIDOR =================
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`\n💰 CONFIGURACIÓN DE MONEDA:`);
    console.log(`   • Moneda principal: ${DEFAULT_CURRENCY} (${CURRENCY_SYMBOL})`);
    console.log(`   • NOTA: Todos los precios están en pesos dominicanos`);
    console.log(`\n📋 RUTAS PRINCIPALES:`);
    console.log(`   • Página principal: http://localhost:${PORT}/`);
    console.log(`   • Tienda: http://localhost:${PORT}/shop`);
    console.log(`   • Carrito: http://localhost:${PORT}/cart`);
    console.log(`   • Checkout: http://localhost:${PORT}/checkout`);
    console.log(`   • Admin: http://localhost:${PORT}/admin`);
    console.log(`\n🔧 RUTAS DE API:`);
    console.log(`   • Test: http://localhost:${PORT}/api/test`);
    console.log(`   • Config moneda: http://localhost:${PORT}/api/currency/config`);
    console.log(`   • Productos (DOP): http://localhost:${PORT}/api/products`);
    console.log(`   • Config pagos: http://localhost:${PORT}/api/payments/config`);
    console.log(`\n👤 CREDENCIALES:`);
    console.log(`   • Admin: admin@gmail.com / admin123`);
    console.log(`\n✅ Listo para usar! Todos los precios se muestran en Pesos Dominicanos (DOP)`);
});

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

// Middleware de depuración
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.url}`);
    console.log('👤 Sesión:', req.session);
    console.log('🔑 User ID:', req.session.userId);
    console.log('👑 User Role:', req.session.userRole);
    next();
});