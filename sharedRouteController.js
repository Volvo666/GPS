const SharedRoute = require('../models/SharedRoute');
const User = require('../models/User');

/**
 * Controlador para rutas compartidas en tiempo real
 */
class SharedRouteController {
  
  /**
   * Crear una nueva ruta compartida
   */
  static async createSharedRoute(req, res) {
    try {
      const userId = req.user.id;
      const {
        routeInfo,
        privacy = {},
        vehicleInfo = {},
        updateSettings = {}
      } = req.body;

      // Validar datos requeridos
      if (!routeInfo || !routeInfo.origin || !routeInfo.destination) {
        return res.status(400).json({
          error: 'Información de ruta incompleta'
        });
      }

      // Generar shareId único
      let shareId;
      let attempts = 0;
      do {
        shareId = SharedRoute.generateShareId();
        const existing = await SharedRoute.findOne({ shareId });
        if (!existing) break;
        attempts++;
      } while (attempts < 10);

      if (attempts >= 10) {
        return res.status(500).json({
          error: 'No se pudo generar un ID único para compartir'
        });
      }

      // Crear nueva ruta compartida
      const sharedRoute = new SharedRoute({
        shareId,
        userId,
        routeInfo: {
          ...routeInfo,
          startTime: new Date(),
          estimatedArrival: routeInfo.estimatedArrival || 
            new Date(Date.now() + (routeInfo.estimatedDuration || 60) * 60 * 1000)
        },
        privacy: {
          showExactLocation: privacy.showExactLocation !== false,
          showSpeed: privacy.showSpeed === true,
          showETA: privacy.showETA !== false,
          allowedViewers: privacy.allowedViewers || [],
          publicAccess: privacy.publicAccess === true
        },
        vehicleInfo,
        updateSettings: {
          frequency: updateSettings.frequency || 30
        }
      });

      await sharedRoute.save();

      res.status(201).json({
        success: true,
        shareId,
        shareUrl: `${process.env.FRONTEND_URL}/track/${shareId}`,
        message: 'Ruta compartida creada exitosamente'
      });

    } catch (error) {
      console.error('Error creando ruta compartida:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener información de una ruta compartida
   */
  static async getSharedRoute(req, res) {
    try {
      const { shareId } = req.params;
      const { email } = req.query;

      const sharedRoute = await SharedRoute.findOne({ shareId })
        .populate('userId', 'name email company')
        .lean();

      if (!sharedRoute) {
        return res.status(404).json({
          error: 'Ruta compartida no encontrada'
        });
      }

      // Verificar permisos de visualización
      if (!sharedRoute.canView || !sharedRoute.canView(email)) {
        return res.status(403).json({
          error: 'No tienes permisos para ver esta ruta'
        });
      }

      // Incrementar estadísticas de visualización
      await SharedRoute.findByIdAndUpdate(sharedRoute._id, {
        $inc: { 'stats.totalViews': 1 },
        $set: { 'stats.lastViewed': new Date() }
      });

      // Preparar respuesta según configuración de privacidad
      const response = {
        shareId: sharedRoute.shareId,
        routeInfo: sharedRoute.routeInfo,
        status: sharedRoute.status,
        vehicleInfo: sharedRoute.vehicleInfo,
        driver: {
          name: sharedRoute.userId.name,
          company: sharedRoute.userId.company
        },
        privacy: {
          showExactLocation: sharedRoute.privacy.showExactLocation,
          showSpeed: sharedRoute.privacy.showSpeed,
          showETA: sharedRoute.privacy.showETA
        },
        lastUpdate: sharedRoute.updateSettings.lastUpdate
      };

      // Añadir ubicación si está permitido
      if (sharedRoute.privacy.showExactLocation && sharedRoute.currentLocation) {
        response.currentLocation = sharedRoute.currentLocation;
        response.locationHistory = sharedRoute.locationHistory;
      }

      res.json(response);

    } catch (error) {
      console.error('Error obteniendo ruta compartida:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar ubicación de una ruta compartida
   */
  static async updateLocation(req, res) {
    try {
      const userId = req.user.id;
      const { shareId } = req.params;
      const { coordinates, speed, heading } = req.body;

      if (!coordinates || !coordinates.lat || !coordinates.lng) {
        return res.status(400).json({
          error: 'Coordenadas requeridas'
        });
      }

      const sharedRoute = await SharedRoute.findOne({ 
        shareId, 
        userId,
        status: 'active'
      });

      if (!sharedRoute) {
        return res.status(404).json({
          error: 'Ruta compartida no encontrada o no activa'
        });
      }

      // Actualizar ubicación
      await sharedRoute.updateLocation({
        coordinates,
        speed,
        heading
      });

      res.json({
        success: true,
        message: 'Ubicación actualizada'
      });

    } catch (error) {
      console.error('Error actualizando ubicación:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar estado de una ruta compartida
   */
  static async updateRouteStatus(req, res) {
    try {
      const userId = req.user.id;
      const { shareId } = req.params;
      const { status } = req.body;

      if (!['active', 'paused', 'completed', 'cancelled'].includes(status)) {
        return res.status(400).json({
          error: 'Estado inválido'
        });
      }

      const sharedRoute = await SharedRoute.findOneAndUpdate(
        { shareId, userId },
        { status },
        { new: true }
      );

      if (!sharedRoute) {
        return res.status(404).json({
          error: 'Ruta compartida no encontrada'
        });
      }

      res.json({
        success: true,
        status: sharedRoute.status,
        message: 'Estado actualizado'
      });

    } catch (error) {
      console.error('Error actualizando estado:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Obtener rutas compartidas del usuario
   */
  static async getUserSharedRoutes(req, res) {
    try {
      const userId = req.user.id;
      const { status } = req.query;

      const filter = { userId };
      if (status) {
        filter.status = status;
      }

      const sharedRoutes = await SharedRoute.find(filter)
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      const routes = sharedRoutes.map(route => ({
        shareId: route.shareId,
        routeInfo: route.routeInfo,
        status: route.status,
        privacy: route.privacy,
        stats: route.stats,
        shareUrl: `${process.env.FRONTEND_URL}/track/${route.shareId}`,
        createdAt: route.createdAt,
        expiresAt: route.expiresAt
      }));

      res.json(routes);

    } catch (error) {
      console.error('Error obteniendo rutas del usuario:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Eliminar una ruta compartida
   */
  static async deleteSharedRoute(req, res) {
    try {
      const userId = req.user.id;
      const { shareId } = req.params;

      const result = await SharedRoute.findOneAndDelete({ shareId, userId });

      if (!result) {
        return res.status(404).json({
          error: 'Ruta compartida no encontrada'
        });
      }

      res.json({
        success: true,
        message: 'Ruta compartida eliminada'
      });

    } catch (error) {
      console.error('Error eliminando ruta compartida:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Actualizar configuración de privacidad
   */
  static async updatePrivacySettings(req, res) {
    try {
      const userId = req.user.id;
      const { shareId } = req.params;
      const { privacy } = req.body;

      const sharedRoute = await SharedRoute.findOneAndUpdate(
        { shareId, userId },
        { 
          $set: {
            'privacy.showExactLocation': privacy.showExactLocation,
            'privacy.showSpeed': privacy.showSpeed,
            'privacy.showETA': privacy.showETA,
            'privacy.allowedViewers': privacy.allowedViewers,
            'privacy.publicAccess': privacy.publicAccess
          }
        },
        { new: true }
      );

      if (!sharedRoute) {
        return res.status(404).json({
          error: 'Ruta compartida no encontrada'
        });
      }

      res.json({
        success: true,
        privacy: sharedRoute.privacy,
        message: 'Configuración de privacidad actualizada'
      });

    } catch (error) {
      console.error('Error actualizando privacidad:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }

  /**
   * Añadir viewer permitido
   */
  static async addAllowedViewer(req, res) {
    try {
      const userId = req.user.id;
      const { shareId } = req.params;
      const { email, name } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Email requerido'
        });
      }

      const sharedRoute = await SharedRoute.findOne({ shareId, userId });

      if (!sharedRoute) {
        return res.status(404).json({
          error: 'Ruta compartida no encontrada'
        });
      }

      // Verificar si ya existe
      const existingViewer = sharedRoute.privacy.allowedViewers.find(
        viewer => viewer.email.toLowerCase() === email.toLowerCase()
      );

      if (existingViewer) {
        return res.status(400).json({
          error: 'Este email ya tiene acceso'
        });
      }

      // Añadir nuevo viewer
      sharedRoute.privacy.allowedViewers.push({
        email: email.toLowerCase(),
        name: name || email,
        addedAt: new Date()
      });

      await sharedRoute.save();

      res.json({
        success: true,
        allowedViewers: sharedRoute.privacy.allowedViewers,
        message: 'Viewer añadido exitosamente'
      });

    } catch (error) {
      console.error('Error añadiendo viewer:', error);
      res.status(500).json({
        error: 'Error interno del servidor'
      });
    }
  }
}

module.exports = SharedRouteController;

