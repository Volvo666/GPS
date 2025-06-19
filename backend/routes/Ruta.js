
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Esquema para puntos de coordenadas
const CoordinateSchema = new Schema({
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  name: {
    type: String
  },
  address: {
    type: String
  }
});

// Esquema para waypoints (paradas intermedias)
const WaypointSchema = new Schema({
  location: {
    type: CoordinateSchema,
    required: true
  },
  name: {
    type: String
  },
  stopDuration: {
    type: Number, // en minutos
    default: 0
  },
  arrivalTime: {
    type: Date
  },
  departureTime: {
    type: Date
  }
});

// Esquema para restricciones de vehículo
const VehicleRestrictionSchema = new Schema({
  height: {
    type: Number // en metros
  },
  width: {
    type: Number // en metros
  },
  length: {
    type: Number // en metros
  },
  weight: {
    type: Number // en toneladas
  },
  axleCount: {
    type: Number
  },
  hazardousMaterials: {
    type: Boolean,
    default: false
  },
  hazardousMaterialType: {
    type: String,
    enum: ['none', 'explosive', 'gas', 'flammable', 'oxidizing', 'toxic', 'radioactive', 'corrosive'],
    default: 'none'
  }
});

// Esquema para rutas
const RouteSchema = new Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  origin: {
    type: CoordinateSchema,
    required: true
  },
  destination: {
    type: CoordinateSchema,
    required: true
  },
  waypoints: [WaypointSchema],
  distance: {
    type: Number, // en metros
    required: true
  },
  duration: {
    type: Number, // en segundos
    required: true
  },
  vehicleRestrictions: {
    type: VehicleRestrictionSchema
  },
  routePolyline: {
    type: String // Codificación polyline de la ruta
  },
  departureTime: {
    type: Date
  },
  arrivalTime: {
    type: Date
  },
  avoidTolls: {
    type: Boolean,
    default: false
  },
  avoidHighways: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastUsed: {
    type: Date
  },
  isFavorite: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model('Route', RouteSchema);
