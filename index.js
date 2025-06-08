const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Cargar variables de entorno
dotenv.config();

// Inicializar la aplicación Express
const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Importar middleware de autenticación
const auth = require('./middleware/auth');

// Importar rutas
const routesRouter = require('./routes/routes');
const userRouter = require('./routes/user');
const sharedRoutesRouter = require('./routes/sharedRoutes');

// Rutas públicas
app.use('/api/user/register', userRouter);
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

