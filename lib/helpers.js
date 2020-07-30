exports.validPlaceTypes = Object.freeze({
  bank: 'BANK',
  restaurant: 'RESTAURANT',
});

exports.validFields = [
  'address_component',
  'business_status',
  'formatted_address',
  'geometry',
  'icon',
  'international_phone_number',
  'name',
  'opening_hours',
  'photo',
  'place_id',
  'type',
  'url',
  'utc_offset',
  'vicinity',
];

exports.isRatingValid = rating => {
  const util = require('util');
  const debuglog = util.debuglog('addRating');

  debuglog(JSON.stringify(rating, null, 2));
  if (typeof rating === 'object' && !Array.isArray(rating)) {
    return (
      rating.hasOwnProperty('placeId') &&
      typeof rating.placeId === 'string' &&
      rating.placeId.trim().length > 0 &&
      rating.hasOwnProperty('placeType') &&
      typeof rating.placeType === 'string' &&
      rating.placeType.trim().length > 0 &&
      rating.hasOwnProperty('ruleId') &&
      typeof rating.ruleId === 'number' &&
      rating.hasOwnProperty('vote') &&
      [-1, 0, 1].includes(rating.vote)
    );
  } else return false;
};

exports.calculateNewRating = (rules, ruleId, vote) => {
  const ruleIndex = rules.findIndex(rule => rule.id === ruleId);

  if (ruleIndex > -1) {
    const rule = rules[ruleIndex];

    ++rule.definiteAnswersCount;
    if (vote === 1) ++rule.positiveAnswersCount;

    rule.score = Math.round(
      (rule.positiveAnswersCount / rule.definiteAnswersCount) * 100,
    );

    let count = 0;
    let finalRating = 0;
    for (let rule of rules) {
      if (rule.definiteAnswersCount > 0) {
        ++count;
        finalRating += rule.score;
      }
    }

    finalRating = Math.round(finalRating / count);

    return { rules, finalRating };
  } else return false;
};

exports.isRulesSchemaValid = schema => {
  if (typeof schema === 'object' && !Array.isArray(schema)) {
    if (
      schema.hasOwnProperty('rules') &&
      Array.isArray(schema.rules) &&
      schema.rules.length > 0
    ) {
      for (let rule of schema.rules) {
        if (
          !(
            rule.hasOwnProperty('id') &&
            typeof rule.id === 'number' &&
            rule.id >= 0 &&
            rule.hasOwnProperty('name') &&
            typeof rule.name === 'string' &&
            rule.name.trim().length > 0
          )
        )
          return false;
      }

      return true;
    } else return false;
  } else return false;
};

// returns a promise for fetching nearby places of a certain type
exports.getNearbyPlacesOfType = (loc, type, radius = 500) => {
  const util = require('util');
  const debuglog = util.debuglog('getNearbyPlaces');

  if (
    typeof loc === 'string' &&
    loc.trim().length > 0 &&
    loc.trim().includes(',') &&
    typeof radius === 'number' &&
    radius > 0 &&
    radius <= 50000 &&
    typeof type === 'string' &&
    type.trim().length > 0 &&
    this.validPlaceTypes.hasOwnProperty(type)
  ) {
    debuglog(`loc: ${loc}\ttype: ${type}\tradius: ${radius}`);

    const fetch = require('node-fetch').default;
    const config = require('./config');

    debuglog(`baseURL: ${config.baseURL}`);

    const finalURL = `${config.baseURL}/nearbysearch/json?key=${
      require('firebase-functions').config().places.key
    }&location=${encodeURIComponent(loc)}&radius=${radius}&type=${type}`;

    debuglog(`finalURL: ${finalURL}`);

    return fetch(finalURL)
      .then(res => {
        if (res.ok) {
          return res.json();
        }
      })
      .catch(e => {
        debuglog(`GET to ${finalURL} rejected`);
        debuglog(`error: ${JSON.stringify(e, null, 2)}`);

        return Promise.reject('error');
      });
  } else {
    debuglog('Invalid parameters passed to function getNearbyPlacesOfType');

    return Promise.reject('error');
  }
};

exports.getPlaceDetailsForPlace = (
  placeId,
  language = 'en',
  fields = this.validFields,
) => {
  const util = require('util');
  const debuglog = util.debuglog('getNearbyPlaces');
  const debuglog1 = util.debuglog('getPlaceFromQuery');
  const debuglog2 = util.debuglog('getChanges');

  if (
    typeof placeId === 'string' &&
    placeId.trim().length > 0 &&
    ['en', 'el'].includes(language) &&
    Array.isArray(fields) &&
    fields.every(f => this.validFields.includes(f))
  ) {
    const fetch = require('node-fetch').default;
    const config = require('./config');
    debuglog(`baseURL: ${config.baseURL}`);
    debuglog1(`baseURL: ${config.baseURL}`);
    debuglog2(`baseURL: ${config.baseURL}`);

    const finalURL = `${config.baseURL}/details/json?key=${
      require('firebase-functions').config().places.key
    }&place_id=${placeId}&language=${language}&fields=${fields.join()}`;

    debuglog(`finalURL: ${finalURL}`);
    debuglog1(`finalURL: ${finalURL}`);
    debuglog2(`finalURL: ${finalURL}`);

    return fetch(finalURL)
      .then(res => {
        if (res.ok) {
          return res.json();
        }
      })
      .catch(e => {
        debuglog(`GET to ${finalURL} rejected`);
        debuglog1(`GET to ${finalURL} rejected`);
        debuglog2(`GET to ${finalURL} rejected`);

        debuglog(`error: ${JSON.stringify(e, null, 2)}`);
        debuglog1(`error: ${JSON.stringify(e, null, 2)}`);
        debuglog2(`error: ${JSON.stringify(e, null, 2)}`);

        return Promise.reject('error');
      });
  } else {
    debuglog('Invalid parameters passed to function getPlaceDetailsForPlace');
    debuglog1('Invalid parameters passed to function getPlaceDetailsForPlace');
    debuglog2('Invalid parameters passed to function getPlaceDetailsForPlace');

    return Promise.reject('error');
  }
};

// returns an array containing the IDs of the places in a Nearby Search response
exports.getPlaceIDsFromResponse = response => {
  if (
    typeof response === 'object' &&
    !Array.isArray(response) &&
    response.status === 'OK'
  ) {
    const placeIDs = [];
    for (let place of response.results) {
      placeIDs.push(place.place_id);
    }

    return placeIDs;
  } else return [];
};
