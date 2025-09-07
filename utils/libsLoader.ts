import toast from "react-hot-toast";

const loadedScripts: { [src: string]: Promise<void> } = {};
const loadedLibraries: { [key: string]: any } = {};

const CDN_URLS = {
  jspdf: 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  html2canvas: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  JSZip: 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js'
};

const loadScript = (src: string): Promise<void> => {
    if (!loadedScripts[src]) {
        loadedScripts[src] = new Promise((resolve, reject) => {
            // Check if script already exists from a previous load attempt
            if (document.querySelector(`script[src="${src}"]`)) {
                return resolve();
            }

            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => {
                delete loadedScripts[src]; // Allow retrying on failure
                reject(new Error(`Failed to load script: ${src}`));
            };
            document.body.appendChild(script);
        });
    }
    return loadedScripts[src];
};

const loadLibrary = async <T>(globalVarName: keyof typeof CDN_URLS, libraryName: string): Promise<T> => {
    if (loadedLibraries[globalVarName]) {
        return loadedLibraries[globalVarName] as T;
    }
    
    if ((window as any)[globalVarName]) {
        loadedLibraries[globalVarName] = (window as any)[globalVarName];
        return loadedLibraries[globalVarName] as T;
    }

    try {
        await loadScript(CDN_URLS[globalVarName]);
    } catch (error) {
        toast.error(`${libraryName} failed to load. Please check your internet connection.`);
        throw error;
    }

    const lib = (window as any)[globalVarName];
    if (lib) {
        loadedLibraries[globalVarName] = lib;
        return lib as T;
    } else {
        const errorMsg = `${libraryName} script loaded but was not found on the window object.`;
        console.error(errorMsg, `Expected window.${globalVarName}`);
        toast.error("A critical error occurred loading an export library.");
        throw new Error(errorMsg);
    }
};


interface JsPDFLib {
    jsPDF: new (options?: any) => any;
}

export const loadJsPDF = (): Promise<JsPDFLib> => loadLibrary('jspdf', 'PDF Export');
export const loadHtml2Canvas = (): Promise<any> => loadLibrary('html2canvas', 'Image Export');
export const loadJSZip = (): Promise<any> => loadLibrary('JSZip', 'ZIP Export');
