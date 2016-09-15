'use strict';

const	formidable	= require('formidable'),
	token	= 'bf186b0a-ff34-44b2-9f62-496aa0d5e2c7',
	async	= require('async'),
	http	= require('http'),
	util	= require('util'),
	url	= require('url');

let port = 80;

if (process.argv[2] !== undefined) {
	port = process.argv[2];
}

http.createServer(function(req, res) {
	const	tasks = [];

	req.urlParsed	= url.parse(req.url);

	if (req.method.toLowerCase() === 'post') {
		tasks.push(function(cb) {
			const	form	= new formidable.IncomingForm();

			form.parse(req, function(err, fields, files) {
				if (err) {
					sendErr(req, res, err);
					return;
				}

				req.postData	= fields;
				req.postFiles	= files;
				cb();
			});
		});
	}

	tasks.push(function(cb) {
		if (req.urlParsed.pathname === '/general/login') {
			login(req, res);
		} else {
			res.writeHead(404, {'Content-Type': 'application/json'});
			res.end(JSON.stringify({'status': 'Not found!', 'urlParsed': req.urlParsed, 'postData': req.postData}));
		}

		cb();
	});

	async.series(tasks);
}).listen(port);

function sendErr(req, res, err) {
	res.writeHead(500, {'content-type': 'text/plain'});
	res.end(util.inspect(err));
}

function login(req, res) {
	res.setHeader('Content-Type', 'application/json');

	if (req.postData.username !== 'foo' || req.postData.password !== 'bar') {
		res.statusCode = 401;
		res.end('"Unauthorized"');
	} else {
		res.statusCode = 200;
		res.end('"' + token + '"'); // NOTICE! This includes ":s that are NOT in the documentation, but exists in the live API
	}
}
