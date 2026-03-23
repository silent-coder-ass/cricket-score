const puppeteer = require('puppeteer');
const path = require('path');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
    try {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('BROWSER_LOG:', msg.text()));
        page.on('pageerror', err => console.log('BROWSER_ERROR:', err.toString()));
        
        const filePath = 'file://' + path.resolve(__dirname, 'index.html');
        console.log(`Opening ${filePath}`);
        
        await page.goto(filePath, { waitUntil: 'networkidle0' });
        
        console.log("Clicking btn-local-mode");
        await page.click('#btn-local-mode');
        await wait(500);
        
        console.log("Clicking btn-start-local");
        await page.click('#btn-start-local');
        await wait(2000);
        
        console.log("Clicking home btn");
        await page.click('[data-navigate="home"]');
        await wait(2000);
        
        console.log("Closing browser");
        await browser.close();
    } catch (e) {
        console.error("PUPPETEER EXCEPTION:", e);
    }
})();
