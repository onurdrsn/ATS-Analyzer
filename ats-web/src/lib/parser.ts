import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Ensure pdf.js worker is loaded correctly for the client
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Extracts text from a PDF File object.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      // @ts-ignore - str exists on TextItem
      .map(item => item.str)
      .join(' ');
    
    fullText += pageText + '\\n';
  }
  
  return fullText.trim();
}

/**
 * Extracts text from a DOCX File object using mammoth.js.
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  } catch (error) {
    console.error('Mammoth extraction failed:', error);
    throw new Error('Failed to extract text from DOCX file. The file might be corrupted.');
  }
}

/**
 * Generic file parser routing based on MIME type / extension.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
    return extractTextFromPDF(file);
  } else if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
    file.name.endsWith('.docx')
  ) {
    return extractTextFromDOCX(file);
  } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
    return await file.text();
  }
  
  throw new Error('Unsupported file format. Please upload a PDF, DOCX, or TXT file.');
}
