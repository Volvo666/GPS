const express = require('express'); 
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const path = require('path'); // Agregado para servir archivos estáticos
const connectDB = require('./db');
const sharedRoutesRouter = require('./routes/sharedRoutes');

// Cargar variables de entorno
dotenv.config();

// Inicializar la aplicación Express
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Importar middleware de autenticación
const auth = require('./auth');

// Importar rutas
const routesRouter = require('./routes/Ruta');
const userRouter = require('./routes/userRoutes');

// Rutas públicas
app.use('/api/user', userRouter);
app.use('/api/user/login', userRouter);

// Rutas de rutas compartidas (mixtas - algunas públicas, algunas privadas)
app.use('/api/shared-routes', sharedRoutesRouter);

// Rutas protegidas
app.use('/api/routes', auth, routesRouter);
app.use('/api/user', auth, userRouter);

// Ruta principal - servir el frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

// Ruta de prueba para verificar que la API funciona
app.get('/api/status', (req, res) => {
  res.json({ message: 'API de Truking GPS funcionando correctamente' });
});

// Puerto
const PORT = process.env.PORT || 3000;

// Conexión a MongoDB (comentada hasta tener credenciales)
/*
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Servidor ejecutándose en el puerto ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Error al iniciar el servidor:', err.message);
  });
*/

// Iniciar servidor sin MongoDB por ahora
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});

module.exports = app;

