const express = require('express');
const app = express();
const SpotifyWebApi = require('spotify-web-api-node');
const path = require('path');
require('dotenv').config();

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI
});

let accessToken = '';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.render('index');
});

app.get('/login', (req, res) => {
  const scopes = ['user-read-private', 'user-top-read', 'playlist-read-private'];
  const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
  res.redirect(authorizeURL);
});

app.get('/callback', async (req, res) => {
  const { code } = req.query;
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    accessToken = data.body['access_token'];
    spotifyApi.setAccessToken(accessToken);
    spotifyApi.setRefreshToken(data.body['refresh_token']);

    setInterval(async () => {
      try {
        const refreshedToken = await spotifyApi.refreshAccessToken();
        accessToken = refreshedToken.body['access_token'];
        spotifyApi.setAccessToken(accessToken);
      } catch (error) {
        console.error('Ошибка обновления токена:', error);
      }
    }, 3500 * 1000);

    res.redirect('/');
  } catch (error) {
    console.error('Ошибка авторизации:', error);
    res.send('Ошибка авторизации: ' + error);
  }
});

app.get('/stats/:term', async (req, res) => {
  try {
    if (!accessToken) {
      throw new Error('Нет токена');
    }
    spotifyApi.setAccessToken(accessToken);
    const term = req.params.term;
    const data = await spotifyApi.getMyTopTracks({ time_range: term, limit: 10 });
    res.render('stats', { tracks: data.body.items, term });
  } catch (error) {
    console.error('Ошибка получения данных:', error);
    res.status(500).send('Ошибка получения данных: ' + error.message);
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Сервер работает на http://localhost:${port}`);
});
