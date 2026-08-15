const http = require('http');

http.get('http://localhost:8080/api/vehiculos/2', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
}).on('error', err => console.log(err.message));
