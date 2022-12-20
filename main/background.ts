import { app, ipcMain } from 'electron';
import serve from 'electron-serve';
import { createWindow } from './helpers';
import { Agent } from 'http';
const { chromium } = require('playwright');
const isProd: boolean = process.env.NODE_ENV === 'production';
const ExcelJs = require('exceljs');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');

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
      headless: false,
    });  // Or 'firefox' or 'webkit'.


    event.sender.send('explanation', '페이지 이동 중...')

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





    event.sender.send('explanation', '네이버 부동산 매물 불러오는 중...')

    /* 페이지 스크롤 */
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
      await page.waitForTimeout(500); // sleep a bit

      await page.waitForSelector('#listContents1 > div');
      let newHeight = await page.evaluate(() => {
        try {
          return document.querySelector('#listContents1 > div').scrollHeight;
        } catch (err) {
          console.log(err)
        }
      })
      if (newHeight === lastHeight) {
        break;
      }
      lastHeight = newHeight;
    }



    await page.waitForSelector('#listContents1 > div');

    await page.evaluate(() => {
      try {
        document.querySelector('#listContent1 > div').scrollTo(0, 0)
      } catch (err) {
        console.log(err)
      }
    })

    /* 찾고자하는 방의 총 갯수 */
    const roomCount = await page.evaluate(() => {
      try {
        return document.querySelector("#listContents1 > div > div > div").childElementCount;
      } catch (err) {
        console.log(err);
      }
    })




    /* Data List */
    const data = [];

    for (let i = 1; i <= roomCount; i++) {
      try {
        event.sender.send('explanation', `${i}/${roomCount}번째 방 데이터 수집 중...`)
        await page.locator(`#listContents1 > div > div > div > div:nth-child(${i})`).click();

        await page.waitForSelector('div.detail_contents_inner');
        await page.waitForSelector('table.info_table_wrap');
        let info = await page.locator('div.detail_contents_inner').innerHTML();

        
        const $ = cheerio.load(info);

        if ($('#tabArea > div.tab_area_list').children().length === 4) {
          continue;
        }
        
        
        
        
        let info_object = {
          room_type: $('.info_article_price > .type').text(),
          room_price: $('.info_article_price > .price').text(),
          location: $('div.detail_box--summary > table > tbody > tr:nth-child(1) > .table_td').text(),
          scope: $('tr:nth-child(3) > .table_td').text(),
          price: $('tr:nth-child(5) > td:nth-child(2)').text(),
          price_content: $('tr:nth-child(5) > td:nth-child(4)').text(),
          move_in_date: $('tr:nth-child(6) > td:nth-child(2)').text(),
          duplex: $('tr:nth-child(9) > td:nth-child(2)').text(),
          room_number: $('tr:nth-child(10) > td:first-of-type').text(),
          link : 'https://new.land.naver.com/rooms?articleNo='.concat($('tr:nth-child(10) > td:first-of-type').text())
        }

        data.push(info_object);

        console.log(info_object)

      } catch (err) {
        console.log(err);
      }
    }


    event.sender.send('explanation', '수집한 데이터를 엑셀 파일로 변환 중...');
    const workbook = new ExcelJs.Workbook();

    const worksheet = workbook.addWorksheet('room list');

    worksheet.columns = [
      {
        header: '방 형태', key: 'room_type', style: { alignment: { horizontal: 'center'}}
      },
      {
        header: '가격', key: 'room_price',width: 9, style: { alignment: { horizontal: 'center'}}
      },
      {
        header: '상세 위치', key: 'location', width: 30, style: { alignment: { horizontal: 'center'}}
      },
      {
        header: '공급/전용면적', key: 'scope', width:28,style: { alignment: { horizontal: 'center'}}
      },
      {
        header: '관리비', key: 'price', width:11,style: { alignment: { horizontal: 'center'}}
      },
      {
        header: '관리비 포함', key: 'price_content',width:21, style: { alignment: { horizontal: 'center'}}
      },
      {
        header: '사용승인일', key: 'move_in_date', width:25, style: { alignment: { horizontal: 'center'}}
      },
      {
        header: '복층 여부', key: 'duplex',width: 9, style: { alignment: { horizontal: 'center'}}
      },
      {
        header: '매물 번호', key: 'room_number', width: 18, style: { alignment: { horizontal: 'center'}}
      },
      {
        header: '상세링크', key: 'link' ,width: 60, style: { alignment: { horizontal: 'center'}}
      }
    ]

    worksheet.insertRows(2, data);

    workbook.xlsx.writeFile(`${payload.region}_room_list.xlsx`);



    event.sender.send('explanation', '엑셀 변환 완료하였습니다.');

    // const Price = await page.innerText('#ct > div.map_wrap > div.detail_panel > div > div.detail_contents_inner > div.detail_fixed > div.main_info_area > div.info_article_price');

    // event.sender.send('room-list', Price)

  })();
})