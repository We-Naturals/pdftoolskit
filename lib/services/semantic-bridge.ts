/**
 * PHASE 46.1: HTML RECONSTRUCTION BRIDGE
 * Bridging the gap between Native Apex HTML and Browser-side Structural Editing.
 */

export interface SemanticDocument {
  html: string;
  css: string;
  metadata: Record<string, unknown>;
}

export class SemanticBridge {
  /**
   * Transforms raw WASM HTML output into a sanitized, editable structure.
   */
  public static async reconstruct(buffer: Uint8Array): Promise<SemanticDocument> {
    const rawContent = new TextDecoder().decode(buffer);

    // Extract CSS and Body content from the LOKit HTML export
    const styleMatch = rawContent.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    const bodyMatch = rawContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);

    const css = styleMatch ? styleMatch[1] : '';
    let html = bodyMatch ? bodyMatch[1] : rawContent;

    // Sanitize LOKit specific classes for browser-side contentEditable
    html = html.replace(/class="[^"]*background[^"]*"/g, 'class="semantic-page-bg"');

    return {
      html,
      css,
      metadata: {
        engine: 'Apex LOKit v3.1',
        standard: 'XHTML/1.1'
      }
    };
  }

  /**
   * Prepares the edited HTML for re-distillation back to PDF/Office.
   */
  public static prepareForSync(html: string, css: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>${css}</style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;
  }
}
