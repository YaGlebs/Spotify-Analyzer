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

// Главная страница с кнопками
app.get('/', (req, res) => {
  res.render('index', { title: 'Spotify Analyzer' });
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

// Анализ плейлистов
app.get('/analyze', async (req, res) => {
  try {
    spotifyApi.setAccessToken(accessToken);
    const data = await spotifyApi.getUserPlaylists();
    const playlists = data.body.items;
    res.render('analysis', { playlists, total_playlists: playlists.length });
  } catch (error) {
    res.status(500).send('Ошибка при анализе: ' + error);
  }
});

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Сервер работает на http://localhost:${port}`);
});
