var _ = require('./internal/util.js');

function Poller(cb) {
  // 'private' variables go here.
  this.__priv__ = {};
  this.__priv__.timer = null;

  this.cb = cb;

  return Object.freeze(this);
}

Poller.prototype.poll = function(duration) {
  if(!_.isNull(this.__priv__.timer)) {
  	throw 'Poller already started!';
  }

  this.__priv__.timer = setInterval(this.cb, duration);
};

Poller.prototype.cancel = function() {
  if(!_.isNull(this.__priv__.timer)) clearInterval(this.__priv__.timer);
  this.__priv__.timer = null;
};

var Duration = {
  'milliseconds': function(duration) {
    return duration;
  },
  'seconds': function(duration) {
    return duration * 1000;
  },
  'minutes': function(duration) {
    return duration * 60000;
  },
  'hours': function(duration) {
    return duration * 3600000;
  },
  'days': function(duration) {
    return duration * 86400000;
  },
  'weeks': function(duration) {
    return duration * 604800000;
  },
  'months': function(duration) {
    return duration * 2419200000;
  },
  'years': function(duration) {
    return duration * 29030400000;
  }
};
Duration.none = 0;

module.exports = {
  'Poller': Poller,
  'Duration': Duration
};
