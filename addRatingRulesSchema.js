const { Request, Response } = require('node-fetch');

exports.addRatingRulesSchema = (
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
      const { isRulesSchemaValid } = require('./lib/helpers');

      if (isRulesSchemaValid(body.schema)) {
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
              if (placeRulesDocSnapshot.exists)
                return Promise.resolve({ exists: true });
              else {
                const { schema } = body;
                let rules = [];

                for (let rule of schema.rules) {
                  rules.push({
                    ...rule,
                    definiteAnswersCount: 0,
                    positiveAnswersCount: 0,
                    score: -1,
                  });
                }

                transaction.set(placeRulesDocRef, { rules });

                return Promise.resolve({ exists: false });
              }
            });
        }).then(({ exists }) => {
          if (exists)
            response.json({
              status: 'schema_exists',
            });
          else response.json({ status: 'ok' });
        });
      } else {
        request.json({ status: 'invalid_schema' });
      }
    } else {
      request.json({ status: 'invalid_place_type' });
    }
  } else responseponse.json({ status: 'unauthorized' });
};
