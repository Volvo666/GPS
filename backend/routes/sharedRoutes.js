const mongoose = require('mongoose');

/**
 * Modelo para rutas compartidas en tiempo real
 */
const sharedRouteSchema = new mongoose.Schema({
  // ID único para compartir (público)
  shareId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Usuario que comparte la ruta
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Información de la ruta
  routeInfo: {
    origin: {
      name: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    destination: {
      name: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    },
    estimatedDuration: Number, // en minutos
    estimatedDistance: Number, // en kilómetros
    startTime: Date,
    estimatedArrival: Date
  },
  
  // Ubicación actual del conductor
  currentLocation: {
    coordinates: {
      lat: Number,
      lng: Number
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    speed: Number, // km/h
    heading: Number // grados
  },
  
  // Estado de la ruta
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active'
  },
  
  // Configuración de privacidad
  privacy: {
    showExactLocation: {
      type: Boolean,
      default: true
    },
    showSpeed: {
      type: Boolean,
      default: false
    },
    showETA: {
      type: Boolean,
      default: true
    },
    allowedViewers: [{
      email: String,
      name: String,
      addedAt: {
        type: Date,
        default: Date.now
      }
    }],
    publicAccess: {
      type: Boolean,
      default: false
    }
  },
  
  // Información del vehículo (opcional)
  vehicleInfo: {
    licensePlate: String,
    model: String,
    company: String
  },
  
  // Configuración de actualizaciones
  updateSettings: {
    frequency: {
      type: Number,
      default: 30 // segundos
    },
    lastUpdate: {
      type: Date,
      default: Date.now
    }
  },
  
  // Historial de ubicaciones (últimas 50 para mostrar trayectoria)
  locationHistory: [{
    coordinates: {
      lat: Number,
      lng: Number
    },
    timestamp: Date,
    speed: Number
  }],
  
  // Metadatos
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  expiresAt: {
    type: Date,
    default: function() {
      // Por defecto expira en 24 horas
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }
  },
  
  // Estadísticas
  stats: {
    totalViews: {
      type: Number,
      default: 0
    },
    uniqueViewers: {
      type: Number,
      default: 0
    },
    lastViewed: Date
  }
}, {
  timestamps: true
});

// Índices para optimizar consultas
sharedRouteSchema.index({ shareId: 1 });
sharedRouteSchema.index({ userId: 1 });
sharedRouteSchema.index({ status: 1 });
sharedRouteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
sharedRouteSchema.index({ 'currentLocation.timestamp': -1 });

// Método para generar un shareId único
sharedRouteSchema.statics.generateShareId = function() {
  const characters = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

// Método para actualizar ubicación
sharedRouteSchema.methods.updateLocation = function(locationData) {
  // Actualizar ubicación actual
  this.currentLocation = {
    coordinates: locationData.coordinates,
    timestamp: new Date(),
    speed: locationData.speed || 0,
    heading: locationData.heading || 0
  };
  
  // Añadir al historial (mantener solo las últimas 50)
  this.locationHistory.push({
    coordinates: locationData.coordinates,
    timestamp: new Date(),
    speed: locationData.speed || 0
  });
  
  if (this.locationHistory.length > 50) {
    this.locationHistory = this.locationHistory.slice(-50);
  }
  
  // Actualizar timestamp de última actualización
  this.updateSettings.lastUpdate = new Date();
  
  return this.save();
};

// Método para verificar si un usuario puede ver la ruta
sharedRouteSchema.methods.canView = function(viewerEmail = null) {
  // Si es acceso público
  if (this.privacy.publicAccess) {
    return true;
  }
  
  // Si no hay email, no puede ver rutas privadas
  if (!viewerEmail) {
    return false;
  }
  
  // Verificar si está en la lista de viewers permitidos
  return this.privacy.allowedViewers.some(viewer => 
    viewer.email.toLowerCase() === viewerEmail.toLowerCase()
  );
};

// Método para incrementar estadísticas de visualización
sharedRouteSchema.methods.incrementViews = function(viewerEmail = null) {
  this.stats.totalViews += 1;
  this.stats.lastViewed = new Date();
  
  // Si es un viewer único (aproximado)
  if (viewerEmail) {
    this.stats.uniqueViewers += 1;
  }
  
  return this.save();
};

// Middleware para limpiar rutas expiradas
sharedRouteSchema.pre('find', function() {
  this.where({ expiresAt: { $gt: new Date() } });
});

sharedRouteSchema.pre('findOne', function() {
  this.where({ expiresAt: { $gt: new Date() } });
});

module.exports = mongoose.model('SharedRoute', sharedRouteSchema);

