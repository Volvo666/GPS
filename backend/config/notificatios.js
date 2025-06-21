// Configuración de Twilio (SMS)
const twilio = require('twilio');
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Configuración de WhatsApp (Facebook Business API)
const axios = require('axios');
const whatsappConfig = {
  apiUrl: 'https://graph.facebook.com/v18.0',
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN
};

// Funciones de envío
module.exports = {
  sendSMS: async (to, message) => {
    try {
      await twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: `+${to.replace(/\D/g, '')}` // Formato internacional
      });
      return { success: true };
    } catch (error) {
      console.error('Error enviando SMS:', error.message);
      return { success: false, error };
    }
  },

  sendWhatsApp: async (to, message) => {
    try {
      await axios.post(
        `${whatsappConfig.apiUrl}/${whatsappConfig.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: `+${to.replace(/\D/g, '')}`,
          type: 'text',
          text: { body: message }
        },
        { headers: { Authorization: `Bearer ${whatsappConfig.accessToken}` } }
      );
      return { success: true };
    } catch (error) {
      console.error('Error enviando WhatsApp:', error.response?.data || error.message);
      return { success: false, error };
    }
  }
};
