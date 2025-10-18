const CHAR_POOL = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const DEFAULT_LENGTH = 8;

const generateDisplayId = (length = DEFAULT_LENGTH) => {
  let result = '';
  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(Math.random() * CHAR_POOL.length);
    result += CHAR_POOL.charAt(randomIndex);
  }
  return result;
};

export default generateDisplayId;
