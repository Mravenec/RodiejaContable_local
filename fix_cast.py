import re

with open("1.Backend/RodiejaContable/src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/service/AudatexService.java", "r", encoding="utf-8") as f:
    content = f.read()

# Fix 1: Short anioIn = (Short) r.get("anio_inicio");
content = content.replace('Short anioIn = (Short) r.get("anio_inicio");', 'Number anioInNum = (Number) r.get("anio_inicio");\n            Short anioIn = anioInNum != null ? anioInNum.shortValue() : null;')
content = content.replace('Short anioFi = (Short) r.get("anio_fin");', 'Number anioFiNum = (Number) r.get("anio_fin");\n            Short anioFi = anioFiNum != null ? anioFiNum.shortValue() : null;')

# Fix 2: Short aInObj = (Short) r.get("anio_inicio");
content = content.replace('Short aInObj = (Short) r.get("anio_inicio");', 'Number aInNum = (Number) r.get("anio_inicio");\n                    Short aInObj = aInNum != null ? aInNum.shortValue() : null;')
content = content.replace('Short aFiObj = (Short) r.get("anio_fin");', 'Number aFiNum = (Number) r.get("anio_fin");\n                    Short aFiObj = aFiNum != null ? aFiNum.shortValue() : null;')

with open("1.Backend/RodiejaContable/src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/service/AudatexService.java", "w", encoding="utf-8") as f:
    f.write(content)

