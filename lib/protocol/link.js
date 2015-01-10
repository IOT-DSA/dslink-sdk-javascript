var WebSocketClient = require('websocket').client,
    node = require('../node.js'),
    Method = require('./method.js').Method,
    Poller = require('../util.js').Poller,
    Node = node.Node,
    Action = node.Action,
    _ = require("../internal.js");

function DSLink(name) {
  // 'private' variables go here.
  this.__priv__ = {};
  this.__priv__.subs = {};
  this.__priv__.listSubs = {};
  this.__priv__.conn = null;
  this.__priv__.sendQueue = [];
  this.__priv__.poller = new Poller(function() {
    this.handleSendQueue(2);
  }.bind(this));

  this.name = name;
  this.rootNode = new Node("Root");

  return Object.freeze(this);
}

DSLink.prototype.connect = function(host, cb) {
  if(!_.isNull(this.__priv__.conn))
    cb("Link is already connected to a broker. Use Link.disconnect() and try to connect again.");

  var sock = new WebSocketClient({
    'keepalive': true,
    'keepaliveInterval': 10000 // 10 seconds
  });

  sock.on('connectFailed', function(err) {
    cb(err);
  });

  sock.on('connect', function(conn) {
    this.__priv__.conn = conn;
    this.__priv__.poller.poll(100);

    this.__priv__.conn.on('error', function(err) {
      this.__priv__.conn = null;
      this.__priv__.poller.cancel();
    }.bind(this));

    this.__priv__.conn.on('close', function() {
      this.__priv__.conn = null;
      this.__priv__.poller.cancel();
    }.bind(this));

    this.__priv__.conn.on('message', function(req) {
      if (req.type === 'utf8') {
        var message = req.utf8Data;
        this.handleMessage(message);
      }
    }.bind(this));

    cb();
  }.bind(this));

  var url = 'ws://' + host + '/wstunnel?' + this.name;
  sock.connect(url);
};

DSLink.prototype.disconnect = function() {
  if(!_.isNull(this.__priv__.conn) && this.__priv__.conn.connected) {
    this.handleSendQueue(-1);
    this.__priv__.conn.close();
    return true;
  }
  return false;
};

DSLink.prototype.handleMessage = function(message) {
  var json = JSON.parse(message);

  _.each(json.requests, function(req) {
    var method = req.method;
    method = method === null || method === undefined ? "" : method;

    if(!_.isNull(Method[method])) {
      var res = Method[method](this, req, json.subscription);
        
      if(!_.isNull(res)) {
        res.reqId = req.reqId;
        res.method = req.method;
        var nmessage = {
          'response': res
        };
        if(json.subscription) { nmessage.subscription = json.subscription; }
        if(!_.isNull(this.__priv__.conn)) {
          this.__priv__.sendQueue.push(nmessage);
        }
      }
    }
  }, this);
};

DSLink.prototype.handleSendQueue = function(limit) {
  var subscriptions = _.map(this.__priv__.sendQueue, function(res) {
    return res.subscription;
  });

  _.each(subscriptions, function(subscription) {
    var data = this.__priv__.sendQueue.filter(function(res) {
      return res.subscription === subscription;
    });
    data = data.splice(0, limit <= 0 ? data.length : limit);

    _.each(data, function(message) {
      if(!_.isNull(message.responses)) {
        data = _.removeWhere(data, function(value) {
          return value === message;
        });
        this.__priv__.sendQueue = _.removeWhere(this.__priv__.sendQueue, function(value) {
          return value === message;
        });
        this.__priv__.conn.sendUTF(JSON.stringify(message));
      } 
    }, this);

    if(data.length === 0)
      return;

    this.__priv__.sendQueue = _.removeWhere(this.__priv__.sendQueue, function(value) {
      return data.indexOf(value) !== -1;
    });

    var map = {
      'subscription': subscription,
      'responses': _.map(data, function(res) { 
        return res.response; 
      })
    };

    this.__priv__.conn.sendUTF(JSON.stringify(map));
  }, this);
};

DSLink.prototype.loadNodes = function(list, container) {
  _.each(list, function(node) {
    this.loadNode(node, container);
  });
};

DSLink.prototype.loadNode = function(map, container) {
  container = container || this.rootNode;

  var node = container.createChild(map.name, {
    'recording': map.recording,
    'value': map.value,
    'icon': map.icon
  });

  if(!_.isNull(map.actions)) {
    _.each(map.actions, function(action) {
      var actionObj;
      if(action instanceof Action) {
        actionObj = action;
      } else {
        actionObj = new Action(action.name, action.callback, {
          'params': action.params,
          'results': action.results,
          'callback': action.callback,
          'hasTableReturn': action.hasTableReturn,
          'tableName': action.tableName
        });
      }
      node.addAction(actionObj);
    });
  }

  if(!_.isNull(map.initialize))
    map.initialize(node);

  if(!_.isNull(map.children)) {
    this.loadNodes(map.children, node);
  }

  return node;
};

DSLink.prototype.subscribe = function(node, callback) {
  this.__priv__.subs[node.getPath()] = callback;

  node.on('valueChanged', callback);
}; 

DSLink.prototype.unsubscribe = function(node) {
  node.removeListener('valueChanged', this.__priv__.subs[node.getPath()]);
}; 

DSLink.prototype.subscribeNodeList = function(node, callback) {
  this.__priv__.listSubs[node.getPath()] = callback;

  node.on('treeChanged', callback);
}; 

DSLink.prototype.unsubscribeNodeList = function(node) {
  node.removeListener('treeChanged', this.__priv__.listSubs[node.getPath()]);
}; 

DSLink.prototype.resolvePath = function(path) {
  var returnNode = this.rootNode;

  _.replaceAll(path, '+', '_');
  var nodes = path.split("/").filter(function(node) {
    return node.trim() !== "";
  });

  _.each(nodes, function(node) {
    if(_.isNull(returnNode.children[node]))
      throw "Node does not have child '" + node + "'!";
    returnNode = returnNode.children[node];
  });

  return returnNode;
};

DSLink.prototype.send = function(message) {
  if(!_.isNull(this.__priv__.conn)) {
    this.__priv__.sendQueue.push(message);
  }
};

module.exports = {
  'Link': DSLink
};
