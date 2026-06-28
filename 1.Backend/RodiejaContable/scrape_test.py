import requests
from bs4 import BeautifulSoup

url_login = "https://inpart-la.audatex.com.mx/AudaPartsSite/Authentication/Login.aspx?ReturnUrl=%2fAudaPartsSite%2f"
url_search = "https://inpart-la.audatex.com.mx/AudaPartsWebApp/frmQuotationSupplierSearch.aspx"
url_target = "https://inpart-la.audatex.com.mx/AudaPartsWebApp/frmQuotationSupplierAnswer.aspx?IdQuotation=yZMOJI2dCfI=&CalledPage=QuotationSupplierSearch"

s = requests.Session()
s.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
})

r = s.get(url_login)
soup = BeautifulSoup(r.text, 'html.parser')
data = {
    '__VIEWSTATE': soup.find(id='__VIEWSTATE')['value'] if soup.find(id='__VIEWSTATE') else '',
    '__VIEWSTATEGENERATOR': soup.find(id='__VIEWSTATEGENERATOR')['value'] if soup.find(id='__VIEWSTATEGENERATOR') else '',
    '__EVENTVALIDATION': soup.find(id='__EVENTVALIDATION')['value'] if soup.find(id='__EVENTVALIDATION') else '',
    'LoginUser$UserName': 'dvenegas',
    'LoginUser$Password': 'Inpart26/',
    'LoginUser$LoginButton': 'Entrar'
}

r2 = s.post(url_login, data=data)
r3 = s.get(url_target)
with open("target.html", "w", encoding="utf-8") as f:
    f.write(r3.text)

print("Saved target.html. Length:", len(r3.text))

# Print all tables in Datos Cotizacion
soup3 = BeautifulSoup(r3.text, 'html.parser')
print("\n--- DATOS VEHICULO ---")
for lbl in ['Marca', 'Modelo', 'Año Modelo', 'Color', 'Armadora', 'Matricula']:
    el = soup3.find(string=lambda t: t and lbl in t)
    if el:
        p = el.find_parent('td')
        if p:
            n = p.find_next_sibling('td')
            if n:
                print(f"{lbl}: {n.get_text(strip=True)}")
