require('dotenv').config();
const { uploadObject, deleteObject, getDownloadUrl } = require('../src/services/s3.service');

const runTest = async () => {
  const key = 'documents/test/s3-integration-test.txt';
  const body = 'S3 integration test successful';
  const contentType = 'text/plain';

  try {
    console.log('Starting S3 Integration Test...');

    // 1. Upload Object
    await uploadObject(key, body, contentType);
    console.log('✅ Upload successful');

    // 2. Generate Signed URL
    const url = await getDownloadUrl(key);
    console.log('✅ Signed URL generation successful');
    console.log(`Signed URL: ${url}`);

    // 3. Delete Object
    await deleteObject(key);
    console.log('✅ Deletion successful');

    console.log('All tests passed successfully!');
  } catch (error) {
    console.error('❌ S3 Integration Test Failed:', error);
  }
};

runTest();
