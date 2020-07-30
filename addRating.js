const { Request, Response } = require('node-fetch');
const util = require('util');

exports.addRating = (request = new Request(), response = new Response()) => {
  const debuglog = util.debuglog('addRating');

  if (
    request.headers.hasOwnProperty('authorization') &&
    typeof request.headers.authorization === 'string' &&
    request.headers.authorization.trim().length > 0
  ) {
    const admin = require('firebase-admin');

    // TODO FIREBASE_CONFIG and GCLOUD_PROJECT will be provided automatically in production
    // const adminConfig = JSON.parse(process.env.FIREBASE_CONFIG);

    if (admin.apps.length <= 0)
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });

    admin
      .auth()
      .getUser(request.headers.authorization)
      .then(_ => {
        const { isRatingValid } = require('./lib/helpers');

        if (isRatingValid(request.body)) {
          const db = admin.firestore();

          const placeRulesDoc = db
            .collection('placeRules')
            .doc(request.body.placeType);

          const userRatingDoc = db
            .collection('userRatings')
            .doc(
              `${request.headers.authorization}-${request.body.placeId}-${request.body.ruleId}`,
            );

          const placeDocRef = db.collection('places').doc(request.body.placeId);

          const userDoc = db
            .collection('users')
            .doc(request.headers.authorization);

          // TODO add .then on runTransaction
          db.runTransaction(transaction => {
            return transaction
              .getAll(placeRulesDoc, userRatingDoc, userDoc, placeDocRef)
              .then(
                ([
                  placeRulesDocSnapshot,
                  userRatingDocSnapshot,
                  userDocSnapshot,
                  placeDocSnapshot,
                ]) => {
                  if (placeRulesDocSnapshot.exists) {
                    if (
                      !userRatingDocSnapshot.exists ||
                      userRatingDocSnapshot.data().vote !== request.body.vote
                    ) {
                      const { placeId, placeType, ruleId, vote } = request.body;

                      // place
                      if (vote !== -1 && placeDocSnapshot.exists) {
                        const { calculateNewRating } = require('./lib/helpers');

                        const newRating = calculateNewRating(
                          placeDocSnapshot.data().rules,
                          ruleId,
                          vote,
                        );

                        debuglog(
                          `newRating: ${JSON.stringify(newRating, null, 2)}`,
                        );

                        if (newRating) {
                          transaction.set(
                            placeDocRef,
                            { ...newRating },
                            { merge: true },
                          );
                        } else {
                          return Promise.resolve('error');
                        }
                      } else if (vote !== -1) {
                        // placeDocSnapshot.exists === false
                        const { calculateNewRating } = require('./lib/helpers');

                        const newRating = calculateNewRating(
                          placeRulesDocSnapshot.data().rules,
                          ruleId,
                          vote,
                        );

                        debuglog(
                          `newRating: ${JSON.stringify(newRating, null, 2)}`,
                        );

                        if (newRating) {
                          transaction.set(placeDocRef, {
                            placeType,
                            ...newRating,
                          });
                        } else {
                          return Promise.resolve('error');
                        }
                      }

                      const changeDoc = db.collection('changes').doc();

                      // userRating and change
                      let from;
                      const ruleIndex = placeRulesDocSnapshot
                        .data()
                        .rules.findIndex(rule => rule.id === ruleId);

                      const rule = placeRulesDocSnapshot.data().rules[
                        ruleIndex
                      ];

                      if (userRatingDocSnapshot.exists) {
                        from = userRatingDocSnapshot.data().vote;
                      } else {
                        from = -1;
                      }

                      const date = new Date().valueOf();

                      transaction
                        .set(changeDoc, {
                          uid: request.headers.authorization,
                          placeId,
                          placeType,
                          rule,
                          from,
                          to: vote,
                          date,
                        })
                        .set(userRatingDoc, {
                          uid: request.headers.authorization,
                          placeId,
                          placeType,
                          rule,
                          vote,
                          date,
                        });

                      let ratedPlaces;
                      if (userDocSnapshot.exists) {
                        ratedPlaces = userDocSnapshot.data().ratedPlaces;

                        const ratedPlaceIndex = ratedPlaces.findIndex(
                          r => r.placeId === placeId,
                        );

                        if (ratedPlaceIndex < 0) {
                          debuglog(
                            `User ${request.headers.authorization} had not rated ${placeId} before.`,
                          );

                          ratedPlaces = [
                            ...ratedPlaces,
                            { placeId, lastUpdate: date },
                          ];
                        } else {
                          debuglog(
                            `User ${request.headers.authorization} had rated ${placeId} before. Changing the date`,
                          );

                          ratedPlaces[ratedPlaceIndex].lastUpdate = date;
                        }
                      } else {
                        debuglog(
                          `Document for ${request.headers.authorization} did not exist. Creating it`,
                        );

                        ratedPlaces = [{ placeId, lastUpdate: date }];
                      }

                      transaction.set(userDoc, { ratedPlaces });
                    } // whether the new vote is the same as the old one or not
                  } else {
                    return Promise.resolve('invalid_place_type');
                  }

                  return Promise.resolve('ok');
                },
              );
          }).then(status => {
            response.json({ status });
          });
        } else {
          response.json({ status: 'invalid_rating' });
        }
      })
      .catch(_ => {
        response.json({ status: 'unauthorized' });
      });
  } else {
    response.json({ status: 'unauthorized' });
  }
};
