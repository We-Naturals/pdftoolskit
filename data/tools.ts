import {
    FileText,
    Scissors,
    Minimize2,
    Image as ImageIcon,
    FileImage,
    RotateCw,
    Trash2,
    LayoutGrid,
    GripVertical,
    Lock,
    Unlock,
    FileDown,
    Files,
    Hash,
    Droplet,
    Crop,
    PenTool,
    EyeOff,
    Camera,
    Tag,
    Layers,
    Wrench,
    RefreshCw,
    FileSpreadsheet,
    FileCode2,
    Presentation,
    FileType,
    Globe,
    LucideIcon,
    Workflow,
    MessageSquare,
    ShieldAlert,
    Printer,
    ShieldCheck,
    Mail,
    Box,
    Dna,
    BrainCircuit
} from 'lucide-react';

export type ToolCategory = 'Workflows' | 'Organize PDF' | 'Optimize PDF' | 'Convert PDF' | 'Edit PDF' | 'PDF Security' | 'AI Tools' | 'View & Edit' | 'Convert & Compress' | 'Organize' | 'Security';
export type ToolArchetype = 'transformer' | 'manipulator' | 'annotator';

export interface Tool {
    id: string; // Added for i18n
    name: string;
    description: string;
    icon: LucideIcon;
    href: string;
    color: string;
    category: ToolCategory;
    archetype: ToolArchetype;
    features?: {
        ai?: boolean;
        p2p?: boolean;
        audit?: boolean;
    };
    keywords?: string[]; // Added keywords property
    premium?: boolean;   // Added premium property
}

