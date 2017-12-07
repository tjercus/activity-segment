"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseDuration = exports.isValidSegment = exports.canAugment = exports.isDirtySegment = exports.augmentSegmentData = exports.makeSegmentsTotal = exports.updateSegment = exports.findSegment = exports.addSegment = exports.removeSegment = undefined;

var _moment = require("moment");

var _moment2 = _interopRequireDefault(_moment);

var _objectUtils = require("object-utils-2");

var _padLeft = require("pad-left");

var _padLeft2 = _interopRequireDefault(_padLeft);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Remove a segment from a list
 * @param  {Segment} segment - object
 * @param  {Array<Segment>} segments - list
 * @returns {Array<Segment>} segments - list
 */
var removeSegment = exports.removeSegment = function removeSegment(segment, segments) {
  var _segments = (0, _objectUtils.clone)(segments);
  var isSeg = function isSeg(_segment) {
    return String(_segment.uuid) === String(segment.uuid);
  };
  var index = _segments.findIndex(isSeg);
  _segments.splice(index > -1 ? index : _segments.length, 1);
  return _segments;
};

/**
 * Add a segment to a list
 * @param  {Segment}  segment object
 * @param  {Array<Segment>} segments
 * @param {boolean} overwriteUuid?
 */
var addSegment = exports.addSegment = function addSegment(segment, segments) {
  var overwriteUuid = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

  var _segment = (0, _objectUtils.clone)(segment);
  var _segments = (0, _objectUtils.clone)(segments);
  if (!(0, _objectUtils.hasProperty)(_segment, "uuid") || !_segment.uuid || overwriteUuid !== undefined && overwriteUuid === true) {
    _segment["uuid"] = (0, _objectUtils.createUuid)();
  }
  var augmentedSegment = augmentSegmentData(_segment);
  _segments.push(augmentedSegment);
  return _segments;
};

/**
 * Find a segment in a list of segments
 * @param {String} uuid - for segment
 * @param {Array<Segment>} segments - arr
 * @returns {Segment|null} found segment or null
 */
var findSegment = exports.findSegment = function findSegment(uuid, segments) {
  var _segments = (0, _objectUtils.clone)(segments);
  var isSeg = function isSeg(_segment) {
    return String(_segment.uuid) === String(uuid);
  };
  return _segments.find(isSeg);
};

/**
 * update segment in a list
 * @param  {Segment}  segment object
 * @param  {Array<Segment>} segments
 * @return {Array<Segment>} segments
 */
var updateSegment = exports.updateSegment = function updateSegment(segment, segments) {
  var segmentClone = augmentSegmentData(segment);
  var _segments = (0, _objectUtils.clone)(segments);
  var isSeg = function isSeg(_segment) {
    return String(_segment.uuid) === String(segmentClone.uuid);
  };
  var index = _segments.findIndex(isSeg);
  _segments[index] = segmentClone;
  return _segments;
};

/**
 * Make totals for the collective segments in a training
 * @param {Array<Segment>} segments
 * @return {Total} total
 */
var makeSegmentsTotal = exports.makeSegmentsTotal = function makeSegmentsTotal(segments) {
  var totalObj = {
    distance: 0,
    duration: "00:00:00",
    pace: "00:00"
  };
  if (segments.length === 0) {
    return totalObj;
  }
  segments.forEach(function (segment) {
    var _segment = augmentSegmentData(segment);
    totalObj.distance += parseFloat(_segment.distance);
    var totalDurationObj = _moment2.default.duration(totalObj.duration).add(_segment.duration);
    totalObj.duration = formatDuration(totalDurationObj);
  });
  if ((0, _objectUtils.hasNoRealValue)(totalObj, "pace", totalObj.pace)) {
    totalObj.pace = makePace(totalObj);
  } else if ((0, _objectUtils.hasNoRealValue)(totalObj, "duration")) {
    totalObj.duration = makeDuration(totalObj);
  }
  return totalObj;
};

/**
 * Calculate transient segment data based on present data
 * @param  {Segment} segment
 * @return {Segment} segment
 */
var augmentSegmentData = exports.augmentSegmentData = function augmentSegmentData(segment) {
  var _segment = (0, _objectUtils.clone)(segment);
  _segment.pace = translateNamedPace(_segment.pace);
  if (canAugment(_segment)) {
    if ((0, _objectUtils.hasNoRealValue)(_segment, "duration")) {
      _segment.duration = makeDuration(_segment);
    }
    if ((0, _objectUtils.hasNoRealValue)(_segment, "pace")) {
      _segment.pace = makePace(_segment);
    }
    if ((0, _objectUtils.hasNoRealValue)(_segment, "distance")) {
      _segment.distance = makeDistance(_segment);
    }
  }
  _segment.isValid = isValidSegment(_segment);
  return _segment;
};

/**
 * Was a segment changed?
 * @param  {Segment}  segment object
 * @param  {Array<Segment>} segments
 * @return {boolean} is the segment dirty compared to what collection holds?
 */
var isDirtySegment = exports.isDirtySegment = function isDirtySegment(segment, segments) {
  var _segment = (0, _objectUtils.clone)(segment);
  var _segments = (0, _objectUtils.clone)(segments);
  var storedSegment = null;
  for (var i = 0, len = _segments.length; i < len; i++) {
    if (_segments[i].uuid === _segment.uuid) {
      storedSegment = _segments[i];
      break;
    }
  }
  if (storedSegment === null) {
    return false;
  }
  return storedSegment.distance !== _segment.distance || storedSegment.duration !== _segment.duration || storedSegment.pace !== _segment.pace;
};

