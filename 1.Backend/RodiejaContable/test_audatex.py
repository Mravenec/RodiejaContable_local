import requests
from bs4 import BeautifulSoup

username = "dvenegas"
password = "Inpart26/"
login_url = "https://inpart-la.audatex.com.mx/AudaPartsSite/Authentication/Login.aspx?ReturnUrl=%2fAudaPartsSite%2f"
main_url = "https://inpart-la.audatex.com.mx/AudaPartsWebApp/frmQuotationSupplierSearch.aspx"
target_url = "https://inpart-la.audatex.com.mx/AudaPartsWebApp/frmQuotationSupplierAnswer.aspx?IdQuotation=yZMOJI2dCfI=&CalledPage=QuotationSupplierSearch"

session = requests.Session()
# 1. GET Login to get __VIEWSTATE
r = session.get(login_url)
soup = BeautifulSoup(r.text, 'html.parser')
viewstate = soup.find(id='__VIEWSTATE')['value']
viewstategen = soup.find(id='__VIEWSTATEGENERATOR')['value']
eventvalidation = soup.find(id='__EVENTVALIDATION')['value']

# 2. POST Login
payload = {
    '__VIEWSTATE': viewstate,
    '__VIEWSTATEGENERATOR': viewstategen,
    '__EVENTVALIDATION': eventvalidation,
    'LoginUser$UserName': username,
    'LoginUser$Password': password,
    'LoginUser$LoginButton': 'Entrar'
}
r = session.post(login_url, data=payload)

# 3. GET Target URL
r = session.get(target_url)
html = r.text
with open("test_dump.html", "w", encoding="utf-8") as f:
    f.write(html)

# Simulate parsearDatosCotizacion
soup = BeautifulSoup(html, 'html.parser')

labels = [
    "Número Cotización", "Fecha de Creación", "Referencia Interna", "Número Siniestro",
    "RFC Asegurado", "Nombre Asegurado", "Número Póliza/Documento", 
    "RFC Tercero", "Nombre Tercero", "RFC Valuador", "Nombre Valuador", "Aseguradora",
    "Descripción", "Armadora", "Marca", "Modelo", "Color", "Matricula", "Chasis", 
    "Año Modelo", "Año Fabricación", "KM", "Características Vehículo",
    "RFC", "Inscripción Estadual", "País", "Estado", "Ciudad", "Codigo Postal", 
    "Calle", "Colonia", "Nombre Contacto", "Teléfono", "E-mail"
]

print("--- EXTRACCION DE DATOS SIMULADA ---")
for label in labels:
    # Mimic Java: doc.getElementsContainingOwnText(label)
    import re
    elems = soup.find_all(string=re.compile(f"^{re.escape(label)}[: ]*$"))
    for text_node in elems:
        el = text_node.parent
        # Go up to td or div
        parent = el
        while parent and parent.name not in ['td', 'div', 'tr']:
            parent = parent.parent
            
        if parent:
            next_sib = parent.find_next_sibling()
            if next_sib:
                val = next_sib.get_text(strip=True)
                if val and val != "-" and val != label:
                    print(f"{label}: {val} (from next_sib)")
                    break
            else:
                val = parent.get_text(strip=True).replace(label, "").replace(":", "").strip()
                if val and val != "-":
                    print(f"{label}: {val} (from parent text)")
                    break
