export const GOOGLE_FONTS = [
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Oswald',
    'Source Sans Pro',
    'Slabo 27px',
    'Raleway',
    'PT Sans',
    'Merriweather',
    'Nunito',
    'Concert One',
    'Prompt',
    'Work Sans',
    'Inter',
    'Playfair Display',
    'Rubik',
    'Lora',
    'Ubuntu',
    'Cabin',
    'Arvo',
    'Anton',
    'Dancing Script',
    'Pacifico',
    'Permanent Marker',
    'Creepster'
];

export const loadFont = (fontFamily: string) => {
    return new Promise<void>((resolve, reject) => {
        if (!fontFamily) {
            resolve();
            return;
        }

        // Check if already loaded
        if (document.fonts.check(`12px "${fontFamily}"`)) {
            resolve();
            return;
        }

        const linkId = `font-${fontFamily.replace(/\s+/g, '-')}`;
        if (document.getElementById(linkId)) {
            resolve(); // Already requested
            return;
        }

        const link = document.createElement('link');
        link.id = linkId;
        link.href = `https://fonts.googleapis.com/css?family=${fontFamily.replace(/\s+/g, '+')}:400,700&display=swap`;
        link.rel = 'stylesheet';
        link.onload = () => {
            // Wait for document.fonts to actually acknowledge it
            document.fonts.load(`12px "${fontFamily}"`).then(() => resolve()).catch(() => resolve());
        };
        link.onerror = () => reject();
        document.head.appendChild(link);
    });
};

export const getFontBytes = async (fontFamily: string): Promise<Uint8Array | null> => {
    try {
        // Fetch the CSS from Google Fonts API
        const response = await fetch(`https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@400;700&display=swap`);
        const css = await response.text();

        // Extract the URL of the .woff2 or .ttf file
        // Note: pdf-lib typically needs TTF or OTF. 
        // Google Fonts often returns WOFF2. pdf-lib might not support WOFF2 directly without opentype.js
        // We can force it to return TTF by changing User-Agent or using the older API format.
        const ttfResponse = await fetch(`https://fonts.googleapis.com/css?family=${fontFamily.replace(/\s+/g, '+')}:400,700`);
        const ttfCss = await ttfResponse.text();

        const urlMatch = ttfCss.match(/url\((https:\/\/fonts\.gstatic\.com\/s\/[^)]+\.ttf)\)/);
        if (!urlMatch) {
            // Fallback: try to find any font file
            const anyUrlMatch = css.match(/url\(([^)]+)\)/);
            if (!anyUrlMatch) return null;
            const fontUrl = anyUrlMatch[1];
            const fontRes = await fetch(fontUrl);
            return new Uint8Array(await fontRes.arrayBuffer());
        }

        const fontUrl = urlMatch[1];
        const fontRes = await fetch(fontUrl);
        return new Uint8Array(await fontRes.arrayBuffer());
    } catch (err) {
        console.error("Failed to fetch font bytes", err);
        return null;
    }
};
