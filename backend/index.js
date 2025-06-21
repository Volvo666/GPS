const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor en puerto ${PORT}`);
});
const express = require('express'); 
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
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
app.use('/api/shared-routes', sharedRoutesRouter);

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

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API de Truking GPS funcionando correctamente');
});

// Puerto
const PORT = process.env.PORT || 5000;

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
app.get('/', (req, res) => {
  res.send('🚛 Backend Truking GPS activo y funcionando');
});
module.exports = app;

