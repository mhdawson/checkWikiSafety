// Copyright the project authors as listed in the AUTHORS file.
// All rights reserved. Use of this source code is governed by the
// license that can be found in the LICENSE file.

const https = require('https');
const process = require('process');
const puppeteer = require('puppeteer');

const userId = process.env.USER_ID;
const userPassword = process.env.USER_PASSWORD;

let chrome;
async function login() {
  chrome = await puppeteer.launch({headless: false});
  const loginPage = await chrome.newPage();
  await loginPage.goto('https://github.com/login');
  await loginPage.type('#login_field', userId);
  await loginPage.type('#password', userPassword);
  await Promise.all([loginPage.click('[name="commit"]'), loginPage.waitForNavigation()]);
  const loginPageContent = await loginPage.content();
  if (loginPageContent.includes('Incorrect username or password.')) {
    chrome.close();
    throw new Error('Failed to login');
  }
  
  return loginPage;
}

async function cleanup() {
  if (chrome) {
    chrome.close();
  }
};

// go to the wiki for the repo specified by the
// url and validate that an attempt to edit the home
// page fails
async function checkWiki(page, url) {
  await page.goto(`${url}/wiki/Home/_edit`)
  const pageContent = await page.content();
  const nonEditable =  pageContent.includes('You do not have permission to update this wiki.');
  return nonEditable;
};

// get the list of repos for an org, page by page
// returns the repos on the page listed
// we use basic authentication as the rate limiting
// is less restrictive if you are logged in.
async function getRepoList(org, page) {
  const result = new Promise((resolve, reject) => {
    const requestOptions = { hostname: 'api.github.com',
                             port: 443,
                             path: `/orgs/${org}/repos?page=${page}`,
                             method: 'GET',
                             headers: { 'User-Agent': 'Node.js request',
                                        'Authorization': 'Basic ' + new Buffer(`${userId}:${userPassword}`).toString('base64') }};
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

// iterate over the repos for the org specified
// checking each repo that was a wiki to make
// sure it is not editable (assumes userid/password
// provided in environment is for a github user
// that is NOT a member of the org
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
        if ((repoListObject[entry].has_wiki) && (repoListObject[entry].archived === false)) {
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



// start checking all of the repos
checkRepos('nodejs').catch( e => {
  console.log(e);
  cleanup(); 
}).then(cleanup);
