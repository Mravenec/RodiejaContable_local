async function test() {
  const loginRes = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@rodieja.com', password: 'Admin123!' })
  });
  const loginData = await loginRes.json();
  const token = loginData.token;

  console.log('Token:', token ? 'Success' : 'Failed');

  const vehRes = await fetch('http://localhost:8080/api/v1/vehiculos/2', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const vehData = await vehRes.json();
  console.log('Vehiculo 2:', JSON.stringify(vehData, null, 2));

  const genRes = await fetch('http://localhost:8080/api/generaciones/2', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const genData = await genRes.json();
  console.log('Generacion 2:', JSON.stringify(genData, null, 2));
}
test();
