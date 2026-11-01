# Talk to Strangers
One-on-one random text and video chat. Created by Sai Anvesh Reddy.

## Run locally
    npm install
    npm start
Open http://localhost:3000 in two browser windows and press Text chat in both.

## Put it online
Deploy this folder to any Node host (Render, Railway, Fly.io). Build command: `npm install`. Start command: `npm start`. The host must serve HTTPS, because browsers only allow camera access on HTTPS.

## Notes
- Video uses WebRTC with Google's free STUN server. Some networks also need a TURN server; add one to `iceServers` in index.html.
- Reports are logged on the server console. Before a public launch add real moderation, rate limits per IP, a terms page and a way to ban users.
