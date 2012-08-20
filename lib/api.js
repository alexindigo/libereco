/*
 * Common methods for the API abstraction layers
 */

var oauth       = require('oauth').OAuth

  , queryString = require('querystring')

  , Defaults    =
    {
      version   : '1.0A',
      signature : 'HMAC-SHA1'
    }
  ;

module.exports = apiBase = function apiBase(){};

// sets provided data object
apiBase.prototype.set = function apiBaseSet(data)
{
  for (var key in data)
  {
    if (!data.hasOwnProperty(key)) continue;

    this.Data[key] = data[key];
  }
}

// Sends auth request to the api service,
// upon receiving verification token
// creates verification handler
// and pushes token to teh client
apiBase.prototype.authRequest = function apiBaseAuthRequest(callback)
{
  // cheatsheet: requestUrl, accessUrl, consumerKey, consumerSecret, version, authorize_callback, signatureMethod
  this.OA = new oauth
  (
    this.OAuth.request,
    this.OAuth.access,
    this.OAuth.key,
    this.OAuth.secret,
    this.OAuth.version || Defaults.version,
    'http://'+this.Data.callbackHost+this.OAuth.callback,
    this.OAuth.signature || Defaults.signature
  );

  // change header separator to make 500px work with it.
  this.OA._oauthParameterSeperator = ', ';

  // request token
  this.OA.getOAuthRequestToken(callback);
}


// Sends access token request
apiBase.prototype.getAccessToken = function apiBaseGetAccessToken(token, secret, verifier, callback)
{
    // get access token
    this.OA.getOAuthAccessToken(token, secret, verifier, function oauthAccessTokenHandler(err, access_token, access_secret, results)
    {
      if (err) return callback(err);

      // store access token and secret
      this.Data.access_token  = access_token;
      this.Data.access_secret = access_secret;
      this.Data.user          = results;

      callback(null, access_token, access_secret, results);
    }.bind(this));
}

apiBase.prototype.fetchPhotos = function apiBaseFetchPhotos(page, callback)
{
  // default to first page
  page = page || 1;

  if (!this.Data.user)
  {
    this.fetchUser(function(err, user)
    {
      if (err) return callback(err);

      this.getPhotos(page, callback);
    }.bind(this));
  }
  else
  {
    // everything is fine proceed right away
    this.getPhotos(page, callback);
  }
}

apiBase.prototype.fetchUser = function apiBaseFetchUser(callback)
{

  // TODO: Make it real fallback, just fail at this point
  if (!this.Data.access_token) return console.error(['Lost access token', this.OAuth]);

  this.getUser(callback);
}

/*
 * Tool functions
 */

apiBase.prototype.apiGet = function apiBaseApiGet(url, callback)
{
  this.OA.get(url, this.Data.access_token, this.Data.access_secret, callback);
}

apiBase.prototype.apiPost = function apiBaseApiPost(url, callback)
{
  this.OA.post(url, this.Data.access_token, this.Data.access_secret, null, 'application/json', callback);
}

apiBase.prototype.makeQueryString = function apiBaseMakeQueryString(params)
{
  return '?'+queryString.stringify(params);
}

// exposed signUrl method for some lower level (than usual) magic
apiBase.prototype.signParams = function apiBaseSignParams(baseUrl, params, method)
{
  var qs
    , signedUrl
    ;

  // create query string
  qs = this.makeQueryString(params);

  // sign base url with params
  signedUrl = this.OA.signUrl(baseUrl+qs, this.Data.access_token, this.Data.access_secret, method);

  return queryString.parse(signedUrl.split('?', 2)[1]);
}
