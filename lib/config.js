module.exports = {
  // TODO baseUrl should be deleted upon release
  baseURL:
    process.env.BUILD_TYPE === 'RELEASE'
      ? 'https://maps.googleapis.com/maps/api/place'
      : 'http://localhost:5001',
};
