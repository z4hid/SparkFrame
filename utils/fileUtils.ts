export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            // Remove the data URI prefix e.g., "data:image/png;base64,"
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const downloadFile = (base64: string, mimeType: string, filename: string) => {
    const link = document.createElement('a');
    const ensured = filename.toLowerCase().endsWith('.png') ? filename : `${filename.replace(/\.[^./\\]+$/, '')}.png`;
    link.href = `data:${mimeType};base64,${base64}`;
    link.download = ensured;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
