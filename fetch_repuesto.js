const axios = require('axios');
async function run() {
  try {
    const res = await axios.post('http://localhost:8080/api/auth/login', {
      email: 'admin@rodieja.com',
      password: 'Admin123!'
    });
    const token = res.data.token;
    const rep = await axios.get('http://localhost:8080/api/inventario/repuestos/4', {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log("Repuesto:", JSON.stringify(rep.data, null, 2));
  } catch (e) {
    console.error(e.message);
  }
}
run();
