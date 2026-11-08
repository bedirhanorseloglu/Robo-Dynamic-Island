const { app, session, net } = require('electron');

app.whenReady().then(async () => {
  const ses = session.fromPartition('persist:google_account_session');
  const cookies = await ses.cookies.get({});
  console.log('Google Cookies count:', cookies.length);
  console.log('Cookie domains:', [...new Set(cookies.map(c => c.domain))]);

  const req = net.request({
    url: 'https://mail.google.com/mail/feed/atom',
    session: ses
  });
  req.on('response', (res) => {
    console.log('STATUS:', res.statusCode);
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log('BODY LENGTH:', d.length);
      console.log('BODY PREVIEW:', d.slice(0, 300));
      app.quit();
    });
  });
  req.on('error', (e) => {
    console.log('ERROR:', e.message);
    app.quit();
  });
  req.end();
});
