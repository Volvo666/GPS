const mongoose = require('mongoose');

// Configurar baseUrl desde variables de entorno
const baseUrl = process.env.BASE_URL || 'https://tu-app.railway.app/shared-routes';

/**
 * Modelo para compartir rutas por Email, SMS y WhatsApp
 */
const sharedRouteSchema = new mongoose.Schema({
  // ID único para compartir
  shareId: {
    type: String,
    required: true,
    unique: true, // Esto ya crea el índice automáticamente
    default: function() {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    }
  },
  // Usuario que comparte
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Datos de la ruta
  routeInfo: {
    origin: { name: String, coordinates: { lat: Number, lng: Number } },
    destination: { name: String, coordinates: { lat: Number, lng: Number } },
    estimatedDuration: Number, // minutos
    estimatedDistance: Number // km
  },
  // Ubicación actual
  currentLocation: {
    coordinates: { lat: Number, lng: Number },
    timestamp: { type: Date, default: Date.now },
    speed: { type: Number, default: 0 } // km/h
  },
  // Configuración de privacidad y métodos de compartir
  privacy: {
    sharingMethods: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      whatsapp: { type: Boolean, default: true }
    },
    allowedViewers: [{
      email: String,
      phone: String, // Para SMS/WhatsApp
      name: String,
      method: { type: String, enum: ['email', 'sms', 'whatsapp'], required: true },
      addedAt: { type: Date, default: Date.now }
    }],
    publicAccess: { type: Boolean, default: false }
  },
  // Expiración
  expiresAt: { 
    type: Date, 
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
  }
}, {
  timestamps: true // Esto crea automáticamente createdAt y updatedAt
});

// ---- Índices optimizados ----
// NO agregues índice para shareId porque unique: true ya lo crea
// sharedRouteSchema.index({ shareId: 1 }); // <-- ELIMINAR ESTA LÍNEA

// Solo mantener el índice TTL
sharedRouteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ---- Métodos para compartir ----
// Generar enlace de compartir según método
sharedRouteSchema.methods.generateShareLink = function(method = 'whatsapp') {
  const link = `${baseUrl}/${this.shareId}`;
  
  switch(method) {
    case 'sms':
      return `SMSTRK: Accede a la ruta: ${link}`;
    case 'whatsapp':
      return `WhatsApp: 🌍 Ruta compartida: ${link}`;
    default:
      return `Email: Enlace a la ruta: ${link}`;
  }
};

// Verificar permisos de visualización
sharedRouteSchema.methods.canView = function(viewerContact) {
  if (this.privacy.publicAccess) return true;
  return this.privacy.allowedViewers.some(v => 
    v.email === viewerContact || v.phone === viewerContact
  );
};

module.exports = mongoose.model('SharedRoute', sharedRouteSchema);
