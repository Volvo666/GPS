const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Esquema para vehículos
const VehicleSchema = new Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['truck', 'trailer', 'semi_trailer'],
    default: 'truck'
  },
  height: {
    type: Number, // en metros
    required: true
  },
  width: {
    type: Number, // en metros
    required: true
  },
  length: {
    type: Number, // en metros
    required: true
  },
  weight: {
    type: Number, // en toneladas
    required: true
  },
  axleCount: {
    type: Number,
    default: 2
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

// Esquema para usuarios
const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  firstName: {
    type: String
  },
  lastName: {
    type: String
  },
  company: {
    type: String
  },
  vehicles: [VehicleSchema],
  defaultVehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date
  }
});

module.exports = mongoose.model('User', UserSchema);

