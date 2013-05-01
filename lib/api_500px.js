/*
 * 500px API abstraction layer
 */

var util      = require('util')
  , API       = require('./api')

  , request   = require('request')
  , formData  = require('form-data')

  , OAuth     =
    {
      request : 'https://api.500px.com/v1/oauth/request_token',
      access  : 'https://api.500px.com/v1/oauth/access_token'
    }
  , basePoint = 'https://api.500px.com/v1/'
  , endPoints =
    {
      user    : basePoint + 'users',
      photos  : basePoint + 'photos',
      upload  : basePoint + 'upload'
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

api500px.prototype.getPhotoUrl = function api500pxGetPhotoUrl(info, callback)
{
  // just to have similar to flickr (and maybe others) api abstraction
  callback(null, info.image_url);
}

api500px.prototype.getPhotoInfo = function api500pxGetPhotoInfo(id, callback)
{
  var queryString = this.makeQueryString(
  {
    image_size: 4,
    tags: 1
  });

  this.apiGet(endPoints.photos+'/'+id+queryString, function(err, data)
  {
    if (err) return callback(err);

    try
    {
      data = JSON.parse(data);
    }
    catch (e)
    {
      return console.error('Cant parse 500px photo info data');
    }

    // get photo url
    this.getPhotoUrl(data.photo, function(err, url)
    {
      var info;

      if (err) return callback(err);

      // normalize data
      info =
      {
        id: data.photo.id,
        title: data.photo.name,
        description: data.photo.description,
        private: data.photo.privacy,
        url: url,
        // TODO
        tags: null,
        safety: !data.photo.nsfw,
        license: null,
        dates: data.photo.taken_at,
        // exif: data.photo.shutter_speed,
        latitude: data.photo.latitude,
        longitude: data.photo.longitude
      }

      callback(null, info);
    }.bind(this));
  }.bind(this));
}

api500px.prototype.uploadPhoto = function api500pxUploadPhoto(photo, callback)
{

  var params =
  {
    name: photo.title,
    description: photo.description,
    category: 0,
    privacy: photo.private
  };

  // add geo data
  if (photo.location.latitude)
  {
    params.latitude  = photo.location.latitude;
    params.longitude = photo.location.longitude;
  }

  this.apiPost(endPoints.photos+this.makeQueryString(params), function(err, data)
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

    this.upload(data, photo.url, function(err, response)
    {
      if (err) return callback(err);

      callback(null, response);

      // add tags
      if (photo.tags.length)
      {
        // Their service is so awesome, so we need to awe and wait. Full second!
        // otherwise you'd get "Photo with id <id> has been deleted." error.
        setTimeout(function()
        {
          this.addTags(data.photo.id, photo.tags, function(err, tags)
          {
            // don't break, photo's already uploaded
            if (err) console.log(['Error', 'Could not add tags to 500px', err]);

            // everything is fine
          });
       }.bind(this), 20000);

      }

    }.bind(this));

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
      if (process.env['NODE_ENV'] != 'production')
      {
        console.log('end-500', body);
      }

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


api500px.prototype.addTags = function api500pxAddTags(id, tags, callback)
{

  if (!tags.length) return callback(null, {status: 200, message: 'No tags to add', error: 'None'});

  var params =
  {
    tags: tags.join(',')
  };

  this.apiPost(endPoints.photos+'/'+id+'/tags', params, function(err, data)
  {
    if (err) return callback(err);

    try
    {
      data = JSON.parse(data);
    }
    catch (e)
    {
      return console.error('Cant parse 500px add tags response');
    }

    callback(null, data);
  }.bind(this));
}
