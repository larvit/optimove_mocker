'use strict';

const	http	= require('http'),
	url	= require('url');

let port = 80;

if (process.argv[2] !== undefined) {
	port = process.argv[2];
}

http.createServer(function(req, res) {
	const	urlParsed	= url.parse(req.url);

	if (urlParsed.pathname === '/general/login') {
		res.end(JSON.stringify(urlParsed));
	} else {
		res.writeHead(404, {'Content-Type': 'text/plain'});
		res.end('Not found');
	}
}).listen(port);
