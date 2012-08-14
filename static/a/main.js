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

socket.on('auth:user', function(data)
{
  console.log(['user', data]);

  if (!data.service) return console.log(['Something wrong with service auth', data]);

  if (authWindow[data.service])
  {
    // remove buttons
    $('.auth_'+data.service).remove();
    //authWindow[data.service].close();

    // start loading photos (first page)
    socket.emit('photos:fetch', data.service, 1);
    $('.service_'+data.service).empty().append('<span class="loading">Loading photos....</span>');
  }

  if ($('.service_'+data.service).length)
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

// Add more photos
socket.on('photos:add', function(service, data)
{
  var list = JSON.parse(data.photos)
    , panel = $('.service_'+service)
    ;

  $('.loading', panel).remove();
  // reset for the first page
  if (data.page == 1)
  {
    $('.photos', panel).remove();
    panel.append('<div class="photos"/>');

    // add scroller event listener
    panel.on('scroll', function(e)
    {
      var scrollTop = panel.scrollTop()
        , panelHeight
        , photosOffset
        ;

      if (Math.abs((panel.data('scrollTop') || 0) - scrollTop) > 20)
      {
        var currentPage = panel.data('page');

        // if no current page defined, no auto loading
        if (!currentPage) return;

        // save last scroll
        panel.data('scrollTop', scrollTop);

        panelHeight  = panel.dim().height;
        photosOffset = $('.photos', panel).offset();

        // calculate teh difference
        if (photosOffset.height + photosOffset.top < panelHeight + 20)
        {
          // prevent other loaders
           panel.data('page', null);

          // load more photos
          socket.emit('photos:fetch', service, currentPage+1);
        }
      }
    });
  }

console.log(['photos', service, list]);

  // TODO: normalize it
  if (service == '500px')
  {
    // save current page number if there is something yet to load
    if (list.total_pages > data.page)
    {
      panel.data('page', data.page);
    }

    $.each(list.photos, function(ph)
    {
      $('<img class="photo_'+ph.id+'" src="'+ph.image_url.replace(/4\.(jpg|png|gif)(\?.*)?$/, '1.jpg$2')+'" alt="'+ph.name+'">')
        .appendTo('.service_500px>.photos')
        .data('photo', ph)
        ;
    });

    // update counters
    panel.attr('data-photos-total', list.total_items);
    panel.attr('data-photos-loaded', $('.photos>img', panel).length);

  }
  else
  {
    // save current page number if there is something yet to load
    if (list.photos.pages > data.page)
    {
      panel.data('page', data.page);
    }

    $.each(list.photos.photo, function(ph)
    {
      $('<img class="photo_'+ph.id+'" src="http://farm'+ph.farm+'.staticflickr.com/'+ph.server+'/'+ph.id+'_'+ph.secret+'_s.jpg" alt="'+ph.title+'">')
        .appendTo('.service_flickr>.photos')
        .data('photo', ph)
        ;
    });

    // update counters
    panel.attr('data-photos-total', list.photos.total);
    panel.attr('data-photos-loaded', $('.photos>img', panel).length);
  }

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
    $('#right').addClass('drop_target');
  }
  else
  {
    $('#chest>.dropzone').clone().appendTo('#left');
    $('#left').addClass('drop_target');
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
  if (e.stopPropagation) e.stopPropagation();
  if (e.preventDefault) e.preventDefault();

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
      var photo = $('.photo_'+data.photo.id)
        , panel = photo.parents('.panel');

console.log(['uploaded', result]);

      // mark as uploaded
      photo.removeClass('uploading');

      // update counter
      panel.attr('data-photos-loaded', $('.photos>img', panel).length);

      // update id to new one
      photo.removeClass('photo_'+data.photo.id).addClass('photo_'+result.data.photo.id);
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
  $('.panel').removeClass('drop_target');
}


$('body').on('.photos>img', 'dragstart', handleDragStart);
$('body').on('.dropzone', 'dragenter', handleDragEnter);
$('body').on('.dropzone', 'dragover', handleDragOver);
$('body').on('.dropzone', 'dragleave', handleDragLeave);
$('body').on('.dropzone', 'drop', handleDrop);
$('body').on('.photos>img', 'dragend', handleDragEnd);




