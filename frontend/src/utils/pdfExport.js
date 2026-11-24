import { jsPDF } from 'jspdf';
import { normalizeMarkdown } from './markdownUtils';

/**
 * Cleanly exports markdown research reports directly to a PDF file without DOM scraping or print dialogs.
 */
export function exportReportToPDF({
  topic = 'Research Report',
  markdown = '',
  trustScore = 0,
  qualityScore = 0,
  citationCoverage = 0,
}) {
  const normalizedMarkdown = normalizeMarkdown(markdown);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  let y = margin;

  const checkPageBreak = (neededHeight) => {
    if (y + neededHeight > pageHeight - margin - 12) {
      doc.addPage();
      y = margin + 8;
      return true;
    }
    return false;
  };

  // Top Accent Bar
  doc.setFillColor(37, 99, 235); // Blue primary #2563eb
  doc.rect(margin, y, contentWidth, 2, 'F');
  y += 7;

  // Header Subtitle
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text('RESEARCHFLOW  |  AUTONOMOUS MULTI-AGENT REPORT', margin, y);
  y += 6;

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(15, 23, 42); // Slate 900
  const titleLines = doc.splitTextToSize(topic, contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 4;

  // Score & Metadata Summary Banner
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const metadataText = `Trust Score: ${trustScore}/100   *   Quality Score: ${qualityScore}/100   *   Citation Coverage: ${citationCoverage}%   *   Date: ${new Date().toLocaleDateString()}`;
  doc.text(metadataText, margin + 4, y + 7.5);
  y += 18;

  // Parse Markdown Content
  const rawLines = (normalizedMarkdown || 'No report content available.').split('\n');

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i].trim();
    if (!raw) {
      y += 2.5;
      continue;
    }

    // Divider Line
    if (raw === '---' || raw === '***') {
      checkPageBreak(8);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageWidth - margin, y);
      y += 5;
      continue;
    }

    // Main Header (H1)
    if (raw.startsWith('# ')) {
      checkPageBreak(15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      const text = raw.replace(/^#\s+/, '').replace(/\*\*/g, '');
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 6 + 3;
      continue;
    }

    // Section Header (H2)
    if (raw.startsWith('## ')) {
      checkPageBreak(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(30, 64, 175); // Blue 800
      const text = raw.replace(/^##\s+/, '').replace(/\*\*/g, '');
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 5.5 + 3;
      continue;
    }

    // Subheader (H3 / H4)
    if (raw.startsWith('### ') || raw.startsWith('#### ')) {
      checkPageBreak(12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(30, 41, 59);
      const text = raw.replace(/^###+\s+/, '').replace(/\*\*/g, '');
      const lines = doc.splitTextToSize(text, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 5 + 2;
      continue;
    }

    // Bullet points / numbered lists
    if (raw.startsWith('- ') || raw.startsWith('* ') || /^(\d+)\.\s+/.test(raw)) {
      const isNumbered = /^(\d+)\.\s+/.test(raw);
      const bulletPrefix = isNumbered ? raw.match(/^(\d+)\.\s+/)[0] : '- ';
      const bulletText = raw.replace(/^(-|\*|\d+\.)\s+/, '').replace(/\*\*/g, '');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);

      const bulletLines = doc.splitTextToSize(bulletText, contentWidth - 6);
      checkPageBreak(bulletLines.length * 4.5 + 2);

      doc.setFont('helvetica', 'bold');
      doc.text(bulletPrefix, margin, y);
      doc.setFont('helvetica', 'normal');
      doc.text(bulletLines, margin + 6, y);
      y += bulletLines.length * 4.5 + 2;
      continue;
    }

    // Table rows (skip markdown table pipe separators or format cleanly)
    if (raw.startsWith('|') && raw.endsWith('|')) {
      if (raw.includes('---')) continue; // Table header divider
      const cells = raw.split('|').map((c) => c.trim()).filter(Boolean);
      const rowText = cells.join('  |  ').replace(/\*\*/g, '');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);

      const tableLines = doc.splitTextToSize(rowText, contentWidth);
      checkPageBreak(tableLines.length * 4.5 + 2);
      doc.text(tableLines, margin, y);
      y += tableLines.length * 4.5 + 2;
      continue;
    }

    // Standard Paragraph
    const cleanPara = raw.replace(/\*\*/g, '');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);

    const paraLines = doc.splitTextToSize(cleanPara, contentWidth);
    checkPageBreak(paraLines.length * 4.5 + 2);
    doc.text(paraLines, margin, y);
    y += paraLines.length * 4.5 + 2.5;
  }

  // Footer on each page
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setDrawColor(241, 245, 249);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.text(`ResearchFlow Verified Report * ${topic}`, margin, pageHeight - 7);
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: 'right' });
  }

  const safeTopic = (topic || 'report').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`researchflow_${safeTopic}.pdf`);
}
