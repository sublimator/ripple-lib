/* -------------------------------- REQUIRES -------------------------------- */

var assert = require('assert');
var rangeset = require('ripple-lib').rangeset;
var RangeSet = rangeset.RangeSet;
var Range = rangeset.Range;

/* --------------------------------- HELPERS -------------------------------- */

var DEV = false;

function prettyj(o) {return JSON.stringify(o, undefined, 2); }

function expectEq (a, b) {
  assert.deepEqual(a, b, !DEV ? null :
                                prettyj(a) + '\n\n!=\n\n' +
                                  prettyj(b));
}

function expectSetEq (a, b) {
  assert(a instanceof RangeSet)
  assert(Array.isArray(b))
  if (b.length != 0) {
    assert(Array.isArray(b[0]))
    assert.equal(b[0].length, 2);
  };
  expectEq(a.toJSON(), b);
}

/* ---------------------------------- TESTS --------------------------------- */

describe('Range', function() {
  it('can be constructed with an explicit tuple', function (){
    var range = new Range([20, 1]);
    assert.equal(range.a, 1);
    assert.equal(range.b, 20);
  });

  it('can be constructed with an implied tuple', function (){
    var range = new Range(20, 1);
    assert.equal(range.a, 1);
    assert.equal(range.b, 20);
  });

  it('can be constructed without `new`', function() {
    var r1 = Range(2, 4);
    var r2 = Range(2, 4);
    assert(r1 instanceof Range);
    assert(r2 instanceof Range);
    assert(r1 !== r2);
    assert(r1 === Range(r1));
    assert(r1 !== Range(r2));
  });

  it('can create a new range `cover`ing another range', function() {
    var r1 = Range(10, 20);
    var r2 = Range(20, 40);
    var r3  = r1.cover(r2);
    assert.equal(r3.a, 10);
    assert.equal(r3.b, 40);
  });

  it('can find its intersection with another range', function() {
    function expectIntersection(r1, r2, expected) {
      r1 = Range(r1);
      r2 = Range(r2);
      expected = expected == null ? null : Range(expected);
      assert.deepEqual(r1.intersection(r2), expected);
      assert.deepEqual(r2.intersection(r1), expected)
    }
    expectIntersection([10, 20], [20, 40], [20, 20]);
    expectIntersection([20, 25], [15, 22], [20, 22]);
    expectIntersection([19, 25], [26, 27], null);
    expectIntersection([1, 1], [2, 2], null);
    expectIntersection([20, 40], [21, 21], [21, 21]);
    expectIntersection([11, 11], [11, 11], [11, 11]);
    expectIntersection([11, 11], [11, 12], [11, 11]);
    expectIntersection([10, 11], [11, 12], [11, 11]);
    expectIntersection([10, 13], [11, 11], [11, 11]);
    expectIntersection([11, 11], [12, 12], null);
    expectIntersection([11, 11], [12, 13], null);
    expectIntersection([11, 12], [10, 14], [11, 12]);
    expectIntersection([15, 32], [18, 23], [18, 23]);
  });

  it('can detect intersection with other ranges', function() {
    var r1 = Range(10, 20);
    var r2 = Range(20, 40);
    assert(r1.intersects(r2) === true);
  });

  it('can detect adjoinment with other ranges', function() {
    var r1 = Range(10, 19);
    var r2 = Range(20, 40);
    var r3 = Range(41, 45);
    assert(r1.adjoins(r2) === true);
    assert(r2.adjoins(r1) === true);
    assert(r2.adjoins(r3) === true);
    assert(r3.adjoins(r2) === true);
  });

  it('can detect containment of another range at low extent', function() {
    var r1 = Range(1, 3);
    var r2 = Range(1, 1);
    assert(r1.contains(r2) === true);
  });

  it('can detect containment of another range inside', function() {
    var r1 = Range(1, 3);
    var r2 = Range(2, 2);
    assert(r1.contains(r2) === true);
  });

  it('can detect containment of another range at high extent', function() {
    var r1 = Range(1, 3);
    var r2 = Range(3, 3);
    assert(r1.contains(r2) === true);
  });

  it('can subtract another range from itself, returning remainders', function(){
    function jsonify(l) {return l.map(function(r) {return r.toJSON();}); }
    function subtract(a, b) {return jsonify(a.subtract(b));}
    function assertSubtract2nd(a, b, rem) {
      assert.deepEqual(subtract(Range(a), Range(b)), rem); }

    assertSubtract2nd([10, 25], [12, 23], [[10, 11], [24, 25]]);
    assertSubtract2nd([12, 23], [10, 25], []);

    assertSubtract2nd([29, 45], [15, 42], [[43, 45]]);
    assertSubtract2nd([29, 45], [50, 100], []);
    assertSubtract2nd([29, 45], [5, 35], [[36, 45]]);
  })
});

