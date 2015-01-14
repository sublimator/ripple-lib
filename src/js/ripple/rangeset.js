/* --------------------------------- HELPERS -------------------------------- */

function sortedIndex(array, obj, iterator, low) {
  // Stolen from the dashing lorider, just for low down calibration :)
  var low = low || 0, high = array.length;
  while (low < high) {
    var mid = (low + high) >> 1;
    iterator(array[mid]) < iterator(obj) ? low = mid + 1 : high = mid;
  }
  return low;
};

/* ---------------------------------- RANGE --------------------------------- */

function Range(a, b) {
  if (!(this instanceof Range))
    return (a instanceof Range) ? a :
            new Range(a, b);

  if (b)
  {
    a = [a, b];
  }

  // JavaScript, being lame, sorts them as strings otherwise
  a.sort(function(a, b) {return a - b});

  this.a = a[0];
  this.b = a[1];
}

Range.prototype.cover = function(other) {
  other = Range(other);
  var range =  new Range(Math.min(this.a, other.a),
                         Math.max(this.b, other.b));
  return range;
}

Range.prototype.toJSON = function() {
  return [this.a, this.b];
}

Range.prototype.containsPoint = function(p)
{
  return p >= this.a && p <= this.b;
}

Range.prototype.intersection = function(other) {
  other = Range(other);

  if (this.intersects(other))
  {
    return new Range(
        Math.max(this.a, other.a),
        Math.min(this.b, other.b) );
  } else {
    return null;
  }
}

Range.prototype.contains = function(other) {
  return this.containsPoint(other.a) &&
         this.containsPoint(other.b);
}

Range.prototype.intersects = function(other) {
  return this.containsPoint(other.b) || other.containsPoint(this.b);
}

Range.prototype.adjoins = function(other) {
  return this.b + 1 == other.a || other.b + 1 == this.a;
}

Range.prototype.intersectsOrAdjoins = function(other) {
  return this.adjoins(other) || this.intersects(other);
}

Range.prototype.equals = function(other)
{
  other = Range(other);
  return this.a == other.a && this.b == other.b;
}

Range.prototype.subtract = function(other)
{
  other = Range(other);
  var r1 = this;
  var r2 = other;

  if (!r1.contains(r2)) {
    r2 = r1.intersection(r2);
    if (r2 == null) {
      return [];
    };
  }

  var r1s = r1.a, r1e = r1.b;
  var r2s = r2.a, r2e = r2.b;

  if (r1s == r2s && r1e == r2e)
      return []
  else if (r1s == r2s)
      return [Range(r2e+1, r1e)]
  else if (r1e == r2e)
      return [Range(r1s, r2s -1)]
  else
      return [Range(r1s, r2s -1 ), Range(r2e+1, r1e)]
}

/* -------------------------------- RANGESET -------------------------------- */

function RangeSet(set) {
  if (!(this instanceof RangeSet))
    return (set instanceof RangeSet) ? set :
            new RangeSet(arguments);

  var self = this;
  set = set || [];
  this.ranges = [];
  for (var i = 0; i < set.length; i++) {
    self.add(set[i]);
  };
}

RangeSet.prototype.subtract = function(remove) {
  remove = Range(remove);
  var ranges = this.ranges;
  var remainders = [];
  var found = this.checkPoints_(this.bisect_(remove), function(i) {
      if (ranges[i].intersects(remove)) {
        ranges[i].subtract(remove).forEach(function(r){remainders.push(r)});
        return true;
      };
  });
  if(found.length > 0)
    this.replaceAt_(found, remainders);
}

RangeSet.prototype.add = function(range) {
  range = Range(range);
  var ranges = this.ranges;
  var bisected = this.bisect_(range);
  var ix = bisected[0];

  if (ranges.length == 0 || ix == ranges.length) {
    ranges.push(range);
  }
  else {
    var found = this.checkPoints_(bisected, function(i) {
      if (ranges[i].intersectsOrAdjoins(range)) {
        range = range.cover(ranges[i]);
        return true;
      };
    });
    if(found.length > 0)
      this.replaceAt_(found, [range]);
    else
      ranges.splice(ix, 0, range);
  }
};

RangeSet.prototype.toJSON = function()
{
  return this.ranges.map(function(r) {return r.toJSON();});
}

RangeSet.prototype.closestRange = function(range)
{
  var ix = this.closestRangeIx_(range);
  return ix == this.ranges.length ? null : this.ranges[ix];
}

RangeSet.prototype.contains = function(range)
{
  range = Range(range);
  var closest = this.closestRange(range);
  return closest != null && closest.contains(range);
}

// Privates

RangeSet.prototype.checkPoints_ = function(points, func) {
  var ranges = this.ranges;
  var found = [];
  points.forEach(function(i) {
    if (func(i)) {found.push(i); };
  });
  return found;
}

RangeSet.prototype.bisect_ = function(range)
{
  var ranges = this.ranges;
  if (ranges.length == 0) { return []};
  var ix = this.closestRangeIx_(range);
  if (ix == this.ranges.length) {return [ix]};
  var highIx = this.closestRangeIxRight_(range, ix);
  var points = [ix, ix+1, highIx-1, highIx];
  var arr = [];
  points.forEach(function(i) {
    if (!(~arr.indexOf(i)) && i > -1 && i < ranges.length)
      arr.push(i);});
  return arr;
}

RangeSet.prototype.replaceAt_ = function(extents, replacements)
{
  var firstIx = extents[0];
  var lastIx = extents[extents.length - 1];
  var removed = lastIx - firstIx + 1;
  Array.prototype.splice.apply(
    this.ranges, [firstIx, removed].concat(replacements));
}

RangeSet.prototype.closestRangeIx_ = function(range)
{
  range = Range(range);
  var ix =  sortedIndex(this.ranges, range, function(r) {return r.a});
  if (ix > 0 &&
      range.intersectsOrAdjoins(this.ranges[ix-1]))
      ix--;
  return ix;
}

RangeSet.prototype.closestRangeIxRight_ = function(range, start)
{
  range = Range(range);
  var ix = sortedIndex(this.ranges, range, function(r) {return r.b}, start);
  return ix;
}

/* --------------------------------- EXPORTS -------------------------------- */

exports.Range = Range;
exports.RangeSet = RangeSet;
