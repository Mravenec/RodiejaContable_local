import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import java.util.*;

public class DebugScraper {
    public static void main(String[] args) throws Exception {
        String wan = "yZMOJI2dCfI=";
        String urlLogin = "https://inpart-la.audatex.com.mx/AudaPartsSite/Authentication/Login.aspx";
        String urlSearch = "https://inpart-la.audatex.com.mx/AudaPartsWebApp/frmQuotationSupplierSearch.aspx";
        String targetUrl = "https://inpart-la.audatex.com.mx/AudaPartsWebApp/frmQuotationSupplierAnswer.aspx?IdQuotation=" + java.net.URLEncoder.encode(wan, "UTF-8") + "&CalledPage=QuotationSupplierSearch";
        
        System.out.println("1. Cargando pagina de login para obtener ViewState...");
        Connection.Response getLogin = Jsoup.connect(urlLogin)
                .method(Connection.Method.GET)
                .execute();
        
        Map<String, String> cookies = getLogin.cookies();
        Document loginDoc = getLogin.parse();
        String viewState = loginDoc.select("input[name=__VIEWSTATE]").val();
        String viewStateGen = loginDoc.select("input[name=__VIEWSTATEGENERATOR]").val();
        String eventVal = loginDoc.select("input[name=__EVENTVALIDATION]").val();
        
        System.out.println("2. Autenticando...");
        Connection.Response postLogin = Jsoup.connect(urlLogin)
                .cookies(cookies)
                .data("__VIEWSTATE", viewState)
                .data("__VIEWSTATEGENERATOR", viewStateGen)
                .data("__EVENTVALIDATION", eventVal)
                .data("LoginUser$UserName", "dvenegas")
                .data("LoginUser$Password", "Inpart26/")
                .data("LoginUser$LoginButton", "Entrar")
                .method(Connection.Method.POST)
                .execute();
                
        cookies.putAll(postLogin.cookies());
        
        System.out.println("3. Obteniendo detalle de WAN...");
        Connection.Response getTarget = Jsoup.connect(targetUrl)
                .cookies(cookies)
                .header("Referer", urlSearch)
                .method(Connection.Method.GET)
                .execute();
                
        Document doc = getTarget.parse();
        
        System.out.println("\n--- DATOS EXTRAIDOS (Simulacion parsearDatosCotizacion) ---");
        Map<String, String> datos = new LinkedHashMap<>();
        String[] labels = {
                "Número Cotización", "Fecha de Creación", "Referencia Interna", "Número Siniestro",
                "RFC Asegurado", "Nombre Asegurado", "Número Póliza/Documento", 
                "RFC Tercero", "Nombre Tercero", "RFC Valuador", "Nombre Valuador", "Aseguradora",
                "Descripción", "Armadora", "Marca", "Modelo", "Color", "Matricula", "Chasis", 
                "Año Modelo", "Año Fabricación", "KM", "Características Vehículo"
        };
        for (String label : labels) {
            Elements elems = doc.getElementsContainingOwnText(label);
            for (Element el : elems) {
                if (el.text().trim().equals(label) || el.text().trim().equals(label + ":") || el.text().trim().equals(label + " :")) {
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
        
        for(Map.Entry<String, String> e : datos.entrySet()) {
            System.out.println(e.getKey() + ": " + e.getValue());
        }
    }
}
