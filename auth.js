/**
 * Middleware para autenticación de usuarios
 * 
 * Nota: En un entorno de producción, se utilizaría JWT para la autenticación.
 * Este es un middleware simplificado para desarrollo.
 */
const auth = (req, res, next) => {
  // Obtener el token del encabezado de autorización
  const token = req.header('Authorization');
  
  // Verificar si el token existe
  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. No se proporcionó token de autenticación.' });
  }
  
  try {
    // En un entorno real, aquí se verificaría el token JWT
    // Por ahora, simplemente verificamos que el token tenga algún valor
    if (token === 'mock_token_for_development') {
      // En un entorno real, aquí se decodificaría el token y se añadiría el usuario a req.user
      next();
    } else {
      res.status(401).json({ error: 'Token inválido.' });
    }
  } catch (error) {
    console.error('Error en la autenticación:', error);
    res.status(500).json({ error: 'Error en la autenticación.' });
  }
};

module.exports = auth;

