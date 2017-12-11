import moment from "moment";
import {
  createUuid,
  clone,
  hasNoRealValue,
  hasProperty,
} from "object-utils-2";
import padLeft from "pad-left";

/**
 * Remove a segment from a list
 * @param  {Segment} segment - object
 * @param  {Array<Segment>} segments - list
 * @returns {Array<Segment>} segments - list
 */
export const removeSegment = (segment, segments) => {
  const _segments = clone(segments);
  const isSeg = _segment => String(_segment.uuid) === String(segment.uuid);
  const index = _segments.findIndex(isSeg);
  _segments.splice((index > -1) ? index : _segments.length, 1);
  return _segments;
};

/**
 * Add a segment to a list
 * @param  {Segment}  segment object
 * @param  {Array<Segment>} segments
 * @param {boolean} overwriteUuid?
 */
export const addSegment = (segment, segments, overwriteUuid = false) => {
  const _segment = clone(segment);
  const _segments = clone(segments);
  if (!hasProperty(_segment, "uuid") || !_segment.uuid ||
    (overwriteUuid !== undefined && overwriteUuid === true)) {
    _segment["uuid"] = createUuid();
  }
  const augmentedSegment = augmentSegmentData(_segment);
  _segments.push(augmentedSegment);
  return _segments;
};

/**
 * Find a segment in a list of segments
 * @param {String} uuid - for segment
 * @param {Array<Segment>} segments - arr
 * @returns {Segment|null} found segment or null
 */
export const findSegment = (uuid, segments) => {
  const _segments = clone(segments);
  const isSeg = _segment => String(_segment.uuid) === String(uuid);
  return _segments.find(isSeg);
};

/**
 * update segment in a list
 * @param  {Segment}  segment object
 * @param  {Array<Segment>} segments
 * @return {Array<Segment>} segments
 */
export const updateSegment = (segment, segments) => {
  const _segment = augmentSegmentData(segment);
  const _segments = clone(segments);
  const isSeg = _segment => String(_segment.uuid) === String(_segment.uuid);
  const index = _segments.findIndex(isSeg);
  _segments[index] = _segment;
  return _segments;
};

/**
 * Make totals for the collective segments in a training
 * @param {Array<Segment>} segments
 * @return {Object<Total>} total
 */
export const makeSegmentsTotal = segments => {
  const totalObj = {
    distance: 0,
    duration: "00:00:00",
    pace: "00:00",
  };
  if (segments.length === 0) {
    return totalObj;
  }
  segments.forEach(segment => {
    const _segment = augmentSegmentData(segment);
    totalObj.distance += parseFloat(_segment.distance);
    const totalDurationObj = moment.duration(totalObj.duration).add(_segment.duration);
    totalObj.duration = formatDuration(totalDurationObj);
  });
  if (hasNoRealValue(totalObj, "pace", totalObj.pace)) {
    totalObj.pace = makePace(totalObj);
  } else if (hasNoRealValue(totalObj, "duration")) {
    totalObj.duration = makeDuration(totalObj);
  }  
  return totalObj;
};

/**
 * Calculate transient segment data based on present data
 * @param  {Object<Segment>} segment
 * @return {Segment} segment
 */
export const augmentSegmentData = segment => {
  const _segment = clone(segment);
  _segment.pace = translateNamedPace(_segment.pace);
  if (canAugment(_segment)) {
    if (hasNoRealValue(_segment, "duration")) {
      _segment.duration = makeDuration(_segment);
    }
    if (hasNoRealValue(_segment, "pace")) {
      _segment.pace = makePace(_segment);
    }
    if (hasNoRealValue(_segment, "distance")) {
      _segment.distance = makeDistance(_segment);
    }
  }
  _segment.isValid = isValidSegment(_segment);
  return _segment;
};

/**
 * Was a segment changed?
 * @param  {Object<Segment>}  segment object
 * @param  {Array<Segment>} segments
 * @return {boolean} is the segment dirty compared to what collection holds?
 */
export const isDirtySegment = (segment, segments) => {
  const _segment = clone(segment);
  const _segments = clone(segments);
  const isSeg = _segment => String(_segment.uuid) === String(_segment.uuid);
  const index = _segments.findIndex(isSeg);
  if (index === -1) {
    return false;
  }
  const storedSegment = _segments[index];
  return (storedSegment.distance !== _segment.distance
    || storedSegment.duration !== _segment.duration
    || storedSegment.pace !== _segment.pace);
};

