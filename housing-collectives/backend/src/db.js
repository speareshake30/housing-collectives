const { Pool } = require('pg');
const config = require('./database');
const env = process.env.NODE_ENV || 'development';

const pool = new Pool(config[env]);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  getClient: () => pool.connect()
};
