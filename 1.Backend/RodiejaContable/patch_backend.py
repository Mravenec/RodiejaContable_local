import re

client_path = "/home/kimberly/Escritorio/personal/RodiejaContable/1.Backend/RodiejaContable/src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/client/AudatexClient.java"
service_path = "/home/kimberly/Escritorio/personal/RodiejaContable/1.Backend/RodiejaContable/src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/service/AudatexService.java"

with open(client_path, 'r', encoding='utf-8') as f:
    client_content = f.read()

# Replace obtenerRepuestosDeCotizacion with obtenerDetallesDeCotizacion
old_sig = "public List<Map<String, String>> obtenerRepuestosDeCotizacion(String wan) {"
new_sig = "public Map<String, Object> obtenerDetallesDeCotizacion(String wan) {\n        Map<String, Object> result = new java.util.HashMap<>();\n        List<Map<String, String>> repuestos = new ArrayList<>();\n        Map<String, String> datosCotizacion = new java.util.LinkedHashMap<>();\n        result.put(\"repuestos\", repuestos);\n        result.put(\"datosCotizacion\", datosCotizacion);"
client_content = client_content.replace(old_sig, new_sig)

# In obtenerDetallesDeCotizacion, change return from `return parsearRepuestosDeDoc(doc);` to adding to map and returning result
old_ret = "return parsearRepuestosDeDoc(doc);"
new_ret = "repuestos.addAll(parsearRepuestosDeDoc(doc));\n            datosCotizacion.putAll(parsearDatosCotizacion(doc));\n            return result;"
client_content = client_content.replace(old_ret, new_ret)

# Also handle the exception block returning an empty list
old_ex_ret = "return new ArrayList<>();"
new_ex_ret = "return result;"
client_content = client_content.replace(old_ex_ret, new_ex_ret, 1)

# Add parsearDatosCotizacion method
new_method = """
    private Map<String, String> parsearDatosCotizacion(Document doc) {
        Map<String, String> datos = new java.util.LinkedHashMap<>();
        try {
            String[] labels = {
                "Número Cotización", "Fecha de Creación", "Referencia Interna", "Número Siniestro",
                "RFC Asegurado", "Nombre Asegurado", "Número Póliza/Documento", 
                "RFC Tercero", "Nombre Tercero", "RFC Valuador", "Nombre Valuador", "Aseguradora",
                "Descripción", "Armadora", "Marca", "Modelo", "Color", "Matricula", "Chasis", 
                "Año Modelo", "Año Fabricación", "KM", "Características Vehículo",
                "RFC", "Inscripción Estadual", "País", "Estado", "Ciudad", "Codigo Postal", 
                "Calle", "Colonia", "Nombre Contacto", "Teléfono", "E-mail"
            };
            
            for (String label : labels) {
                // Buscamos elementos que contengan el texto del label
                org.jsoup.select.Elements elems = doc.getElementsContainingOwnText(label);
                for (Element el : elems) {
                    if (el.text().trim().equals(label) || el.text().trim().equals(label + ":") || el.text().trim().equals(label + " :")) {
                        // Buscar el td o span padre, luego el siguiente hermano
                        Element parentTd = el.parent();
                        while (parentTd != null && !parentTd.tagName().equals("td") && !parentTd.tagName().equals("div")) {
                            parentTd = parentTd.parent();
                        }
                        if (parentTd != null) {
                            Element next = parentTd.nextElementSibling();
                            if (next != null) {
                                String value = next.text().trim();
                                if (!value.isEmpty() && !value.equals("-") && !value.equals(label)) {
                                    datos.put(label, value);
                                    break;
                                }
                            } else {
                                // Sometimes they are in the same div/td
                                String fullText = parentTd.text().replace(el.text(), "").trim();
                                if (!fullText.isEmpty() && !fullText.equals("-") && !fullText.equals(label)) {
                                    datos.put(label, fullText);
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            log.error("[Audatex] Error parseando datos de cotizacion", e);
        }
        return datos;
    }
"""
# Insert before parsearRepuestosDeDoc
idx = client_content.find("private List<Map<String, String>> parsearRepuestosDeDoc(Document doc)")
if idx != -1:
    client_content = client_content[:idx] + new_method + client_content[idx:]
    
with open(client_path, 'w', encoding='utf-8') as f:
    f.write(client_content)


with open(service_path, 'r', encoding='utf-8') as f:
    service_content = f.read()

old_svc = """                                java.util.List<java.util.Map<String, String>> repuestos =
                                        client.obtenerRepuestosDeCotizacion(wan);
                                oportunidad.put("repuestos", repuestos);
                                log.debug("[AudatexService][Stream] WAN {} → {} repuesto(s)", wan, repuestos.size());"""

new_svc = """                                java.util.Map<String, Object> detalles = client.obtenerDetallesDeCotizacion(wan);
                                java.util.List<java.util.Map<String, String>> repuestos = (java.util.List<java.util.Map<String, String>>) detalles.get("repuestos");
                                oportunidad.put("repuestos", repuestos);
                                oportunidad.put("datosCotizacion", detalles.get("datosCotizacion"));
                                
                                if (detalles.get("datosCotizacion") instanceof java.util.Map) {
                                    java.util.Map<String, String> dt = (java.util.Map<String, String>) detalles.get("datosCotizacion");
                                    if (dt.containsKey("Marca")) oportunidad.put("marca", dt.get("Marca"));
                                    if (dt.containsKey("Modelo")) oportunidad.put("modelo", dt.get("Modelo"));
                                    if (dt.containsKey("Año Modelo")) oportunidad.put("anio", dt.get("Año Modelo"));
                                    if (dt.containsKey("Matricula")) oportunidad.put("matricula", dt.get("Matricula"));
                                    if (dt.containsKey("Chasis")) oportunidad.put("chasis", dt.get("Chasis"));
                                }
                                
                                log.debug("[AudatexService][Stream] WAN {} → {} repuesto(s)", wan, repuestos.size());"""

service_content = service_content.replace(old_svc, new_svc)

with open(service_path, 'w', encoding='utf-8') as f:
    f.write(service_content)

print("Backend modificado")
