'use strict';

const	querystring	= require('querystring'),
	formidable	= require('formidable'),
	tokens	= {'foo': 'bf186b0a-ff34-44b2-9f62-496aa0d5e2c7', 'buz': '639e2d7d-6366-440f-92c1-a76128044bf7'},
	async	= require('async'),
	http	= require('http'),
	util	= require('util'),
	url	= require('url');

if (require.main === module) {
	runServer(process.argv[2]);
}

function getKeyByValue(obj, value) {
	for (const key of Object.keys(obj)) {
		if (obj[key] === value) {
			return key;
		}
	}

	return undefined;
}

function randomString(length, chars) {
	let	result	= '';

	for (let i = length; i > 0; -- i) {
		result += chars[Math.floor(Math.random() * chars.length)];
	}

	return result;
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
			} else if (req.urlParsed.pathname === '/actions/GetExecutedCampaignsByChannel') {
				getExecutedCampaignsByChannel(req, res);
			} else if (req.urlParsed.pathname === '/customers/GetCustomerSendDetailsByCampaign') {
				getCustomerSendDetailsByCampaign(req, res);
			} else if (req.urlParsed.pathname === '/customers/GetCustomerSendDetailsByChannel') {
				getCustomerSendDetailsByChannel(req, res);
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

	if (req.urlParsed.query.ChannelId === undefined) {
		res.writeHead(400, {'content-type': 'text/plain'});
		res.end('URL Parameter ChannelId is missing.');
		return;
	}

	if (req.urlParsed.query.ChannelId !== '505') {
		res.writeHead(400, {'content-type': 'text/plain'});
		res.end('In this mocking version of the Optimove API only ChannelId 505 is allowed. ' + req.urlParsed.query.ChannelId + ' given.');
		return;
	}

	// Via correspondence with Shachar Guz at Optimove, the content type must be application/json. This is undocumented
	if (req.headers['content-type'] !== 'application/json') {
		res.writeHead(400, {'content-type': 'text/plain'});
		res.end('Invalid content-type given. Expected "application/json", but received: "' + req.headers['content-type'] + '"');
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
		if (key.toLowerCase() === 'authorization-token' && getKeyByValue(tokens, req.headers[key]) !== undefined) {
			return true;
		}
	}

	res.writeHead(401, {'content-type': 'text/plain'});
	res.end('"Unauthorized"');

	return false;
}

function getCustomerSendDetailsByCampaign(req, res) {
	const	response	= [
				{
					'CustomerID':	'231342',
					'ChannelID':	505,
					'ScheduledTime':	'2015-12-30 10:30:00',
					'SendID':	'HG65D'
				},
				{
					'CustomerID':	'917251',
					'ChannelID':	505,
					'ScheduledTime':	'2015-12-30 11:45:00',
					'SendID':	'HG65E'
				}
			];

	let	includeTemplateIDs = false;

	if (checkToken(req, res) === false) return;

	if (req.method.toLowerCase() !== 'get') {
		res.writeHead(405, {'content-type': 'text/plain'});
		res.end('"Method Not Allowed"');
		return;
	}

	if (req.urlParsed.query.CampaignID === undefined) {
		res.writeHead(400, {'content-type': 'text/plain'});
		res.end('URL Parameter CampaignID is missing.');
		return;
	}

	if (req.urlParsed.query.IncludeTemplateIDs.toLowerCase() === 'true') {
		includeTemplateIDs = true;
	}

	res.writeHead(200, {'content-type': 'application/json'});
	if (includeTemplateIDs) {
		response[0].TemplateId = 12;
		response[1].TemplateId = 7;
	}

	res.end(JSON.stringify(response));
}

