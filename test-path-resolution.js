// Simple test to verify path resolution works
const { readMarkdown } = require('./dist/src/common/file-utils');

async function testPathResolution() {
  console.log('Testing path resolution in readMarkdown...');

  try {
    const content = await readMarkdown('text.system.prompt.md');
    console.log('✅ Path resolution works! Content length:', content.length);
    return true;
  } catch (error) {
    console.error('❌ Path resolution failed:', error.message);
    return false;
  }
}

testPathResolution().then((success) => {
  console.log(
    success
      ? '✅ All path resolution tests passed!'
      : '❌ Path resolution tests failed!',
  );
  process.exit(success ? 0 : 1);
});
