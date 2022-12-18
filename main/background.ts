import { app, ipcMain } from 'electron';
import serve from 'electron-serve';
import { createWindow } from './helpers';
import { Agent } from 'http';
const { chromium } = require('playwright');
const isProd: boolean = process.env.NODE_ENV === 'production';
const Excel = require('exceljs');

if (isProd) {
  serve({ directory: 'app' });
} else {
  app.setPath('userData', `${app.getPath('userData')} (development)`);
}

(async () => {
  await app.whenReady();

  const mainWindow = createWindow('main', {
    width: 1000,
    height: 600,
  });

  if (isProd) {
    await mainWindow.loadURL('app://./home.html');
  } else {
    const port = process.argv[2];
    await mainWindow.loadURL(`http://localhost:${port}/home`);
    mainWindow.webContents.openDevTools();
  }
})();

app.on('window-all-closed', () => {
  app.quit();
});




ipcMain.on('get-room', (event: any, payload) => {

  (async () => {
    const browser = await chromium.launch({
      headless: false
    });  // Or 'firefox' or 'webkit'.
    const page = await browser.newPage();
    await page.goto('https://land.naver.com');

    await page.locator('#queryInputHeader').fill(payload.region)

    await page.locator('fieldset > a:first-of-type').click();

    // await page.locator('#listContents1 > div > div > div:nth-child(1) > div:nth-child(1)').click();



    await page.waitForTimeout(2000); // sleep a bit

    /* 원룸/투룸인 경우 */
    if (payload.regionShape === '2') {
      await page.locator('.lnb_wrap > a:nth-child(4)').click();
    }
    /* 빌라/주택인 경우 */
    else {
      await page.locator('.lnb_wrap > a:nth-child(3)').click();
    }





    await page.waitForTimeout(1000); // sleep a bit

    await page.waitForSelector('#listContents1 > div');

    let lastHeight = await page.evaluate(() => {
      try {
        return document.querySelector('#listContents1 > div').scrollHeight
      } catch (err) {
        console.log(err)
      }
    });

    await page.waitForSelector('#listContents1 > div');
    while (true) {

      await page.evaluate((lastHeight) => {
        try {
          document.querySelector('#listContents1 > div').scrollTo(0, lastHeight);
        } catch (err) {
          console.log(err)
        }
      }, lastHeight);
      await page.waitForTimeout(1000); // sleep a bit

      await page.waitForSelector('#listContents1 > div');
      let newHeight = await page.evaluate(() => {
        try {
          return document.querySelector('#listContents1 > div').scrollHeight;
        } catch (err) {
          console.log(err)
        }
      })
      console.log(newHeight)
      if (newHeight === lastHeight) {
        break;
      }
      lastHeight = newHeight;
    }


    // const Price = await page.innerText('#ct > div.map_wrap > div.detail_panel > div > div.detail_contents_inner > div.detail_fixed > div.main_info_area > div.info_article_price');

    // event.sender.send('room-list', Price)

  })();
})