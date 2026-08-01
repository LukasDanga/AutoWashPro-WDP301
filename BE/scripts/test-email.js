require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('Testing SMTP connection...');
  console.log('Host:', process.env.SMTP_HOST);
  console.log('Port:', process.env.SMTP_PORT);
  console.log('User:', process.env.SMTP_USER);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_PORT == 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  try {
    console.log('Verifying transporter...');
    await transporter.verify();
    console.log('Transporter verification SUCCESS!');

    const info = await transporter.sendMail({
      from: `"AutoWashPro" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: 'Test Email AutoWashPro',
      text: 'This is a test email from AutoWashPro BE',
    });
    console.log('Email sent successfully! MessageId:', info.messageId);
  } catch (error) {
    console.error('SMTP TEST ERROR:', error);
  }
}

testEmail();
