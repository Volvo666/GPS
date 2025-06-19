const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../index');
const SharedRoute = require('../models/SharedRoute');
const User = require('../models/User');

describe('Shared Routes API', () => {
  let authToken;
  let userId;
  let testUser;

  beforeAll(async () => {
    // Conectar a base de datos de prueba
    await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/truking_gps_test');
    
    // Crear usuario de prueba
    testUser = new User({
      name: 'Test Driver',
      email: 'test@example.com',
      password: 'hashedpassword',
      company: 'Test Transport'
    });
    await testUser.save();
    userId = testUser._id;
    
    // Simular token de autenticación
    authToken = 'test-jwt-token';
  });

  afterAll(async () => {
    // Limpiar base de datos de prueba
    await SharedRoute.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Limpiar rutas compartidas antes de cada prueba
    await SharedRoute.deleteMany({});
  });

  describe('POST /api/shared-routes', () => {
    const validRouteData = {
      routeInfo: {
        origin: {
          name: 'Madrid, España',
          coordinates: { lat: 40.4168, lng: -3.7038 }
        },
        destination: {
          name: 'Barcelona, España',
          coordinates: { lat: 41.3851, lng: 2.1734 }
        },
        estimatedDuration: 360, // 6 horas
        estimatedDistance: 620 // 620 km
      },
      privacy: {
        showExactLocation: true,
        showSpeed: false,
        showETA: true,
        publicAccess: true,
        allowedViewers: []
      },
      vehicleInfo: {
        licensePlate: 'ABC-1234',
        model: 'Volvo FH16'
      }
    };

    it('should create a shared route successfully', async () => {
      const response = await request(app)
        .post('/api/shared-routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(validRouteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.shareId).toBeDefined();
      expect(response.body.shareUrl).toContain(response.body.shareId);
      expect(response.body.message).toBe('Ruta compartida creada exitosamente');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/shared-routes')
        .send(validRouteData)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should fail with incomplete route info', async () => {
      const incompleteData = {
        ...validRouteData,
        routeInfo: {
          origin: { name: 'Madrid' }
          // Falta destination
        }
      };

      const response = await request(app)
        .post('/api/shared-routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(incompleteData)
        .expect(400);

      expect(response.body.error).toBe('Información de ruta incompleta');
    });

    it('should create private route with allowed viewers', async () => {
      const privateRouteData = {
        ...validRouteData,
        privacy: {
          ...validRouteData.privacy,
          publicAccess: false,
          allowedViewers: [
            { email: 'viewer1@example.com', name: 'Viewer 1' },
            { email: 'viewer2@example.com', name: 'Viewer 2' }
          ]
        }
      };

      const response = await request(app)
        .post('/api/shared-routes')
        .set('Authorization', `Bearer ${authToken}`)
        .send(privateRouteData)
        .expect(201);

      expect(response.body.success).toBe(true);
      
      // Verificar que la ruta se guardó con la configuración correcta
      const savedRoute = await SharedRoute.findOne({ shareId: response.body.shareId });
      expect(savedRoute.privacy.publicAccess).toBe(false);
      expect(savedRoute.privacy.allowedViewers).toHaveLength(2);
    });
  });

  describe('GET /api/shared-routes/:shareId', () => {
    let publicRoute;
    let privateRoute;

    beforeEach(async () => {
      // Crear ruta pública de prueba
      publicRoute = new SharedRoute({
        shareId: 'PUB12345',
        userId: userId,
        routeInfo: {
          origin: { name: 'Madrid', coordinates: { lat: 40.4168, lng: -3.7038 } },
          destination: { name: 'Barcelona', coordinates: { lat: 41.3851, lng: 2.1734 } }
        },
        privacy: { publicAccess: true },
        currentLocation: {
          coordinates: { lat: 40.5, lng: -3.5 },
          timestamp: new Date()
        }
      });
      await publicRoute.save();

      // Crear ruta privada de prueba
      privateRoute = new SharedRoute({
        shareId: 'PRIV6789',
        userId: userId,
        routeInfo: {
          origin: { name: 'Valencia', coordinates: { lat: 39.4699, lng: -0.3763 } },
          destination: { name: 'Sevilla', coordinates: { lat: 37.3891, lng: -5.9845 } }
        },
        privacy: {
          publicAccess: false,
          allowedViewers: [{ email: 'allowed@example.com', name: 'Allowed User' }]
        }
      });
      await privateRoute.save();
    });

    it('should get public route without email', async () => {
      const response = await request(app)
        .get(`/api/shared-routes/${publicRoute.shareId}`)
        .expect(200);

      expect(response.body.shareId).toBe(publicRoute.shareId);
      expect(response.body.routeInfo).toBeDefined();
      expect(response.body.currentLocation).toBeDefined();
    });

    it('should fail to get private route without email', async () => {
      const response = await request(app)
        .get(`/api/shared-routes/${privateRoute.shareId}`)
        .expect(403);

      expect(response.body.error).toBe('No tienes permisos para ver esta ruta');
    });

    it('should get private route with allowed email', async () => {
      const response = await request(app)
        .get(`/api/shared-routes/${privateRoute.shareId}`)
        .query({ email: 'allowed@example.com' })
        .expect(200);

      expect(response.body.shareId).toBe(privateRoute.shareId);
      expect(response.body.routeInfo).toBeDefined();
    });

    it('should fail to get private route with non-allowed email', async () => {
      const response = await request(app)
        .get(`/api/shared-routes/${privateRoute.shareId}`)
        .query({ email: 'notallowed@example.com' })
        .expect(403);

      expect(response.body.error).toBe('No tienes permisos para ver esta ruta');
    });

    it('should return 404 for non-existent route', async () => {
      const response = await request(app)
        .get('/api/shared-routes/NOTFOUND')
        .expect(404);

      expect(response.body.error).toBe('Ruta compartida no encontrada');
    });
  });

  describe('PUT /api/shared-routes/:shareId/location', () => {
    let testRoute;

    beforeEach(async () => {
      testRoute = new SharedRoute({
        shareId: 'LOC12345',
        userId: userId,
        routeInfo: {
          origin: { name: 'Madrid', coordinates: { lat: 40.4168, lng: -3.7038 } },
          destination: { name: 'Barcelona', coordinates: { lat: 41.3851, lng: 2.1734 } }
        },
        status: 'active'
      });
      await testRoute.save();
    });

    it('should update location successfully', async () => {
      const locationData = {
        coordinates: { lat: 40.5, lng: -3.5 },
        speed: 80,
        heading: 45
      };

      const response = await request(app)
        .put(`/api/shared-routes/${testRoute.shareId}/location`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(locationData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Ubicación actualizada');

      // Verificar que la ubicación se actualizó en la base de datos
      const updatedRoute = await SharedRoute.findOne({ shareId: testRoute.shareId });
      expect(updatedRoute.currentLocation.coordinates.lat).toBe(40.5);
      expect(updatedRoute.currentLocation.coordinates.lng).toBe(-3.5);
      expect(updatedRoute.currentLocation.speed).toBe(80);
    });

    it('should fail without authentication', async () => {
      const locationData = {
        coordinates: { lat: 40.5, lng: -3.5 }
      };

      const response = await request(app)
        .put(`/api/shared-routes/${testRoute.shareId}/location`)
        .send(locationData)
        .expect(401);

      expect(response.body.error).toBeDefined();
    });

    it('should fail with invalid coordinates', async () => {
      const invalidData = {
        coordinates: { lat: 'invalid' }
      };

      const response = await request(app)
        .put(`/api/shared-routes/${testRoute.shareId}/location`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Coordenadas requeridas');
    });
  });

  describe('PUT /api/shared-routes/:shareId/status', () => {
    let testRoute;

    beforeEach(async () => {
      testRoute = new SharedRoute({
        shareId: 'STAT1234',
        userId: userId,
        routeInfo: {
          origin: { name: 'Madrid', coordinates: { lat: 40.4168, lng: -3.7038 } },
          destination: { name: 'Barcelona', coordinates: { lat: 41.3851, lng: 2.1734 } }
        },
        status: 'active'
      });
      await testRoute.save();
    });

    it('should update status successfully', async () => {
      const response = await request(app)
        .put(`/api/shared-routes/${testRoute.shareId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'paused' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.status).toBe('paused');

      // Verificar en base de datos
      const updatedRoute = await SharedRoute.findOne({ shareId: testRoute.shareId });
      expect(updatedRoute.status).toBe('paused');
    });

    it('should fail with invalid status', async () => {
      const response = await request(app)
        .put(`/api/shared-routes/${testRoute.shareId}/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.error).toBe('Estado inválido');
    });
  });

  describe('GET /api/shared-routes', () => {
    beforeEach(async () => {
      // Crear múltiples rutas de prueba
      const routes = [
        {
          shareId: 'ROUTE001',
          userId: userId,
          status: 'active',
          routeInfo: { origin: { name: 'Madrid' }, destination: { name: 'Barcelona' } }
        },
        {
          shareId: 'ROUTE002',
          userId: userId,
          status: 'completed',
          routeInfo: { origin: { name: 'Valencia' }, destination: { name: 'Sevilla' } }
        }
      ];

      await SharedRoute.insertMany(routes);
    });

    it('should get user routes', async () => {
      const response = await request(app)
        .get('/api/shared-routes')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].shareId).toBeDefined();
      expect(response.body[0].shareUrl).toBeDefined();
    });

    it('should filter routes by status', async () => {
      const response = await request(app)
        .get('/api/shared-routes')
        .query({ status: 'active' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe('active');
    });
  });

  describe('DELETE /api/shared-routes/:shareId', () => {
    let testRoute;

    beforeEach(async () => {
      testRoute = new SharedRoute({
        shareId: 'DEL12345',
        userId: userId,
        routeInfo: {
          origin: { name: 'Madrid', coordinates: { lat: 40.4168, lng: -3.7038 } },
          destination: { name: 'Barcelona', coordinates: { lat: 41.3851, lng: 2.1734 } }
        }
      });
      await testRoute.save();
    });

    it('should delete route successfully', async () => {
      const response = await request(app)
        .delete(`/api/shared-routes/${testRoute.shareId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Ruta compartida eliminada');

      // Verificar que se eliminó de la base de datos
      const deletedRoute = await SharedRoute.findOne({ shareId: testRoute.shareId });
      expect(deletedRoute).toBeNull();
    });

    it('should fail to delete non-existent route', async () => {
      const response = await request(app)
        .delete('/api/shared-routes/NOTFOUND')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error).toBe('Ruta compartida no encontrada');
    });
  });
});

