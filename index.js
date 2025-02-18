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

app.get('/login', (req, res) => {
  const scopes = ['playlist-read-private', 'user-read-private'];
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

app.get('/analyze', async (req, res) => {
  try {
    if (!accessToken) return res.send('Нет токена. Пожалуйста, авторизуйтесь заново.');
    spotifyApi.setAccessToken(accessToken);
    const data = await spotifyApi.getUserPlaylists();
    const playlists = data.body.items;

    const analysis = await Promise.all(playlists.map(async (playlist) => {
      const tracksData = await spotifyApi.getPlaylistTracks(playlist.id);
      const tracks = tracksData.body.items.map(item => item.track);
      const artists = {};
      tracks.forEach(track => {
        track.artists.forEach(artist => {
          artists[artist.name] = (artists[artist.name] || 0) + 1;
        });
      });
      const topArtists = Object.entries(artists).sort((a, b) => b[1] - a[1]).slice(0, 5);
      return { name: playlist.name, total_tracks: tracks.length, top_artists: topArtists };
    }));

    res.render('analysis', { total_playlists: playlists.length, analysis });
  } catch (error) {
    res.status(500).send('Ошибка при анализе плейлистов: ' + error);
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`Сервер работает на http://localhost:${port}`);
});