describe('RangeSet', function() {
  it('can be constructed from a list of tuples', function () {
      var set = new RangeSet([[10, 20], [22, 30]]);
      assert.equal(set.ranges[0].a, 10);
      assert.equal(set.ranges[0].b, 20);
      assert.equal(set.ranges[1].a, 22);
      assert.equal(set.ranges[1].b, 30);
      assert.equal(set.ranges.length, 2);
  });

  it('can be constructed without `new` and via `arguments` list', function () {
      var set = RangeSet([10, 20], [22, 30]);
      expectSetEq(set, [[10, 20], [22, 30]]);
      assert(RangeSet(set) === set);
  });

  it('can add a range to an empty set', function () {
      var set = RangeSet();
      set.add([20, 40]);
      expectSetEq(set, [[20, 40]]);
  });

  it('can find the closest element matching a range', function () {
      var set = RangeSet([10, 20], [22, 30], [31, 40]);
      assert.equal(set.ranges.length, 2);
      var range = set.closestRange([41, 45]);
      assert(range.equals([22, 40]));
      range = set.closestRange([22, 28]);
      assert(range.equals([22, 40]));
      range = set.closestRange([21, 21]);
      assert(range.equals([10, 20]));
      range = set.closestRange([-15, 11]);
      assert(range.equals([10, 20]));
  });

  it('can insert ranges inbetween existing ranges', function() {
    var set = RangeSet([20, 30], [40, 45]);
    set.add([32, 33]);
    expectSetEq(set, [[20, 30], [32, 33], [40, 45]]);
  });

  it('can merge an added range with existing ranges', function () {
      var set = RangeSet([10, 20], [22, 30]);
      expectSetEq(set, [[10,  20], [22, 30]]);
      set.add([30, 45]);
      expectSetEq(set, [[10,  20], [22, 45]]);
  });

  it('collapses intersecting ranges', function() {
    var set = RangeSet([1,2], [2,3]);
    expectSetEq(set, [[1, 3]]);
  });

  it('collapses adjoining ranges', function() {
    var set = RangeSet([1,3], [4, 10]);
    expectSetEq(set, [[1, 10]]);
  });

  it('collapses adjoining ranges on either side of an insertion', function() {
    var set = RangeSet([1,12], [14, 20]);
    expectSetEq(set, [[1, 12], [14, 20]]);
    set.add([13, 13]);
    expectSetEq(set, [[1,  20]]);
  });

  it('can detect range membership', function() {
    var set = RangeSet([1,3], [5, 10], [20, 400]);
    assert(set.contains([3, 3]));
    assert(set.contains([1, 1]));
    assert(set.contains([1, 2]));
    assert(!set.contains([1, 4]));
    assert(!set.contains([3, 4]));
    assert(set.contains([5, 5]));
    assert(set.contains([10, 10]));
    assert(!set.contains([10, 11]));
    assert(!set.contains([10, 11]));
    assert(!set.contains([19, 20]));
    assert(set.contains([20, 20]));
    assert(set.contains([400, 400]));
    assert(!set.contains([400, 401]));
  });

  it('can remove ranges', function() {
    var set = RangeSet([1, 20], [25, 40]);
    function subtract(r, expected) {
      set.subtract(r);
      expectSetEq(set, expected);
    }

    subtract([10, 30],
             [[1, 9], [31, 40]]);
    subtract([10, 32],
             [[1, 9], [33, 40]]);
    subtract([10, 32],
             [[1, 9], [33, 40]]);
    subtract([1, 15],
             [[33, 40]]);
    subtract([33, 33],
             [[34, 40]]);
    subtract([40, 40],
             [[34, 39]]);
    subtract([35, 37],
             [[34, 34], [38, 39]]);

    set = RangeSet([10, 15], [18, 23], [25, 31], [38, 55]);

    subtract([10, 19],
             [[20, 23], [25, 31], [38, 55]]);
    subtract([10, 19],
             [[20, 23], [25, 31], [38, 55]]);
    subtract([30, 39],
             [[20, 23], [25, 29], [40, 55]]);

    subtract([20, 25],
             [[26, 29], [40, 55]]);

    subtract([20, 55], []);
    subtract([20, 55], []);

    set = RangeSet([10, 15], [18, 23], [25, 31], [38, 55]);
    subtract([10, 10],
             [[11, 15],  [18, 23], [25, 31], [38, 55]]);

    subtract([15, 17],
             [[11, 14],  [18, 23], [25, 31], [38, 55]]);

    subtract([10, 56],
             []);

    set = RangeSet([ 1, 11 ],
                   [ 13, 16 ],
                   [ 19, 21 ],
                   [ 25, 26 ],
                   [ 31, 31 ],
                   [ 36, 37 ],
                   [ 41, 43 ],
                   [ 46, 49 ],
                   [ 51, 295 ]);

    subtract([4, 280],
             [[1, 3], [281, 295]]);
  })
})
