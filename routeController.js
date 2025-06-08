const openRouteService = require('../services/openRouteService');
const Route = require('../models/Route');
const User = require('../models/User');

/**
 * Controlador para gestión de rutas usando OpenRouteService
 * Alternativa gratuita a HERE Maps
 */

/**
 * Calcular ruta para camiones
 */
const calculateRoute = async (req, res) => {
  try {
    const { origin, destination, vehicleParams, preferences } = req.body;

    // Validar datos de entrada
    if (!origin || !destination) {
      return res.status(400).json({
        success: false,
        message: 'Origen y destino son requeridos'
      });
    }

    if (!origin.lat || !origin.lng || !destination.lat || !destination.lng) {
      return res.status(400).json({
        success: false,
        message: 'Coordenadas de origen y destino son requeridas'
      });
    }

    // Parámetros del vehículo con valores por defecto
    const vehicleConfig = {
      height: vehicleParams?.height || 4.2,
      width: vehicleParams?.width || 2.5,
      length: vehicleParams?.length || 16.5,
      weight: vehicleParams?.weight || 40,
      axleCount: vehicleParams?.axleCount || 5
    };

    console.log('Calculando ruta con OpenRouteService:', {
      origin,
      destination,
      vehicleConfig
    });

    // Calcular ruta usando OpenRouteService
    const routeResult = await openRouteService.calculateTruckRoute(
      origin,
      destination,
      vehicleConfig
    );

    if (!routeResult.success) {
      return res.status(400).json({
        success: false,
        message: 'No se pudo calcular la ruta'
      });
    }

    const route = routeResult.route;

    // Formatear respuesta para mantener compatibilidad
    const formattedRoute = {
      distance: Math.round(route.distance / 1000 * 100) / 100, // convertir a km
      duration: Math.round(route.duration / 60), // convertir a minutos
      estimatedDuration: Math.round(route.duration / 60),
      estimatedDistance: Math.round(route.distance / 1000 * 100) / 100,
      geometry: route.geometry,
      instructions: route.instructions,
      warnings: route.warnings,
      bbox: route.bbox,
      summary: {
        distance: route.distance,
        duration: route.duration,
        distanceText: `${Math.round(route.distance / 1000)} km`,
        durationText: formatDuration(route.duration)
      }
    };

    res.json({
      success: true,
      route: formattedRoute,
      provider: 'OpenRouteService',
      message: 'Ruta calculada exitosamente'
    });

  } catch (error) {
    console.error('Error calculando ruta:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Error interno del servidor'
    });
  }
};

/**
 * Geocodificar dirección
 */
const geocodeAddress = async (req, res) => {
  try {
    const { address, country, limit } = req.query;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Dirección es requerida'
      });
    }

    const options = {
      country: country || 'ES,FR,DE,IT,PT,NL,BE,AT,CH,PL,CZ,HU,SK,SI,HR,RO,BG,GR,LT,LV,EE,FI,SE,DK,NO,IE,LU,MT,CY',
      limit: parseInt(limit) || 5
    };

    const result = await openRouteService.geocode(address, options);

    res.json({
      success: result.success,
      results: result.results || [],
      message: result.message || 'Geocodificación completada'
    });

  } catch (error) {
    console.error('Error en geocodificación:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Error en geocodificación'
    });
  }
};

/**
 * Geocodificación inversa
 */
const reverseGeocode = async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitud y longitud son requeridas'
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Coordenadas inválidas'
      });
    }

    const result = await openRouteService.reverseGeocode(latitude, longitude);

    res.json({
      success: result.success,
      address: result.address || '',
      details: result.details || {},
      message: result.message || 'Geocodificación inversa completada'
    });

  } catch (error) {
    console.error('Error en geocodificación inversa:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Error en geocodificación inversa'
    });
  }
};

/**
 * Guardar ruta calculada
 */
const saveRoute = async (req, res) => {
  try {
    const userId = req.user.id;
    const { routeData, name, description } = req.body;

    if (!routeData) {
      return res.status(400).json({
        success: false,
        message: 'Datos de ruta son requeridos'
      });
    }

    const newRoute = new Route({
      userId,
      name: name || `Ruta ${new Date().toLocaleDateString()}`,
      description: description || '',
      origin: routeData.origin,
      destination: routeData.destination,
      distance: routeData.distance,
      duration: routeData.duration,
      geometry: routeData.geometry,
      instructions: routeData.instructions,
      vehicleParams: routeData.vehicleParams || {},
      provider: 'OpenRouteService',
      createdAt: new Date()
    });

    await newRoute.save();

    res.json({
      success: true,
      route: newRoute,
      message: 'Ruta guardada exitosamente'
    });

  } catch (error) {
    console.error('Error guardando ruta:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error guardando ruta'
    });
  }
};

/**
 * Obtener rutas guardadas del usuario
 */
const getUserRoutes = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const routes = await Route.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Route.countDocuments({ userId });

    res.json({
      success: true,
      routes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error obteniendo rutas:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error obteniendo rutas'
    });
  }
};

/**
 * Eliminar ruta guardada
 */
const deleteRoute = async (req, res) => {
  try {
    const userId = req.user.id;
    const { routeId } = req.params;

    const route = await Route.findOne({ _id: routeId, userId });

    if (!route) {
      return res.status(404).json({
        success: false,
        message: 'Ruta no encontrada'
      });
    }

    await Route.deleteOne({ _id: routeId, userId });

    res.json({
      success: true,
      message: 'Ruta eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error eliminando ruta:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error eliminando ruta'
    });
  }
};

/**
 * Calcular isócrona (área alcanzable)
 */
const calculateIsochrone = async (req, res) => {
  try {
    const { center, timeMinutes, vehicleParams } = req.body;

    if (!center || !center.lat || !center.lng) {
      return res.status(400).json({
        success: false,
        message: 'Coordenadas centrales son requeridas'
      });
    }

    if (!timeMinutes || timeMinutes <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Tiempo en minutos es requerido y debe ser mayor a 0'
      });
    }

    const result = await openRouteService.calculateIsochrone(
      center,
      timeMinutes,
      vehicleParams || {}
    );

    res.json({
      success: result.success,
      isochrone: result.isochrone,
      timeMinutes,
      center,
      message: 'Isócrona calculada exitosamente'
    });

  } catch (error) {
    console.error('Error calculando isócrona:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Error calculando isócrona'
    });
  }
};

/**
 * Verificar estado de la API
 */
const checkApiStatus = async (req, res) => {
  try {
    const status = await openRouteService.checkApiStatus();

    res.json({
      success: status.success,
      status: status.status,
      provider: 'OpenRouteService',
      remainingQuota: status.remainingQuota,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error verificando estado de API:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error verificando estado de la API'
    });
  }
};

/**
 * Formatear duración en texto legible
 * @private
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  } else {
    return `${minutes}min`;
  }
}

module.exports = {
  calculateRoute,
  geocodeAddress,
  reverseGeocode,
  saveRoute,
  getUserRoutes,
  deleteRoute,
  calculateIsochrone,
  checkApiStatus
};

