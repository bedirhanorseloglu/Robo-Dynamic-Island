#!/usr/bin/env node
/**
 * TwoCode CLI Hook Helper
 * Claude Code / Codex veya herhangi bir terminal betiğinden Dynamic Island'a
 * canlı durum ve onay (Allow / Deny) isteği göndermek için kullanılır.
 *
 * Kullanım:
 *   node twocode-cli.cjs working "src/App.jsx okunuyor..."
 *   node twocode-cli.cjs approve "npm run deploy"
 *   node twocode-cli.cjs done "Derleme tamamlandı!"
 */
const http = require('http');

const [, , mode = 'working', message = 'Processing...', extra = ''] = process.argv;

const payload = JSON.stringify({
  agent: process.env.TWOCODE_AGENT || 'Claude Code',
  type: mode === 'approve' ? 'approval' : mode === 'done' ? 'done' : 'working',
  title:
    mode === 'approve'
      ? 'Terminal komutu için onay bekleniyor'
      : message,
  command: mode === 'approve' ? message : extra,
  file: extra || 'src/App.jsx',
  wait: mode === 'approve',
});

const req = http.request(
  {
    hostname: '127.0.0.1',
    port: 4242,
    path: '/api/agent',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  },
  (res) => {
    let body = '';
    res.on('data', (c) => (body += c));
    res.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (mode === 'approve') {
          if (data.approved) {
            console.log('✓ TwoCode Ada üzerinden ONAYLANDI (Allowed).');
            process.exit(0);
          } else {
            console.error('✗ TwoCode Ada üzerinden REDDEDİLDİ (Denied).');
            process.exit(1);
          }
        } else {
          console.log('✓ TwoCode Ada güncellendi:', data);
        }
      } catch {
        console.log(body);
      }
    });
  }
);

req.on('error', (err) => {
  console.error('TwoCode Dynamic Island çalışmıyor olabilir (127.0.0.1:4242):', err.message);
  process.exit(1);
});

req.write(payload);
req.end();
