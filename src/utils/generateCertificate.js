import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export async function generateCertificatePDF(certificate) {
  const {
    name = 'Participant',
    eventName = 'Event',
    eventDate = new Date().toISOString(),
    certificateNumber = 'N/A',
    issuedAt = new Date().toISOString(),
  } = certificate;

  // Try parsing date or fallback safely
  const formattedEventDate = new Date(eventDate).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const formattedIssuedDate = new Date(issuedAt).toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  
  // Safely get dimensions supporting multiple jsPDF versions
  const width = typeof doc.internal.pageSize.getWidth === 'function' 
    ? doc.internal.pageSize.getWidth() 
    : doc.internal.pageSize.width;
    
  const height = typeof doc.internal.pageSize.getHeight === 'function' 
    ? doc.internal.pageSize.getHeight() 
    : doc.internal.pageSize.height;

  // Background
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, width, height, 'F');

  // Decorative border
  const borderMargin = 8;
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(1.5);
  doc.rect(borderMargin, borderMargin, width - 2 * borderMargin, height - 2 * borderMargin);

  // Inner border
  doc.setDrawColor(168, 85, 247);
  doc.setLineWidth(0.5);
  doc.rect(borderMargin + 4, borderMargin + 4, width - 2 * (borderMargin + 4), height - 2 * (borderMargin + 4));

  // Top decorative line
  const grad1Start = 50;
  const grad1End = width - 50;
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(2);
  doc.line(grad1Start, 25, grad1End, 25);
  doc.setDrawColor(168, 85, 247);
  doc.line(grad1Start, 26.5, grad1End, 26.5);

  // Corner accents
  const cornerSize = 15;
  const corners = [
    [borderMargin + 4, borderMargin + 4],
    [width - borderMargin - 4 - cornerSize, borderMargin + 4],
    [borderMargin + 4, height - borderMargin - 4 - cornerSize],
    [width - borderMargin - 4 - cornerSize, height - borderMargin - 4 - cornerSize],
  ];
  doc.setDrawColor(236, 72, 153);
  doc.setLineWidth(1);
  corners.forEach(([x, y]) => {
    doc.line(x, y, x + cornerSize, y);
    doc.line(x, y, x, y + cornerSize);
  });

  // "CERTIFICATE" title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(14);
  doc.setTextColor(148, 163, 184);
  doc.text('CERTIFICATE', width / 2, 40, { align: 'center' });

  // "OF PARTICIPATION" subtitle
  doc.setFontSize(28);
  doc.setTextColor(99, 102, 241);
  doc.text('OF PARTICIPATION', width / 2, 52, { align: 'center' });

  // "This is to certify that"
  doc.setFontSize(12);
  doc.setTextColor(203, 213, 225);
  doc.text('This is to certify that', width / 2, 68, { align: 'center' });

  // Name
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(String(name), width / 2, 85, { align: 'center' });

  // Underline under name
  const nameStr = String(name);
  const nameWidth = doc.getTextWidth(nameStr);
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.8);
  doc.line(width / 2 - nameWidth / 2 - 10, 89, width / 2 + nameWidth / 2 + 10, 89);

  // "has successfully participated in"
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(203, 213, 225);
  doc.text('has successfully participated in', width / 2, 100, { align: 'center' });

  // Event Name
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(168, 85, 247);
  doc.text(String(eventName), width / 2, 114, { align: 'center' });

  // Date info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text(`held on ${formattedEventDate}`, width / 2, 125, { align: 'center' });

  // Bottom decorative line
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(2);
  doc.line(grad1Start, height - 55, grad1End, height - 55);
  doc.setDrawColor(168, 85, 247);
  doc.line(grad1Start, height - 53.5, grad1End, height - 53.5);

  // Organization
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('EventHub College Portal', width / 2, height - 43, { align: 'center' });

  // Issue date & cert number, bottom left inside the corner accents
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Certificate No: ${String(certificateNumber)}`, 32, height - 26);
  doc.text(`Issued: ${formattedIssuedDate}`, 32, height - 20);

  // QR Code
  try {
    const verifyUrl = `${window.location.origin}/verify?cert=${certificateNumber}`;
    // Handle both default import and named export safely to avoid crash in Vite
    const qrcodeGenerator = QRCode.toDataURL || QRCode.default?.toDataURL;
    if (qrcodeGenerator) {
      const qrDataUrl = await qrcodeGenerator(verifyUrl, {
        width: 200,
        margin: 1,
        color: { dark: '#6366f1', light: '#0f172a' },
      });
      // Bottom right, clear of the corner accent
      doc.addImage(qrDataUrl, 'PNG', width - 60, height - 50, 25, 25);
      doc.setFontSize(7);
      doc.text('Scan to verify', width - 47.5, height - 21, { align: 'center' });
    }
  } catch (err) {
    console.warn('QR code generation failed:', err);
  }

  return doc;
}

export function downloadCertificate(doc, certificateNumber) {
  doc.save(`${certificateNumber}.pdf`);
}
