const { Request, Response } = require('node-fetch');
const util = require('util');

exports.getNearbyPlaces = (
  request = new Request(),
  response = new Response(),
) => {
  const debuglog = util.debuglog('getNearbyPlaces');

  if (
    request.query.hasOwnProperty('loc') &&
    typeof request.query.loc === 'string' &&
    request.query.loc.trim().length > 0 &&
    request.query.loc.includes(',')
  ) {
    const {
      validPlaceTypes,
      getNearbyPlacesOfType,
      getPlaceDetailsForPlace,
      getPlaceIDsFromResponse,
    } = require('./lib/helpers');
    let promises = [];

    for (let type of Object.keys(validPlaceTypes)) {
      debuglog(`---[placeType: ${type}]---`);
      promises.push(getNearbyPlacesOfType(request.query.loc.trim(), type));
      debuglog(`---[placeType: ${type}]---\n`);
    }

    Promise.all(promises)
      .then(nearbyPlaces => {
        promises = [];
        const placeIDs = [];

        // get place IDs from each of the place
        for (let result of nearbyPlaces) {
          placeIDs.push(...getPlaceIDsFromResponse(result));
        }

        if (placeIDs.length === 0) {
          return Promise.reject('no_places');
        }

        // get place details for each of the places
        if (
          request.query.hasOwnProperty('language') &&
          ['en', 'el'].includes(request.query.language)
        ) {
          // query includes language
          const { language } = request.query;
          debuglog(`language: ${language}`);

          for (let placeID of placeIDs) {
            debuglog(`---[placeID: ${placeID}]---`);
            promises.push(getPlaceDetailsForPlace(placeID, language));
            debuglog(`---[placeID: ${placeID}]---\n`);
          }
        } else {
          debuglog('---[placeIDs]---');
          for (let placeID of placeIDs) {
            debuglog(`placeID: ${placeID}`);
            promises.push(getPlaceDetailsForPlace(placeID));
          }
        }

        return Promise.all(promises);
      })
      .then(result => {
        const places = [];

        for (let place of result) {
          if (place.status === 'OK') {
            places.push(place);
          }
        }

        response.json({ status: 'ok', places }); // ok
      })
      .catch(status => response.json({ status }));
  } else {
    response.json({ status: 'invalid_location' }); // invalid_location
  }
};
