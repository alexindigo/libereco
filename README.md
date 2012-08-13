#Libereco

*Liberate your photos from the hosting platforms lockin*

A node.js server which allows you to migrate your photos between [Flickr](http://www.flickr.com/) and [500px](http://www.500px.com/) as easy as drag-n-drop.

## Demo

Try it for yourself: [http://libereco.ia.gs/](http://libereco.ia.gs/)

## Installation

```
npm install libereco
```

## Usage

### Add API services

*You need at least two services enabled for application to work.*

* 500px *([request API key](http://500px.com/settings/applications?from=developers))*:

```
npm config set libereco:api_500px_key <500px consumer key>
npm config set libereco:api_500px_secret <500px consumer secret>
```

* Flickr  *([request API key](http://www.flickr.com/services/apps/create/apply/))*:

```
npm config set libereco:api_flickr_key <flickr api key>
npm config set libereco:api_flickr_secret <flickr api secret>
```


### Customize HTTP server

You should have publicly accessible http server for OAuth to work.

* Hostname *(Defaults to OS assigned hostname)*:

```
npm config set libereco:host libereco.ia.gs
```

* Port *(Defaults to port 8000)*:

```
npm config set libereco:port 1337
```

### Start application

```
npm start
```

Or run it on custom port

```
port=1337 npm start
```

Open your favorite latest webkit browser and liberate your photos. :)


## TODO

* Add statistics (e.g. number of photos migrated per service)
* Add albums support
* Add more services (e.g. Dropbox, Instagram, Facebook, Google Plus)

## License

(The MIT License)

Copyright (c) 2012 Alex Indigo

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

