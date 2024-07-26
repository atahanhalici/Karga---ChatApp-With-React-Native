const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const app = express();
const port = process.env.PORT || 3000;

const serviceAccount = require('./karga-303a6-firebase-adminsdk-qwpe7-53ed378049.json');

// Firebase Admin SDK'yı başlat
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Body parser middleware kullan
app.use(bodyParser.json());

// Bildirim gönderme endpoint'i
app.post('/send-notification', (req, res) => {
  const { token, title, body } = req.body;

  if (!token || !title || !body) {
    return res.status(400).send({ error: 'Missing required fields' });
  }

  const message = {
    token: token,
    notification: {
      title: title,
      body: body,
    },
  };

  admin.messaging().send(message)
    .then(response => {
      console.log('Successfully sent message:', response);
      res.status(200).send({ success: 'Successfully sent message', response: response });
    })
    .catch(error => {
      console.error('Error sending message:', error);
      res.status(500).send({ error: 'Error sending message', details: error.message });
    });
});

// Sunucuyu başlat
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
