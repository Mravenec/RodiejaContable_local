from bs4 import BeautifulSoup
import re

with open('AudaPartsWebApp_Detalle.html', 'r', encoding='utf-8') as f:
    html = f.read()

soup = BeautifulSoup(html, 'html.parser')

inputs = soup.find_all('input', {'type': 'text'})
for inp in inputs[:10]:
    print(inp.get('name', ''), inp.get('id', ''), inp.get('class', ''))

print("---")
# Look for repuesto description rows
for span in soup.find_all('span'):
    if span.get('id') and 'lblPartDescription' in span.get('id'):
        print(span.get('id'), span.text.strip())

