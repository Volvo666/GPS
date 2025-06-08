const User = require('../models/User');
const crypto = require('crypto');

/**
 * Controlador para gestionar los usuarios
 */
const userController = {
  /**
   * Registra un nuevo usuario
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async register(req, res) {
    try {
      const { username, email, password, firstName, lastName, company } = req.body;
      
      // Validar datos de entrada
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Se requieren nombre de usuario, email y contraseña' });
      }
      
      // Verificar si el usuario ya existe
      const existingUser = await User.findOne({ $or: [{ username }, { email }] });
      if (existingUser) {
        return res.status(400).json({ error: 'El nombre de usuario o email ya está en uso' });
      }
      
      // Hash de la contraseña (en producción se usaría bcrypt)
      // Esto es solo para demostración, en un entorno real se usaría bcrypt
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      
      // Crear un nuevo usuario
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        firstName,
        lastName,
        company,
        createdAt: new Date()
      });
      
      // Guardar el usuario en la base de datos
      await newUser.save();
      
      // Devolver el usuario creado (sin la contraseña)
      const userResponse = {
        _id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        company: newUser.company,
        createdAt: newUser.createdAt
      };
      
      res.status(201).json({
        success: true,
        user: userResponse
      });
    } catch (error) {
      console.error('Error al registrar el usuario:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al registrar el usuario'
      });
    }
  },

  /**
   * Inicia sesión de un usuario
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async login(req, res) {
    try {
      const { username, password } = req.body;
      
      // Validar datos de entrada
      if (!username || !password) {
        return res.status(400).json({ error: 'Se requieren nombre de usuario y contraseña' });
      }
      
      // Buscar el usuario
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
      
      // Verificar la contraseña (en producción se usaría bcrypt)
      const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
      if (user.password !== hashedPassword) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
      
      // Actualizar la fecha de último inicio de sesión
      user.lastLogin = new Date();
      await user.save();
      
      // Devolver el usuario (sin la contraseña)
      const userResponse = {
        _id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company,
        vehicles: user.vehicles,
        defaultVehicle: user.defaultVehicle
      };
      
      // En un entorno real, aquí se generaría un token JWT
      
      res.status(200).json({
        success: true,
        user: userResponse,
        token: 'mock_token_for_development' // En producción, esto sería un token JWT real
      });
    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al iniciar sesión'
      });
    }
  },

  /**
   * Obtiene el perfil de un usuario
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async getProfile(req, res) {
    try {
      const { userId } = req.query;
      
      // Validar datos de entrada
      if (!userId) {
        return res.status(400).json({ error: 'Se requiere el ID del usuario' });
      }
      
      // Buscar el usuario
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      // Devolver el perfil del usuario (sin la contraseña)
      const userProfile = {
        _id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company,
        vehicles: user.vehicles,
        defaultVehicle: user.defaultVehicle,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      };
      
      res.status(200).json({
        success: true,
        profile: userProfile
      });
    } catch (error) {
      console.error('Error al obtener el perfil del usuario:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al obtener el perfil del usuario'
      });
    }
  },

  /**
   * Actualiza el perfil de un usuario
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async updateProfile(req, res) {
    try {
      const { userId, firstName, lastName, company } = req.body;
      
      // Validar datos de entrada
      if (!userId) {
        return res.status(400).json({ error: 'Se requiere el ID del usuario' });
      }
      
      // Buscar el usuario
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      // Actualizar los campos del perfil
      if (firstName !== undefined) user.firstName = firstName;
      if (lastName !== undefined) user.lastName = lastName;
      if (company !== undefined) user.company = company;
      
      // Guardar los cambios
      await user.save();
      
      // Devolver el perfil actualizado
      const updatedProfile = {
        _id: user._id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        company: user.company
      };
      
      res.status(200).json({
        success: true,
        profile: updatedProfile
      });
    } catch (error) {
      console.error('Error al actualizar el perfil del usuario:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al actualizar el perfil del usuario'
      });
    }
  },

  /**
   * Añade un vehículo al perfil de un usuario
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async addVehicle(req, res) {
    try {
      const { userId, vehicle } = req.body;
      
      // Validar datos de entrada
      if (!userId || !vehicle) {
        return res.status(400).json({ error: 'Se requieren el ID del usuario y los datos del vehículo' });
      }
      
      // Validar datos del vehículo
      if (!vehicle.name || !vehicle.height || !vehicle.width || !vehicle.length || !vehicle.weight) {
        return res.status(400).json({ error: 'Faltan datos requeridos del vehículo' });
      }
      
      // Buscar el usuario
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      // Añadir el vehículo
      user.vehicles.push(vehicle);
      
      // Si es el primer vehículo, establecerlo como predeterminado
      if (user.vehicles.length === 1) {
        user.defaultVehicle = user.vehicles[0]._id;
      }
      
      // Guardar los cambios
      await user.save();
      
      res.status(201).json({
        success: true,
        vehicle: user.vehicles[user.vehicles.length - 1]
      });
    } catch (error) {
      console.error('Error al añadir el vehículo:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al añadir el vehículo'
      });
    }
  },

  /**
   * Establece un vehículo como predeterminado
   * @param {Object} req - Objeto de solicitud
   * @param {Object} res - Objeto de respuesta
   */
  async setDefaultVehicle(req, res) {
    try {
      const { userId, vehicleId } = req.body;
      
      // Validar datos de entrada
      if (!userId || !vehicleId) {
        return res.status(400).json({ error: 'Se requieren el ID del usuario y el ID del vehículo' });
      }
      
      // Buscar el usuario
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      
      // Verificar que el vehículo existe
      const vehicleExists = user.vehicles.some(v => v._id.toString() === vehicleId);
      if (!vehicleExists) {
        return res.status(404).json({ error: 'Vehículo no encontrado' });
      }
      
      // Establecer el vehículo como predeterminado
      user.defaultVehicle = vehicleId;
      
      // Guardar los cambios
      await user.save();
      
      res.status(200).json({
        success: true,
        message: 'Vehículo predeterminado actualizado correctamente'
      });
    } catch (error) {
      console.error('Error al establecer el vehículo predeterminado:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Error al establecer el vehículo predeterminado'
      });
    }
  }
};

module.exports = userController;

