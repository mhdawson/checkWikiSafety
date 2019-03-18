// Copyright the project authors as listed in the AUTHORS file.
// All rights reserved. Use of this source code is governed by the
// license that can be found in the LICENSE file.

const https = require('https');
const puppeteer = require('puppeteer');

let chrome;
async function login() {
  chrome = await puppeteer.launch({headless: false});
  const loginPage = await chrome.newPage();
  await loginPage.goto('https://github.com/login');
  await loginPage.type('#login_field', 'XXXXX');
  await loginPage.type('#password', 'XXXXX');
  await Promise.all([loginPage.click('[name="commit"]'), loginPage.waitForNavigation()]);
  const loginPageContent = await loginPage.content();
  if (loginPageContent.includes('Incorrect username or password.')) {
    chrome.close();
    throw new Error('Failed to login');
  }
  
  return loginPage;
}

async function checkWiki(page, url) {
  await page.goto(`${url}/wiki/Home/_edit`)
  const pageContent = await page.content();
  const nonEditable =  pageContent.includes('You do not have permission to update this wiki.');
//  chrome.close();
  return nonEditable;
};

async function getRepoList(org, page) {
  const result = new Promise((resolve, reject) => {
    const requestOptions = { hostname: 'api.github.com',
                             port: 443,
                             path: `/orgs/${org}/repos?page=${page}`,
                             method: 'GET',
                             headers: { 'User-Agent': 'Node.js request',
                                        'Authorization': 'Basic ' + new Buffer('XXXXX:XXXXX').toString('base64') }};
    https.request(requestOptions, (res) => {
      let responseData = '';
      res.on('data', data =>  {
        responseData = responseData += data;
      });

      res.on('end', () => {
        resolve(responseData);
      });
    }).end();
  });

  return result;
}

async function checkRepos(org) {
  const puppetPage = await login();
  let repo = 1;
  let page = 1;
  while(true) {
    const repoList = await getRepoList(org, page);
    const repoListObject = JSON.parse(repoList);
    if (repoListObject.length != 0) {
      for (entry in repoListObject) {
        let nonEditable;
        let problem = '';
        if (repoListObject[entry].has_wiki) {
          nonEditable = await checkWiki(puppetPage, repoListObject[entry].html_url); 
          if (nonEditable !== true) {
            problem = '*';
          }
        }
        console.log(repo + 
                    ':' +
                    repoListObject[entry].name +
                    ':' +
                    repoListObject[entry].has_wiki +
                    ':' + 
                    nonEditable +
                    problem);
        repo++;
      }
    } else {
      break;
    }
    page++;
  }
}

checkRepos('nodejs').catch( e => {
  console.log(e);
});
/*
check().then({}, (e) => {
  console.log(e);
});;
*/
