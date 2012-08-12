#!/usr/bin/env node

var path           = require('path')
  , util           = require('util')

  , async          = require('async')
  , app            = require('tako')() // it uses socket.io internaly

  // apis
  , APIs           =
    {
      '500px'      : require('./lib/api_500px'),
      'flickr'     : require('./lib/api_flickr')
    }

  // globals
  , oauthPool      = {}

  // settings
  , Config         =
    {
      port         : 8000,
      path         : 'static',
      oauthCallback: '/oauth/callback'
    }
  ;

// {{{ prepare environment

// process config settings
Config.host = process.env.npm_package_config_host;

Config.port = process.env.npm_package_config_port || Config.port;

Config.path = process.env.npm_package_config_path || Config.path;
if (Config.path[0] != '/') Config.path = path.join(__dirname, Config.path);

Config.index = path.join(Config.path, process.env.npm_package_config_index || 'index.html');

// check APIs
for (var service in APIs)
{
  if (!APIs.hasOwnProperty(service)) continue;

  // check that we have both api key and secret for each service
  if (process.env['npm_package_config_api_'+service+'_key'] && process.env['npm_package_config_api_'+service+'_secret'])
  {
    APIs[service].oauth(
    {
      key      : process.env['npm_package_config_api_'+service+'_key'],
      secret   : process.env['npm_package_config_api_'+service+'_secret'],
      callback : Config.oauthCallback
    });
  }
  else
  {
    delete APIs[service];
  }
}

// it makes sense to work with at least two services
if (Object.keys(APIs).length < 2)
{
  console.error('Error: Please enable at least two api services.');
  process.exit(0);
}

// socket.io settings
app.socketioManager.set('log level', 1);
app.socketioManager.set('transports', ['websocket']);
app.socketioManager.set('heartbeat interval', 20);
app.socketioManager.set('heartbeat timeout', 60);

// }}}

// {{{ define routing

// oauth callback
app.route(Config.oauthCallback, function appRouteOauthCallback(req, res)
{
  var token    = req.qs.oauth_token
    , verifier = req.qs.oauth_verifier;

  if (typeof oauthPool[token] == 'function')
  {
    oauthPool[token](verifier);
  }

  res.end('Thank you.');
});

// static files + landing page
app.route('/').files(Config.index);
app.route('*').files(Config.path);

// sockets
app.sockets.on('connection', function socketsConnection(socket)
{
  // let's party
  socket.emit('ready');

  // {{{ service auth
  // TODO: Maybe make it as handler for situations when access token is missing
  socket.on('auth:request', function socketAuthRequestHandler(service, callback)
  {
    if (!(service in APIs)) return callback({status: 'error', message: 'Requested service ['+service+'] is not enabled.'});

    // create api instance
    var api = new APIs[service]();

    // set current host
    // TODO: Make it sane
    api.set({callbackHost: Config.host || socket.manager.handshaken[Object.keys(socket.manager.handshaken)[0]].headers.host });

    // and store it in the socket
    socket.set('api_'+service, api, function socketStoreApi()
    {
      // request auth token
      api.authRequest(function apiAuthRequest(err, token, secret, results)
      {
        if (err) return callback({status: 'error', message: 'Unable to authenticate with the requested service ['+service+']'});

        // wait for the callback
        createOAuthVerifier(socket, service, token, secret);

        callback({ status: 'ok', data: {token: token, secret: secret, results: results} });
      });

    });

  });
  // }}}

  // {{{ upload photo
  socket.on('upload:photo', function socketUploadPhotoHandler(data, callback)
  {

    // get two (from & to) apis
    async.parallel(
    {
      from: function socketUploadPhotoGetApiFrom(cb)
      {
        socket.get('api_'+data.from, cb);
      },
      to: function socketUploadPhotoGetApiTo(cb)
      {
        socket.get('api_'+data.to, cb);
      }
    },
    function socketUploadPhotoGetApiResult(err, apis)
    {
      // get photo info to upload
      apis.from.getPhotoInfo(data.photo.id, function(err, photo)
      {
        if (err) return callback({status: 'error', message: err});

        // upload photo to the destination api
        // TODO: Streams would play here better,
        // but wait for them to be stable
        apis.to.uploadPhoto(photo, function(err, result)
        {
          if (err) return callback({status: 'error', message: err});

          callback({status: 'ok', data: result});
        });
      });

    });

  });
  // }}}

});

// }}}

// {{{ start server

app.httpServer.listen(Config.port, Config.host);

// }}}

/*
 * subroutines
 */

// creates oauth verification handler,
// upon receiving callback from the api
// requests access token
function createOAuthVerifier(socket, service, token, secret)
{
  oauthPool[token] = function oauthVerificationCallbackHandler(verifier)
  {
    socket.get('api_'+service, function(err, api)
    {
      if (err) return console.error(['Cannot store access data ['+service+'] in the socket', err]);

      // get Access Token from the API
      api.getAccessToken(token, secret, verifier, function oauthAccessTokenHandler(err, access_token, access_secret, results)
      {
        if (err) return console.error(['Cannot get access token for '+service, err]);

        // notify client
        socket.emit('auth:done', {service: service, results: results});

        // fetch photos
        api.fetchPhotos(function(err, data)
        {
          if (err) return console.log(['Cant get photos from '+service, err]);

          // TODO: Make it less coupled
          socket.emit('auth:user', {service: service, user: api.Data.user});

          // return list of photos
          socket.emit(service+':photos', data);

        });
      });

    });

    // we done here, clean up
    delete oauthPool[token];
  };
}

