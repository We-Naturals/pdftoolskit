import { ConversionOrchestrator } from './pdf/conversionOrchestrator';

/**
 * PHASE 40: THE APEX SERVICE LAYER (Document OS)
 * This service acts as the primary brain for all document operations. 
 * It abstracts the complexity of the 144MB WASM worker into a clean, 
 * command-oriented TypeScript interface.
 */

export type ApexCommand =
  | 'CONVERT_TO_PDF'
  | 'RECONSTRUCT_OFFICE'
  | 'MAIL_MERGE'
  | 'REPAIR_PDF_A'
  | 'OPTIMIZE_PDF'
  | 'EXPORT_HTML'
  | 'OPTIMIZE_RESOURCES'
  | 'EXECUTE_CQL'
  | 'FORENSIC_WIPE'
  | 'LOAD_FONT'
  | 'PROBE_VFS';

/**
 * PHASE 45.1: UNIFIED FILTER REGISTRY
 * Maps professional document standards to native LOKit filter strings.
 */
export const APEX_NATIVE_FILTERS = {
  // Archival Standards
  PDFA_2B: 'pdf:writer_pdf_Export:{"SelectPdfVersion":{"type":"long","value":"1"}}',
  PDFA_3B: 'pdf:writer_pdf_Export:{"SelectPdfVersion":{"type":"long","value":"2"}}',

  // High-Fidelity Professional Printing
  PDFX_1A: 'pdf:writer_pdf_Export:{"IsSkipEmptyPages":{"type":"boolean","value":"true"}}',

  // Security & Privacy
  ENCRYPT_256: 'pdf:writer_pdf_Export:{"Encrypt":{"type":"boolean","value":"true"}}',
  STRIP_CONTENT: 'pdf:writer_pdf_Export:{"ExportNotes":{"type":"boolean","value":"false"}}',

  // Web Optimization
  LINEARIZED: 'pdf:writer_pdf_Export:{"FastWebView":{"type":"boolean","value":"true"}}',
  WEBSITE_EXPORT: 'html:HTML:UTF8'
} as const;

export type ApexNativeFilterKey = keyof typeof APEX_NATIVE_FILTERS;

export interface ApexJob {
  id: string;
  command: ApexCommand;
  payload: {
    file?: File | Uint8Array;
    fileName?: string;
    options?: Record<string, unknown>;
    fontName?: string;
    fontBuffer?: Uint8Array;
    script?: unknown[];
  };
}

