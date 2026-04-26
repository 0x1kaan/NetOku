export function buildStudentReportShareText(params: {
  studentName: string;
  url: string;
}): string {
  return `${params.studentName} için NetOku öğrenci raporu: ${params.url}`;
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

