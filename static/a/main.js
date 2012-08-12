var socket = io.connect()

  // globals
  , authWindow = {}
  ;

// hack on ender
$.ender(
{
  // hack for now
  clone: function()
  {
    if (!this[0]) return false;
    return $(this[0].cloneNode(true)).removeAttr('id');
  }
}, true);


// common

socket.on('ready', function()
{
  // copy auth
  $('.panel').each(function(el)
  {
    $('#chest>.auth').clone().appendTo(el);
  });

  if ($('body').hasClass('loading'))
  {
    $('body').removeClass('loading');
  }
  else
  {
    window.location.reload();
  }
});

socket.on('auth:done', function(data)
{
  if (data.service && authWindow[data.service])
  {
    // remove buttons
    $('.auth_'+data.service).remove();
    // set loading label
    $('.service_'+data.service).empty().append('<span class="loading">Loading photos....</span>');
    authWindow[data.service].close();
  }
});


socket.on('auth:user', function(data)
{
  console.log(['user', data]);

  if (data.service && $('.service_'+data.service).length)
  {
    $('.service_'+data.service).attr('data-username', data.user.username);

    // special check for Flickr
    if (data.service == 'flickr' && !data.user.details.ispro)
    {
      $('#chest>.flickr_message_nopro').clone().prependTo('.service_'+data.service);
    }

    // special check for Flickr
    if (data.service == 'flickr')
    {
      $('#chest>.flickr_message_noupload').clone().prependTo('.service_'+data.service);
    }
  }
});


// flickr

$('body').on('.auth_flickr', 'click', function(e)
{
  socket.emit('auth:request', 'flickr', function(data)
  {
    // set service name
    $(e.target).parents('.panel').addClass('service_flickr');

    authWindow['flickr'] = window.open('http://www.flickr.com/services/oauth/authorize?oauth_token='+data.data.token, 'flickr_auth', 'width=500,height=700');
  });

});

socket.on('flickr:photos', function(data)
{
  var list = JSON.parse(data);

  $('.service_flickr>.loading').remove();
  $('.service_flickr').append('<div class="photos"/>');

  $.each(list.photos.photo, function(ph)
  {
    $('<img class="photo_'+ph.id+'" src="http://farm'+ph.farm+'.staticflickr.com/'+ph.server+'/'+ph.id+'_'+ph.secret+'_s.jpg" alt="'+ph.title+'">')
      .appendTo('.service_flickr>.photos')
      .data('photo', ph)
      ;

  });

});

// 500px

$('body').on('.auth_500px', 'click', function(e)
{
  socket.emit('auth:request', '500px', function(data)
  {
    // set service name
    $(e.target).parents('.panel').addClass('service_500px');

    authWindow['500px'] = window.open('https://api.500px.com/v1/oauth/authorize?oauth_token='+data.data.token, '500px_auth', 'width=500,height=700');
  });

});

socket.on('500px:photos', function(data)
{
  var list = JSON.parse(data);

  $('.service_500px>.loading').remove();
  $('.service_500px').append('<div class="photos"/>');

  $.each(list.photos, function(ph)
  {
    $('<img class="photo_'+ph.id+'" src="'+ph.image_url.replace(/4\.(jpg|png|gif)(\?.*)?$/, '1.jpg$2')+'" alt="'+ph.name+'">')
      .appendTo('.service_500px>.photos')
      .data('photo', ph)
      ;
  });

});

/* dragging */

function handleDragStart(e)
{
  $(this).addClass('touched');

  // show dropzone
  var parent = $(this).parents('.panel');

  if (parent.attr('id') == 'left')
  {
    $('#chest>.dropzone').clone().appendTo('#right');
  }
  else
  {
    $('#chest>.dropzone').clone().appendTo('#left');
  }

  e.dataTransfer.effectAllowed = 'copy';
  e.dataTransfer.setData('text/plain', JSON.stringify(
    {
      photo: $(this).data('photo'),
      from: (parent.hasClass('service_500px') ? '500px' : 'flickr')
    })
  );
}

function handleDragOver(e)
{
  if (e.preventDefault)
  {
    e.preventDefault();
  }

  e.dataTransfer.dropEffect = 'none';

  if (!$(this).parents('.panel').hasClass('service_flickr')
      && !$(this).parents('.panel').hasClass('service_500px'))
    return false;

  e.dataTransfer.dropEffect = 'copy';

  return false;
}

function handleDragEnter(e)
{
  $(this).addClass('over');
}

function handleDragLeave(e)
{
  $(this).removeClass('over');
}


function handleDrop(e)
{
  if (e.stopPropagation)
  {
    e.stopPropagation();
  }

  if (!$(this).hasClass('dropzone')) return false;

  var data = JSON.parse(e.dataTransfer.getData('text/plain'));

  socket.emit('upload:photo',
    {
      from: data.from,
      to: ($(this).parents('.panel').hasClass('service_500px') ? '500px' : 'flickr'),
      photo: data.photo
    },
    function(result)
    {
console.log(['uploaded', result]);
      $('.photo_'+data.photo.id).removeClass('uploading');
      // update id to new one
      $('.photo_'+data.photo.id).removeClass('photo_'+data.photo.id).addClass('photo_'+result.data.photo.id);
    }
  );

  // add to new panel as loading
  $('.photo_'+data.photo.id).clone().prependTo($(this).parents('.panel').find('.photos')).addClass('uploading');

  return false;
}

function handleDragEnd(e)
{
  $('.photos>img.touched').removeClass('touched');
  $('.panel>.dropzone').remove();
}


$('body').on('.photos>img', 'dragstart', handleDragStart);
$('body').on('.dropzone', 'dragenter', handleDragEnter);
$('body').on('.dropzone', 'dragover', handleDragOver);
$('body').on('.dropzone', 'dragleave', handleDragLeave);
$('body').on('.dropzone', 'drop', handleDrop);
$('body').on('.photos>img', 'dragend', handleDragEnd);




