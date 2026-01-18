// setup-images.js
const fs = require('fs');
const path = require('path');

function setupImages() {
    const imagesDir = path.join(__dirname, 'public/images');
    const productsDir = path.join(__dirname, 'public/images/products');
    
    // Crear directorios si no existen
    if (!fs.existsSync(imagesDir)) {
        fs.mkdirSync(imagesDir, { recursive: true });
        console.log('✅ Directorio images creado');
    }
    
    if (!fs.existsSync(productsDir)) {
        fs.mkdirSync(productsDir, { recursive: true });
        console.log('✅ Directorio products creado');
    }
    
    // Verificar imagen por defecto
    const defaultImage = path.join(imagesDir, 'default-product.jpg');
    if (!fs.existsSync(defaultImage)) {
        // Puedes copiar una imagen aquí o crear un archivo simple
        console.log('⚠️  Imagen por defecto no encontrada en:', defaultImage);
        console.log('👉 Sube una imagen llamada "default-product.jpg" a la carpeta public/images/');
    }
    
    console.log('📁 Directorio de imágenes listo');
}

setupImages();