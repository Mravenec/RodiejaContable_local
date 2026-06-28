import re

filepath = "/home/kimberly/Escritorio/personal/RodiejaContable/1.Backend/RodiejaContable/src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/client/AudatexClient.java"
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# We need to add the POST logic right after `repuestos.addAll(parsearRepuestosDeDoc(doc));`
old_logic = """            repuestos.addAll(parsearRepuestosDeDoc(doc));
            datosCotizacion.putAll(parsearDatosCotizacion(doc));
            return result;"""

new_logic = """            repuestos.addAll(parsearRepuestosDeDoc(doc));
            
            // Extracción inicial por si acaso
            datosCotizacion.putAll(parsearDatosCotizacion(doc));
            
            // Si la pestaña de datos viene vacía (AJAX TabContainer de ASP.NET) simulamos el clic en la pestaña
            if (datosCotizacion.getOrDefault("Marca", "").isEmpty() && datosCotizacion.getOrDefault("Matricula", "").isEmpty()) {
                String vs = ""; String vsg = ""; String ev = "";
                org.jsoup.select.Elements vsEl = doc.select("input[name=__VIEWSTATE]");
                if (!vsEl.isEmpty()) vs = vsEl.first().val();
                org.jsoup.select.Elements vsgEl = doc.select("input[name=__VIEWSTATEGENERATOR]");
                if (!vsgEl.isEmpty()) vsg = vsgEl.first().val();
                org.jsoup.select.Elements evEl = doc.select("input[name=__EVENTVALIDATION]");
                if (!evEl.isEmpty()) ev = evEl.first().val();
                
                try {
                    Connection.Response postResp = Jsoup.connect(detalleUrl)
                            .cookies(cookies)
                            .method(Connection.Method.POST)
                            .data("__EVENTTARGET", "ctl00$cphBody$tbcAnswerQuotation")
                            .data("__EVENTARGUMENT", "activeTabChanged:1")
                            .data("__VIEWSTATE", vs)
                            .data("__VIEWSTATEGENERATOR", vsg)
                            .data("__EVENTVALIDATION", ev)
                            .data("ctl00$cphBody$tbcAnswerQuotation_ClientState", "{\\"ActiveTabIndex\\":1,\\"TabState\\":[true,true,true]}")
                            .execute();
                    
                    Document postDoc = postResp.parse();
                    java.util.Map<String, String> datosPost = parsearDatosCotizacion(postDoc);
                    for (java.util.Map.Entry<String, String> entry : datosPost.entrySet()) {
                        if (entry.getValue() != null && !entry.getValue().isEmpty() && !entry.getValue().equals("-")) {
                            datosCotizacion.put(entry.getKey(), entry.getValue());
                        }
                    }
                } catch (Exception postEx) {
                    log.warn("[Audatex] Error al hacer POST para tab de datos: {}", postEx.getMessage());
                }
            }
            
            return result;"""

if old_logic in content:
    content = content.replace(old_logic, new_logic)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patch aplicado con exito.")
else:
    print("ERROR: No se encontró el texto original.")
