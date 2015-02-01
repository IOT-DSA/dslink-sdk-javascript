var _ = require('./internal.js');

function ValueType(name, obj) {
  obj = obj || {};
  var returned = {
    'name': name,
    'enum': obj.enum,
    'precision': obj.precision,
    'max': obj.max,
    'min': obj.min,
    'unit': obj.unit
  };

  returned.toMap = function(name) {
    var map = {};

    if(name)
      map.name = returned.name;
    if(_.isNull(returned.enum))
      map.enum = returned.enum;
    if(_.isNull(returned.precision))
      map.precision = returned.precision;
    if(_.isNull(returned.max))
      map.max = returned.max;
    if(_.isNull(returned.min))
      map.min = returned.min;
    if(_.isNull(returned.unit))
      map.unit = returned.unit;

    return map;
  };
  return returned;
}

function determineType(value) {
  var types = {
    'string': ValueType.STRING,
    'boolean': ValueType.BOOLEAN,
    'undefined': ValueType.NULL
  };

  var type = _.typeOf(value);

  if(type === 'number') {
    if(value % 1 === 0)
      return ValueType.INTEGER;
    return ValueType.NUMBER;
  }

  if(value === null) {
    return ValueType.NULL;
  }

  if(types[type] !== undefined)
    return types[type];

  throw ('Unsupported Type: ' + type);
}

function Value(value, obj) {
  obj = obj || {};

  this.value = value;
  this.type = obj.type || determineType(value, obj);
  this.timestamp = obj.timestamp || new Date();
  this.status = obj.status || 'ok';

  if(!_.isNull(this.type.enum)) {
    if(this.type.enum.indexOf(this.value.toString()) === -1)
      throw 'Enum Values must have a valid value.';
  }

  return Object.freeze(this);
}

Value.prototype.toString = function() {
  return this.value.toString();
};

Value.prototype.isNull = function() {
  return this.type === ValueType.NULL;
};

Value.prototype.isTruthy = function() {
  return (_.typeOf(this.value) === 'number' && this.value !== 0) ||
      this.value === 'true' ||
      this.value === true;
};

Value.prototype.toMap = function() {
  var returned = _.mixin({
    'type': this.type.name,
    'value': this.value,
    'status': this.status,
    'lastUpdate': this.timestamp.toISOString()
  }, this.type.toMap(false));
  return returned;
};

ValueType.STRING = new ValueType('string');
ValueType.INTEGER = new ValueType('number', { 'precision': 0 });
ValueType.NUMBER = new ValueType('number');
ValueType.BINARY = new ValueType('number', { 'precision': 0, 'min': 0, 'max': 255 });
ValueType.BOOLEAN = new ValueType('bool', { 'enum': ['true', 'false'] });
ValueType.NULL = new ValueType('null');
ValueType.ENUM = new ValueType('enum');

module.exports = {
  'Value': Value,
  'ValueType': Object.freeze(ValueType)
};
