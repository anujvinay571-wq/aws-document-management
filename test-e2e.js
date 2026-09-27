async function run() {
  try {
    const email = `sns-test-${Date.now()}@example.com`;
    const password = 'Password123';

    // 1. Register
    const regRes = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'SNS Test', email, password })
    });
    console.log('Register:', regRes.status);

    // 2. Login
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const loginData = await loginRes.json();
    const token = loginData.accessToken;
    console.log('Login:', loginRes.status);

    // 3. Create dummy PNG
    const fs = require('fs');
    const magicBytes = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    fs.writeFileSync('dummy.png', magicBytes);

    // 4. Upload
    const formData = new FormData();
    const fileBlob = new Blob([magicBytes], { type: 'image/png' });
    formData.append('document', fileBlob, 'dummy.png');

    const uploadRes = await fetch('http://localhost:3000/api/documents/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });
    
    const uploadData = await uploadRes.json();
    console.log('Upload Status:', uploadRes.status);
    console.log('Upload Data:', uploadData);
  } catch (error) {
    console.error(error);
  }
}
run();
