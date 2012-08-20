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
  , activeClients  = 0
  , oauthPool      = {}

  // settings
  , Config         =
    {
      port         : 8000,
      path         : 'static',
      index        : 'index.html',
      oauthCallback: '/oauth/callback'
    }
  ;

// {{{ prepare environment

// process config settings
Config.host = process.env.IP || process.env.host || process.env.npm_package_config_host;

Config.port = process.env.PORT || process.env.port || process.env.npm_package_config_port || Config.port;

Config.path = process.env.path || process.env.npm_package_config_path || Config.path;
if (Config.path[0] != '/') Config.path = path.join(__dirname, Config.path);

Config.index = process.env.index || process.env.npm_package_config_index || Config.index;
if (Config.index[0] != '/') Config.index = path.join(Config.path, Config.index);

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

  res.end('<script>window.close();</script>');
});

// static files + landing page
app.route('/').files(Config.index);
app.route('*').files(Config.path);

// sockets
app.sockets.on('connection', function socketsConnection(socket)
{
  // let's party
  socket.emit('ready');

  activeClients++;

  var browser = (socket.manager.handshaken[socket.id].headers['user-agent'].match(/(Chrome|Safari|Firefox|MSIE)(\/| )[0-9]+(\.[0-9]+)?/) || [socket.manager.handshaken[socket.id].headers['user-agent']])[0];

  console.log(['connected', browser, socket.id, activeClients]);

  socket.browser = browser;

  // {{{ disconnect
  socket.on('disconnect', function()
  {
    activeClients--;
    console.log(['left', browser, socket.id, activeClients]);
  });
  // }}}

  // {{{ service auth
  // TODO: Maybe make it as handler for situations when access token is missing
  socket.on('auth:request', function socketAuthRequestHandler(service, callback)
  {
    if (!(service in APIs)) return callback({status: 'error', message: 'Requested service ['+service+'] is not enabled.'});

    // create api instance
    var api = new APIs[service]();

    // set current host
    // TODO: Make it sane
    api.set({callbackHost: Config.host || socket.manager.handshaken[socket.id].headers.host });

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

  // {{{ fetch photos
  socket.on('photos:fetch', function socketPhotosFetchHandler(service, page)
  {
    socket.get('api_'+service, function(err, api)
    {
      if (err) return console.error(['Unable to find API ['+service+'] data', err]);

      // fetch photos
      api.fetchPhotos(page, function(err, data)
      {
        if (err) return console.error(['Cant get photos from '+service, err]);

        // return list of photos
        socket.emit('photos:add', service, {page: page, photos: data});
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

console.log('Listening on '+Config.host+':'+Config.port);

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
      if (err || !api) return console.error(['Cannot store access data ['+service+'] in the socket', (err ? err : 'api is null'), api]);

      // get Access Token from the API
      api.getAccessToken(token, secret, verifier, function oauthAccessTokenHandler(err, access_token, access_secret, results)
      {
        if (err) return console.error(['Cannot get access token for '+service, err]);

        api.fetchUser(function(err, user)
        {
          if (err) return console.error(['Cannot get user data for '+service, err]);

          socket.emit('auth:user', {service: service, user: api.Data.user});
        });
      });

    });

    // we done here, clean up
    delete oauthPool[token];
  };
}

