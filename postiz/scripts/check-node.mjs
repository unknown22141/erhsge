// Next.js 16 needs Node.js 20.9 or newer, say so clearly before it fails
const [major, minor] = process.versions.node.split('.').map(Number);
if (major < 20 || (major === 20 && minor < 9)) {
  console.error(
    `\nThis app needs Node.js 20.9 or newer, you have ${process.versions.node}.\n` +
      'Install the LTS version from https://nodejs.org and run the command again.\n'
  );
  process.exit(1);
}
