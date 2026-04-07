const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection (non-blocking)
transporter.verify().then(() => console.log('✅ Email service ready')).catch(() => console.warn('⚠️  Email service not configured'));

const baseStyle = `
  font-family: 'Segoe UI', Arial, sans-serif;
  max-width: 600px; margin: 0 auto;
  background: #ffffff; border-radius: 12px;
  overflow: hidden; border: 1px solid #e8e5df;
`;
const header = (title) => `
  <div style="background: linear-gradient(135deg,#1a1a2e,#0f3460); padding: 2rem; text-align:center;">
    <h1 style="color:#fff; font-size:1.5rem; margin:0;">🏠 StayFinder</h1>
    <p style="color:rgba(255,255,255,0.7); margin:0.5rem 0 0; font-size:0.9rem;">${title}</p>
  </div>`;
const footer = `
  <div style="background:#f8f7f4; padding:1rem; text-align:center; font-size:0.78rem; color:#9a9ab0;">
    © 2024 StayFinder · <a href="${process.env.CLIENT_URL}" style="color:#e94560;">Visit Website</a>
  </div>`;

async function sendEmail({ to, subject, html }) {
  if (!process.env.EMAIL_USER) {
    console.log(`[EMAIL SKIPPED — not configured] To: ${to} | Subject: ${subject}`);
    return;
  }
  try {
    await transporter.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
    console.log(`✉️  Email sent to ${to}`);
  } catch (e) {
    console.error('Email error:', e.message);
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

exports.sendWelcomeEmail = async ({ to, name, role }) => {
  await sendEmail({
    to, subject: '🎉 Welcome to StayFinder!',
    html: `<div style="${baseStyle}">${header('Welcome Aboard!')}
      <div style="padding:2rem;">
        <h2 style="color:#1a1a2e;">Hi ${name}! 👋</h2>
        <p style="color:#5a5a7a;">You've successfully registered as a <strong>${role}</strong>.</p>
        ${role === 'tenant'
          ? `<p style="color:#5a5a7a;">Start exploring thousands of verified rooms with AI-powered fair pricing.</p>
             <a href="${process.env.CLIENT_URL}/search" style="display:inline-block;background:#e94560;color:#fff;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600;margin-top:1rem;">Browse Rooms →</a>`
          : `<p style="color:#5a5a7a;">List your property and let our AI help you price it competitively.</p>
             <a href="${process.env.CLIENT_URL}/add-property" style="display:inline-block;background:#e94560;color:#fff;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600;margin-top:1rem;">List Property →</a>`
        }
      </div>${footer}</div>`
  });
};

exports.sendBookingConfirmation = async ({ to, tenantName, propertyTitle, city, startDate, duration, amount }) => {
  await sendEmail({
    to, subject: `📋 Booking Request Sent — ${propertyTitle}`,
    html: `<div style="${baseStyle}">${header('Booking Request Sent')}
      <div style="padding:2rem;">
        <h2 style="color:#1a1a2e;">Hi ${tenantName}!</h2>
        <p style="color:#5a5a7a;">Your booking request has been sent to the owner.</p>
        <div style="background:#f8f7f4;border-radius:8px;padding:1.25rem;margin:1rem 0;">
          <p style="margin:0.3rem 0;"><strong>🏠 Property:</strong> ${propertyTitle}</p>
          <p style="margin:0.3rem 0;"><strong>📍 City:</strong> ${city}</p>
          <p style="margin:0.3rem 0;"><strong>📅 Move-in:</strong> ${startDate}</p>
          <p style="margin:0.3rem 0;"><strong>🕒 Duration:</strong> ${duration} month(s)</p>
          <p style="margin:0.3rem 0;"><strong>💰 Amount Due:</strong> ₹${amount?.toLocaleString()}</p>
        </div>
        <p style="color:#5a5a7a;">You'll receive another email once the owner responds.</p>
        <a href="${process.env.CLIENT_URL}/dashboard" style="display:inline-block;background:#e94560;color:#fff;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600;margin-top:0.5rem;">View Dashboard →</a>
      </div>${footer}</div>`
  });
};

exports.sendBookingStatusEmail = async ({ to, tenantName, propertyTitle, status }) => {
  const isApproved = status === 'approved';
  await sendEmail({
    to, subject: `${isApproved ? '✅' : '❌'} Booking ${isApproved ? 'Approved' : 'Rejected'} — ${propertyTitle}`,
    html: `<div style="${baseStyle}">${header(`Booking ${isApproved ? 'Approved' : 'Rejected'}`)}
      <div style="padding:2rem;">
        <h2 style="color:#1a1a2e;">Hi ${tenantName},</h2>
        <p style="color:#5a5a7a;">Your booking for <strong>${propertyTitle}</strong> has been <strong style="color:${isApproved ? '#22c55e' : '#ef4444'}">${status}</strong>.</p>
        ${isApproved
          ? `<p style="color:#5a5a7a;">Congratulations! Please complete the payment to confirm your room.</p>
             <a href="${process.env.CLIENT_URL}/dashboard" style="display:inline-block;background:#22c55e;color:#fff;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600;margin-top:0.5rem;">Pay Now →</a>`
          : `<p style="color:#5a5a7a;">Don't worry — browse other available rooms.</p>
             <a href="${process.env.CLIENT_URL}/search" style="display:inline-block;background:#e94560;color:#fff;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600;margin-top:0.5rem;">Browse Rooms →</a>`
        }
      </div>${footer}</div>`
  });
};

exports.sendNewBookingOwnerEmail = async ({ to, ownerName, tenantName, propertyTitle, startDate, duration }) => {
  await sendEmail({
    to, subject: `🔔 New Booking Request — ${propertyTitle}`,
    html: `<div style="${baseStyle}">${header('New Booking Request')}
      <div style="padding:2rem;">
        <h2 style="color:#1a1a2e;">Hi ${ownerName},</h2>
        <p style="color:#5a5a7a;"><strong>${tenantName}</strong> has requested to book your property.</p>
        <div style="background:#f8f7f4;border-radius:8px;padding:1.25rem;margin:1rem 0;">
          <p style="margin:0.3rem 0;"><strong>🏠 Property:</strong> ${propertyTitle}</p>
          <p style="margin:0.3rem 0;"><strong>👤 Tenant:</strong> ${tenantName}</p>
          <p style="margin:0.3rem 0;"><strong>📅 Move-in:</strong> ${startDate}</p>
          <p style="margin:0.3rem 0;"><strong>🕒 Duration:</strong> ${duration} month(s)</p>
        </div>
        <a href="${process.env.CLIENT_URL}/dashboard" style="display:inline-block;background:#0f3460;color:#fff;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600;margin-top:0.5rem;">Approve / Reject →</a>
      </div>${footer}</div>`
  });
};

exports.sendPaymentSuccessEmail = async ({ to, name, propertyTitle, amount, paymentId }) => {
  await sendEmail({
    to, subject: `💰 Payment Confirmed — ₹${amount?.toLocaleString()}`,
    html: `<div style="${baseStyle}">${header('Payment Successful')}
      <div style="padding:2rem;">
        <h2 style="color:#1a1a2e;">Hi ${name},</h2>
        <p style="color:#5a5a7a;">Your payment has been received successfully!</p>
        <div style="background:#dcfce7;border-radius:8px;padding:1.25rem;margin:1rem 0;border:1px solid #22c55e;">
          <p style="margin:0.3rem 0;color:#166534;"><strong>✅ Amount Paid:</strong> ₹${amount?.toLocaleString()}</p>
          <p style="margin:0.3rem 0;color:#166534;"><strong>🏠 Property:</strong> ${propertyTitle}</p>
          <p style="margin:0.3rem 0;color:#166534;"><strong>🔖 Payment ID:</strong> ${paymentId}</p>
        </div>
        <a href="${process.env.CLIENT_URL}/dashboard" style="display:inline-block;background:#e94560;color:#fff;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:600;margin-top:0.5rem;">View Dashboard →</a>
      </div>${footer}</div>`
  });
};

exports.sendAgreementEmail = async ({ to, tenantName, propertyTitle, agreementId, pdfBuffer }) => {
  if (!process.env.EMAIL_USER) {
    console.log(`[EMAIL SKIPPED] Agreement email to ${to}`);
    return;
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to,
      subject: `📄 Rental Agreement Ready — ${propertyTitle}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#1a1a2e;padding:1.5rem;text-align:center;">
          <h2 style="color:#fff;margin:0;">📄 Rental Agreement</h2>
          <p style="color:rgba(255,255,255,0.7);margin:0.3rem 0 0;">StayFinder</p>
        </div>
        <div style="padding:1.5rem;">
          <p>Hi ${tenantName},</p>
          <p>Your rental agreement for <strong>${propertyTitle}</strong> is attached to this email.</p>
          <p style="background:#f0fdf4;border:1px solid #22c55e;border-radius:8px;padding:0.75rem;color:#166534;">
            ✅ Agreement ID: <strong>${agreementId}</strong>
          </p>
          <p>Please keep this document safe. You can also re-download it anytime from your dashboard.</p>
        </div>
        <div style="background:#f8f7f4;padding:1rem;text-align:center;font-size:0.78rem;color:#9a9ab0;">
          © 2024 StayFinder
        </div>
      </div>`,
      attachments: pdfBuffer ? [{
        filename:    `StayFinder_Agreement_${agreementId}.pdf`,
        content:     pdfBuffer,
        contentType: 'application/pdf',
      }] : [],
    });
    console.log(`📄 Agreement email sent to ${to}`);
  } catch (e) { console.error('Agreement email error:', e.message); }
};

