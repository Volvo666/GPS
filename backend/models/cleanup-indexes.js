// cleanup-indexes.js - Ejecutar UNA SOLA VEZ para limpiar índices duplicados
const mongoose = require('mongoose');

async function cleanupIndexes() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
    
    console.log('🔄 Limpiando índices duplicados...');
    
    // Obtener la colección SharedRoute
    const collection = mongoose.connection.db.collection('sharedroutes');
    
    // Listar índices actuales
    const indexes = await collection.listIndexes().toArray();
    console.log('Índices actuales:', indexes.map(i => i.name));
    
    // Eliminar todos los índices excepto _id_
    for (const index of indexes) {
      if (index.name !== '_id_') {
        console.log(`🗑️ Eliminando índice: ${index.name}`);
        await collection.dropIndex(index.name);
      }
    }
    
    console.log('✅ Índices limpiados exitosamente');
    
    // Cerrar conexión
    await mongoose.connection.close();
    console.log('🔐 Conexión cerrada');
    
  } catch (error) {
    console.error('❌ Error limpiando índices:', error);
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  cleanupIndexes();
}

module.exports = cleanupIndexes;
