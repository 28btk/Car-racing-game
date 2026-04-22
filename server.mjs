import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const host = '127.0.0.1';
const port = 4173;
const root = resolve('.');

const mimeTypes = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.mjs': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.jpeg': 'image/jpeg',
	'.svg': 'image/svg+xml',
	'.webp': 'image/webp',
	'.glb': 'model/gltf-binary',
};

createServer((request, response) => {
	const url = new URL(request.url, `http://${request.headers.host}`);
	const relativePath = url.pathname === '/' ? 'index.html' : normalize(decodeURIComponent(url.pathname.slice(1)));
	const filePath = resolve(join(root, relativePath));

	if (!filePath.startsWith(root) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
		response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
		response.end('Not found');
		return;
	}

	response.writeHead(200, {
		'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream',
		'Cache-Control': 'no-store',
	});

	createReadStream(filePath).pipe(response);
}).listen(port, host, () => {
	console.log(`Skyline Pursuit is running at http://${host}:${port}`);
});
