const fs = require('fs');
const Jimp = require('jimp');

async function processImage() {
    try {
        const image = await Jimp.read('c:/MyWorks/jhartestmobileapp/jhartest-app/assets/images/newlogo2.jpeg');
        // Make image square (1024x1024) for app icon
        
        // Let's create a transparent icon for the app
        const cloned = image.clone();
        
        // Remove white background (make it transparent)
        cloned.scan(0, 0, cloned.bitmap.width, cloned.bitmap.height, function (x, y, idx) {
            const r = this.bitmap.data[idx];
            const g = this.bitmap.data[idx + 1];
            const b = this.bitmap.data[idx + 2];
            
            // If the pixel is very close to white
            if (r > 240 && g > 240 && b > 240) {
                this.bitmap.data[idx + 3] = 0; // Set alpha to 0
            }
        });
        
        // Resize to square for app icon
        const iconImg = cloned.clone().contain(1024, 1024);
        await iconImg.writeAsync('c:/MyWorks/jhartestmobileapp/jhartest-app/assets/images/app-icon.png');
        
        // Splash screen logo
        await cloned.writeAsync('c:/MyWorks/jhartestmobileapp/jhartest-app/assets/images/logo-transparent.png');
        
        console.log("Images processed successfully.");
    } catch (e) {
        console.error("Error processing image:", e);
    }
}

processImage();
