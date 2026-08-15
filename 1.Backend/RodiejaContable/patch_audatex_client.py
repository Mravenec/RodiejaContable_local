import re

with open("src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/client/AudatexClient.java", "r") as f:
    content = f.read()

new_methods = """
    // ── ROD-XX: Sincronización de Pedidos ──────────────────────────────────────────

    public void buscarTodosPedidosStreaming(String desde, String hasta,
            Consumer<List<Map<String, Object>>> onPage) throws IOException {
        scrapeStreamingPedidos(desde, hasta, onPage);
    }

    private void scrapeStreamingPedidos(String desde, String hasta,
            Consumer<List<Map<String, Object>>> onPage) throws IOException {

        if (desde != null && hasta != null) {
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
            LocalDate start = LocalDate.parse(desde.trim(), formatter);
            LocalDate end = LocalDate.parse(hasta.trim(), formatter);
            if (!start.isAfter(end)) {
                final int diasPorChunk = 3;
                LocalDate chunkEnd = end;
                while (!chunkEnd.isBefore(start)) {
                    LocalDate chunkStart = chunkEnd.minusDays(diasPorChunk - 1);
                    if (chunkStart.isBefore(start)) chunkStart = start;
                    log.info("[Audatex] === Búsqueda Pedidos chunk {} → {} ===", chunkStart, chunkEnd);
                    scrapeRangoFechasPedidos(chunkStart.toString(), chunkEnd.toString(), onPage);
                    chunkEnd = chunkStart.minusDays(1);
                    humanDelay();
                }
                return;
            }
        }
        scrapeRangoFechasPedidos(desde, hasta, onPage);
    }

    private void scrapeRangoFechasPedidos(String desde, String hasta,
            Consumer<List<Map<String, Object>>> onPage) throws IOException {

        Map<String, String> cookies = sessionManager.getActiveCookies();
        String refererUrl = sessionManager.getCurrentPanelUrl();
        String orderSearchUrl = props.getQuotationSearchUrl().replace("frmQuotationSupplierSearch.aspx", "frmOrderSupplierSearch.aspx");
        String searchUrl = orderSearchUrl;
        
        if (desde == null && hasta == null) {
            searchUrl = orderSearchUrl + SEARCH_URL_ALL;
        }

        log.info("[Audatex] Buscando pedidos en: {}", searchUrl);

        Connection.Response resp = Jsoup.connect(searchUrl)
                .cookies(cookies)
                .header("Referer", refererUrl)
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .followRedirects(true)
                .method(Connection.Method.GET)
                .userAgent(USER_AGENT)
                .execute();

        if (resp.url().toString().contains("frmLogin")) {
            sessionManager.invalidate();
            cookies = sessionManager.getActiveCookies();
            resp = Jsoup.connect(searchUrl).cookies(cookies).method(Connection.Method.GET).userAgent(USER_AGENT).execute();
        }

        Document doc = resp.parse();
        String finalStartDate = formatToPortalDate(desde);
        String finalEndDate = formatToPortalDate(hasta);
        String finalStatus = "";

        if (desde == null && hasta == null) {
            Element txtStart = doc.getElementById("ctl00_cphBody_txtStartDate");
            if (txtStart != null) finalStartDate = txtStart.attr("value");
            Element txtEnd = doc.getElementById("ctl00_cphBody_txtEndDate");
            if (txtEnd != null) finalEndDate = txtEnd.attr("value");
            Element ddlStatusEl = doc.getElementById("ctl00_cphBody_ddlStatus");
            if (ddlStatusEl != null) {
                Element selected = ddlStatusEl.select("option[selected]").first();
                if (selected != null) finalStatus = selected.attr("value");
            }
        }

        if (desde != null || hasta != null) {
            Map<String, String> searchForm = extractFormFields(doc);
            searchForm.put("__EVENTTARGET", "");
            searchForm.put("__EVENTARGUMENT", "");
            if (finalStartDate != null) searchForm.put("ctl00$cphBody$txtStartDate", finalStartDate);
            if (finalEndDate != null)   searchForm.put("ctl00$cphBody$txtEndDate",   finalEndDate);
            searchForm.put("ctl00$cphBody$ddlStatus", finalStatus);
            searchForm.put("ctl00$cphBody$btnSearch", "Buscar");

            resp = postForm(orderSearchUrl, cookies, searchForm);
            cookies.putAll(resp.cookies());
            doc = resp.parse();
        }

        List<Map<String, Object>> pag1 = parsearTablaPedidos(doc);
        onPage.accept(pag1);

        int totalPaginas = obtenerTotalPaginas(doc);
        int pagina = 1;
        while (pagina < totalPaginas) {
            pagina++;
            log.info("[Audatex] Paginando Pedidos a pág {}/{}", pagina, totalPaginas);
            Map<String, String> pageForm = extractFormFields(doc);
            pageForm.put("__EVENTTARGET", "ctl00$cphBody$gdvResult");
            pageForm.put("__EVENTARGUMENT", "Page$" + pagina);
            
            resp = postAjax(orderSearchUrl, cookies, pageForm);
            doc = resp.parse();
            
            List<Map<String, Object>> pagSig = parsearTablaPedidos(doc);
            if (pagSig.isEmpty()) break;
            onPage.accept(pagSig);
            humanDelay();
        }
    }

    private List<Map<String, Object>> parsearTablaPedidos(Document doc) {
        List<Map<String, Object>> lista = new ArrayList<>();
        Element table = doc.getElementById("ctl00_cphBody_gdvResult");
        if (table == null) table = doc.select("table[id$=gdvResult]").first();
        if (table == null) return lista;

        Elements rows = table.select("tr");
        for (int i = 1; i < rows.size(); i++) {
            Elements cols = rows.get(i).select("td");
            if (cols.size() < 7) continue;

            Map<String, Object> pedido = new LinkedHashMap<>();
            pedido.put("aseguradora", cols.get(0).text().trim());
            pedido.put("numeroPedido", cols.get(1).text().trim());
            pedido.put("cotizacionId", cols.get(2).text().trim());
            pedido.put("taller", cols.get(3).text().trim());
            pedido.put("poliza", cols.get(4).text().trim());
            pedido.put("siniestro", cols.get(5).text().trim());
            pedido.put("matricula", cols.get(6).text().trim());
            
            if (cols.size() > 7) {
                pedido.put("armadora", cols.get(7).text().trim());
                if (cols.size() > 8) pedido.put("fecha", cols.get(8).text().trim());
            }

            String rowHtml = rows.get(i).outerHtml();
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?:IdQuotation|IdOrder|WAN)=([^&\"'>]+)").matcher(rowHtml);
            if (m.find()) {
                pedido.put("wan", m.group(1));
            } else {
                m = java.util.regex.Pattern.compile("['\"]([A-Za-z0-9+/]{10,60}=*)['\"]").matcher(rowHtml);
                if (m.find()) pedido.put("wan", m.group(1));
            }
            lista.add(pedido);
        }
        return lista;
    }

"""

content = content.replace("    private void humanDelay() {", new_methods + "\n    private void humanDelay() {")

with open("src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/client/AudatexClient.java", "w") as f:
    f.write(content)

