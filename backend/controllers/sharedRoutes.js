const SharedRoute = require('../models/SharedRoute');
const { sendSMS, sendWhatsApp } = require('../config/notifications');

/**
 * Compartir ruta por SMS/WhatsApp/Email
 */
exports.shareRoute = async (req, res) => {
  try {
    const { routeId, contacts, method } = req.body; // method: 'sms', 'whatsapp', 'email'
    const userId = req.user.id; // ID del usuario logueado

    // 1. Validar método
    if (!['sms', 'whatsapp', 'email'].includes(method)) {
      return res.status(400).json({ error: 'Método no válido' });
    }

    // 2. Obtener ruta
    const route = await SharedRoute.findOne({ _id: routeId, userId });
    if (!route) return res.status(404).json({ error: 'Ruta no encontrada' });

    // 3. Generar enlace y mensaje
    const message = route.generateShareLink(method);

    // 4. Enviar notificaciones
    const results = [];
    for (const contact of contacts) {
      if (method === 'sms') {
        const result = await sendSMS(contact.phone, message);
        results.push({ contact, ...result });
      } 
      else if (method === 'whatsapp') {
        const result = await sendWhatsApp(contact.phone, message);
        results.push({ contact, ...result });
      }
      // Para email, usar un servicio como Nodemailer (te lo añado si lo necesitas)
    }

    // 5. Guardar en la base de datos
    route.privacy.allowedViewers.push(...contacts.map(c => ({
      ...c,
      method
    })));
    await route.save();

    res.json({
      success: true,
      message: `Ruta compartida por ${method}`,
      results
    });

  } catch (error) {
    console.error('Error compartiendo ruta:', error);
    res.status(500).json({ error: 'Error al compartir ruta' });
  }
};
