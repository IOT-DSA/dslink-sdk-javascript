var RequesterStream = require('./stream.js').RequesterStream,
    DSError = require('../error.js').Error,
    _ = require('../internal');

function Requester() {
  this.streams = {
    0: new RequesterStream(0, this)
  };

  this.rid = 0;
  this.sid = 0;
  this.queue = [];
}

Requester.prototype._send = function(obj) {
  var rid = ++this.rid;

  this.queue.push(obj);

  this.streams[rid] = new RequesterStream(rid, this);
  return this.streams[rid];
};

Requester.prototype._tick = function() {
  return this.queue.splice(0, this.queue.length);
};

Requester.prototype.handleResponse = function(res) {
  if(!_.isNull(this.streams[res.rid])) {
    this.streams[res.rid].state = res.stream;

    if(!_.isNull(res.updates)) {
      this.streams[res.rid].concat(res.updates);
    }

    if(!_.isNull(res.error)) {
      this.streams[res.rid].push(new DSError(res.error));
    }
  }
};

Requester.prototype.list = function(path) {
  return this._send({
    rid: rid,
    method: 'list',
    path: path
  });
};

Requester.prototype.set = function(path, value) {
  return this._send({
    rid: rid,
    method: 'set',
    path: path,
    value: !_.isNull(value.value) ? value.value : value
  });
};

Requester.prototype.remove = function(path) {
  return this._send({
    rid: rid,
    method: 'remove',
    path: path
  });
};

Requester.prototype.invoke = function(path, params) {
  var rid = ++this.rid;

  var map = {
    rid: rid,
    method: 'invoke',
    path: path
  };

  if(!_.isNull(params)) {
    map.params = params;
  }

  this.queue.push(map);

  this.streams[rid] = new RequesterStream(rid, this);
  return this.streams[rid];
};

Requester.prototype.subscribe = function(paths) {
  var rid = ++this.rid;

  this.queue.push({
    rid: rid,
    method: 'subscribe',
    paths: paths.map(function(path) {
      if(_.typeOf(path) !== 'string')
        return path;

      return {
        path: path,
        sid: ++this.sid
      };
    })
  });

  this.streams[rid] = new RequesterStream(rid, this);
  return this.streams[rid];
};

Requester.prototype.unsubscribe = function(sids) {
  return this._send({
    rid: rid,
    method: 'unsubscribe',
    sids: sids
  });
};

Requester.prototype.close = function(rid) {
  this.queue.push({
    rid: rid,
    method: 'close'
  });
};

module.exports = {
  Requester: Requester
};