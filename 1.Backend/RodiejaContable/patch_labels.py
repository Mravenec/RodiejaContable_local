import re

filepath_java = "/home/kimberly/Escritorio/personal/RodiejaContable/1.Backend/RodiejaContable/src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/client/AudatexClient.java"
with open(filepath_java, 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('idMap.put("Nombre Contacto Taller", "lblBodyshop");', 'idMap.put("Nombre Taller", "lblBodyshop");')
with open(filepath_java, 'w', encoding='utf-8') as f:
    f.write(content)


filepath_js = "/home/kimberly/Escritorio/personal/RodiejaContable/2.Frontend/RodiejaContable/src/pages/audatex/OportunidadesAudatex.js"
with open(filepath_js, 'r', encoding='utf-8') as f:
    content_js = f.read()

old_taller = "const grupoTaller = ['RFC', 'Inscripción Estadual', 'País', 'Estado', 'Ciudad', 'Codigo Postal', 'Calle', 'Colonia', 'Nombre Contacto', 'Teléfono', 'E-mail'];"
new_taller = "const grupoTaller = ['Nombre Taller', 'RFC', 'Inscripción Estadual', 'País', 'Estado', 'Ciudad', 'Codigo Postal', 'Calle', 'Colonia', 'Nombre Contacto', 'Teléfono', 'E-mail'];"
content_js = content_js.replace(old_taller, new_taller)

with open(filepath_js, 'w', encoding='utf-8') as f:
    f.write(content_js)

print("Labels sincronizados")
