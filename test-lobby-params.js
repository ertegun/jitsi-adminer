// Test different lobby config parameters

const jwt = require('jsonwebtoken');
const jitsiAppId = 'jitsi-e7e13546abbfed28';
const jitsiAppSecret = 'YhL23e5CMz//YWCgS+jESc2upTbCJuyMKDZpplgY8DI=';
const jitsiDomain = 'meet.gruparge.tr';
const roomName = 'test-lobby-params';

// Guest token (no affiliation)
const guestPayload = {
  aud: jitsiAppId,
  iss: jitsiAppId,
  sub: jitsiDomain,
  room: roomName,
  exp: Math.floor(Date.now() / 1000) + 3600,
  context: {
    features: {
      recording: false,
      livestreaming: false,
      transcription: false,
      'outbound-call': false
    }
  }
};

const guestToken = jwt.sign(guestPayload, jitsiAppSecret, { algorithm: 'HS256' });

const baseUrl = `https://${jitsiDomain}/${roomName}`;

// Try different lobby config combinations
const configs = [
  'config.lobby.enabled=true',
  'config.lobby.enabled=true&lobby.autoKnock=false',
  'lobby.enabled=true',  // without config. prefix
  'config.enableLobby=true',
];

console.log('=== TEST DIFFERENT LOBBY PARAMETERS ===\n');
configs.forEach((config, i) => {
  const url = `${baseUrl}?jwt=${guestToken}&${config}`;
  console.log(`${i+1}. ${config}`);
  console.log(url);
  console.log('');
});

console.log('Test each URL and see which one shows lobby waiting room.');
