/*
 * Flickr API abstraction layer
 */

var util      = require('util')
  , API       = require('./api')
  , OAuth     =
    {
      request : 'http://www.flickr.com/services/oauth/request_token',
      access  : 'http://www.flickr.com/services/oauth/access_token'
    }
  , basePoint = 'http://api.flickr.com/services/rest'
  , endPoints =
    {
      // TODO : Explore this idea
      get_user: function() {}
    }
  ;

function apiFlickr()
{
  // data storage
  this.Data = {};
  this.OAuth = OAuth;
}
util.inherits(apiFlickr, API);

// export
module.exports = apiFlickr;

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

apiFlickr.prototype.getUser = function apiFlickrGetUser(callback)
{
  var queryString = this.makeQueryString(
  {
    format: 'json',
    nojsoncallback: '1',
    method: 'flickr.people.getInfo',
    user_id: this.OAuth.user.user_nsid
  });

  this.apiGet(basePoint + queryString, function(err, data)
  {
    if (err) return callback(err);

    try
    {
      data = JSON.parse(data);
    }
    catch (e)
    {
      return console.log('Cant parse flickr user data');
    }

    // update user info
    this.Data.user =
    {
      id: data.person.nsid,
      username: data.person.username._content,
      details: data.person
    };

    callback(null, this.Data.user);
  }.bind(this));
}

apiFlickr.prototype.getPhotos = function apiFlickrGetPhotos(page, callback)
{
  var queryString = this.makeQueryString(
  {
    format: 'json',
    nojsoncallback: '1',
    method: 'flickr.photos.search',
    user_id: this.Data.user.id,
    per_page: 100,
    page: page
  });

  this.apiGet(basePoint + queryString, callback);
}

apiFlickr.prototype.getPhotoInfo = function apiFlickrGetPhotoInfo(id, callback)
{
  var queryString = this.makeQueryString(
  {
    format: 'json',
    nojsoncallback: '1',
    method: 'flickr.photos.getInfo',
    photo_id: id
  });

  this.apiGet(basePoint + queryString, function(err, data)
  {
    if (err) return callback(err);

    try
    {
      data = JSON.parse(data);
    }
    catch (e)
    {
      return console.log('Cant parse flickr photo data');
    }

    if (data.stat != 'ok') return callback(data);

    // get photo url
    this.getPhotoUrl(data.photo, function(err, url)
    {
      var info;

      if (err) return callback(err);

      // normalize data
      info =
      {
        id: data.photo.id,
        title: data.photo.title._content,
        description: data.photo.description._content,
        private: !data.photo.visibility.ispublic,
        url: url,
        // TODO
        tags: data.photo.tags,
        safety: data.photo.safety_level,
        license: data.photo.license,
        dates: data.photo.dates,
        exif: data.photo.exif
      }

      callback(null, info);
    }.bind(this));
  }.bind(this));
}

// generates url based on the photo's id (goes for original size or largest available)
apiFlickr.prototype.getPhotoUrl = function apiFlickrGetPhotoUrl(info, callback)
{

  // get original photo for the Pro users
  if (this.Data.user.details.ispro)
  {
    callback(null, 'http://farm'+info.farm+'.staticflickr.com/'+info.server+'/'+info.id+'_'+info.originalsecret+'_o.'+info.originalformat);
  }
  // and largest available for free accounts
  else
  {
    this.getPhotoSizes(info.id, function(err, sizes)
    {
      if (err) return callback(err);

      callback(null, sizes[sizes.length-1].source);
    });
  }
}

apiFlickr.prototype.getPhotoSizes = function apiFlickrGetPhotoSizes(id, callback)
{
  var queryString = this.makeQueryString(
  {
    format: 'json',
    nojsoncallback: '1',
    method: 'flickr.photos.getSizes',
    photo_id: id
  });

  this.apiGet(basePoint + queryString, function(err, sizes)
  {
    if (err) return callback(err);

    try
    {
      sizes = JSON.parse(sizes).sizes;
    }
    catch (e)
    {
      return console.log('Cant parse flickr photo sizes data');
    }

    callback(null, sizes.size);
  });
}

apiFlickr.prototype.uploadPhoto = function apiFlickrUploadPhoto(photo, callback)
{

}

