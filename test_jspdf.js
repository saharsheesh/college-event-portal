import { jsPDF } from 'jspdf';
try {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  console.log(doc.internal.pageSize.getWidth());
} catch(e) {
  console.error("jspdf error: ", e);
}
