var Phantasma = require('../index');
var should = require('should');
var fs = require('fs');
var rimraf = require('rimraf');
var http = require('http');
var serveStatic = require('serve-static');
var finalhandler = require('finalhandler');

describe('Phantasma', function () {
  this.timeout(10000); 

  var server, ph;

  before(function (done) {

    var serve = serveStatic('./test/files');
    server = http.createServer(function(req, res){
      var d = finalhandler(req, res);
      serve(req, res, d);
    });
    server.listen(3000, function () {
      done();
    });
  });

  after(function (done) {
    ph.exit();
    server.close(function () {
      rimraf('test/temp', done);
    });
  });

  beforeEach(function () {
    ph = new Phantasma({timeout: 10000});
  });

  afterEach(function () {
    ph.exit();
  });

  it('should be constructable', function () {
    ph.should.be.ok;
  });

  describe('Methods', function () {
    
    it('should open page', function () {
      return ph.open('http://localhost:3000')
        .then(function (status) {
          status.should.equal('success');
        });
    });

    it('should reject when open fails', function () {
      return ph.open('http://localhost:3001')
        .then(function (status) {
          throw new Error('failed request did not reject');
        })
        .catch(function (status) {
          status.should.equal('fail');
        });
    });

    it('should get the page title', function () {
      return ph.open('http://localhost:3000')
        .title()
        .then(function (title) {
          title.should.equal('Test');
        });
    });

    it('should follow a link', function () {
      return ph.open('http://localhost:3000')
        .click('#link')
        .wait()
        .url()
        .then(function (url) {
          url.should.equal('http://localhost:3000/page1.html');
        });
    });

    it('should enter text', function () {
      return ph.open('http://localhost:3000')
        .type('#typehere', 'test value')
        .evaluate(function () {
          return document.querySelector('#typehere').value;
        })
        .then(function (val) {
          val.should.equal('test value');
        });
    });

    it('should set value', function () {
      return ph.open('http://localhost:3000')
        .value('#typehere', 'test value')
        .evaluate(function () {
          return document.querySelector('#typehere').value;
        })
        .then(function (val) {
          val.should.equal('test value');
        });
    });

    it('should select a value', function () {
      return ph.open('http://localhost:3000')
        .select('#selectthis', '2')
        .evaluate(function () {
          return document.querySelector('#selectthis').value;
        })
        .then(function (val) {
          val.should.equal('2');
        });
    });

    it('should take screenshots', function () {
      var path = 'test/temp/screenshot.png';
      return ph.open('http://localhost:3000')
        .screenshot(path)
        .then(function () {
          fs.existsSync(path).should.be.true;
        });
    });
    
     it('should screenshot h1 and save it as image', function () {
      var path = 'test/temp/h1.png';
      return ph.open('http://localhost:3000')
        .screenshotDomElement('h1[id="heading"]',path)
        .then(function () {
          fs.existsSync(path).should.be.true;
        });
    });

    it('should navigate backwards and forwards', function () {
      return ph.open('http://localhost:3000')
        .open('http://localhost:3000/page1.html')
        .back()
        .url()
        .then(function (url) {
          url.should.equal('http://localhost:3000/');
        })
        .forward()
        .url(function (url) {
          url.should.equal('http://localhost:3000/page1.html');
        });
    });

    it('should refresh the page', function () {
      var count = 0;
      ph.on('onLoadFinished', function () {
        count++;
      });

      return ph.open('http://localhost:3000')
        .refresh()
        .then(function () {
          count.should.equal(2);
        });
    });

    it('should focus an element', function () {
      return ph.open('http://localhost:3000')
        .focus('#typehere')
        .evaluate(function () {
          return document.activeElement.id;
        })
        .then(function (active) {
          active.should.equal('typehere');
        });
    });

    it('should inject javascript', function () {
      return ph.open('http://localhost:3000')
        .injectJs('test/files/inject.js')
        .evaluate(function () {
          return test;
        })
        .then(function (result) {
          result.should.equal('testing!');
        });
    });

    it('should inject css', function () {
      return ph.open('http://localhost:3000')
        .injectCss('h1 { color: #ff0000; }')
        .evaluate(function () {
          var el = document.querySelector('#heading');
          var style = getComputedStyle(el);
          return style.color;
        })
        .then(function (result) {
          result.should.equal('rgb(255, 0, 0)');
        });
    });

    it('should get content', function () {
      return ph.open('http://localhost:3000/content.html')
        .content()
        .then(function (result) {
          result.should.equal('<html><head></head><body><h1>Test</h1></body></html>');
        });
    });

    it('should set content', function () {
      return ph.content('<h1>Test</h1>')
        .content()
        .then(function (result) {
          result.should.equal('<html><head></head><body><h1>Test</h1></body></html>');
        });
    });

  });

  describe('Events', function () {
    
    it('should emit on url change', function (done) {
      ph.open('http://localhost:3000')
        .once('onUrlChanged', function (url) {
          url.should.equal('http://localhost:3000/');
          done();
        });
    });

    it('should emit on resource requested', function (done) {
      ph.open('http://localhost:3000')
        .once('onResourceRequested', function (requestData, networkRequest) {
          requestData.url.should.equal('http://localhost:3000/');
          requestData.method.should.equal('GET');
          done();
        });
    });

    it('should emit on resource received', function (done) {
      ph.open('http://localhost:3000')
        .once('onResourceReceived', function (response) {
          response.url.should.equal('http://localhost:3000/');
          done();
        });
    });

    it('should emit on load started', function (done) {
      ph.open('http://localhost:3000')
        .once('onLoadStarted', function () {
          done();
        });
    });

    it('should emit on load finished', function (done) {
      ph.open('http://localhost:3000')
        .once('onLoadFinished', function (status) {
          status.should.equal('success');
          done();
        });
    });

    it('should emit on alert', function (done) {
      ph.open('http://localhost:3000/alert.html')
        .once('onAlert', function (msg) {
          msg.should.equal('test alert message');
          done();
        });
    });

    it('should emit on javascript error', function (done) {
      ph.open('http://localhost:3000/jserr.html')
        .once('onError', function (msg) {
          msg.should.not.be.empty;
          done();
        });
    });

    it('should remove event listener', function (done) {
      var count = 0;
      var errorCallback = function (msg){
        count++;
        msg.should.not.be.empty;
      }
      ph.on('onError', errorCallback);
      ph.open('http://localhost:3000/jserr.html')
        .then(function(){
          ph.removeListener('onError', errorCallback);
        })
        .open('http://localhost:3000/jserr.html')
        .delay(100)
        .then(function(){
          count.should.equal(1);
          done();
        });
    });

    it('should emit on navigation requested', function (done) {
      ph.open('http://localhost:3000')
        .once('onNavigationRequested', function (url, type, willNavigate, main) {
          url.should.equal('http://localhost:3000/');
          willNavigate.should.be.true;
          done();
        });
    });

  });

});

describe('Phantasma Multiple Processes', function () {
  
  it('should be able to handle multiple processes', function (done) {
    var ph1 = new Phantasma();
    var pid1, pid2;
    ph1.then(function () {
      pid1 = ph1.getPid();
      
      var ph2 = new Phantasma();
      ph2.then(function () {
        pid2 = ph2.getPid();
        pid3 = ph1.getPid();
        
        pid1.should.equal(pid3);
        pid2.should.not.equal(pid3);
        done();
      });
    });
    
  });
  
});