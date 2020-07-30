const express = require('express');
const cors = require('cors');

const app = express();

app.use(express.json());
app.use(cors());

app.post('/', require('./addRating').addRating);

app.post(
  '/addRatingRulesSchema',
  require('./addRatingRulesSchema').addRatingRulesSchema,
);

app.post(
  '/updateRatingRulesSchema',
  require('./updateRatingRulesSchema').updateRatingRulesSchema,
);

app.get('/getPlaceFromQuery', require('./getPlaceFromQuery').getPlaceFromQuery);

app.get('/getNearbyPlaces', require('./getNearbyPlaces').getNearbyPlaces);

app.get('/getChanges', require('./getChanges').getChanges);

app.get('/getPlaceRating', require('./getPlaceRating').getPlaceRating);

app.listen(5000, () => console.log('Listening on port 5000'));
