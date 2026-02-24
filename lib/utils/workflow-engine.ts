export type ToolId = string;

const WORKFLOW_MAP: Record<string, ToolId[]> = {
    'mergePdf': ['compressPdf', 'protectPdf', 'editPdf'],
    'splitPdf': ['mergePdf', 'compressPdf'],
    'compressPdf': ['protectPdf', 'signPdf', 'pdfA'],
    'ocrPdf': ['editPdf', 'pdfToWord', 'chatPdf'],
    'repairPdf': ['compressPdf', 'protectPdf'],
    'jpgToPdf': ['mergePdf', 'compressPdf'],
    'excelToPdf': ['mergePdf', 'protectPdf'],
    'powerPointToPdf': ['mergePdf', 'protectPdf'],
    'addWatermark': ['protectPdf', 'signPdf'],
    'addPageNumbers': ['mergePdf', 'compressPdf'],
    'protectPdf': ['signPdf', 'chatPdf'],
    'unlockPdf': ['editPdf', 'compressPdf'],
    'pdfToJpg': ['mergePdf'],
    'pdfToWord': ['chatPdf'],
    'wordToPdf': ['mergePdf', 'protectPdf']
};

export function getNextSteps(currentToolId: string): ToolId[] {
    // eslint-disable-next-line security/detect-object-injection
    return WORKFLOW_MAP[currentToolId] || ['compressPdf', 'mergePdf', 'protectPdf'];
}
