const fs = require('fs/promises');
const path = require('path');
const log = require('log-colors');

const writeFileRecursive = async (filePath, content) => {
  const directory = path.dirname(filePath);
  const directoryExists = await fs.access(directory, fs.constants.W_OK).then(() => true).catch(() => false);

  if (!directoryExists) {
    log.info(`creating directory: ${directory}`)
    await fs.mkdir(directory, { recursive: true })
  }

  await fs.writeFile(filePath, content, 'utf-8');
}

module.exports = writeFileRecursive;
