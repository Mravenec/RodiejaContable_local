async function test() {
  const loginRes = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@rodieja.com', password: 'Admin123!' })
  });
  const token = (await loginRes.json()).token;

  const vehRes = await fetch('http://localhost:8080/api/vehiculos/2', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const vehData = await vehRes.json();
  console.log('Vehiculo POJO 2:', JSON.stringify(vehData, null, 2));
}
test();
