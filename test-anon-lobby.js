// Test: Guest link WITHOUT any JWT (completely anonymous)

const jitsiDomain = 'meet.gruparge.tr';
const roomName = 'test-anon-lobby';

// Build URLs
const baseUrl = `https://${jitsiDomain}/${roomName}`;
const configParams = [
  'config.startWithAudioMuted=true',
  'config.startWithVideoMuted=true',
  'config.requireDisplayName=true',
  'config.prejoinPageEnabled=true',
  'config.disableChat=false',
  'config.disableReactions=false',
  'config.e2eeEnabled=false',
  'config.lobby.enabled=true'
].join('&');

// GUEST: NO JWT at all (anonymous)
const guestUrl = `${baseUrl}?${configParams}`;

// MODERATOR: With JWT
const jwt = require('jsonwebtoken');
const jitsiAppId = 'jitsi-e7e13546abbfed28';
const jitsiAppSecret = 'YhL23e5CMz//YWCgS+jESc2upTbCJuyMKDZpplgY8DI=';

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

const modToken = jwt.sign(modPayload, jitsiAppSecret, { algorithm: 'HS256' });
const modUrl = `${baseUrl}?jwt=${modToken}&${configParams}`;

console.log('=== ANONYMOUS GUEST TEST ===\n');
console.log('GUEST LINK (NO JWT):');
console.log(guestUrl);
console.log('\n');
console.log('MODERATOR LINK:');
console.log(modUrl);
console.log('\n');
console.log('=== INSTRUCTIONS ===');
console.log('1. Open GUEST link (no JWT) in incognito');
console.log('2. Should wait in lobby OR show "waiting for host"');
console.log('3. Open MODERATOR link in normal window');
console.log('4. Should be able to start meeting and admit guest');
