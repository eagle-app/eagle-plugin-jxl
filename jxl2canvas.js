module.exports = async (src, plugin) => {
    return new Promise(async (resolve, reject) => {
        const fs = require('fs');
        const path = require('path');
        
        // First, try native browser JXL support
        try {
            console.log('Attempting native JXL decoding...');
            const image = await new Promise((resolve, reject) => {
                const img = new Image();
                img.src = src;
                
                img.onload = () => {
                    // Check if image actually loaded with valid dimensions
                    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
                        resolve(img);
                    } else {
                        reject(new Error('Image loaded but has invalid dimensions'));
                    }
                };
                
                img.onerror = () => reject(new Error('Native JXL decoding failed'));
                
                // Give native decoding 3 seconds to work
                setTimeout(() => reject(new Error('Native JXL decoding timeout')), 3000);
            });

            // Successfully loaded with native support
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(image, 0, 0);
            
            // Verify canvas has actual image data (not empty/transparent)
            const imageData = ctx.getImageData(0, 0, Math.min(10, canvas.width), Math.min(10, canvas.height));
            const hasContent = imageData.data.some((value, index) => {
                // Check if any pixel has non-transparent content
                return (index % 4 === 3) ? value > 0 : value !== 0;
            });
            
            if (hasContent) {
                console.log('Successfully decoded JXL using native browser support');
                return resolve({
                    canvas: canvas,
                    width: image.naturalWidth,
                    height: image.naturalHeight
                });
            } else {
                console.log('Native decoding produced empty canvas, falling back to WASM');
            }
        } catch (nativeError) {
            console.log('Native JXL support not available or failed:', nativeError.message);
        }
        
        // Fallback to WASM decoder
        console.log('Using WASM decoder for JXL...');
        try {
            // Read the JXL file
            const buffer = fs.readFileSync(src);
            const arrayBuffer = new Uint8Array(buffer).buffer;
            
            // Create worker for JXL decoding
            const workerPath = path.join(plugin.path, 'jxl_dec.js');
            const worker = new Worker(workerPath);
            
            // Use transferable objects for better performance
            // This transfers ownership of the buffer to the worker, avoiding copy
            worker.postMessage({
                jxlSrc: src,
                image: arrayBuffer
            }, [arrayBuffer]); // Transfer the ArrayBuffer
            
            // Handle worker response
            worker.addEventListener('message', async (e) => {
                try {
                    if (e.data.imgData) {
                        const imgData = e.data.imgData;
                        
                        // Always use regular canvas for compatibility with Eagle
                        const canvas = document.createElement('canvas');
                        canvas.width = imgData.width;
                        canvas.height = imgData.height;
                        
                        const ctx = canvas.getContext('2d', { 
                            willReadFrequently: false,  // Optimize for writing
                            alpha: true,
                            desynchronized: true  // Better performance in Chrome
                        });
                        
                        // Use putImageData with optional dirty rectangle for better performance
                        ctx.putImageData(imgData, 0, 0);
                        
                        // Terminate worker immediately to free memory
                        worker.terminate();
                        
                        console.log('Successfully decoded JXL using WASM');
                        resolve({
                            canvas: canvas,
                            width: imgData.width,
                            height: imgData.height
                        });
                    }
                } catch (error) {
                    worker.terminate();
                    console.error('Error processing JXL image with WASM:', error);
                    reject(error);
                }
            });
            
            // Handle worker errors
            worker.addEventListener('error', (error) => {
                worker.terminate();
                console.error('WASM Worker error:', error);
                reject(error);
            });
            
            // Add timeout to prevent hanging
            const timeout = setTimeout(() => {
                worker.terminate();
                reject(new Error('WASM JXL decoding timeout (30s)'));
            }, 30000);
            
            // Clear timeout on success
            worker.addEventListener('message', () => clearTimeout(timeout), { once: true });
            
        } catch (e) {
            console.error('Error with WASM JXL decoder:', e);
            
            // Fallback: try to load as regular image if it's not actually JXL
            try {
                console.log('This file may not be in JXL format, trying to load as JPG/PNG instead...');
                const image = await new Promise((resolve, reject) => {
                    const img = new Image();
                    img.src = src;
                    img.onload = () => resolve(img);
                    img.onerror = reject;
                });

                const canvas = document.createElement('canvas');
                canvas.width = image.width;
                canvas.height = image.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(image, 0, 0);

                if (image.width && image.height) {
                    console.log('Successfully loaded as JPG/PNG');
                    resolve({
                        canvas: canvas,
                        width: image.width,
                        height: image.height
                    });
                } else {
                    console.log('Failed to load as JPG/PNG');
                    reject('Invalid image');
                }
            } catch (fallbackError) {
                console.error('Fallback loading failed:', fallbackError);
                reject(fallbackError);
            }
        }
    });
};