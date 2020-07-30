const { Request, Response } = require('node-fetch');
const util = require('util');

exports.getChanges = (request = new Request(), response = new Response()) => {
  const debuglog = util.debuglog('getChanges');

  if (
    request.headers.hasOwnProperty('authorization') &&
    typeof request.headers.authorization === 'string' &&
    request.headers.authorization.trim().length > 0
  ) {
    const admin = require('firebase-admin');
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

        db.collection('users')
          .doc(request.headers.authorization)
          .get()
          .then(userRefSnaphot => {
            if (userRefSnaphot.exists) {
              const ratedPlaces = userRefSnaphot.data().ratedPlaces;

              if (ratedPlaces.length > 0) {
                ratedPlaces.sort((a, b) => b.lastUpdate - a.lastUpdate);

                const requestHasStartAt =
                  request.query.hasOwnProperty('startAt') &&
                  parseInt(request.query.startAt) &&
                  parseInt(request.query.startAt) >= 0;

                if (
                  requestHasStartAt &&
                  parseInt(request.query.startAt) >= ratedPlaces.length
                ) {
                  response.json({ status: 'no_more_changes' });
                } else {
                  const { getPlaceDetailsForPlace } = require('./lib/helpers');
                  const startAt = requestHasStartAt
                    ? parseInt(request.query.startAt)
                    : 0;

                  // store up to 8 placeIds
                  const placesToGet = [];
                  for (let i = startAt; i < startAt + 8; ++i) {
                    // get the name and the user's changes for the ratedPlace at i
                    placesToGet.push(
                      Promise.all([
                        getPlaceDetailsForPlace(ratedPlaces[i].placeId, 'en', [
                          'name',
                        ]),
                        db
                          .collection('changes')
                          .where('uid', '==', request.headers.authorization)
                          .where('placeId', '==', ratedPlaces[i].placeId)
                          .orderBy('date', 'desc')
                          .get(),
                      ]),
                    );

                    if (i === ratedPlaces.length - 1) {
                      break;
                    }
                  }

                  const allSettled = require('promise.allsettled');

                  allSettled(placesToGet).then(results => {
                    const finalChangesObjs = [];

                    for (let result of results) {
                      const tmpChangesObj = { placeName: '', changes: [] };

                      if (
                        result.status === 'fulfilled' &&
                        result.value[0].status === 'OK'
                      ) {
                        const [placeDetails, querySnapshot] = result.value;

                        tmpChangesObj.placeName = placeDetails.result.name;
                        querySnapshot.forEach(queryDocSnapshot => {
                          tmpChangesObj.changes.push(queryDocSnapshot.data());
                        });

                        finalChangesObjs.push(tmpChangesObj);
                      }
                    }

                    if (finalChangesObjs.length === 0) {
                      response.json({ status: 'no_changes' });
                    } else {
                      response.json({
                        status: 'ok',
                        changes: finalChangesObjs,
                      });
                    }
                  });
                }
              } else {
                debuglog(
                  `Document for user with uid ${request.headers.authorization} exists but user has not rated any places`,
                );

                response.json({ status: 'no_changes' });
              }
            } else {
              debuglog(
                `Document for user with uid ${request.headers.authorization} does not exist`,
              );

              response.json({ status: 'no_changes' });
            }
          })
          .catch(e => {
            debuglog(
              `Error while getting the user from Firestore: ${JSON.stringify(
                e,
                null,
                2,
              )}`,
            );

            response.json({ status: 'error' });
          });
      })
      .catch(_ => {
        debuglog('User does not exist');

        response.json({ status: 'unauthorized' });
      });
  } else {
    debuglog(
      'GET request to /getChanges did not include an authorization header',
    );

    response.json({ status: 'unauthorized' });
  }
};
