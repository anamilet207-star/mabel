-- setup-database.sql
-- Crear o actualizar tabla usuarios
DO $$ 
BEGIN
    -- Verificar si la columna 'ciudad' existe
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'usuarios' 
        AND column_name = 'ciudad'
    ) THEN
        -- Si no existe, agregar las columnas que necesitas
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS direccion VARCHAR(255);
        ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100);
    END IF;
END $$;

-- Crear tabla productos si no existe
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    categoria VARCHAR(100),
    imagen VARCHAR(500),
    stock INTEGER DEFAULT 0,
    tallas TEXT,
    colores TEXT,
    sku VARCHAR(100) UNIQUE,
    material VARCHAR(100),
    coleccion VARCHAR(100),
    imagenes_adicionales TEXT,
    descuento_porcentaje INTEGER DEFAULT 0,
    descuento_precio DECIMAL(10,2),
    descuento_expiracion DATE,
    vistas INTEGER DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP
);

-- Crear tabla direcciones (versión simplificada)
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
);

-- Crear tabla wishlist
CREATE TABLE IF NOT EXISTS wishlist (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id) ON DELETE CASCADE,
    fecha_agregado TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(usuario_id, producto_id)
);

-- Insertar datos de prueba
INSERT INTO productos (nombre, descripcion, precio, categoria, imagen, stock, tallas, colores) 
VALUES 
('Legging High-Waist Black', 'Legging de alta compresión', 2500, 'leggings', '/public/images/default-product.jpg', 10, '{"XS","S","M"}', '{"Negro"}'),
('Sports Bra Essential', 'Sujetador deportivo', 1500, 'tops', '/public/images/default-product.jpg', 15, '{"S","M","L"}', '{"Negro","Blanco"}')
ON CONFLICT (sku) DO NOTHING;