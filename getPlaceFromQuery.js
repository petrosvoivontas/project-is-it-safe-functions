const { Request, Response } = require('node-fetch');
const util = require('util');

exports.getPlaceFromQuery = (
  request = new Request(),
  response = new Response(),
) => {
  const debuglog = util.debuglog('getPlaceFromQuery');

  if (
    request.query.hasOwnProperty('textString') &&
    typeof request.query.textString === 'string' &&
    request.query.textString.trim().length > 0
  ) {
    const fetch = require('node-fetch').default;
    const config = require('./lib/config');
    debuglog(`baseURL: ${baseURL}`);

    const finalURL = `${config.baseURL}/findplacefromtext/json?key=${
      require('firebase-functions').config().places.key
    }&input=${encodeURIComponent(
      request.query.textString,
    )}&inputtype=textquery`;

    debuglog(`finalURL: ${finalURL}`);

    fetch(finalURL)
      .then(result => {
        if (result.ok) {
          return result.json();
        }
      })
      .then(jsonResponse => {
        if (jsonResponse.status === 'OK') {
          const { getPlaceDetailsForPlace } = require('./lib/helpers');

          const promises = [];

          if (
            request.query.hasOwnProperty('language') &&
            ['en', 'el'].includes(request.query.language)
          ) {
            debuglog(`language: ${language}`);
            for (let candidate of jsonResponse.candidates) {
              debuglog(`---[placeID: ${candidate.place_id}]---`);

              promises.push(
                getPlaceDetailsForPlace(
                  candidate.place_id,
                  request.query.language,
                ),
              );

              debuglog(`---[placeID: ${candidate.place_id}]---\n`);
            }
          } else {
            for (let candidate of jsonResponse.candidates) {
              debuglog(`---[placeID: ${candidate.place_id}]---`);

              promises.push(getPlaceDetailsForPlace(candidate.place_id));

              debuglog(`---[placeID: ${candidate.place_id}]---\n`);
            }
          }

          return Promise.all(promises);
        } else if (jsonResponse.status === 'ZERO_RESULTS') {
          debuglog(`findplacefromtext status: ${jsonResponse.status}`);

          return Promise.reject('no_places');
        } else {
          debuglog(`findplacefromtext status: ${jsonResponse.status}`);

          return Promise.reject('error');
        }
      })
      .then(placeDetails => {
        const places = [];

        for (let place of placeDetails) {
          if (place.status === 'OK') {
            places.push(place);
          }
        }

        response.json({ status: 'ok', places });
      })
      .catch(status => response.json({ status }));
  } else {
    response.json({ status: 'invalid_query' });
  }
};