/**
 * Can a segment be augmented or is it complete or too incomplete?
 * @param  {Segment} segment is part of a training
 * @return {boolean} if augmentable
 */
var canAugment = exports.canAugment = function canAugment(segment) {
  var _segment = (0, _objectUtils.clone)(segment);
  var augmentCount = 0;
  if ((0, _objectUtils.hasNoRealValue)(_segment, "distance")) augmentCount++;
  if ((0, _objectUtils.hasNoRealValue)(_segment, "duration")) augmentCount++;
  if ((0, _objectUtils.hasNoRealValue)(_segment, "pace")) augmentCount++;
  return augmentCount === 1;
};

/**
 * Given a Segment with enough data, is the data valid?
 * @param  {Segment}  segment [description]
 * @return {boolean}         [description]
 */
var isValidSegment = exports.isValidSegment = function isValidSegment(segment) {
  var segmentClone = (0, _objectUtils.clone)(segment);
  // if (makeDistance(segmentClone).toString()
  //    !== Number(segmentClone.distance).toFixed(3).toString()) {
  //  return false;
  // }
  if (makeDuration(segmentClone) !== segmentClone.duration) {
    return false;
  }
  return makePace(segmentClone) === segmentClone.pace;
};

/**
 * parse a duration from:
 * a. int minutes to a duration as string 00:00:00
 * b. from 00:00 to 00:00:00
 * @param {string|number} duration as string, format: HH:mm:ss or int, ex: 945
 * @return {Duration|string} as a moment.js obj
 */
var parseDuration = exports.parseDuration = function parseDuration(duration) {
  if (duration !== null && duration !== "") {
    if (!isNaN(duration)) {
      return (0, _moment2.default)("2016-01-01").minutes(duration).format("HH:mm:ss");
    }
    if (duration.length === 5) {
      return "00:" + duration;
    }
  }
  return duration;
};

/**
 * TODO unit test and fix
 * @param {Segment} original pace as mm:ss
 * @return {string} pace as mm:ss
 */
/*
export function makePaceAt400(pace) {
  const durationObj = moment.duration(pace);
  const seconds = durationObj.asSeconds();
  const paceObj = moment.duration(Math.round((seconds / 10) * 4), "seconds");
  return `${padLeft(paceObj.minutes())}:${padLeft(paceObj.seconds())}`;
};
*/

/**
 * @param {Duration} moment.duration obj
 * @return {String} HH:mm:ss NL
 */
var formatDuration = function formatDuration(duration) {
  return (0, _padLeft2.default)(duration.hours(), 2, "0") + ":" + (0, _padLeft2.default)(duration.minutes(), 2, "0") + ":" + (0, _padLeft2.default)(duration.seconds(), 2, "0");
};

/**
 * @param {Segment|Object} segment object
 * @return {string} pace as mm:ss
 */
var makePace = function makePace(segment) {
  var _segment = (0, _objectUtils.clone)(segment);
  var durationObj = _moment2.default.duration(_segment.duration);
  var seconds = durationObj.asSeconds();
  var paceObj = _moment2.default.duration(Math.round(seconds / _segment.distance), "seconds");
  return (0, _padLeft2.default)(paceObj.minutes(), 2, "0") + ":" + (0, _padLeft2.default)(paceObj.seconds(), 2, "0");
};

/**
 * @param {Segment} segment object
 * Make duration based on distance and pace
 * @return {string} HH:mm:ss as: ex: 5:10 * 12.93 km = 1:6:48
 */
var makeDuration = function makeDuration(segment) {
  var _segment = (0, _objectUtils.clone)(segment);
  var paceObj = _moment2.default.duration(_segment.pace);
  var seconds = paceObj.asSeconds() / 60;
  var totalSeconds = Math.round(seconds * _segment.distance);
  var durationObj = _moment2.default.duration(totalSeconds, "seconds");
  return formatDuration(durationObj);
};

/**
 * @param {Segment} segment object
 * @return {number} distance. Calculated distance based on duration / pace
 */
var makeDistance = function makeDistance(segment) {
  var _segment = (0, _objectUtils.clone)(segment);
  var paceObj = _moment2.default.duration(_segment.pace);
  var durationObj = _moment2.default.duration(_segment.duration);
  var durationSeconds = durationObj.asSeconds();
  var paceSeconds = paceObj.asSeconds() / 60;
  if (paceSeconds === 0 || durationSeconds === 0) {
    return 0;
  }
  var rawDistance = durationSeconds / paceSeconds;
  return Math.round(rawDistance * 1000) / 1000;
};

var isDuration = function isDuration(str) {
  return (/^(\d){2}(:)(\d){2}(:)(\d){2}/.test(str)
  );
};

// TODO extract to config
/**
 * Translate a pace with an @ to a real pace
 * @param  {string} pace is a description starting with an @
 * @return {string} realPace is pace as mm:ss
 */
var translateNamedPace = function translateNamedPace(pace) {
  if (pace === undefined || pace === null || !pace.startsWith("@")) {
    return pace;
  }
  switch (pace) {
    case "@RECOV":
      return "05:30";
    case "@EASY":
      return "05:10";
    case "@LRP":
      return "04:45";
    case "@MP":
      return "04:05";
    case "@MP+5%":
      return "04:17";
    case "@21KP":
      return "03:53";
    case "@16KP":
      return "03:49";
    case "@LT":
      return "03:49";
    case "@10KP":
      return "03:36";
    case "@5KP":
      return "03:30";
    case "@3KP":
      return "03:21";
    case "@MIP":
      return "03:10";
    default:
      return pace;
  }
};
