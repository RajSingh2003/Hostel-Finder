const PDFDocument = require('pdfkit');
const QRCode      = require('qrcode');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate a rental agreement PDF buffer.
 * Returns: { buffer: Buffer, agreementId: string }
 */
async function generateAgreementPDF({ booking, property, tenant, owner, payment }) {
  return new Promise(async (resolve, reject) => {
    try {
      const agreementId = `SF-AGR-${uuidv4().slice(0,8).toUpperCase()}`;
      const today       = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
      const startDate   = new Date(booking.startDate).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });
      const endDate     = booking.endDate
        ? new Date(booking.endDate).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })
        : 'Open-ended';

      // Generate QR code for verification
      const verifyUrl  = `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-agreement/${agreementId}`;
      const qrDataUrl  = await QRCode.toDataURL(verifyUrl, { width: 80, margin: 1 });
      const qrBuffer   = Buffer.from(qrDataUrl.split(',')[1], 'base64');

      const doc    = new PDFDocument({ size: 'A4', margin: 50, info: { Title: 'Rental Agreement', Author: 'StayFinder' } });
      const chunks = [];

      doc.on('data',  chunk => chunks.push(chunk));
      doc.on('end',   () => resolve({ buffer: Buffer.concat(chunks), agreementId }));
      doc.on('error', reject);

      const W = 595 - 100; // page width minus margins
      const ACCENT = '#e94560';
      const DARK   = '#1a1a2e';
      const GRAY   = '#5a5a7a';
      const LIGHT  = '#f8f7f4';

      // ── Header band ──────────────────────────────────────────────────────────
      doc.rect(0, 0, 595, 80).fill(DARK);
      doc.fillColor('#fff').fontSize(22).font('Helvetica-Bold').text('StayFinder', 50, 22);
      doc.fillColor(ACCENT).fontSize(10).font('Helvetica').text('Smart Rental Platform', 50, 48);
      doc.fillColor('rgba(255,255,255,0.5)').fontSize(9).text('stayfinder.in', 50, 60);

      // QR code top-right
      try { doc.image(qrBuffer, 490, 8, { width: 64 }); } catch {}

      // Agreement ID
      doc.fillColor('#fff').fontSize(8).font('Helvetica').text(`ID: ${agreementId}`, 490, 74, { width:64, align:'center' });

      doc.moveDown(3);

      // ── Title ─────────────────────────────────────────────────────────────────
      doc.fillColor(DARK).fontSize(16).font('Helvetica-Bold').text('RENTAL AGREEMENT', { align:'center' });
      doc.moveDown(0.3);
      doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(`Generated on ${today}  ·  Valid Agreement ID: ${agreementId}`, { align:'center' });

      // Divider
      doc.moveDown(0.8);
      doc.strokeColor(ACCENT).lineWidth(1.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.8);

      // ── Section helper ────────────────────────────────────────────────────────
      function sectionTitle(title) {
        doc.fillColor(ACCENT).fontSize(11).font('Helvetica-Bold').text(title.toUpperCase());
        doc.strokeColor('#e8e5df').lineWidth(0.5).moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).stroke();
        doc.moveDown(0.6);
      }

      function row(label, value, opts = {}) {
        const y = doc.y;
        doc.fillColor(GRAY).fontSize(9).font('Helvetica').text(label + ':', 50, y, { width: 140, continued: false });
        doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text(value || '—', 200, y, { width: W - 150 });
        doc.moveDown(0.5);
      }

      function infoBox(text, color = '#fff9ec', border = '#f5a623') {
        const y = doc.y;
        doc.rect(50, y, W, 32).fill(color).stroke(border);
        doc.fillColor('#92600a').fontSize(9).font('Helvetica').text(text, 58, y + 10, { width: W - 16 });
        doc.y = y + 40;
        doc.moveDown(0.5);
      }

      // ── Parties ───────────────────────────────────────────────────────────────
      sectionTitle('1. Parties to the Agreement');

      // Two-column party boxes
      const bY = doc.y;
      doc.rect(50, bY, 230, 80).fill(LIGHT).stroke('#e8e5df');
      doc.rect(300, bY, 245, 80).fill(LIGHT).stroke('#e8e5df');

      doc.fillColor(ACCENT).fontSize(8).font('Helvetica-Bold').text('LANDLORD / OWNER', 58, bY + 8);
      doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text(owner?.name || 'N/A', 58, bY + 22);
      doc.fillColor(GRAY).fontSize(8).font('Helvetica').text(owner?.email || '', 58, bY + 35);
      doc.fillColor(GRAY).fontSize(8).text(owner?.phone || '', 58, bY + 47);

      doc.fillColor(ACCENT).fontSize(8).font('Helvetica-Bold').text('TENANT', 308, bY + 8);
      doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text(tenant?.name || 'N/A', 308, bY + 22);
      doc.fillColor(GRAY).fontSize(8).font('Helvetica').text(tenant?.email || '', 308, bY + 35);
      doc.fillColor(GRAY).fontSize(8).text(tenant?.phone || '', 308, bY + 47);

      doc.y = bY + 90;
      doc.moveDown(0.8);

      // ── Property ──────────────────────────────────────────────────────────────
      sectionTitle('2. Property Details');
      row('Property Name',  property?.title);
      row('Address',        `${property?.location?.address}, ${property?.location?.city}`);
      row('Property Type',  property?.type);
      row('Room Size',      property?.size ? `${property.size} sq ft` : '—');
      row('Floor',          property?.floor || '—');
      row('Available For',  property?.gender || 'Any');

      doc.moveDown(0.3);

      // ── Tenancy ───────────────────────────────────────────────────────────────
      sectionTitle('3. Tenancy Details');
      row('Move-in Date',   startDate);
      row('End Date',       endDate);
      row('Duration',       `${booking.duration} month(s)`);
      row('Monthly Rent',   `₹${property?.price?.toLocaleString('en-IN')} per month`);
      row('Security Deposit', `₹${(booking.securityDeposit || 0).toLocaleString('en-IN')}`);
      row('Service Fee',    '₹500 (one-time)');

      const totalPaid = (booking.securityDeposit || 0) + 500;
      doc.moveDown(0.2);
      doc.rect(50, doc.y, W, 26).fill('#dcfce7').stroke('#22c55e');
      doc.fillColor('#166534').fontSize(10).font('Helvetica-Bold')
         .text(`Total Paid via StayFinder: ₹${totalPaid.toLocaleString('en-IN')}`, 58, doc.y + 7, { width: W - 16 });
      doc.y += 34;
      doc.moveDown(0.5);

      // ── Payment Record ────────────────────────────────────────────────────────
      if (payment) {
        sectionTitle('4. Payment Record');
        row('Payment ID',     payment.razorpayPaymentId || payment.razorpayOrderId || 'N/A');
        row('Amount Paid',    `₹${((payment.amount || 0) / 100).toLocaleString('en-IN')}`);
        row('Payment Status', 'CONFIRMED ✓');
        row('Payment Date',   new Date(payment.updatedAt || payment.createdAt).toLocaleDateString('en-IN'));
        doc.moveDown(0.3);
      }

      // ── Amenities ─────────────────────────────────────────────────────────────
      sectionTitle(`${payment ? 5 : 4}. Included Amenities`);
      const amentities = property?.amenities || [];
      if (amentities.length) {
        const cols = 3;
        const colW = W / cols;
        let col = 0, rowY = doc.y;
        amentities.forEach((a, i) => {
          doc.fillColor(DARK).fontSize(9).font('Helvetica').text(`• ${a}`, 50 + col * colW, rowY, { width: colW - 10 });
          col++;
          if (col >= cols) { col = 0; rowY += 16; }
        });
        doc.y = rowY + (col > 0 ? 16 : 0) + 8;
      } else {
        doc.fillColor(GRAY).fontSize(9).text('None specified').moveDown(0.5);
      }
      doc.moveDown(0.5);

      // ── Terms ─────────────────────────────────────────────────────────────────
      const tNum = payment ? 6 : 5;
      sectionTitle(`${tNum}. Terms & Conditions`);

      const terms = [
        'Tenant shall pay rent on or before the 5th of each month.',
        'Security deposit is refundable within 30 days of vacating, subject to deductions for damages.',
        'Tenant must maintain cleanliness and shall not cause noise disturbances.',
        'Guests are permitted for a maximum of 3 days. Extended stays require owner approval.',
        'Tenant must give 30 days written notice before vacating the premises.',
        'The owner reserves the right to inspect the property with 24-hour prior notice.',
        'Subletting of the property is strictly prohibited without written consent.',
        'Utility bills (electricity, water) are to be borne by the tenant unless otherwise agreed.',
        'This agreement is governed by the laws of India under the Rent Control Act.',
        'Disputes shall first be resolved through mediation before approaching a court of law.',
      ];

      terms.forEach((t, i) => {
        doc.fillColor(DARK).fontSize(8.5).font('Helvetica').text(`${i + 1}.  ${t}`, 50, doc.y, { width: W, lineGap: 2 });
        doc.moveDown(0.4);
      });

      doc.moveDown(0.5);

      // ── Signatures ────────────────────────────────────────────────────────────
      sectionTitle(`${tNum + 1}. Signatures`);

      const sigY = doc.y;
      // Owner sig box
      doc.rect(50, sigY, 220, 60).stroke('#e8e5df');
      doc.fillColor(GRAY).fontSize(8).font('Helvetica').text('Owner / Landlord Signature', 58, sigY + 8);
      doc.strokeColor('#e8e5df').moveTo(58, sigY + 42).lineTo(260, sigY + 42).stroke();
      doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text(owner?.name || '', 58, sigY + 46);

      // Tenant sig box
      doc.rect(320, sigY, 225, 60).stroke('#e8e5df');
      doc.fillColor(GRAY).fontSize(8).font('Helvetica').text('Tenant Signature', 328, sigY + 8);
      doc.strokeColor('#e8e5df').moveTo(328, sigY + 42).lineTo(535, sigY + 42).stroke();
      doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold').text(tenant?.name || '', 328, sigY + 46);

      doc.y = sigY + 70;
      doc.moveDown(0.5);
      doc.fillColor(GRAY).fontSize(8).font('Helvetica').text(`Date: ${today}`, 50);

      doc.moveDown(1);

      // ── Footer ────────────────────────────────────────────────────────────────
      doc.strokeColor('#e8e5df').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.4);
      doc.fillColor(GRAY).fontSize(8).font('Helvetica')
         .text(`This agreement was digitally generated by StayFinder (stayfinder.in). Agreement ID: ${agreementId}. Verify at: ${verifyUrl}`, {
           align: 'center', width: W,
         });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generateAgreementPDF };
