const jwt = require('jsonwebtoken');

const payload = {
  id: 999,
  email: 'scraper@juscash.com',
  role: 'scraper_service',
  name: 'Scraper Service'
};

// Use o mesmo secret do .env (sem aspas duplas)
const secret = 'juscash_scraper_mbr586zs_QL08TXcGembdrwHt2groUQi4kaQNif9Q';

const token = jwt.sign(payload, secret, {
  expiresIn: '30d' // Token longo para o scraper
});

console.log('JWT Token válido para o scraper:');
console.log(token);