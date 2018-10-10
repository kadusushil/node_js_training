/*
 * The application demonstrates following.
 *      1. How to create and listen to server?
 *      2. How to handle multiple environments with configuration file?
 *      3. How to support HTTPS
 *      4. How to return JSON data instead of plain string
 *      5. How to handle multiple router
 */

var http = require('http');
var https = require('https');
var file  = require('fs');
var environment = require('./config');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
const os = require('os');
const cluster = require('cluster');

// init the servers
const init = () => {

  if (cluster.isMaster) {
    console.log(`Master ${process.pid} is running`);

    // Fork workers.
    for (let i = 0; i < os.cpus().length; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} died`);
    });
  } else {
      // Create HTTP server
      var httpServer = http.createServer(function(request, response) {
          handleRequest(request, response);
      });

      // Server can start listening now
      httpServer.listen(environment.httpPort, function() {
        console.log('Server listening on port: ' + environment.httpPort + " ENV "
                                                 + environment.envMode);
        console.log('Usage: /hello \nThis shall return generic message\n');
        console.log('Usage: /hello?name=<<your name>> \n' +
         'This shall return a special message only for you!\n');
         console.log('In case you are curious about my health, don\'t forget to /ping');
      });

      // create configuration for HTTPS
      var httpsCertificateConfig = {
        'key': file.readFileSync('./certs/key.pem'),
        'cert': file.readFileSync('./certs/cert.pem')
      };

      // create https Server
      var httpsServer = https.createServer(httpsCertificateConfig,
        function(request, response) {
          handleRequest(request, response);
        });

      // start listening https Server
      httpsServer.listen(environment.httpsPort, function() {
        console.log('Server listening on port: ' + environment.httpsPort + " ENV "
                                                 + environment.envMode);
      });
    }
};

// Init the server process
init();

/*
 * THis function handles all requests coming to server.
 */
var handleRequest = function(request, response) {

  console.log('---------------- Incoming Request -----------------');
  // parse route
  var parsedUrl = url.parse(request.url, true);
  var pathName = parsedUrl.pathname;
  var trimmedPath = pathName.replace(/^\/+|\/+$/g, '');

  // get method type
  var method = request.method.toLowerCase();

  // get query string
  var queryString = parsedUrl.query;

  // headers
  var headers = request.headers;

  var selectedHandler = typeof(routes[trimmedPath]) !== 'undefined'
                        ? routes[trimmedPath] : handlers.notDefined;

  var decoder = new StringDecoder('utf-8');
  var buffer = '';
  // read data in case it's POST request.
  request.on('data', function(data) {
    buffer += decoder.write(data);
  });

  request.on('end', function() {
      buffer += decoder.end();

      var data = {
        'method' : method,
        'queryString': queryString,
        'headers': headers,
        'payload': buffer,
        'path': trimmedPath
      };

      console.log('Request Details: ', data);

      selectedHandler(data, function(statusCode, responseData) {

          // check if we callback function returned statusCode
          statusCode = typeof(statusCode) == 'number' ? statusCode : 200;
          var responsePayload = typeof(responseData) == 'object' ?
                                          responseData : {};

          var payload = JSON.stringify(responsePayload);

          // Client expects JSON response, let's comfort them
          response.setHeader('Content-Type', 'application/json');
          response.writeHead(statusCode);
          response.end(payload +'\n');
          console.log('----------------- Requests Ends -------------------\n');
      });
  });
};

// Define handlers
var handlers = {};

// handles ping
handlers.ping = function(data, callback) {
  callback(200, {'message':'Server is alive, relax!'});
};

// handles 'hello' from client
handlers.hello = function(data, callback) {

  var queryString = data.queryString;
  var messageFor = typeof(queryString['name']) !== 'undefined' ?
                                        queryString['name'] :'stranger';

  var message = 'Hello, ' + messageFor + ', how are you!';

  callback(200, {'message':message});
};

// handles all routes except defined above
handlers.notDefined = function(data, callback) {
  callback(404);
};

// Define routes
var routes = {
  'ping': handlers.ping,
  'hello': handlers.hello
};
