const jwt = require('jsonwebtoken');

const jitsiAppId = 'jitsi-e7e13546abbfed28';
const jitsiAppSecret = 'YhL23e5CMz//YWCgS+jESc2upTbCJuyMKDZpplgY8DI=';
const jitsiDomain = 'meet.gruparge.tr';
const roomName = 'test-lobby-room';

// Guest token with NO affiliation
const guestPayload = {
  aud: jitsiAppId,
  iss: jitsiAppId,
  sub: jitsiDomain,
  room: roomName,
  exp: Math.floor(Date.now() / 1000) + 3600,
  context: {
    features: {
      recording: true,
      livestreaming: false,
      transcription: false,
      'outbound-call': false
    }
  }
};

// Moderator token with affiliation
const modPayload = {
  aud: jitsiAppId,
  iss: jitsiAppId,
  sub: jitsiDomain,
  room: roomName,
  exp: Math.floor(Date.now() / 1000) + 3600,
  context: {
    user: {
      name: 'Test Moderator',
      email: 'mod@test.com',
      affiliation: 'owner'
    },
    features: {
      recording: true,
      livestreaming: false,
      transcription: false,
      'outbound-call': false
    }
  },
  moderator: 'true'
};

const guestToken = jwt.sign(guestPayload, jitsiAppSecret, { algorithm: 'HS256' });
const modToken = jwt.sign(modPayload, jitsiAppSecret, { algorithm: 'HS256' });

// Build URLs with lobby enabled
const baseUrl = `https://${jitsiDomain}/${roomName}`;
const configParams = [
  'config.startWithAudioMuted=true',
  'config.startWithVideoMuted=true',
  'config.requireDisplayName=true',
  'config.prejoinPageEnabled=true',
  'config.disableChat=false',
  'config.disableReactions=false',
  'config.e2eeEnabled=false',
  'config.lobby.enabled=true'  // ← LOBBY ENABLED
].join('&');

const guestUrl = `${baseUrl}?jwt=${guestToken}&${configParams}`;
const modUrl = `${baseUrl}?jwt=${modToken}&${configParams}`;

console.log('=== TEST URLS WITH LOBBY ===\n');
console.log('MODERATOR LINK:');
console.log(modUrl);
console.log('\n');
console.log('GUEST LINK:');
console.log(guestUrl);
console.log('\n');
console.log('=== INSTRUCTIONS ===');
console.log('1. Open GUEST link in incognito/private window');
console.log('2. You should see "Waiting for the host to admit you"');
console.log('3. Open MODERATOR link in normal window');
console.log('4. You should be able to admit the guest from lobby');
