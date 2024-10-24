const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const crypto = require('crypto');

const OAuth2 = google.auth.OAuth2;

const oauth2Client = new OAuth2(
  'YOUR_CLIENT_ID',
  'YOUR_CLIENT_SECRET',
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: 'YOUR_REFRESH_TOKEN',
});

function sendVerificationEmail(userEmail, verificationToken) {
  return new Promise(async (resolve, reject) => {
    try {
      const accessToken = await oauth2Client.getAccessToken();

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: 'YOUR_EMAIL@gmail.com',
          clientId: 'YOUR_CLIENT_ID',
          clientSecret: 'YOUR_CLIENT_SECRET',
          refreshToken: 'YOUR_REFRESH_TOKEN',
          accessToken: accessToken.token,
        },
      });

      const verificationUrl = `http://localhost:3000/verify-email?token=${verificationToken}`;

      const mailOptions = {
        from: 'YOUR_EMAIL@gmail.com',
        to: userEmail,
        subject: 'Verify your Email - Random Video Chat',
        html: `<p>Please verify your email by clicking the link below:</p>
               <a href="${verificationUrl}">Verify Email</a>`,
      };

      await transporter.sendMail(mailOptions);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { sendVerificationEmail, generateVerificationToken };
