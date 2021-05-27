import mojo from '../lib/mojo.js';
import t from 'tap';

t.test('WebSocket', async t => {
  const app = mojo();

  app.get('/').to(ctx => ctx.render({text: 'Hello Mojo!'}));

  app.websocket('/ws').to(ctx => {
    ctx.on('connection', ws => {
      ws.on('message', message => {
        ws.send(message);
      });
    });
  });

  app.websocket('/ws/iterator').to(ctx => {
    ctx.on('connection', async ws => {
      for await (const message of ws) {
        await ws.send(message);
      }
    });
  });

  app.websocket('/ping').to(ctx => {
    ctx.on('connection', ws => {
      ws.on('ping', async data => {
        await ws.pong(data);
      });
    });
  });

  const client = await app.newTestClient({tap: t});

  await t.test('Hello World', async t => {
    (await client.getOk('/')).statusIs(200).bodyIs('Hello Mojo!');
  });

  await t.test('WebSocket roundtrip', async t => {
    const ws = await client.websocket('/ws');
    ws.send('Hello Mojo!');
    const message = await new Promise(resolve => {
      ws.on('message', message => {
        ws.on('close', () => resolve(message));
        ws.close();
      });
    });
    t.equal(message, 'Hello Mojo!');
  });

  await t.test('WebSocket roundtrip (client iterator)', async t => {
    const ws = await client.websocket('/ws');
    ws.send('Hello Mojo!');
    let result;
    for await (const message of ws) {
      result = message;
      ws.close();
    }
    t.equal(result, 'Hello Mojo!');
  });

  await t.test('WebSocket roundtrip (server iterator)', async t => {
    const ws = await client.websocket('/ws/iterator');
    ws.send('Hello Mojo!');
    const message = await new Promise(resolve => {
      ws.on('message', message => {
        ws.on('close', () => resolve(message));
        ws.close();
      });
    });
    t.equal(message, 'Hello Mojo!');
  });

  await t.test('Ping/Pong', async t => {
    const ws = await client.websocket('/ping');
    await ws.ping(Buffer.from('Hello Mojo!'));
    const data = await new Promise(resolve => {
      ws.on('pong', data => {
        ws.on('close', () => resolve(data));
        ws.close();
      });
    });
    t.equal(data.toString(), 'Hello Mojo!');
  });

  await client.stop();
});