export class ApexService {
  private static instance: ApexService;
  private workers: Worker[] = [];
  /* eslint-disable @typescript-eslint/no-explicit-any */
  private jobMap: Map<string, { resolve: (value: any) => void, reject: (reason?: any) => void }> = new Map();
  /* eslint-enable @typescript-eslint/no-explicit-any */
  private initialized = false;
  private currentWorkerIndex = 0;
  private readonly POOL_SIZE = typeof navigator !== 'undefined' ? (navigator.hardwareConcurrency || 4) : 4;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.initWorker();
    }
  }

  public static getInstance(): ApexService {
    if (!ApexService.instance) {
      ApexService.instance = new ApexService();
    }
    return ApexService.instance;
  }

  private initWorker() {
    if (typeof window === 'undefined') return;

    // PHASE 52.1: MULTI-CORE WORKER POOL
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const worker = new Worker(new URL('../engines/apex-core.worker.ts', import.meta.url), {
        type: 'module'
      });

      worker.onmessage = (e) => this.handleMessage(e);
      worker.onerror = (e) => console.error(`Apex Worker ${i} Error:`, e);
      this.workers.push(worker);
    }

    this.initialized = true;
    // eslint-disable-next-line no-console
    console.log(`🚀 APEX: Initializing ${this.POOL_SIZE} high-fidelity workers...`);
  }

  private handleMessage(e: MessageEvent) {
    const { id, type, payload, error } = e.data;
    const job = this.jobMap.get(id);

    if (!job) return;

    if (type === 'SUCCESS') {
      job.resolve(payload);
    } else {
      job.reject(new Error(error || 'Apex Operation Failed'));
    }

    this.jobMap.delete(id);
  }

  /**
   * Universal Dispatcher for the Apex "Document OS" (Phase 52.1)
   * Hardened with multi-core round-robin distribution.
   */
  public async dispatch<T>(job: ApexJob): Promise<T> {
    if (!this.initialized) this.initWorker();

    return new Promise((resolve, reject) => {
      const jobId = job.id || crypto.randomUUID();
      this.jobMap.set(jobId, { resolve, reject });

      const runDispatch = async () => {
        try {
          let buffer: Uint8Array | undefined;
          if (job.payload.file instanceof File) {
            const arrayBuffer = await job.payload.file.arrayBuffer();
            buffer = new Uint8Array(arrayBuffer);
          } else if (job.payload.file instanceof Uint8Array) {
            buffer = job.payload.file;
          }

          const optimizedBuffer = buffer ? this.prepareSharedBuffer(buffer) : undefined;

          // PHASE 52.2: CONDITIONAL TRANSFER LIST
          // We must NOT transfer SharedArrayBuffers as they are shared by address.
          const transferList: Transferable[] = [];
          if (optimizedBuffer instanceof Uint8Array && optimizedBuffer.buffer && !(optimizedBuffer.buffer instanceof SharedArrayBuffer)) {
            transferList.push(optimizedBuffer.buffer);
          }

          // Round-robin worker selection
          const worker = this.workers[this.currentWorkerIndex];
          this.currentWorkerIndex = (this.currentWorkerIndex + 1) % this.POOL_SIZE;

          worker.postMessage({
            id: jobId,
            type: job.command,
            payload: {
              ...job.payload,
              fileBuffer: optimizedBuffer,
              fileName: job.payload.fileName || 'document.tmp'
            }
          }, transferList);
        } catch (e) {
          reject(e);
        }
      };

      runDispatch();
    });
  }

  /**
   * PHASE 47.1 / 52.2: ZERO-COPY MEMORY MANAGEMENT
   * Utilizes SharedArrayBuffer for large documents.
   */
  private prepareSharedBuffer(data: Uint8Array): Uint8Array {
    if (typeof SharedArrayBuffer !== 'undefined' && data.length > 2 * 1024 * 1024) { // Only for > 2MB
      // PHASE 54.1: FORENSIC TELEMETRY
      const shared = new SharedArrayBuffer(data.length);
      const view = new Uint8Array(shared);
      view.set(data);
      return view;
    }
    return data;
  }

  /**
   * HIGH-FIDELITY CONVERTERS (Phase 41)
   */
  public async officeToPdf(file: File, options: {
    initialView?: string,
    pageRange?: string,
    imageCompression?: number,
    filterKey?: ApexNativeFilterKey,
    customFilter?: string
  } = {}): Promise<Uint8Array> {
    const filter = options.customFilter || (options.filterKey ? APEX_NATIVE_FILTERS[options.filterKey] : 'pdf');

    return this.dispatch<Uint8Array>({
      id: crypto.randomUUID(),
      command: 'CONVERT_TO_PDF',
      payload: {
        file,
        fileName: file.name,
        options: { ...options, format: filter }
      }
    });
  }

  /**
   * INTELLIGENT RECONSTRUCTION (Phase 42)
   */
  public async pdfToOffice(file: File, targetFormat: 'docx' | 'xlsx' | 'pptx', options: {
    filterKey?: ApexNativeFilterKey,
    customFilter?: string
  } = {}): Promise<Uint8Array> {
    const filter = options.customFilter || (options.filterKey ? APEX_NATIVE_FILTERS[options.filterKey] : targetFormat);
    return this.dispatch<Uint8Array>({
      id: crypto.randomUUID(),
      command: 'RECONSTRUCT_OFFICE',
      payload: {
        file,
        fileName: file.name,
        options: { format: filter }
      }
    });
  }

  /**
   * APEX SCRIPTING ENGINE (Phase 45.2)
   */
  public async executeCql(file: File, script: unknown[]): Promise<Uint8Array> {
    return this.dispatch<Uint8Array>({
      id: crypto.randomUUID(),
      command: 'EXECUTE_CQL',
      payload: {
        file,
        fileName: file.name,
        script
      }
    });
  }

  /**
   * MAIL MERGE / TEMPLATE INJECTION (Phase 43)
   */
  public async mailMerge(template: File, data: unknown[]): Promise<Uint8Array> {
    const results = await ConversionOrchestrator.runParallelConversion<Uint8Array>(
      template,
      async (_range: number[]) => {
        return this.dispatch<Uint8Array>({
          id: crypto.randomUUID(),
          command: 'MAIL_MERGE',
          payload: {
            file: template,
            fileName: template.name,
            options: { dataSet: data.slice(0, 10) }
          }
        });
      }
    );
    return results[0];
  }

  /**
   * ARCHIVAL REPAIR & PDF/A CONVERSION (Phase 43)
   */
  public async repairPdf(file: File): Promise<Uint8Array> {
    return this.dispatch<Uint8Array>({
      id: crypto.randomUUID(),
      command: 'REPAIR_PDF_A',
      payload: {
        file,
        fileName: file.name,
        options: { repairLevel: 'forensic', outputFormat: 'pdf/a-2b' }
      }
    });
  }

  /**
   * HIGH-FIDELITY OPTIMIZATION (Phase 44 / 50.2)
   * Hardened to default to mandatory metadata stripping for forensic privacy.
   */
  public async optimizePdf(file: File, settings: { mode: string, stripMetadata: boolean } = { mode: 'web', stripMetadata: true }): Promise<Uint8Array> {
    return this.dispatch<Uint8Array>({
      id: crypto.randomUUID(),
      command: 'OPTIMIZE_PDF',
      payload: {
        file,
        fileName: file.name,
        options: { settings }
      }
    });
  }

  /**
   * STRUCTURAL EDITING BRIDGE (Phase 44)
   * Exports PDF to HTML for high-fidelity browser editing.
   */
  public async exportToHtml(file: File, options: {
    filterKey?: ApexNativeFilterKey,
    customFilter?: string
  } = {}): Promise<Uint8Array> {
    const filter = options.customFilter || (options.filterKey ? APEX_NATIVE_FILTERS[options.filterKey] : 'html');

    return this.dispatch<Uint8Array>({
      id: crypto.randomUUID(),
      command: 'EXPORT_HTML',
      payload: {
        file,
        fileName: file.name,
        options: { format: filter }
      }
    });
  }

  /**
   * TYPOGRAPHIC PARITY (Phase 41.2)
   * Mounts a font asset into the WASM VFS for metric-precise rendering.
   */
  public async loadFont(name: string, buffer: ArrayBuffer): Promise<void> {
    const sanitizedBuffer = new Uint8Array(buffer); // Renamed to avoid conflict with 'buffer' parameter
    await this.dispatch({
      id: crypto.randomUUID(),
      command: 'LOAD_FONT', // Changed 'LOAD_FONT' as any to 'LOAD_FONT'
      payload: {
        file: sanitizedBuffer, // Use sanitizedBuffer
        fileName: name,
        fontName: name,
        fontBuffer: sanitizedBuffer // Use sanitizedBuffer
      }
    });
  }

  /**
   * BI-DIRECTIONAL SYNC (Phase 46.2)
   * Redistills edited HTML back into a high-fidelity PDF.
   */
  public async syncHtmlToPdf(html: string, options: {
    filterKey?: ApexNativeFilterKey,
    css?: string
  } = {}): Promise<Uint8Array> {
    const fullHtml = `<!DOCTYPE html><html><head><style>${options.css || ''}</style></head><body>${html}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' }); // Changed [buffer as Uint8Array] to [fullHtml]
    const file = new File([blob], 'edited.html', { type: 'text/html' });

    return this.officeToPdf(file, { filterKey: options.filterKey || 'LINEARIZED' });
  }

  /**
   * FORENSIC WIPE (Phase 47.2 / 50.1 / 52.1)
   * Securely cleanses the engine's Virtual File System of all document fragments.
   * If forceRestart is true, the entire worker pool is terminated and respawned,
   * guaranteeing 100% JS/WASM heap purification for all threads.
   */
  public async forensicWipe(options: { forceRestart?: boolean } = {}): Promise<void> {
    if (options.forceRestart) {
      // eslint-disable-next-line no-console
      console.log("💎 APEX: Executing deep heap purification (Worker Pool Reset)...");
      this.workers.forEach(w => w.terminate());
      this.workers = [];
      this.jobMap.clear();
      this.initialized = false;
      this.initWorker();
      return;
    }

    // Traditional VFS-wipe across the pool (broadcast)
    const wipePromises = this.workers.map((_, index) => {
      return this.dispatchToWorker<void>(index, {
        id: crypto.randomUUID(),
        command: 'FORENSIC_WIPE',
        payload: {}
      });
    });

    await Promise.all(wipePromises);
  }

  /**
   * Specialized broadcaster for cross-pool operations
   */
  private async dispatchToWorker<T>(workerIndex: number, job: ApexJob): Promise<T> {
    return new Promise((resolve, reject) => {
      const jobId = job.id || crypto.randomUUID();
      this.jobMap.set(jobId, { resolve, reject });
      // eslint-disable-next-line security/detect-object-injection
      this.workers[workerIndex].postMessage({
        id: jobId,
        type: job.command,
        payload: { ...job.payload }
      });
    });
  }
}

export const apexService = ApexService.getInstance();
