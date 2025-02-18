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
  res.render('index', { period: null });
});

app.get('/login', (req, res) => {
  const scopes = ['playlist-read-private', 'user-read-private', 'user-top-read'];
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
      const refreshedToken = await spotifyApi.refreshAccessToken();
      accessToken = refreshedToken.body['access_token'];
      spotifyApi.setAccessToken(accessToken);
    }, 3500 * 1000);

    res.redirect('/analyze');
  } catch (error) {
    res.send('Ошибка авторизации: ' + error);
  }
});

app.get('/analyze', (req, res) => {
  res.render('analysis', { period: null });
});

app.get('/stats/:period', async (req, res) => {
  const period = req.params.period;
  try {
    spotifyApi.setAccessToken(accessToken);
    const data = await spotifyApi.getMyTopTracks({ time_range: period, limit: 50 });
    const tracks = data.body.items;
    res.render('analysis', { tracks, period });
  } catch (error) {
    res.status(500).send('Ошибка при получении статистики: ' + error);
  }
});

// Добавление интерфейса с кнопками для выбора периода
app.get('/ui', (req, res) => {
  res.send(`
    <h1>Spotify Playlist Analyzer</h1>
    <button onclick="window.location.href='/stats/short_term'">За неделю</button>
    <button onclick="window.location.href='/stats/medium_term'">За месяц</button>
    <button onclick="window.location.href='/stats/long_term'">За год</button>
  `);
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Сервер работает на http://localhost:${port}`);
});