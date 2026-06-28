import re

filepath = "/home/kimberly/Escritorio/personal/RodiejaContable/2.Frontend/RodiejaContable/src/pages/audatex/OportunidadesAudatex.js"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

bad_str = """      }
    },
      sorter: (a, b) => (a.armadora || '').localeCompare(b.armadora || '')
    },"""

good_str = """      }
    },"""

content = content.replace(bad_str, good_str)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Sintaxis arreglada")
