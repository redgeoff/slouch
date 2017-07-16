'use strict';

var FakedStreamIterator = function (items) {
  this._items = items;
  this._i = 0;
};

FakedStreamIterator.prototype.each = function (onItem) {
  var self = this;
  if (self._i < self._items.length) {
    return onItem(self._items[self._i++]).then(function () {
      return self.each(onItem);
    });
  } else {
    return Promise.resolve();
  }
};

module.exports = FakedStreamIterator;
