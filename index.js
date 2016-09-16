'use strict';

const	querystring	= require('querystring'),
	formidable	= require('formidable'),
	token	= 'bf186b0a-ff34-44b2-9f62-496aa0d5e2c7',
	async	= require('async'),
	http	= require('http'),
	util	= require('util'),
	url	= require('url');

if (require.main === module) {
	runServer(process.argv[2]);
}

function runServer(port) {
	if (port === undefined) {
		port = 80;
	}

	http.createServer(function(req, res) {
		const	tasks = [];

		req.urlParsed	= url.parse(req.url);
		req.urlParsed.query	= querystring.parse(req.urlParsed.query);

		if (req.method.toLowerCase() === 'post') {
			tasks.push(function(cb) {
				const tasks	= [];

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

				tasks.push(function(cb) {
					req.postBody = '';

					req.on('data', function(chunk) {
						req.postBody += chunk.toString();
					});

					req.on('end', cb);
				});

				async.parallel(tasks, cb);
			});
		}

		tasks.push(function(cb) {
			if (req.urlParsed.pathname === '/general/login') {
				login(req, res);
			} else if (req.urlParsed.pathname === '/general/GetLastDataUpdate') {
				getLastDataUpdate(req, res);
			} else if (req.urlParsed.pathname === '/integrations/AddChannelTemplates') {
				addChannelTemplates(req, res);
			} else {
				res.writeHead(405, {'content-type': 'text/plain'});
				res.end('"Method Not Allowed"');

				//res.writeHead(404, {'content-type': 'application/json'});
				//res.end(JSON.stringify({'status': 'Not found!', 'urlParsed': req.urlParsed, 'postData': req.postData}));
			}

			cb();
		});

		async.series(tasks);
	}).listen(port);
}

function addChannelTemplates(req, res) {
	if (checkToken(req, res) === false) return;

	if (req.method.toLowerCase() !== 'post') {
		res.writeHead(405, {'content-type': 'text/plain'});
		res.end('"Method Not Allowed"');
		return;
	}

	if (req.urlParsed.query.ChannelId !== '505') {
		res.writeHead(400, {'content-type': 'text/plain'});
		res.end('In this mocking version of the Optimove API only ChannelId 505 is allowed. ' + req.urlParsed.query.ChannelId + ' given.');
		return;
	}

	try {
		req.postBodyJson = JSON.parse(req.postBody);
	} catch(err) {
		res.writeHead(400, {'content-type': 'text/plain'});
		res.end('Invalid POST body, is not valid JSON.');
		return;
	}

	if ( ! (req.postBodyJson instanceof Array) || req.postBodyJson.length > 100) {
		res.writeHead(400, {'content-type': 'text/plain'});
		res.end('Body must be a JSON array with maximum 100 entries');
		return;
	}

	for (let i = 0; req.postBodyJson[i] !== undefined; i ++) {
		const	templateId	= req.postBodyJson[i].TemplateId,
			templateName	= req.postBodyJson[i].TemplateName;

		if (templateId !== parseInt(templateId, 10)) {
			res.writeHead(400, {'content-type': 'text/plain'});
			res.end('Template IDs must be integers!');
			return;
		}

		if (typeof templateName !== 'string' || templateName === '') {
			res.writeHead(400, {'content-type': 'text/plain'});
			res.end('Template name must be a non empty string!');
			return;
		}
	}

	res.writeHead(200, {'content-type': 'application/json'});
	res.end('{"ResponseCode":200}');
}

function checkToken(req, res) {
	for (const key of Object.keys(req.headers)) {
		if (key.toLowerCase() === 'authorization-token' && req.headers[key] === token) {
			return true;
		}
	}

	res.writeHead(401, {'content-type': 'text/plain'});
	res.end('"Unauthorized"');

	return false;
}

function getLastDataUpdate(req, res) {
	if (req.method.toLowerCase() !== 'get') {
		res.writeHead(405, {'content-type': 'text/plain'});
		res.end('"Method Not Allowed"');
		return;
	}

	if (checkToken(req, res) === false) return;

	res.writeHead(200, {'content-type': 'application/json'});
	res.end('{"Date":"2015-08-13"}');
}

function login(req, res) {
	res.setHeader('Content-Type', 'application/json');

	if (req.postData === undefined || req.postData.username === undefined || req.postData.password === undefined) {
		res.statusCode = 400;
		res.end('"Bad Request"');
	} else if (req.postData === undefined || req.postData.username !== 'foo' || req.postData.password !== 'bar') {
		//res.statusCode = 403;
		//res.end('"Forbidden"');

		// According to the docs an invalid login is http 500...
		// That is very bad usage of the http codes, but the docs are clear
		// The only correct code here should be 403
		res.statusCode = 500;
		res.end('"Internal Server Error"');
	} else {
		res.statusCode = 200;
		res.end('"' + token + '"'); // NOTICE! This includes ":s that are NOT in the documentation, but exists in the live API
	}
}

function sendErr(req, res, err) {
	res.writeHead(500, {'content-type': 'text/plain'});
	res.end(util.inspect(err));
}

exports = module.exports = runServer;
