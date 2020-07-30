const functions = require('firebase-functions');

exports.addRating = functions
  .region('europe-west3')
  .https.onRequest(require('./addRating').addRating);

exports.addRatingRulesSchema = functions
  .region('europe-west3')
  .https.onRequest(require('./addRatingRulesSchema').addRatingRulesSchema);

exports.updateRatingRulesSchema = functions
  .region('europe-west3')
  .https.onRequest(
    require('./updateRatingRulesSchema').updateRatingRulesSchema,
  );

exports.getPlaceFromQuery = functions
  .region('europe-west3')
  .https.onRequest(require('./getPlaceFromQuery').getPlaceFromQuery);

exports.getNearbyPlaces = functions
  .region('europe-west3')
  .https.onRequest(require('./getNearbyPlaces').getNearbyPlaces);

exports.getChanges = functions
  .region('europe-west3')
  .https.onRequest(require('./getChanges').getChanges);

exports.getPlaceRating = functions
  .region('europe-west3')
  .https.onRequest(require('./getPlaceRating').getPlaceRating);
