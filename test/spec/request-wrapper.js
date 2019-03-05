'use strict';

var RequestWrapper = require('../../scripts/request-wrapper');

describe('request-wrapper', function () {

  it('should not replace existing headers', function () {
    var requestWrapper = new RequestWrapper();
    requestWrapper.setCookie('my-cookie');
    var opts = requestWrapper._setCookieHeader({
      headers: {
        'my-header': 'my-value'
      }
    });
    opts.should.eql({
      headers: {
        'my-header': 'my-value',
        cookie: 'my-cookie'
      },
      withCredentials: true
    });
  });

  it('should set cookie in header', function () {
    var requestWrapper = new RequestWrapper();
    requestWrapper.setCookie('my-cookie');
    var opts = requestWrapper._setCookieHeader({});
    opts.should.eql({
      headers: {
        cookie: 'my-cookie'
      },
      withCredentials: true
    });
  });

});
