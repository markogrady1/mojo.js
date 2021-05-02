import mojo from '../index.js';

const app = mojo();

app.any('/hello', ctx => ctx.render({inline: hello}));

app.start();

const hello = `
Hello <%= 'World!' %>
`;
