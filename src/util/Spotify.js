// TODO the clientId should not be committed to a public repo, so remove it and load it from a file?
const clientId = "4038f3de698c45eb851e9da2d62b7664";
const spotifySearchAPI = 'https://api.spotify.com/v1/search';
const spotifyUserProfileAPI = 'https://api.spotify.com/v1/me';
// @Reviewer: what's the preferred way to store urls with dynamic content?
const spotifyPlaylistAPI = 'https://api.spotify.com/v1/users/${userId}/playlists';
const spotifyPlaylistTracksAPI = 'https://api.spotify.com/v1/users/${userId}/playlists/${playlistId}/tracks';
const spotifyRedirectUrl = "http://localhost:3000";

let accessToken;
let expiresIn;

const Spotify = {

    getAccessToken() {
        // 1. case: already there?
        if (accessToken) {
            return accessToken;
        }
        // 2. case: already in URL?
        let url = window.location.href;
        accessToken = this.extract(url, "access_token=", "&");
        if (accessToken) {
            expiresIn = this.extract(url, "expires_in=", "&");
            window.setTimeout(() => accessToken = '', expiresIn * 1000);
            window.history.pushState('Access Token', null, '/');
            console.log("access token successful retrieved.");
            return accessToken;
        } else {
            // 3. case: fetch from spotify
            let state = 4321; // TODO generate state, save to app-state and validate
            window.location.href = `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=token&scope=playlist-modify-private&redirect_uri=${spotifyRedirectUrl}&state=${state}`;
        }
    },

    /* returns a promise */
    search(term) {
        return fetch(`${spotifySearchAPI}?type=track&q=${term}`,
            {headers: this.buildAuthorizationHeader()})
            .then(response => response.json())
            .then(jsonResponse => {
                if (jsonResponse.tracks) {
                    return jsonResponse.tracks.items.map(function(track) {
                        return {
                            id: track.id,
                            name: track.name,
                            uri: track.uri,
                            album: track.album.name,
                            artist: track.artists[0].name
                        }}
                    )}
                else {
                    return [];
                }
            });
    },

    /* returns a promise */
    savePlaylist(name, trackURIs) {
      return fetch(`${spotifyUserProfileAPI}`,
          {headers: this.buildAuthorizationHeader()})
          .then(response => response.json())
          .then(jsonResponse => {
              let userId = jsonResponse.id;
              return this.createPlaylistWithTracks(userId, name, trackURIs);
          });
    },

    /* returns a promise */
    createPlaylistWithTracks(userId, playlistName, playlistTracks) {
        let jsonBody = JSON.stringify({name: playlistName, public: false});
        let url = spotifyPlaylistAPI.replace("${userId}", userId);
        return fetch(url, { headers: this.buildAuthorizationHeader(),
            method:'POST', body: jsonBody})
            .then(response => this.handleResponse(response))
            .then(jsonResponse => {
                console.log("playlist successful created.");
                let playlistId = jsonResponse.id;
                return this.saveTracksToPlaylist(userId, playlistId, playlistTracks);
            });
    },

    /* returns a promise */
    saveTracksToPlaylist(userId, playlistId, playlistTracks) {
        let jsonBody = JSON.stringify(playlistTracks);
        let url = spotifyPlaylistTracksAPI.replace("${userId}", userId).replace("${playlistId}", playlistId);
        return fetch(url, { headers: this.buildAuthorizationHeader(),
            method:'POST', body: jsonBody})
            .then(response => this.handleResponse(response))
            .then(jsonResponse => {
                console.log("tracks successful stored");
                return jsonResponse.snapshot_id;
            });
    },

    /* returns a promise */
    handleResponse(response) {
        if (response.ok) {
            return response.json();
        }
        throw new Error('Request failed!');
    },

    buildAuthorizationHeader() {
        let token = this.getAccessToken();
        return {Authorization: `Bearer ${token}`};
    },

    /* extracts everything between the end of the keyword and the limiter from the string. if the keyword
     * was not found, return undefined. */
    // TODO write some tests for this
    extract(string, keyword, limiter) {
        let startIndex = string.indexOf(keyword);
        if (startIndex !== -1) {
            // add the length of the keyword to the start position to get the "real" start
            startIndex += keyword.length;
            let endIndex = string.indexOf(limiter, startIndex);
            if (endIndex !== -1) {
                return string.slice(startIndex, endIndex);
            } else {
                return string.slice(startIndex);
            }
        }
        return undefined;
    }
};

export default Spotify;