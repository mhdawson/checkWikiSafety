const puppeteer = require('puppeteer');

async function check () {
  const chrome = await puppeteer.launch({headless: false});
  const loginPage = await chrome.newPage();
  await loginPage.goto('https://github.com/login');
  await loginPage.type('#login_field', 'nobodydevrus');
  await loginPage.type('#password', 'XXXXXXXXX');
  await Promise.all([loginPage.click('[name="commit"]'), loginPage.waitForNavigation()]);
  await loginPage.goto('https://github.com/mhdawson/testwiki/wiki/Home/_edit')
  const pageContent = await loginPage.content();
  const nonEditable =  pageContent.includes('You do not have permission to update this wiki.');
  console.log(nonEditable);

};


check();
