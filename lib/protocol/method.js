var trends = require('../trends.js'),
    rollup = require('../rollup.js'),
    table = require('../table.js'),
    util = require('../util.js'),
    Table = table.Table,
    RollupType = rollup.RollupType,
    TimeRange = trends.TimeRange,
    Interval = trends.Interval,
    _ = require('../internal.js');

var Method = {};

Method.GetNodeList = function(link, req) {
  var node = link.resolvePath(req.path),
      children = Object.keys(node.children);

  // 50 seems awfully high, the abitary number that the Dart SDK uses.
  if(children.length <= 50) {
  	return {
  	  'nodes': _.map(children, function(child) {
  	  	return node.children[child].toMap();
  	  })
  	};
  }

  _.each(children, function(child, index) {
  	var res = ({
  	  'nodes': node.children[child].toMap()
  	});
  	if(index === 0)
  	  res.partial = 'nodes';
  	else if(index === children.length - 1)
  	  res.done = true;
  	
  	return res;
  });
};

Method.GetNode = function(link, req) {
  var node = link.resolvePath(req.path);

  return {
  	'node': node.toMap()
  };
};

Method.GetValue = function(link, req) {
  var node = link.resolvePath(req.path);
  var map = node.value.toMap();
  map.path = req.path;

  return map;
};

Method.GetValueHistory = function(link, req) {
	var node = link.resolvePath(req.path),
      trArray = req.timeRange.split("/"),
      timeRange = TimeRange(Date.parse(trArray[0]), Date.parse(trArray[1])),
      interval = Interval[req.interval],
      rollup = req.rollup;

  if(!_.isNull(rollup) && RollupType.indexOf(rollup) === -1)
    throw "Unsupported rollup type: " + rollup;

  if(!node.hasValueHistory())
    throw "Node does not have value history: " + req.path;

  util.Context.timeRange = timeRange;
  util.Context.interval = interval;
  util.Context.rollupType = rollup;

  return node.getValueHistory().toMap();
};

Method.Invoke = function(link, req) {
	var node = link.resolvePath(req.path),
      action = req.action,
      params = req.parameters;

  var map = {},
      results = node.invokeAction(action, params);

  if(!_.isNull(results) && !_.isEmpty(results)) {
    _.each(results, function(result) {
      if(node.actions[action].hasTableReturn) {
        results[node.actions[action].tableName] = results[result].toMap();
      } else {
        results[result] = results[result].value;
      }
    });

    map.results = results;
  }

  map.path = req.path;
  return map;
};

Method.Subscribe = function(link, req, subscription) {
  var nodes = _.map(req.paths, function(path) { return link.resolvePath(path); });

  var values = [];
  _.each(nodes, function(node) {
    var count = 1;
    link.subscribe(node, function() {
      link.send({
        'subscription': subscription,
        'response': [{
          'method': 'UpdateSubscription',
          'updateId': ++count,
          'values': [_.mixin({}, node.value.toMap(), {
            'path': node.getPath()
          })]
        }]
      });
    });

    values.push(_.mixin({}, node.value.toMap(), {
      'path': node.getPath()
    }));
  });

  link.send({
    'subscription': subscription,
    'responses': [{
      'method': 'UpdateSubscription',
      'updateId': 1,
      'values': values
    }]
  });
};

Method.Unsubscribe = function(link, req) {
  var nodes = _.map(req.paths, function(path) { return link.resolvePath(path); });

  _.each(nodes, function(node) {
    link.unsubscribe(node);
  });

  return {};
};

Method.SubscribeNodeList = function(link, req) {
  var node = link.resolvePath(req.path);

  if(node.isWatchable) {
    var count = 0;
    link.subscribeNodeList(node, function() {
      link.send({
        'responses': [
          _.mixin({}, Method.GetNodeList(link, req), {
            'method': 'UpdateNodeList',
            'updateId': ++count
          })
        ]
      });
    });
  }

  return Method.GetNodeList(link, req);
};

Method.UnsubscribeNodeList = function(link, req) {
  var node = link.resolvePath(req.path);
  link.unsubscribeNodeList(node);

  return {};
};

module.exports = {
  'Method': Object.freeze(Method)
};