/**
 * Can a segment be augmented or is it complete or too incomplete?
 * @param  {Object<Segment>} segment is part of a training
 * @return {boolean} if augmentable
 */
export const canAugment = segment => {
  const _segment = clone(segment);
  let augmentCount = 0;
  if (hasNoRealValue(_segment, "distance")) augmentCount++;
  if (hasNoRealValue(_segment, "duration")) augmentCount++;
  if (hasNoRealValue(_segment, "pace")) augmentCount++;
  return augmentCount === 1;
};

/**
 * Given a Segment with enough data, is the data valid?
 * @param  {Object<Segment>}  segment [description]
 * @return {boolean}         [description]
 */
export const isValidSegment = segment => {
  const _segment = clone(segment);
  if (makeDistance(_segment).toString() !== Number(_segment.distance).toFixed(3).toString()) {
    return false;
  }
  if (makeDuration(_segment) !== _segment.duration) {
    return false;
  }
  return makePace(_segment) === _segment.pace;
};

/**
 * parse a duration from:
 * a. int minutes to a duration as string 00:00:00
 * b. from 00:00 to 00:00:00
 * @param {string|number} duration as string, format: HH:mm:ss or int, ex: 945
 * @return {Duration|string} as a moment.js obj
 */
export const parseDuration = duration => {
  if (duration !== null && duration !== "") {
    if (!isNaN(duration)) {
      return moment("2016-01-01").minutes(duration).format("HH:mm:ss");
    }
    if (duration.length === 5) {
      return `00:${duration}`;
    }
  }
  return duration;
};

/**
 * rework a default 1 km pace to a 400 meters pace
 * @param {string} pace - original pace as mm:ss
 * @return {string} pace - converted pace as mm:ss
 */
export const convertPaceTo400 = pace => {
  const durationObj = moment.duration(`00:${pace}`);
  const seconds = durationObj.asSeconds();
  const paceObj = moment.duration(Math.round((seconds / 10) * 4), "seconds");
  return `${padLeft(paceObj.minutes(), 2, "0")}:${padLeft(paceObj.seconds(), 2, "0")}`;
};

/**
 * @param {Duration} duration - as moment js duration obj
 * @return {String} HH:mm:ss NL
 */
const formatDuration = duration =>
  `${padLeft(duration.hours(), 2, "0")}:${padLeft(duration.minutes(), 2, "0")}:${padLeft(duration.seconds(), 2, "0")}`;

/**
 * @param {Segment|Object} segment object
 * @return {string} pace as mm:ss
 */
const makePace = segment => {
  const _segment = clone(segment);
  const durationObj = moment.duration(_segment.duration);
  const seconds = durationObj.asSeconds();
  const paceObj = moment.duration(Math.round(seconds / _segment.distance), "seconds");
  return `${padLeft(paceObj.minutes(), 2, "0")}:${padLeft(paceObj.seconds(), 2, "0")}`;
};

/**
 * @param {Object<Segment>} segment object
 * Make duration based on distance and pace
 * @return {string} HH:mm:ss as: ex: 5:10 * 12.93 km = 1:6:48
 */
const makeDuration = segment => {
  const _segment = clone(segment);
  const paceObj = moment.duration(_segment.pace);
  const seconds = paceObj.asSeconds() / 60;
  const totalSeconds = Math.round(seconds * _segment.distance);
  const durationObj = moment.duration(totalSeconds, "seconds");
  return formatDuration(durationObj);
};

/**
 * @param {Segment} segment object
 * @return {number} distance. Calculated distance based on duration / pace
 */
const makeDistance = segment => {
  const _segment = clone(segment);
  const paceObj = moment.duration(_segment.pace);
  const durationObj = moment.duration(_segment.duration);
  const durationSeconds = durationObj.asSeconds();
  const paceSeconds = paceObj.asSeconds() / 60;
  if (paceSeconds === 0 || durationSeconds === 0) {
    return 0;
  }
  const rawDistance = durationSeconds / paceSeconds;
  return Math.round(rawDistance * 1000) / 1000;
};

const isDuration = (str) => {
  return /^(\d){2}(:)(\d){2}(:)(\d){2}/.test(str);
};

// TODO extract to config
/**
 * Translate a pace with an @ to a real pace
 * @param  {string} pace is a description starting with an @
 * @return {string} realPace is pace as mm:ss
 */
const translateNamedPace = pace => {
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
