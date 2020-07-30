const { Request, Response } = require('node-fetch');
const util = require('util');

exports.getPlaceRating = (
  request = new Request(),
  response = new Response(),
) => {
  const debuglog = util.debuglog('getPlaceRating');

  if (
    request.headers.hasOwnProperty('authorization') &&
    typeof request.headers.authorization === 'string' &&
    request.headers.authorization.trim().length > 0
  ) {
    if (
      request.query.hasOwnProperty('placeId') &&
      typeof request.query.placeId === 'string' &&
      request.query.placeId.trim().length > 0
    ) {
      const admin = require('firebase-admin');
      const placeId = request.query.placeId.trim();

      if (admin.apps.length <= 0) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
      }

      admin
        .auth()
        .getUser(request.headers.authorization)
        .then(_ => {
          const db = admin.firestore();

          const placeRatingDoc = db.collection('places').doc(placeId);
          const userRatingQuery = db
            .collection('userRatings')
            .where('placeId', '==', placeId);

          const allSettled = require('promise.allsettled');

          allSettled([placeRatingDoc.get(), userRatingQuery.get()]).then(
            results => {
              if (
                results[0].status === 'fulfilled' &&
                results[0].value.exists
              ) {
                if (results[0].value.exists) {
                  const tmpResponse = {
                    placeRating: results[0].value.data(),
                    userRatings: [],
                  };

                  if (results[1].status === 'fulfilled') {
                    results[1].value.forEach(queryDocSnapshot => {
                      tmpResponse.userRatings.push(queryDocSnapshot.data());
                    });
                  }

                  response.json({ status: 'ok', ...tmpResponse });
                } else {
                  response.json({ status: 'no_place_rating' });
                }
              } else {
                response.json({ status: 'error' });
              }
            },
          );
        })
        .catch(_ => {
          response.json({ status: 'unauthorized' });
        });
    } else {
      response.json({ status: 'invalid_place_id' });
    }
  } else {
    response.json({ status: 'unauthorized' });
  }
};
