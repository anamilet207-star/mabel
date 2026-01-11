-- Crear tabla de usuarios si no existe
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(20),
    direccion TEXT,
    rol VARCHAR(20) DEFAULT 'cliente',
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_login TIMESTAMP,
    activo BOOLEAN DEFAULT true
);

-- Crear tabla de productos si no existe
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10, 2) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    imagen VARCHAR(255),
    tallas TEXT[] DEFAULT '{"XS","S","M","L","XL"}',
    colores TEXT[] DEFAULT '{"Negro","Blanco","Gris"}',
    stock INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    vistas INTEGER DEFAULT 0,
    sku VARCHAR(50),
    material TEXT,
    cuidado TEXT,
    origen VARCHAR(100),
    caracteristicas TEXT[],
    imagenes_adicionales TEXT[],
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar usuario administrador por defecto
-- Contraseña: admin123
INSERT INTO usuarios (nombre, apellido, email, password_hash, rol) 
VALUES ('Mabel', 'Admin', 'admin@gmail.com', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insertar productos de ejemplo
INSERT INTO productos (nombre, descripcion, precio, categoria, imagen, stock, sku, material) VALUES
('Legging High-Waist Black', 'Legging de alta compresión con tecnología dry-fit', 59.99, 'leggings', '/public/images/products/legging-black.jpg', 25, 'MAB-LG001', 'Nylon/Spandex'),
('Sports Bra Essential', 'Sujetador deportivo esencial con soporte medio', 34.99, 'tops', '/public/images/products/sports-bra.jpg', 30, 'MAB-BR001', 'Polyester/Spandex'),
('Set Active Premium', 'Set completo de ropa deportiva premium', 89.99, 'sets', '/public/images/products/set-premium.jpg', 15, 'MAB-ST001', 'Nylon/Polyester/Spandex'),
('Shorts Running Fit', 'Shorts para running con bolsillo para teléfono', 39.99, 'shorts', '/public/images/products/shorts-running.jpg', 40, 'MAB-SH001', 'Polyester'),
('Bandas de Resistencia', 'Set de bandas de resistencia para entrenamiento', 24.99, 'accesorios', '/public/images/products/resistance-bands.jpg', 50, 'MAB-AC001', 'Latex natural')
ON CONFLICT (sku) DO NOTHING;

-- Verificar inserción
SELECT '✅ Tablas creadas correctamente' as mensaje;
SELECT COUNT(*) as total_usuarios FROM usuarios;
SELECT COUNT(*) as total_productos FROM productos;