export const tools: Tool[] = [
    // Phase 8 Tools
    {
        id: 'visual-diff',
        name: 'Visual Diff', // Fixed key from title to name
        description: 'Compare two PDF documents with overlay and split-screen modes.',
        icon: Layers, // Fixed from string
        category: 'View & Edit',
        archetype: 'annotator',
        features: { ai: true, p2p: true },
        href: '/visual-diff', // Fixed key from path to href
        color: 'from-cyan-500 to-blue-600', // Added missing color
        keywords: ['compare', 'diff', 'overlay', 'changes'],
        premium: true
    },
    {
        id: 'mail-merge',
        name: 'Mail Merge',
        description: 'Generate bulk PDFs from CSV data and templates.',
        icon: Mail,
        category: 'Convert & Compress',
        archetype: 'transformer',
        features: { ai: false, p2p: false },
        href: '/mail-merge',
        color: 'from-green-500 to-emerald-600',
        keywords: ['bulk', 'csv', 'generate', 'template'],
        premium: true
    },
    {
        id: 'memory-palace',
        name: 'Memory Palace',
        description: 'Spatial 3D document organization.',
        icon: Box,
        category: 'Organize',
        archetype: 'manipulator',
        href: '/memory-palace',
        color: 'from-purple-500 to-pink-600',
        keywords: ['3d', 'spatial', 'organize', 'webxr'],
        premium: true
    },
    {
        id: 'bio-encode',
        name: 'Bio-Encode',
        description: 'Store documents in synthetic DNA format.',
        icon: Dna,
        category: 'Security',
        archetype: 'transformer',
        href: '/bio-encode',
        color: 'from-emerald-500 to-teal-600',
        keywords: ['dna', 'storage', 'archive', 'future'],
        premium: true
    },
    {
        id: 'agent-teacher',
        name: 'Agent Trainer',
        description: 'Teach the AI new commands via few-shot learning.',
        icon: BrainCircuit,
        category: 'AI Tools',
        archetype: 'transformer',
        features: { ai: true },
        href: '/agent-teacher',
        color: 'from-indigo-500 to-purple-600',
        keywords: ['ai', 'train', 'teach', 'learn'],
        premium: true
    },
    {
        id: 'bates-stamp',
        name: 'Bates Stamp',
        description: 'Legal-grade sequential page numbering for discovery.',
        icon: Hash,
        category: 'Edit PDF',
        archetype: 'annotator',
        features: { p2p: false },
        href: '/bates-stamp',
        color: 'from-slate-700 to-slate-900',
        keywords: ['legal', 'discovery', 'numbering', 'stamp'],
        premium: true
    },
    {
        id: 'mergePdf',
        name: 'Merge PDF',
        description: 'Combine multiple PDF files into one document',
        icon: FileText,
        archetype: 'manipulator',
        features: { ai: true, p2p: true },
        href: '/merge-pdf',
        color: 'from-purple-500 to-pink-500',
        category: 'Organize PDF'
    },
    {
        id: 'splitPdf',
        name: 'Split PDF',
        description: 'Extract pages from your PDF document',
        icon: Scissors,
        archetype: 'manipulator',
        features: { ai: true, p2p: true },
        href: '/split-pdf',
        color: 'from-blue-500 to-cyan-500',
        category: 'Organize PDF'
    },
    {
        id: 'compressPdf',
        name: 'Compress PDF',
        description: 'Reduce PDF file size while maintaining quality',
        icon: Minimize2,
        archetype: 'transformer',
        features: { ai: true, p2p: true, audit: true },
        href: '/compress-pdf',
        color: 'from-green-500 to-emerald-500',
        category: 'Optimize PDF'
    },
    {
        id: 'pdfToWord',
        name: 'PDF to Word',
        description: 'Convert PDF documents to editable Word files',
        icon: FileDown,
        archetype: 'transformer',
        features: { ai: true, p2p: true },
        href: '/pdf-to-word',
        color: 'from-blue-500 to-indigo-500',
        category: 'Convert PDF'
    },
    {
        id: 'pdfToJpg',
        name: 'PDF to JPG',
        description: 'Convert PDF pages to high-quality images',
        icon: ImageIcon,
        archetype: 'transformer',
        href: '/pdf-to-jpg',
        color: 'from-orange-500 to-red-500',
        category: 'Convert PDF'
    },
    {
        id: 'jpgToPdf',
        name: 'JPG to PDF',
        description: 'Create PDF from multiple images',
        icon: FileImage,
        archetype: 'transformer',
        href: '/jpg-to-pdf',
        color: 'from-indigo-500 to-purple-500',
        category: 'Convert PDF'
    },
    {
        id: 'chatPdf',
        name: 'Chat with PDF',
        description: 'Ask questions and extract insights from your PDF using AI',
        icon: MessageSquare,
        archetype: 'annotator',
        features: { ai: true },
        href: '/chat-pdf',
        color: 'from-violet-600 to-fuchsia-600',
        category: 'Edit PDF'
    },
    {
        id: 'signPdf',
        name: 'Sign PDF',
        description: 'Add your signature to PDF documents',
        icon: PenTool,
        archetype: 'annotator',
        features: { ai: true, p2p: true, audit: true },
        href: '/sign-pdf',
        color: 'from-indigo-500 to-blue-600',
        category: 'PDF Security'
    },
    {
        id: 'pdfToExcel',
        name: 'PDF to Excel',
        description: 'Convert PDF tables to editable Excel spreadsheets',
        icon: FileSpreadsheet,
        archetype: 'transformer',
        features: { ai: true, p2p: true },
        href: '/pdf-to-excel',
        color: 'from-green-500 to-emerald-600',
        category: 'Convert PDF'
    },
    {
        id: 'excelToPdf',
        name: 'Excel to PDF',
        description: 'Convert Excel spreadsheets to professional PDFs',
        icon: FileCode2,
        archetype: 'transformer',
        href: '/excel-to-pdf',
        color: 'from-green-600 to-teal-600',
        category: 'Convert PDF'
    },
    {
        id: 'ocrPdf',
        name: 'OCR PDF',
        description: 'Extract text from scanned PDFs and Images',
        icon: RefreshCw,
        archetype: 'transformer',
        features: { ai: true },
        href: '/ocr-pdf',
        color: 'from-teal-400 to-emerald-500',
        category: 'Convert PDF'
    },
    {
        id: 'editPdf',
        name: 'Edit PDF',
        description: 'Edit text, add images, and annotate PDFs',
        icon: PenTool,
        archetype: 'annotator',
        href: '/edit-pdf',
        color: 'from-blue-600 to-indigo-600',
        category: 'Edit PDF'
    },
    {
        id: 'scanPdf',
        name: 'Insta-Scan',
        description: '60FPS WebGPU-accelerated real-time document capture',
        icon: Camera,
        archetype: 'transformer',
        features: { ai: true },
        href: '/insta-scan',
        color: 'from-blue-500 to-indigo-600',
        category: 'Convert PDF'
    },
    {
        id: 'pdfToPowerPoint',
        name: 'PDF to PowerPoint',
        description: 'Convert PDF slides to editable PowerPoint',
        icon: Presentation,
        archetype: 'transformer',
        href: '/pdf-to-powerpoint',
        color: 'from-orange-500 to-red-500',
        category: 'Convert PDF'
    },
    {
        id: 'powerPointToPdf',
        name: 'PowerPoint to PDF',
        description: 'Convert PowerPoint presentations to PDF',
        icon: FileType,
        archetype: 'transformer',
        href: '/powerpoint-to-pdf',
        color: 'from-red-600 to-orange-600',
        category: 'Convert PDF'
    },
    {
        id: 'htmlToPdf',
        name: 'HTML to PDF',
        description: 'Convert web pages and HTML to PDF',
        icon: Globe,
        archetype: 'transformer',
        href: '/html-to-pdf',
        color: 'from-blue-400 to-indigo-500',
        category: 'Convert PDF'
    },
    {
        id: 'rotatePdf',
        name: 'Rotate PDF',
        description: 'Rotate PDF pages to the correct orientation',
        icon: RotateCw,
        archetype: 'manipulator',
        features: { ai: true, p2p: true },
        href: '/rotate-pdf',
        color: 'from-pink-500 to-rose-500',
        category: 'Edit PDF'
    },
    {
        id: 'organizePdf',
        name: 'Organize PDF',
        description: 'Reorder and reorganize PDF pages',
        icon: GripVertical,
        archetype: 'manipulator',
        features: { ai: true, p2p: true },
        href: '/organize-pdf',
        color: 'from-cyan-500 to-blue-500',
        category: 'Organize PDF'
    },
    {
        id: 'masterOrganizer',
        name: 'Master Organizer',
        description: 'Unified UI to Reorder, Rotate and Delete pages',
        icon: LayoutGrid,
        archetype: 'manipulator',
        href: '/master-organizer',
        color: 'from-blue-500 to-indigo-600',
        category: 'Organize PDF'
    },
    {
        id: 'removePages',
        name: 'Remove Pages',
        description: 'Delete unwanted pages from your PDF',
        icon: Trash2,
        archetype: 'manipulator',
        href: '/remove-pages',
        color: 'from-yellow-500 to-orange-500',
        category: 'Organize PDF'
    },
    {
        id: 'extractPages',
        name: 'Extract Pages',
        description: 'Create a new PDF with specific pages',
        icon: Files,
        archetype: 'manipulator',
        href: '/extract-pages',
        color: 'from-purple-500 to-pink-500',
        category: 'Organize PDF'
    },
    {
        id: 'addPageNumbers',
        name: 'Add Page Numbers',
        description: 'Insert page numbers with custom positioning',
        icon: Hash,
        archetype: 'annotator',
        href: '/add-page-numbers',
        color: 'from-green-500 to-emerald-500',
        category: 'Edit PDF'
    },
    {
        id: 'addWatermark',
        name: 'Add Watermark',
        description: 'Stamp text watermarks on your documents',
        icon: Droplet,
        archetype: 'annotator',
        href: '/add-watermark',
        color: 'from-indigo-500 to-violet-500',
        category: 'Edit PDF'
    },
    {
        id: 'cropPdf',
        name: 'Crop PDF',
        description: 'Trim margins from your PDF pages',
        icon: Crop,
        archetype: 'annotator',
        href: '/crop-pdf',
        color: 'from-orange-500 to-red-500',
        category: 'Edit PDF'
    },
    {
        id: 'protectPdf',
        name: 'Password Protect',
        description: 'Secure PDF files with password encryption',
        icon: Lock,
        archetype: 'transformer',
        features: { ai: true, p2p: true, audit: true },
        href: '/protect-pdf',
        color: 'from-red-500 to-orange-500',
        category: 'PDF Security'
    },
    {
        id: 'unlockPdf',
        name: 'Unlock PDF',
        description: 'Remove password protection from PDFs',
        icon: Unlock,
        archetype: 'transformer',
        features: { ai: true, p2p: true },
        href: '/unlock-pdf',
        color: 'from-green-500 to-teal-500',
        category: 'PDF Security'
    },
    {
        id: 'redactPdf',
        name: 'Redact PDF',
        description: 'Permanently hide sensitive information',
        icon: EyeOff,
        archetype: 'annotator',
        features: { ai: true, audit: true },
        href: '/redact-pdf',
        color: 'from-gray-700 to-black',
        category: 'PDF Security'
    },
    {
        id: 'editMetadata',
        name: 'Edit Metadata',
        description: 'Update Title, Author and Keywords',
        icon: Tag,
        archetype: 'transformer',
        features: { ai: true, audit: true },
        href: '/edit-metadata',
        color: 'from-blue-400 to-indigo-500',
        category: 'Edit PDF'
    },
    {
        id: 'flattenPdf',
        name: 'Flatten PDF',
        description: 'Merge layers and lock forms',
        icon: Layers,
        archetype: 'transformer',
        href: '/flatten-pdf',
        color: 'from-indigo-800 to-purple-800',
        category: 'Edit PDF'
    },
    {
        id: 'repairPdf',
        name: 'Repair PDF',
        description: 'Fix corrupted PDF documents',
        icon: Wrench,
        archetype: 'transformer',
        features: { ai: true, audit: true },
        href: '/repair-pdf',
        color: 'from-green-500 to-emerald-600',
        category: 'Optimize PDF'
    },
    {
        id: 'metadataAuditor',
        name: 'Metadata Auditor',
        description: 'Inspect and wipe hidden tracking data',
        icon: ShieldAlert,
        archetype: 'transformer',
        features: { ai: true, audit: true },
        href: '/metadata-auditor',
        color: 'from-rose-500 to-orange-600',
        category: 'PDF Security'
    },
    {
        id: 'createWorkflow',
        name: 'Create Workflow',
        description: 'Build custom automated PDF workflows',
        icon: Workflow,
        archetype: 'manipulator',
        href: '/workflows/create',
        color: 'from-blue-600 to-indigo-600',
        category: 'Workflows'
    },
    {
        id: 'pdfA',
        name: 'PDF/A Converter',
        description: 'Convert PDF to long-term archiving format',
        icon: ShieldCheck,
        archetype: 'transformer',
        href: '/standards/pdf-a',
        color: 'from-emerald-600 to-teal-700',
        category: 'Optimize PDF'
    },
    {
        id: 'printReadyPdf',
        name: 'Print-Ready PDF',
        description: 'Prepare PDF for professional printing (CMYK)',
        icon: Printer,
        archetype: 'transformer',
        href: '/print-ready-pdf',
        color: 'from-blue-700 to-indigo-800',
        category: 'Optimize PDF'
    },
    {
        id: 'wordToPdf',
        name: 'Word to PDF',
        description: 'Convert Word documents to PDF format',
        icon: FileText,
        archetype: 'transformer',
        features: { ai: true, p2p: true },
        href: '/word-to-pdf',
        color: 'from-blue-500 to-indigo-500',
        category: 'Convert PDF'
    },
];
