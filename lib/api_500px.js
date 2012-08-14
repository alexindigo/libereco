/*
 * 500px API abstraction layer
 */

var util        = require('util')
  , API         = require('./api')

  , request        = require('request')
  , formData       = require('form-data')

  , OAuth       =
    {
      request   : 'https://api.500px.com/v1/oauth/request_token',
      access    : 'https://api.500px.com/v1/oauth/access_token'
    }
  , basePoint   = 'https://api.500px.com/v1/'
  , endPoints   =
    {
      user  : basePoint + 'users',
      photos: basePoint + 'photos',
      upload: basePoint + 'upload'
    }
  ;

function api500px()
{
  // data storage
  this.Data = {};
  this.OAuth = OAuth;
}
util.inherits(api500px, API);

// export
module.exports = api500px;

// sets oauth settings
module.exports.oauth = function(data)
{
  for (var key in data)
  {
    if (!data.hasOwnProperty(key)) continue;

    OAuth[key] = data[key];
  }
};


// service specific methods

api500px.prototype.getUser = function api500pxGetUser(callback)
{
  this.apiGet(endPoints.user, function(err, data)
  {
    if (err) return callback(err);

    try
    {
      data = JSON.parse(data);
    }
    catch (e)
    {
      return console.error('Cant parse 500px user data');
    }

    // update user info
    this.Data.user =
    {
      id: data.user.id,
      username: data.user.username,
      details: data.user
    };

    callback(null, this.Data.user);
  }.bind(this));
}

api500px.prototype.getPhotos = function api500pxGetPhotos(page, callback)
{
  var queryString = this.makeQueryString(
  {
    feature: 'user',
    user_id: this.Data.user.id,
    rpp: 100,
    page: page,
    image_size: 4
  });

  this.apiGet(endPoints.photos+queryString, callback);
}

api500px.prototype.getPhotoUrl = function api500pxGetPhotoUrl(id, callback)
{
}

api500px.prototype.getPhotoInfo = function api500pxGetPhotoInfo(id, callback)
{

}

api500px.prototype.uploadPhoto = function api500pxUploadPhoto(photo, callback)
{
  var queryString = this.makeQueryString(
  {
    name: photo.title,
    description: photo.description,
    category: 0,
    privacy: photo.private
  });

  this.apiPost(endPoints.photos+queryString, function(err, data)
  {
    var photoUrl;

    if (err) return callback(err);

    try
    {
      data = JSON.parse(data);
    }
    catch (e)
    {
      return console.error('Cant parse 500px upload photo data');
    }

    this.upload(data, photo.url, callback)
  }.bind(this));
}

api500px.prototype.upload = function api500pxUpload(info, srcUrl, callback)
{
  var form = new formData();

  form.append('photo_id', ''+info.photo.id);
  form.append('consumer_key', this.OAuth.key);
  form.append('access_key', this.Data.access_token);
  form.append('upload_key', info.upload_key);
  form.append('file', request(srcUrl));

  form.submit(endPoints.upload, function(err, res)
  {
    var body = '';

    if (err) return callback(err);

    res.setEncoding('utf8');

    res.on('data', function(data)
    {
      body += data;
    });
    res.on('end', function()
    {
      console.log('end-500', body);

      try
      {
        body = JSON.parse(body);
      }
      catch (e)
      {
        callback(e);
        return console.error(['Cant parse 500px upload photo data', e, body]);
      }

      // serious check
      if (body.error != 'None.') return callback(body.status);

      // finally everything is good
      callback(null, {message: body.status, photo: info.photo});
    });

  });
}
