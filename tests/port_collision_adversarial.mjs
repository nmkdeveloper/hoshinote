import net from 'net';
import { preview } from 'vite';

const server = net.createServer();
server.listen(4180, '127.0.0.1', async () => {
  console.log('Occupied port 4180 with dummy TCP listener.');
  try {
    const viteServer = await preview({
      preview: {
        port: 4180,
        strictPort: false,
      },
    });
    console.log('Vite preview server successfully rolled over to:', viteServer.resolvedUrls?.local?.[0]);
    await viteServer.close();
    console.log('Vite server closed cleanly.');
  } catch (err) {
    console.error('Vite failed to roll over:', err);
    process.exit(1);
  } finally {
    server.close();
    console.log('Dummy TCP listener closed.');
  }
});
