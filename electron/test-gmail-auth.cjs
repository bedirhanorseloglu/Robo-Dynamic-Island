const { app, BrowserWindow } = require('electron');

app.whenReady().then(async () => {
  const FIREFOX_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0';

  const win = new BrowserWindow({
    show: false,
    width: 600,
    height: 500,
    webPreferences: {
      partition: 'persist:google_account_session',
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  win.webContents.setUserAgent(FIREFOX_UA);
  // Seamless sign in continue to Gmail
  await win.loadURL('https://accounts.google.com/ServiceLogin?service=mail&continue=https://mail.google.com/mail/u/0/');

  setTimeout(async () => {
    console.log('FINAL URL:', win.webContents.getURL());
    console.log('PAGE TITLE:', win.getTitle());
    app.quit();
  }, 6000);
});
