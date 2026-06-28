import re

filepath = "/home/kimberly/Escritorio/personal/RodiejaContable/1.Backend/RodiejaContable/src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/client/AudatexClient.java"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

old_parser = """    private Map<String, String> parsearDatosCotizacion(Document doc) {
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
    }"""

new_parser = """    private Map<String, String> parsearDatosCotizacion(Document doc) {
        Map<String, String> datos = new java.util.LinkedHashMap<>();
        try {
            // Mapa de Labels hacia sus sufijos de ID correspondientes en ASP.NET
            java.util.Map<String, String> idMap = new java.util.LinkedHashMap<>();
            idMap.put("Número Cotización", "lblQuotationNumber");
            idMap.put("Fecha de Creación", "lblDateOfQuotationBegin");
            idMap.put("Referencia Interna", "lblInternalReference");
            idMap.put("Número Siniestro", "lblClaimNumber");
            idMap.put("RFC Asegurado", "lblInsuredRN");
            idMap.put("Nombre Asegurado", "lblInsuredName");
            idMap.put("Número Póliza/Documento", "lblPolicyDocumentNumber");
            idMap.put("RFC Tercero", "lblThirdPartyRN");
            idMap.put("Nombre Tercero", "lblThirdPartName");
            idMap.put("RFC Valuador", "lblSurveyorEIN");
            idMap.put("Nombre Valuador", "lblNameEvaluator");
            idMap.put("Aseguradora", "lblInsurerName");
            idMap.put("Descripción", "lblVehicleDescription");
            idMap.put("Armadora", "lblVehicleManufacturer");
            idMap.put("Marca", "lblVehicleBranch");
            idMap.put("Modelo", "lblVehicleModel");
            idMap.put("Color", "lblVehicleColor");
            idMap.put("Matricula", "lblLicensePlate");
            idMap.put("Chasis", "lblVIN");
            idMap.put("Año Modelo", "lblYearModel");
            idMap.put("Año Fabricación", "lblYearManufacture");
            idMap.put("KM", "lblKM");
            idMap.put("Características Vehículo", "lblVehicleFeatures"); // Generalmente no tiene un lbl específico simple o es vacío
            
            // Datos del Taller
            idMap.put("Nombre Contacto Taller", "lblBodyshop"); // El nombre principal suele estar aquí
            idMap.put("RFC", "lblEIN");
            idMap.put("Inscripción Estadual", "lblStateResgistration");
            idMap.put("País", "lblCountry");
            idMap.put("Estado", "lblState");
            idMap.put("Ciudad", "lblCity");
            idMap.put("Codigo Postal", "lblZipCode");
            idMap.put("Calle", "lblStreet");
            idMap.put("Colonia", "lblNeighbourhood");
            idMap.put("Nombre Contacto", "lblContactName");
            idMap.put("Teléfono", "lblPhone");
            idMap.put("E-mail", "lblEmail");

            for (java.util.Map.Entry<String, String> entry : idMap.entrySet()) {
                String label = entry.getKey();
                String partialId = entry.getValue();
                
                // Usamos un selector CSS que busque elementos cuyo ID termine en el partialId (para lidiar con el ctl00_...)
                org.jsoup.select.Elements elems = doc.select("[id$=" + partialId + "]");
                if (!elems.isEmpty()) {
                    String value = elems.first().text().trim();
                    if (!value.isEmpty() && !value.equals("-")) {
                        datos.put(label, value);
                    }
                }
            }
        } catch (Exception e) {
            log.error("[Audatex] Error parseando datos de cotizacion", e);
        }
        return datos;
    }"""

if old_parser in content:
    content = content.replace(old_parser, new_parser)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Nuevo parser por IDs inyectado")
else:
    print("No se encontro el parser viejo en el archivo. Buscando con Regex...")
    
