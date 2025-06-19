const express = require('express');
const router = express.Router();
const User = require('../models/User'); // Ajusta según tu estructura real
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Ruta para registrar un nuevo usuario
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Verificar si ya existe el usuario
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'El usuario ya existe' });

    // Encriptar contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Crear usuario
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    res.status(201).json({ message: 'Usuario registrado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
});

// Ruta para login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Usuario no encontrado' });

    // Verificar contraseña
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Contraseña incorrecta' });

    // Crear token
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
});

module.exports = router;