function getCustomerSendDetailsByChannel(req, res) {
	const	result	= 	[
					{
						'CustomerID':	'96134',
						'TemplateID':	14,
						'ScheduledTime':	'2016-08-30 10:00:00'
					},
					{
						'CustomerID':	'13482',
						'TemplateID':	14,
						'ScheduledTime':	'2016-08-30 10:00:00'
					}
				];

	let	attributeDelimiter	= ',',
		attributeNames;

	if (req.method.toLowerCase() !== 'get') {
		res.writeHead(405, {'content-type': 'text/plain'});
		res.end('"Method Not Allowed"');
		return;
	}

	if (req.urlParsed.query.CampaignID === undefined) {
		res.writeHead(400, {'content-type': 'text/plain'});
		res.end('URL Parameter CampaignID is missing.');
		return;
	}

	if (req.urlParsed.query.ChannelID === undefined) {
		res.writeHead(400, {'content-type': 'text/plain'});
		res.end('URL Parameter ChannelID is missing.');
		return;
	}

	if (req.urlParsed.query.CustomerAttributesDelimiter !== undefined && req.urlParsed.query.CustomerAttributesDelimiter !== '') {
		attributeDelimiter = req.urlParsed.query.CustomerAttributesDelimiter;
	}

	if (req.urlParsed.query.CustomerAttributes !== undefined) {
		attributeNames	= req.urlParsed.query.CustomerAttributes.split(';');

		for (let i = 0; result[i] !== undefined; i ++) {
			const	thisResult = result[i],
				attributes	= [];

			for (let i = 0; attributeNames[i] !== undefined; i ++) {
				if (attributeNames[i] === 'PhoneNumber') {
					attributes.push(Math.floor(Math.random() * 999999999));
				} else {
					attributes.push(randomString(Math.floor(Math.random() * 20), '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ .!?'));
				}
			}

			thisResult.CustomerAttributes = attributes.join(attributeDelimiter);
		}
	}

	res.writeHead(200, {'content-type': 'application/json'});
	res.end(JSON.stringify(result));
}

function getExecutedCampaignsByChannel(req, res) {
	if (checkToken(req, res) === false) return;

	if (req.method.toLowerCase() !== 'get') {
		res.writeHead(405, {'content-type': 'text/plain'});
		res.end('"Method Not Allowed"');
		return;
	}

	if (req.urlParsed.query.ChannelId === undefined) {
		res.writeHead(400, {'content-type': 'text/plain'});
		res.end('URL Parameter ChannelId is missing.');
		return;
	}

	if (req.urlParsed.query.ChannelId !== '505') {
		res.writeHead(400, {'content-type': 'text/plain'});
		res.end('In this mocking version of the Optimove API only ChannelId 505 is allowed. ' + req.urlParsed.query.ChannelId + ' given.');
		return;
	}

	if (req.urlParsed.query.Date === undefined) {
		res.writeHead(400, {'content-type': 'text/plain'});
		res.end('URL Parameter Date is missing.');
		return;
	}

	if ( ! req.urlParsed.query.Date.match(/[0-9]{4}-[0-9]{2}-[0-9]{2}/)) {
		res.writeHead(400, {'content-type': 'text/plain'});
		res.end('Invalid Date parameter, must be YYYY-MM-DD.');
		return;
	}

	res.writeHead(200, {'content-type': 'application/json'});

	if (getKeyByValue(tokens, req.headers['authorization-token']) === 'foo') {
		res.end('[{"CampaignID":12, "CampaignID":16, "CampaignID":17, "CampaignID":19}]');
		// Notice the fucked up JSON with multiple identical keys... This is cut and pasted from the v3.0 documentation
	} else if (getKeyByValue(tokens, req.headers['authorization-token']) === 'buz') {
		res.end('[]');
	} else {
		res.end('MMmaDddness1!11! :O :O :O');
	}
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
	} else if (req.postData !== undefined && req.postData.username === 'foo' && req.postData.password === 'bar') {
		res.statusCode = 200;
		res.end('"' + tokens.foo + '"'); // NOTICE! This includes ":s that are NOT in the documentation, but exists in the live API
	} else if (req.postData !== undefined && req.postData.username === 'buz' && req.postData.password === 'lightyear') {
		res.statusCode = 200;
		res.end('"' + tokens.buz + '"'); // NOTICE! This includes ":s that are NOT in the documentation, but exists in the live API
	} else {
		//res.statusCode = 401;
		//res.end('"Unauthorized"');

		// According to the docs an invalid login is http 500...
		// That is very bad usage of the http codes, but the docs are clear
		// The only correct code here should be 401
		res.statusCode = 500;
		res.end('"Internal Server Error"');
	}
}

function sendErr(req, res, err) {
	res.writeHead(500, {'content-type': 'text/plain'});
	res.end(util.inspect(err));
}

exports = module.exports = runServer;
