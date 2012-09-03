/*
 * Flickr API abstraction layer
 */

var util        = require('util')
  , API         = require('./api')

  , request     = require('request')
  , formData    = require('form-data')
  , _           = require('valentine')

  , OAuth       =
    {
      request   : 'http://www.flickr.com/services/oauth/request_token',
      access    : 'http://www.flickr.com/services/oauth/access_token'
    }
  , basePoint   = 'http://api.flickr.com/services/rest'
  , uploadPoint = 'http://api.flickr.com/services/upload/'
  , endPoints   =
    {
      // TODO   : Explore this idea
      get_user  : function() {}
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
    user_id: this.Data.user.user_nsid
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
      return console.error('Cant parse flickr user data');
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

  // get photo geo data
  // TODO: Refactor it into something sane
  this.getPhotoGeo(id, function(err, geo)
  {
    if (err) return callback(err);

    if (geo.stat == 'ok')
    {
      geo = geo.photo.location;
    }
    else
    {
      geo = {};
    }

    this.apiGet(basePoint + queryString, function(err, data)
    {
      if (err) return callback(err);

      try
      {
        data = JSON.parse(data);
      }
      catch (e)
      {
        return console.error('Cant parse flickr photo data');
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
          location: {latitude: geo.latitude, longitude: geo.longitude, accuracy: geo.accuracy},
          tags: _.map(data.photo.tags.tag, function(tag){ return tag.raw; }),
          // TODO
          safety: data.photo.safety_level,
          license: data.photo.license,
          dates: data.photo.dates,
          exif: data.photo.exif
        }

        callback(null, info);
      }.bind(this));
    }.bind(this));

  }.bind(this));
}

apiFlickr.prototype.getPhotoGeo = function apiFlickrGetPhotoGeo(id, callback)
{
  var queryString = this.makeQueryString(
  {
    format: 'json',
    nojsoncallback: '1',
    method: 'flickr.photos.geo.getLocation',
    photo_id: id
  });

  this.apiGet(basePoint + queryString, function(err, geo)
  {
    if (err) return callback(err);

    try
    {
      geo = JSON.parse(geo);
    }
    catch (e)
    {
      return console.error('Cant parse flickr photo geo data');
    }

    callback(null, geo);
  });
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
      return console.error('Cant parse flickr photo sizes data');
    }

    callback(null, sizes.size);
  });
}

apiFlickr.prototype.uploadPhoto = function apiFlickrUploadPhoto(photo, callback)
{
  // get upload stats first
  this.getUploadStats(function(err, data)
  {
    if (err) return callback(err);

    // check bandwidth
    if (!data.ispro || !data.bandwidth.unlimited)
    {
      // now what?
      // { max: 2147483648,
      //   used: 0,
      //   maxbytes: 2147483648,
      //   usedbytes: 0,
      //   remainingbytes: 2147483648,
      //   maxkb: 2097152,
      //   usedkb: 0,
      //   remainingkb: 2097152,
      //   unlimited: 1 },
    }

    // check filesizes
    // but not now, don't know remote filesize yet

    this.upload(photo, photo.url, callback);

  }.bind(this));
}

// get upload limits
apiFlickr.prototype.getUploadStats = function apiFlickrGetUploadStats(callback)
{
  var queryString = this.makeQueryString(
  {
    format: 'json',
    nojsoncallback: '1',
    method: 'flickr.people.getUploadStatus'
  });

  this.apiGet(basePoint + queryString, function(err, stats)
  {
    if (err) return callback(err);

    try
    {
      stats = JSON.parse(stats);
    }
    catch (e)
    {
      return console.error('Cant parse flickr upload stats data');
    }

    if (stats.stat != 'ok') return callback(stats);

    callback(null, stats);
  });
}


apiFlickr.prototype.upload = function apiFlickrUpload(info, srcUrl, callback)
{
  var form   = new formData()
    , params =
      {
//        async: 1,
        title: info.title,
        description: info.description || ' ', // If description parameter provided and it's empty Flickr hangs
        is_public: info.private ? 0 : 1,
        safety_level: info.safety ? 1 : 3, // Set to 1 for Safe, 2 for Moderate, or 3 for Restricted.
        hidden: info.private ? 2 : 1, // Set to 1 to keep the photo in global search results, 2 to hide from public searches.
        content_type: 1 // Set to 1 for Photo, 2 for Screenshot, or 3 for Other.
      };

  // tags (optional)
  // A space-seperated list of tags to apply to the photo.

  // sign params
  params = this.signParams(uploadPoint, params, 'POST');

  // add parameters to the form
  for (var key in params)
  {
    if (!params.hasOwnProperty(key)) continue;
    form.append(key, params[key]);
  }

  // attach photo
  form.append('photo', request(srcUrl));

  // submit everything to flickr
  form.submit(uploadPoint, function(err, res)
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
      var match;

      console.log('end-Flickr', body);

      if (match = body.match(/<photoid>([0-9]+)<\/photoid>/))
      {
        // finally everything is good
        return callback(null, {message: 'Uploaded', photo: {id: match[1]} });
      }
      else if (match = body.match(/err code="([0-9]+)" msg="([^"]+)"/))
      {
        return callback({code: match[1], message: match[2] });
      }

      // <rsp stat="fail">
      //         <err code="5" msg="Filetype was not recognised" />
      // </rsp>

      return callback(body);

      // <?xml version="1.0" encoding="utf-8" ?>\n<rsp stat="ok">\n<photoid>7820437578</photoid>\n</rsp>\n'
      // <?xml version="1.0" encoding="utf-8" ?>\n<rsp stat="ok">\n<ticketid>2318123-72157631152563322</ticketid>\n</rsp>\n
    });

  });
}