exports.sendRoommateMatchEmail = async ({ to, senderName, receiverName, score, city, chatLink }) => {
  await sendEmail({
    to,
    subject: `🧑‍🤝‍🧑 ${senderName} wants to connect as a roommate!`,
    html: `<div style="${baseStyle}">${header('Roommate Match Found!')}
      <div style="padding:2rem;">
        <h2 style="color:#1a1a2e;">Hi ${receiverName}! 👋</h2>
        <p style="color:#5a5a7a;"><strong>${senderName}</strong> found your profile on StayFinder and wants to connect as a roommate.</p>
        <div style="background:#f0f4ff;border:1px solid #3b82f6;border-radius:10px;padding:1.25rem;margin:1rem 0;text-align:center;">
          <div style="font-size:2rem;margin-bottom:0.5rem;">🎯</div>
          <div style="font-size:1.3rem;font-weight:700;color:#1e40af;">${score}% Compatible</div>
          <div style="font-size:0.85rem;color:#1e3a8a;margin-top:0.25rem;">Based on budget, lifestyle & preferences in ${city}</div>
        </div>
        <p style="color:#5a5a7a;">Start a conversation to see if you're a good fit!</p>
        <a href="${chatLink}" style="display:inline-block;background:#e94560;color:#fff;padding:0.85rem 1.75rem;border-radius:8px;text-decoration:none;font-weight:600;margin-top:0.5rem;">
          💬 Start Chatting
        </a>
        <p style="color:#9a9ab0;font-size:0.78rem;margin-top:1rem;">You received this because you have an active roommate profile on StayFinder.</p>
      </div>${footer}</div>`
  });
};
