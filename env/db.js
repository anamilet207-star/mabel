const { Pool } = require('pg');

// URL de conexión proporcionada por Railway
const connectionString = 'postgresql://postgres:nZOCKIxGXyucDITEUOfDIrvZPuWSCOFI@postgres.railway.internal:5432/railway';

// Configuración de conexión a PostgreSQL
const pool = new Pool({
    connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

// Probar la conexión al iniciar
pool.connect((err, client, done) => {
    if (err) {
        console.error('❌ Error conectando a PostgreSQL:', err.message);
    } else {
        console.log('✅ Conectado a PostgreSQL');
        done();
    }
});

// Función para consultas
async function query(text, params) {
    const client = await pool.connect();
    try {
        const result = await client.query(text, params);
        return result;
    } catch (error) {
        console.error('Error en consulta SQL:', error);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = {
    query,
    pool
};
