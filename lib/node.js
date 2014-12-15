var EventEmitter = require('events').EventEmitter,
    inherits = require('util').inherits,
    value = require('./value.js'),
    _ = require('./util.js');

function DSNode(name) {
  // 'private' variables go here.
  this.__priv__ = {};
  _.immutable(this.__priv__, 'actions', {});

  // super constructor
  EventEmitter.call(this);

  _.immutable(this, 'name', name);
  _.immutable(this, 'children', {});

  this.valueCreator = function() {};
  this.icon = null;
  this.parent = null;

  _.getter(this, 'valueType', function() {
    return this.hasValue() ? this.value.type : null;
  });

  _.prop(this, 'displayName', function() {
    var returned = this.__priv__.displayName;
    return !_.isNull(returned) ? returned : this.name;
  });

  // careful, here be dragons.
  _.prop(this, 'value', function() {
    if (!_.isNull(this.__priv__.value)) {
      return this.__priv__.value;
    } else {
      this.value = valueCreator();
      return this.__priv__.value;
    }
  }, function(val) {
    if(val instanceof value.Value) {
      this.__priv__.value = val;
    } else {
      this.__priv__.value = new value.Value(val);
    }
    this.emit('valueChanged', this.__priv__.value);
  });

  return this;
}

inherits(DSNode, EventEmitter);

DSNode.prototype.getPath = function() {
  var _this = this;
  var tree = [];

  while (!_.isNull(_this.parent)) {
    tree.push(_this.name);
    _this = _this.parent;
  }

  parts = parts.reverse();
  return "/" + parts.join("/");
};

DSNode.prototype.hasValue = function() {
  return !_.isNull(this.value);
};

DSNode.prototype.hasValueHistory = function() {
  return false;
};

DSNode.prototype.getValueHistory = function() {
  return null;
};

DSNode.prototype.getDisplayValue = function(value) {
  return null;
};

DSNode.prototype.addChild = function(child) {
  children[child.name] = child;
  child.parent = this;
  return this;
};

DSNode.prototype.createChild = function(displayName, obj) {
  obj.recording = !_.isNull(obj.recording) ? obj.recording : false;
  
  var name = _.replaceAll(displayName, ' ', '_');

  // TODO: Implement RecordingNode
  // var node = obj.recording ? new RecordingNode(name) : new Node(name);
  var node = new Node(name);

  if(!_.isNull(obj.value)) node.value = obj.value;
  node.displayName = displayName;
  node.icon = obj.icon;

  return node;
};

DSNode.prototype.addAction = function(action) {
  this.__priv__.actions[action.name] = action;
};

DSNode.prototype.removeAction = function(action) {
  this.__priv__.actions[action.name] = undefined;
};

DSNode.prototype.invokeAction = function(name, args) {
  var action = this.__priv__.actions[name];
  if (!_.isNull(action)) {
    return action.invoke(args);
  }
  return null;
};

function DSAction(name, obj) {
  this.name = name;
  this.results = obj.results || {};
  this.params = obj.params || {};
  this.callback = obj.callback || function() {};
  this.hasTableReturn = !_.isNull(obj.hasTableReturn) ? obj.hasTableReturn : false;
  this.tableName = !_.isNull(obj.tableName) ? obj.tableName : "table";

  return Object.freeze(this);
}

DSAction.prototype.invoke = function(args) {
  return this.callback(args);
};

module.exports = {
  'Node': DSNode,
  'Action': Action
};
