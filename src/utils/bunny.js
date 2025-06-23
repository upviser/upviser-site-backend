import https from 'https';

export const uploadToBunny = ({ fileName, stream }) => {
  return new Promise((resolve, reject) => {
    const host = 'storage.bunnycdn.com';
    const options = {
      method: 'PUT',
      host,
      path: `/${encodeURIComponent(process.env.BUNNY_STORAGE_NAME)}/${encodeURIComponent(fileName)}`,
      headers: {
        AccessKey: process.env.BUNNY_CDN_API,
        'Content-Type': 'application/octet-stream',
        accept: 'application/json'
      },
      timeout: 30000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const url = `https://${process.env.BUNNY_CDN_NAME}.b-cdn.net/${fileName}`;
          resolve(url);
        } else {
          reject(new Error(`Upload failed: ${res.statusCode} – ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy(new Error('Upload timed out'));
    });

    stream.pipe(req);
  });
};