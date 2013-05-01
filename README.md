#Libereco

*Liberate your photos from the hosting platforms lockin*

A node.js server which allows you to migrate your photos between [Flickr](http://www.flickr.com/) and [500px](http://www.500px.com/) as easy as drag-n-drop.

## Demo

Try it for yourself: [http://libere.co/](http://libere.co/)

## Installation

```
npm install libereco
```

## Usage

Could be deployed to [https://www.nodejitsu.com/](nodejitsu.com) out of the box:
```
cd node_modules/libereco/
jitsu env set api_500px_key <500px consumer key>
jitsu env set api_500px_secret <500px consumer secret>
jitsu env set api_flickr_key <flickr api key>
jitsu env set api_flickr_secret <flickr api secret>
jitsu deploy
```

Read below for more details.

### Add API services (required)

*You need at least two services enabled for application to work.*

* 500px *([request API key](http://500px.com/settings/applications?from=developers))*:

Environment variables:
```
export api_500px_key <500px consumer key>
export api_500px_secret <500px consumer secret>
```

Or npm config:
```
npm config set libereco:api_500px_key <500px consumer key>
npm config set libereco:api_500px_secret <500px consumer secret>
```

* Flickr  *([request API key](http://www.flickr.com/services/apps/create/apply/))*:

Environment variables:
```
export api_flickr_key <flickr api key>
export api_flickr_secret <flickr api secret>
```

Or npm config:
```
npm config set libereco:api_flickr_key <flickr api key>
npm config set libereco:api_flickr_secret <flickr api secret>
```

### Customize HTTP server (optional)

* Hostname *(Defaults to OS assigned hostname)*:

Environment variables:
```
export host libereco.yourapp.com
```

Or npm config:
```
npm config set libereco:host libereco.yourapp.com
```

* Port *(Defaults to port ```8000```)*:

Environment variables:
```
export port 1337
```

Or npm config:
```
npm config set libereco:port 1337
```

* Path for static files (*Defaults to ```static```*):

*Useful for customizing UI of the app and keeping `npm update` functionality*

Environment variables:
```
export path /var/www/custom_root
```

Or npm config:
```
npm config set libereco:path /var/www/custom_root
```

* Index file (*Defaults to ```index.html```*):

*For example temporally switching to the maintenance page*

Environment variables:
```
export index maintenance.html
```

Or npm config:
```
npm config set libereco:index maintenance.html
```

### Start application

```
npm start libereco
```

You can specify all the config parameters on start time:


```
index=maintenance.html path=/var/www/theme2 port=1337 npm start libereco
```

Open your favorite modern browser and liberate your photos. :)

## Browser support

*Take it away*: Chrome, Safari, Firefox

*Getting there*: iPad

*Eventually*: Internet Explorer, iPhone

## In Development

* Refactor libs into separate modules
* Add tests

## TODO

* Add link to the new photo from old location
* Add statistics (e.g. number of photos migrated per service)
* Add albums support
* Add more services (e.g. Dropbox, Instagram, Facebook, Google Plus)

## License

(The MIT License)

Copyright (c) 2012 Alex Indigo

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

