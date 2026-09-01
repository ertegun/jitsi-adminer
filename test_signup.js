// Test signup via API directly
const response = await fetch('http://localhost:3000/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test User',
    email: 'test' + Date.now() + '@example.com',
    password: 'password123',
    organizationName: 'Test Organization'
  })
});

const data = await response.json();
console.log(JSON.stringify(data, null, 2));
