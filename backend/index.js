const express = require('express'); 
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config();

// Inicializar la aplicación Express
const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://gps-production-e508.up.railway.app'] 
    : ['http://localhost:3000', 'http://localhost:3001']
}));

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos desde la carpeta frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Log de inicio
console.log('🚀 Iniciando aplicación Truking GPS...');
console.log('📦 NODE_ENV:', process.env.NODE_ENV);
console.log('🔌 PORT:', process.env.PORT);

// Importar y configurar rutas de forma segura
let routesLoaded = {
  auth: false,
  db: false,
  userRoutes: false,
  sharedRoutes: false
};

// Cargar auth de forma segura
let auth = (req, res, next) => next(); // Fallback por defecto
try {
  auth = require('./auth');
  routesLoaded.auth = true;
  console.log('✅ Auth middleware cargado');
} catch (error) {
  console.log('⚠️  Auth middleware no encontrado, usando fallback');
}

// Cargar DB de forma segura
let connectDB = null;
try {
  connectDB = require('./db');
  routesLoaded.db = true;
  console.log('✅ DB module cargado');
} catch (error) {
  console.log('⚠️  DB module no encontrado');
}

// Cargar rutas de forma segura
try {
  const userRouter = require('./routes/userRoutes');
  app.use('/api/user', userRouter);
  routesLoaded.userRoutes = true;
  console.log('✅ User routes cargadas');
} catch (error) {
  console.log('⚠️  User routes no encontradas:', error.message);
}

try {
  const sharedRoutesRouter = require('./routes/sharedRoutes');
  app.use('/api/shared-routes', sharedRoutesRouter);
  routesLoaded.sharedRoutes = true;
  console.log('✅ Shared routes cargadas');
} catch (error) {
  console.log('⚠️  Shared routes no encontradas:', error.message);
}

// Intentar cargar otras rutas posibles
const possibleRouteFiles = ['routes', 'Ruta', 'routeController'];
for (const routeFile of possibleRouteFiles) {
  try {
    const router = require(`./routes/${routeFile}`);
    app.use('/api/routes', auth, router);
    console.log(`✅ Route file ${routeFile} cargado`);
    break;
  } catch (error) {
    // Continuar con el siguiente archivo
  }
}

// Rutas básicas
app.get('/', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
  } catch (error) {
    res.json({
      message: 'Truking GPS API',
      status: 'running',
      timestamp: new Date().toISOString()
    });
  }
});

// Ruta de estado/health check
app.get('/api/status', (req, res) => {
  res.json({
    message: 'API de Truking GPS funcionando correctamente',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    modules: routesLoaded,
    mongodb: process.env.MONGODB_URI ? 'configured' : 'not configured'
  });
});

// Ruta catch-all para SPA
app.get('*', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
  } catch (error) {
    res.status(404).json({ message: 'Page not found' });
  }
});

// Puerto - Railway asigna automáticamente
const PORT = process.env.PORT || 3000;

// Función para iniciar el servidor
const startServer = async () => {
  try {
    // Intentar conectar a MongoDB si está configurado
    if (connectDB && process.env.MONGODB_URI) {
      console.log('🔄 Conectando a MongoDB...');
      await connectDB();
      console.log('✅ Conectado a MongoDB');
    } else {
      console.log('⚠️  MongoDB no configurado o no disponible');
    }
  } catch (error) {
    console.error('❌ Error conectando a MongoDB:', error.message);
    console.log('🔄 Continuando sin MongoDB...');
  }
  
  // Iniciar servidor
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
    console.log(`🌐 URL: https://gps-production-e508.up.railway.app`);
    console.log(`📊 Health check: https://gps-production-e508.up.railway.app/api/status`);
  });

  // Manejo graceful shutdown
  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM recibido, cerrando servidor...');
    server.close(() => {
      console.log('✅ Servidor cerrado correctamente');
      process.exit(0);
    });
  });
};

// Manejo de errores globales
process.on('uncaughtException', (error) => {
  console.error('❌ Error no capturado:', error);
  console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (error) => {
  console.error('❌ Promesa rechazada no manejada:', error);
  console.error('Stack:', error.stack);
});

// Iniciar el servidor
startServer().catch((error) => {
  console.error('❌ Error fatal al iniciar servidor:', error);
  process.exit(1);
});

module.exports = app;

