import { jsPDF } from 'jspdf';

export async function generateODLetterPDF({ user, event }) {
  // A4 size: 210 x 297 mm
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  
  // Header Background
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, width, 40, 'F');
  
  // Header Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('ON DUTY (OD) REQUEST', width / 2, 23, { align: 'center' });
  
  // College / Portal Info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text('EventHub Verified Document', width / 2, 30, { align: 'center' });
  
  // Body settings
  doc.setTextColor(15, 23, 42); // slate-900
  const marginX = 20;
  let posY = 60;
  
  // Date
  doc.setFontSize(11);
  const today = new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`Date of Issue: ${today}`, marginX, posY);
  posY += 15;
  
  // Salutation
  doc.setFont('helvetica', 'bold');
  doc.text('To Whom It May Concern,', marginX, posY);
  posY += 15;
  
  // Main Paragraph
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  const text1 = `This is to formally state that `;
  doc.text(text1, marginX, posY);
  const w1 = doc.getTextWidth(text1);
  
  doc.setFont('helvetica', 'bold');
  doc.text(`${user.name}`, marginX + w1, posY);
  const w2 = doc.getTextWidth(`${user.name}`);
  
  doc.setFont('helvetica', 'normal');
  doc.text(` has actively registered and is required`, marginX + w1 + w2, posY);
  
  posY += 8;
  doc.text(`to be On-Duty (OD) for the following authorized college event:`, marginX, posY);
  
  // Event Details Box
  posY += 15;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(marginX, posY, width - (marginX * 2), 45, 3, 3, 'FD');
  
  posY += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Event Name:', marginX + 5, posY);
  doc.setFont('helvetica', 'normal');
  doc.text(`${event.title}`, marginX + 35, posY);
  
  posY += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Date:', marginX + 5, posY);
  doc.setFont('helvetica', 'normal');
  const evtDateStr = new Date(event.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`${evtDateStr}`, marginX + 35, posY);
  
  posY += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('Duration:', marginX + 5, posY);
  doc.setFont('helvetica', 'normal');
  
  // Format Times safely
  const formatTime = (timeStr) => {
    try {
      const parts = timeStr.split(':');
      let hours = parseInt(parts[0], 10);
      const minutes = parts[1] || '00';
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${hours}:${minutes} ${ampm}`;
    } catch { return timeStr; }
  };
  
  const formattedStart = formatTime(event.time);
  const formattedEnd = event.endTime ? formatTime(event.endTime) : (formatTime((parseInt(event.time.split(':')[0]) + event.duration) + ':00'));
  doc.text(`${formattedStart} to ${formattedEnd}`, marginX + 35, posY);
  
  posY += 25;
  // Clash Notice
  doc.setFontSize(12);
  const text2 = "This event's timeline creates a confirmed structural clash with the student's saved";
  doc.text(text2, marginX, posY);
  posY += 7;
  doc.text("FFCS/Academic timetable. Attendance credit is requested for any concurrent slots.", marginX, posY);
  
  posY += 30;
  // Signatures
  doc.setFont('helvetica', 'bold');
  doc.text('Authorized By:', marginX, posY);
  
  posY += 8;
  doc.setFont('helvetica', 'normal');
  doc.text(`${event.organizer}`, marginX, posY);
  posY += 6;
  doc.setFontSize(10);
  doc.text('Event Coordinator / Organizer', marginX, posY);
  
  // Footer Border
  doc.setDrawColor(99, 102, 241); // primary-500
  doc.setLineWidth(1.5);
  doc.line(0, doc.internal.pageSize.getHeight() - 15, width, doc.internal.pageSize.getHeight() - 15);
  
  return doc;
}

export function downloadODLetter(doc, studentName, eventName) {
  const safeName = studentName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const safeEvent = eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`OD_Letter_${safeName}_${safeEvent}.pdf`);
}
