// Test JWT token generation for guest vs moderator
const jwt = require('jsonwebtoken');

const jitsiAppId = 'jitsi-e7e13546abbfed28';
const jitsiAppSecret = 'YhL23e5CMz//YWCgS+jESc2upTbCJuyMKDZpplgY8DI=';
const jitsiDomain = 'meet.gruparge.tr';
const roomName = 'test-room-xyz';

// Create moderator token
const moderatorPayload = {
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

// Create guest token (NO affiliation, NO moderator)
const guestPayload = {
  aud: jitsiAppId,
  iss: jitsiAppId,
  sub: jitsiDomain,
  room: roomName,
  exp: Math.floor(Date.now() / 1000) + 3600,
  context: {
    // NO user object at all for anonymous guest
    features: {
      recording: true,
      livestreaming: false,
      transcription: false,
      'outbound-call': false
    }
  }
  // NO moderator claim
};

const modToken = jwt.sign(moderatorPayload, jitsiAppSecret, { algorithm: 'HS256' });
const guestToken = jwt.sign(guestPayload, jitsiAppSecret, { algorithm: 'HS256' });

console.log('=== MODERATOR TOKEN ===');
console.log('Token:', modToken);
console.log('\nDecoded:');
console.log(JSON.stringify(jwt.decode(modToken), null, 2));

console.log('\n\n=== GUEST TOKEN ===');
console.log('Token:', guestToken);
console.log('\nDecoded:');
console.log(JSON.stringify(jwt.decode(guestToken), null, 2));

console.log('\n\n=== URLs ===');
console.log('Moderator:', `https://${jitsiDomain}/${roomName}?jwt=${modToken}`);
console.log('Guest:', `https://${jitsiDomain}/${roomName}?jwt=${guestToken}`);
