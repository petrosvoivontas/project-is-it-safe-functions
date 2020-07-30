const { Request, Response } = require('node-fetch');

exports.updateRatingRulesSchema = (
  request = new Request(),
  response = new Response(),
) => {
  const { body } = request;
  const serviceAccount = require('./lib/serviceAccount.json');

  if (request.headers.authorization === serviceAccount.private_key_id) {
    if (
      body.hasOwnProperty('placeType') &&
      typeof body.placeType === 'string' &&
      body.placeType.trim().length > 0
    ) {
      if (
        body.hasOwnProperty('mode') &&
        typeof body.mode === 'string' &&
        ['delete', 'merge', 'replace'].includes(body.mode)
      ) {
        const admin = require('firebase-admin');
        if (admin.apps.length <= 0)
          admin.initializeApp({
            credential: admin.credential.applicationDefault(),
          });

        const db = admin.firestore();

        const placeRulesDocRef = db
          .collection('placeRules')
          .doc(body.placeType);

        db.runTransaction(transaction => {
          return transaction
            .get(placeRulesDocRef)
            .then(placeRulesDocSnapshot => {
              if (placeRulesDocSnapshot.exists) {
                const previousRules = placeRulesDocSnapshot.data().rules;

                if (body.mode === 'delete') {
                  if (
                    body.hasOwnProperty('rulesToDelete') &&
                    Array.isArray(body.rulesToDelete)
                  ) {
                    // check that the ids correspond to existent rules
                    for (let id of body.rulesToDelete) {
                      const ruleId = previousRules.findIndex(
                        rule => rule.id === id,
                      );

                      if (ruleId < 0) {
                        return Promise.resolve('invalid_rule_id');
                      }

                      previousRules.splice(ruleId, 1);
                    }

                    transaction.set(placeRulesDocRef, {
                      rules: previousRules,
                    });
                  } else {
                    return Promise.resolve('invalid_rule_id');
                  }
                } else if (['merge', 'replace'].includes(body.mode)) {
                  if (body.hasOwnProperty('schema')) {
                    const { isRulesSchemaValid } = require('./lib/helpers');

                    if (isRulesSchemaValid(body.schema)) {
                      transaction.set(
                        placeRulesDocRef,
                        { rules: body.schema.rules },
                        { merge: body.mode === 'merge' },
                      );
                    } else {
                      return Promise.resolve('invalid_schema');
                    }
                  } else {
                    return Promise.resolve('invalid_schema');
                  }
                } else {
                  return Promise.resolve('invalid_mode');
                }
              } else {
                return Promise.resolve('schema_does_not_exist');
              }
            });
        }).then(status => response.json({ status }));
      } else {
        response.json({ status: 'invalid_mode' });
      }
    } else {
      response.json({ status: 'invalid_place_type' });
    }
  } else {
    response.json({ status: 'unauthorized' });
  }
};
