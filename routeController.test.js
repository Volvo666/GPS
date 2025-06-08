/**
 * Pruebas para el controlador de rutas
 */

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const routeController = require('../controllers/routeController');
const hereMapService = require('../services/hereMapService');

// Mock del servicio de HERE Maps
jest.mock('../services/hereMapService');

// Crear una aplicación Express para las pruebas
const app = express();
app.use(bodyParser.json());

// Configurar las rutas para las pruebas
app.post('/api/routes/calculate', routeController.calculateRoute);
app.post('/api/routes/rest-areas', routeController.getRestAreas);
app.post('/api/routes/optimize-stops', routeController.optimizeRestStops);
app.get('/api/routes/speed-limits', routeController.getSpeedLimits);

describe('Route Controller', () => {
  // Datos de prueba
  const testOrigin = { lat: 40.4168, lng: -3.7038 }; // Madrid
  const testDestination = { lat: 41.3851, lng: 2.1734 }; // Barcelona
  const testVehicleParams = {
    height: 4.2,
    width: 2.5,
    length: 16.5,
    weight: 40,
    axleCount: 5
  };

  // Limpiar mocks después de cada prueba
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateRoute', () => {
    test('debería devolver una ruta calculada correctamente', async () => {
      // Mock de la respuesta del servicio de HERE Maps
      const mockBaseRoute = {
        status: 'success',
        distance: 600000, // 600 km
        duration: 25200, // 7 horas
        segments: [
          {
            distance: 300000,
            duration: 12600,
            road_type: 'motorway',
            country_code: 'ES',
            start_point: testOrigin,
            end_point: { lat: 40.9, lng: -2.5 }
          },
          {
            distance: 300000,
            duration: 12600,
            road_type: 'motorway',
            country_code: 'ES',
            start_point: { lat: 40.9, lng: -2.5 },
            end_point: testDestination
          }
        ],
        origin: testOrigin,
        destination: testDestination
      };

      // Configurar el mock del servicio
      hereMapService.getRoute.mockResolvedValue(mockBaseRoute);

      // Realizar la solicitud
      const response = await request(app)
        .post('/api/routes/calculate')
        .send({
          origin: testOrigin,
          destination: testDestination,
          vehicleParams: testVehicleParams
        });

      // Verificar la respuesta
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(hereMapService.getRoute).toHaveBeenCalledWith(
        testOrigin,
        testDestination,
        testVehicleParams,
        undefined,
        undefined
      );
    });

    test('debería devolver error 400 si faltan parámetros requeridos', async () => {
      // Realizar la solicitud sin destino
      const response = await request(app)
        .post('/api/routes/calculate')
        .send({
          origin: testOrigin,
          // Falta el destino
          vehicleParams: testVehicleParams
        });

      // Verificar la respuesta
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Se requieren origen y destino');
    });

    test('debería devolver error 400 si el formato de coordenadas es incorrecto', async () => {
      // Realizar la solicitud con formato incorrecto
      const response = await request(app)
        .post('/api/routes/calculate')
        .send({
          origin: { latitude: 40.4168, longitude: -3.7038 }, // Formato incorrecto
          destination: testDestination,
          vehicleParams: testVehicleParams
        });

      // Verificar la respuesta
      expect(response.status).toBe(400);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('formato de las coordenadas');
    });

    test('debería devolver error 500 si el servicio de HERE Maps falla', async () => {
      // Configurar el mock para simular un error
      hereMapService.getRoute.mockResolvedValue({
        status: 'error',
        message: 'Error en el servicio de HERE Maps'
      });

      // Realizar la solicitud
      const response = await request(app)
        .post('/api/routes/calculate')
        .send({
          origin: testOrigin,
          destination: testDestination,
          vehicleParams: testVehicleParams
        });

      // Verificar la respuesta
      expect(response.status).toBe(500);
      expect(response.body.status).toBe('error');
      expect(response.body.message).toContain('Error al obtener la ruta base');
    });
  });

  describe('getSpeedLimits', () => {
    test('debería devolver los límites de velocidad para camiones', async () => {
      // Realizar la solicitud
      const response = await request(app)
        .get('/api/routes/speed-limits');

      // Verificar la respuesta
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toBeDefined();
      
      // Verificar que incluye datos para España
      expect(response.body.data.ES).toBeDefined();
      expect(response.body.data.ES.motorway).toBe(90);
      
      // Verificar que incluye datos para Alemania
      expect(response.body.data.DE).toBeDefined();
      expect(response.body.data.DE.motorway).toBe(80);
    });
  });

  // Nota: Las pruebas para getRestAreas y optimizeRestStops requerirían
  // mockear el proceso de Python, lo cual es más complejo y se omite aquí
});

