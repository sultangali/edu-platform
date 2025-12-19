import nodemailer from 'nodemailer';
import { t } from '../utils/i18n.js';

// Create transporter only if SMTP config is available
let transporter = null;

const getTransporter = () => {
  if (!transporter && process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Don't verify connection on creation
      pool: true,
      maxConnections: 1,
      rateDelta: 20000,
      rateLimit: 5,
    });
  }
  return transporter;
};

// Helper to create a mock request object for translation
const createMockReq = (language) => ({
  headers: { 'accept-language': language },
  query: { lang: language },
  body: { language }
});

export const sendVerificationEmail = async (email, token, language = 'kaz') => {
  const transporterInstance = getTransporter();
  
  if (!transporterInstance) {
    console.warn('SMTP not configured. Email verification link:', `${process.env.CLIENT_URL}/verify-email?token=${token}`);
    throw new Error('Email service is not configured. Please configure SMTP settings.');
  }

  const verificationUrl = `${process.env.CLIENT_URL}/verify-email?token=${token}`;
  const req = createMockReq(language);

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'EduPlatform <noreply@eduplatform.com>',
    to: email,
    subject: t(req, 'auth.verifyEmail.subject'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #046ffb;">${t(req, 'auth.verifyEmail.title')}</h2>
        <p>${t(req, 'auth.verifyEmail.message')}</p>
        <p style="margin: 20px 0;">
          <a href="${verificationUrl}" style="background-color: #046ffb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            ${t(req, 'auth.verifyEmail.button')}
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          ${t(req, 'auth.verifyEmail.linkExpires')}
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          ${t(req, 'auth.verifyEmail.ifNotRequested')}
        </p>
      </div>
    `,
  };

  try {
    await transporterInstance.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw error;
  }
};

export const sendPasswordResetEmail = async (email, token, language = 'kaz') => {
  const transporterInstance = getTransporter();
  
  if (!transporterInstance) {
    console.warn('SMTP not configured. Password reset link:', `${process.env.CLIENT_URL}/reset-password/${token}`);
    throw new Error('Email service is not configured. Please configure SMTP settings.');
  }

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
  const req = createMockReq(language);

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'EduPlatform <noreply@eduplatform.com>',
    to: email,
    subject: t(req, 'auth.resetPassword.subject'),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #046ffb;">${t(req, 'auth.resetPassword.title')}</h2>
        <p>${t(req, 'auth.resetPassword.message')}</p>
        <p style="margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #046ffb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            ${t(req, 'auth.resetPassword.button')}
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">
          ${t(req, 'auth.resetPassword.linkExpires')}
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          ${t(req, 'auth.resetPassword.ifNotRequested')}
        </p>
      </div>
    `,
  };

  try {
    await transporterInstance.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
};

export const sendCourseEnrollmentEmail = async (user, course, language = 'kaz') => {
  const transporterInstance = getTransporter();
  
  if (!transporterInstance) {
    console.warn('SMTP not configured. Skipping enrollment email.');
    return;
  }

  const req = createMockReq(language);

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'EduPlatform <noreply@eduplatform.com>',
    to: user.email,
    subject: t(req, 'email.enrollment.subject', { courseTitle: course.title }),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #046ffb;">${t(req, 'email.enrollment.welcome', { courseTitle: course.title })}</h2>
        <p>${t(req, 'email.enrollment.greeting', { firstName: user.firstName })}</p>
        <p>${t(req, 'email.enrollment.message', { courseTitle: course.title })}</p>
        <p style="margin: 20px 0;">
          <a href="${process.env.CLIENT_URL}/courses/${course._id}/learn" style="background-color: #046ffb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            ${t(req, 'email.enrollment.startLearning')}
          </a>
        </p>
      </div>
    `,
  };

  try {
    await transporterInstance.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending course enrollment email:', error);
    // Don't throw, just log - enrollment should succeed even if email fails
  }
};

