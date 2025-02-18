const express = require('express');
const session = require('express-session');
const app = express();
const SpotifyWebApi = require('spotify-web-api-node');
const path = require('path');
require('dotenv').config();

app.use(session({
  secret: 'spotifyanalyzersecret',
  resave: false,
  saveUninitialized: true,
}));

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: process.env.REDIRECT_URI
});

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
    req.session.accessToken = data.body['access_token'];
    req.session.refreshToken = data.body['refresh_token'];
    spotifyApi.setAccessToken(req.session.accessToken);
    spotifyApi.setRefreshToken(req.session.refreshToken);

    setInterval(async () => {
      const refreshedToken = await spotifyApi.refreshAccessToken();
      req.session.accessToken = refreshedToken.body['access_token'];
      spotifyApi.setAccessToken(req.session.accessToken);
    }, 3500 * 1000);

    res.redirect('/');
  } catch (error) {
    res.send('Ошибка авторизации: ' + error);
  }
});

app.get('/stats/:term', async (req, res) => {
  if (!req.session.accessToken) {
    return res.status(401).send('Ошибка получения данных: Нет токена');
  }
  spotifyApi.setAccessToken(req.session.accessToken);
  try {
    const term = req.params.term;
    const data = await spotifyApi.getMyTopTracks({ time_range: term, limit: 10 });
    res.render('stats', { tracks: data.body.items, term });
  } catch (error) {
    res.status(500).send('Ошибка получения данных: ' + error);
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Сервер работает на http://localhost:${port}`);
});