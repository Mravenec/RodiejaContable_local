import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.select.Elements;
public class TestJsoupDelta {
    public static void main(String[] args) {
        String delta = "150|updatePanel|ctl00_cphBody_tbcAnswerQuotation|<div id=\"some_div\"><span id=\"ctl00_cphBody_tbcAnswerQuotation_tabQuotationData_ucQuotationSupplierData_lblVehicleModel\">Yaris</span></div>|";
        Document doc = Jsoup.parse(delta);
        Elements elems = doc.select("[id$=lblVehicleModel]");
        System.out.println("Elements found: " + elems.size());
        if(elems.size() > 0) System.out.println("Text: " + elems.get(0).text());
    }
}
