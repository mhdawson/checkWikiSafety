// Copyright the project authors as listed in the AUTHORS file.
// All rights reserved. Use of this source code is governed by the
// license that can be found in the LICENSE file.

const puppeteer = require('puppeteer');

async function check() {
  const chrome = await puppeteer.launch({headless: false});
  const loginPage = await chrome.newPage();
  await loginPage.goto('https://github.com/login');
  await loginPage.type('#login_field', 'XXXXXXXXXXXX');
  await loginPage.type('#password', 'XXXXXXXXX');
  await Promise.all([loginPage.click('[name="commit"]'), loginPage.waitForNavigation()]);
  const loginPageContent = await loginPage.content();
  if (loginPageContent.includes('Incorrect username or password.')) {
    chrome.close();
    throw new Error('Failed to login');
  }
  
  await loginPage.goto('https://github.com/mhdawson/testwiki/wiki/Home/_edit')
  const pageContent = await loginPage.content();
  const nonEditable =  pageContent.includes('You do not have permission to update this wiki.');
  console.log(nonEditable);
  chrome.close();
};

check().then({}, (e) => {
  console.log(e);
});;
