package com.rodiejacontable.rodiejacontable.integration.audatex.client;

import com.rodiejacontable.rodiejacontable.integration.audatex.config.AudatexProperties;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import io.github.resilience4j.timelimiter.annotation.TimeLimiter;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * ROD-11 — Cliente HTTP que interactúa con el portal Audatex InPart usando Jsoup.
 * ROD-15 — Aplica patrones de resilience: CircuitBreaker, Retry, TimeLimiter.
 * ROD-27 — Envía cotizaciones al portal con form submit y ViewState.
 *
 * Métodos principales:
 *  - buscarOportunidades(page) → lista de cotizaciones de la página dada
 *  - buscarTodasOportunidades() → todas las páginas (paginación automática)
 *  - enviarCotizacion(wan, precio, tiempo, condicion) → envía una cotización al portal
 *
 * La autenticación es delegada al AudatexSessionManager.
 */
@Component
public class AudatexClient {

    private static final Logger log = LoggerFactory.getLogger(AudatexClient.class);

    private static final String USER_AGENT =
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";

    /**
     * URL de búsqueda con filtro de estado "Todas" (IdStatus=0pvvBf/2O2M=)
     * Descubierta en Cycle 0 / ADR-001
     */
    private static final String SEARCH_URL_ALL =
            "?preloadfilter=true&IdStatus=0pvvBf/2O2M=";

    private final AudatexProperties props;
    private final AudatexSessionManager sessionManager;

    public AudatexClient(AudatexProperties props, AudatexSessionManager sessionManager) {
        this.props = props;
        this.sessionManager = sessionManager;
    }

    /**
     * Recupera todas las oportunidades disponibles navegando todas las páginas
     * del portal.
     *
     * ROD-15: Aplica patrones de resilience:
     *   - @CircuitBreaker: abre el circuito si hay 50% de fallos en 10 llamadas
     *   - @Retry: reintenta hasta 3 veces con delay de 1s ante IOException
     *   - @TimeLimiter: timeout de 30s para evitar bloqueos indefinidos
     *
     * @return lista completa de oportunidades activas
     * @throws IOException si falla la comunicación con el portal
     */
    public List<Map<String, Object>> buscarTodasOportunidades() throws IOException {
        return buscarTodasOportunidades(null, null);
    }

    @CircuitBreaker(name = "audatexClient", fallbackMethod = "buscarTodasOportunidadesFallback")
    @Retry(name = "audatexClient")
    @TimeLimiter(name = "audatexClient")
    public List<Map<String, Object>> buscarTodasOportunidades(String desde, String hasta) throws IOException {
        List<Map<String, Object>> todas = new ArrayList<>();
        scrapeStreaming(desde, hasta, page -> todas.addAll(page));
        log.info("[Audatex] Total oportunidades recuperadas: {}", todas.size());
        return todas;
    }

    /**
     * Versión streaming: invoca onPage por cada página scrapeada para que el
     * llamador pueda emitir resultados progresivamente (SSE / SseEmitter).
     * No lleva anotaciones de resilience4j: el manejo de errores es
     * responsabilidad del SseEmitter que envuelve la llamada.
     */
    public void buscarTodasOportunidadesStreaming(String desde, String hasta,
            Consumer<List<Map<String, Object>>> onPage) throws IOException {
        scrapeStreaming(desde, hasta, onPage);
    }

    /**
     * Scrapea oportunidades. Si hay rango de fechas, lo divide en ventanas de 3 días
     * (desde hoy hacia atrás) porque el portal InPart limita búsquedas amplias.
     */
    private void scrapeStreaming(String desde, String hasta,
            Consumer<List<Map<String, Object>>> onPage) throws IOException {

        if (desde != null && hasta != null) {
            java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
            LocalDate start = LocalDate.parse(desde.trim(), formatter);
            LocalDate end = LocalDate.parse(hasta.trim(), formatter);
            if (!start.isAfter(end)) {
                final int diasPorChunk = 3;
                // Chunks del más reciente al más antiguo: primero hoy, luego hacia atrás.
                LocalDate chunkEnd = end;
                while (!chunkEnd.isBefore(start)) {
                    LocalDate chunkStart = chunkEnd.minusDays(diasPorChunk - 1);
                    if (chunkStart.isBefore(start)) chunkStart = start;
                    log.info("[Audatex] === Búsqueda chunk {} → {} (reciente → antiguo) ===",
                            chunkStart, chunkEnd);
                    scrapeRangoFechas(chunkStart.toString(), chunkEnd.toString(), onPage);
                    chunkEnd = chunkStart.minusDays(1);
                    humanDelay();
                }
                return;
            }
        }
        scrapeRangoFechas(desde, hasta, onPage);
    }

    private void scrapeRangoFechas(String desde, String hasta,
            Consumer<List<Map<String, Object>>> onPage) throws IOException {

        Map<String, String> cookies = sessionManager.getActiveCookies();
        String refererUrl = sessionManager.getCurrentPanelUrl();

        String searchUrl = props.getQuotationSearchUrl();
        if (desde == null && hasta == null) {
            searchUrl = props.getQuotationSearchUrl() + SEARCH_URL_ALL;
        }

        log.info("[Audatex] Buscando oportunidades en: {}", searchUrl);
        log.info("[Audatex] Referer URL: {}", refererUrl);
        log.info("[Audatex] Cookies: {}", cookies.size());

        Connection.Response resp = Jsoup.connect(searchUrl)
                .cookies(cookies)
                .header("Referer", refererUrl)
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
                .header("Accept-Language", "es-419,es;q=0.9")
                .header("sec-ch-ua", "\"Google Chrome\";v=\"147\", \"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"147\"")
                .header("sec-ch-ua-mobile", "?0")
                .header("sec-ch-ua-platform", "\"Linux\"")
                .header("sec-fetch-dest", "document")
                .header("sec-fetch-mode", "navigate")
                .header("sec-fetch-site", "same-origin")
                .header("Upgrade-Insecure-Requests", "1")
                .followRedirects(true)
                .method(Connection.Method.GET)
                .userAgent(USER_AGENT)
                .execute();

        log.info("[Audatex] Response URL: {}", resp.url().toString());
        log.info("[Audatex] Response Status: {}", resp.statusCode());

        if (resp.url().toString().contains("frmLogin") || resp.url().toString().contains("AudaPartsSite")) {
            log.warn("[Audatex] Sesión expirada detectada en cliente — invalidando y reintentando");
            sessionManager.invalidate();
            cookies = sessionManager.getActiveCookies();
            String panelUrl = sessionManager.getCurrentPanelUrl();
            log.info("[Audatex] Reintentando búsqueda con Referer: {}", panelUrl);
            resp = Jsoup.connect(searchUrl)
                    .cookies(cookies)
                    .header("Referer", panelUrl)
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
                    .header("Accept-Language", "es-419,es;q=0.9")
                    .header("sec-ch-ua", "\"Google Chrome\";v=\"147\", \"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"147\"")
                    .header("sec-ch-ua-mobile", "?0")
                    .header("sec-ch-ua-platform", "\"Linux\"")
                    .header("sec-fetch-dest", "document")
                    .header("sec-fetch-mode", "navigate")
                    .header("sec-fetch-site", "same-origin")
                    .header("Upgrade-Insecure-Requests", "1")
                    .followRedirects(true)
                    .method(Connection.Method.GET)
                    .userAgent(USER_AGENT)
                    .execute();
            log.info("[Audatex] Respuesta del reintento - URL: {}, Status: {}", resp.url().toString(), resp.statusCode());
        }

        Document doc = resp.parse();

        String finalStartDate = formatToPortalDate(desde);
        String finalEndDate = formatToPortalDate(hasta);
        // "" = "Todos" en el select ddlStatusQuotation del portal.
        // SEARCH_URL_ALL ya preselecciona "Todos" en el servidor mediante IdStatus URL param.
        String finalStatus = "";

        if (desde == null && hasta == null) {
            Element txtStart = doc.getElementById("ctl00_cphBody_txtStartDate");
            if (txtStart != null) finalStartDate = txtStart.attr("value");
            Element txtEnd = doc.getElementById("ctl00_cphBody_txtEndDate");
            if (txtEnd != null) finalEndDate = txtEnd.attr("value");
            Element ddlStatusEl = doc.getElementById("ctl00_cphBody_ddlStatusQuotation");
            if (ddlStatusEl != null) {
                Element selected = ddlStatusEl.select("option[selected]").first();
                if (selected != null) finalStatus = selected.attr("value");
            }
        }
        log.info("[Audatex] Status de búsqueda: '{}' (Todos)", finalStatus);

        if (desde != null || hasta != null) {
            log.info("[Audatex] POST búsqueda con fechas desde={} (portal: {}) hasta={} (portal: {})",
                    desde, finalStartDate, hasta, finalEndDate);

            Map<String, String> searchForm = extractFormFields(doc);
            searchForm.put("__EVENTTARGET", "");
            searchForm.put("__EVENTARGUMENT", "");
            if (finalStartDate != null) searchForm.put("ctl00$cphBody$txtStartDate", finalStartDate);
            if (finalEndDate != null)   searchForm.put("ctl00$cphBody$txtEndDate",   finalEndDate);
            searchForm.put("ctl00$cphBody$ddlStatusQuotation", finalStatus);
            searchForm.put("ctl00$cphBody$btnSearch", "Buscar");

            resp = Jsoup.connect(props.getQuotationSearchUrl())
                    .cookies(cookies)
                    .data(searchForm)
                    .header("Referer", resp.url().toString())
                    .header("Origin", "https://inpart-la.audatex.com.mx")
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
                    .header("Accept-Language", "es-419,es;q=0.9")
                    .method(Connection.Method.POST)
                    .userAgent(USER_AGENT)
                    .execute();

            cookies.putAll(resp.cookies());
            doc = resp.parse();
        }

        List<Map<String, Object>> pag1 = parsearTablaOportunidades(doc);
        onPage.accept(pag1);

        int totalPaginas = obtenerTotalPaginas(doc);
        int totalRegistros = obtenerTotalRegistros(doc);
        log.info("[Audatex] Total de páginas detectadas: {}, registros en portal: {}", totalPaginas, totalRegistros);

        String currentUrl = resp.url().toString();
        List<Map<String, Object>> paginaAnterior = pag1;

        // Navegación secuencial página a página (Siguiente / AJAX del paginador).
        int pagina = 1;
        while (pagina < totalPaginas) {
            humanDelay();
            PostNavigationResult nav = irSiguientePagina(doc, currentUrl, cookies,
                    finalStartDate, finalEndDate, finalStatus);
            if (!nav.success()) {
                log.warn("[Audatex] Paginación detenida en página {} de {}: {}",
                        pagina, totalPaginas, nav.message());
                break;
            }
            doc = nav.document();
            cookies.putAll(nav.cookies());
            currentUrl = nav.url();
            pagina++;

            List<Map<String, Object>> filas = parsearTablaOportunidades(doc);
            if (filas.isEmpty()) {
                log.warn("[Audatex] Página {} sin filas — deteniendo", pagina);
                break;
            }
            if (mismasFilas(filas, paginaAnterior)) {
                log.warn("[Audatex] Página {} duplicada (mismos cotizacionId que anterior) — deteniendo", pagina);
                break;
            }
            paginaAnterior = filas;
            onPage.accept(filas);
            log.info("[Audatex] Página {} scrapeada — {} filas (acumulado portal ~{})",
                    pagina, filas.size(), pagina * filas.size());

            if (pagina >= 300) {
                log.warn("[Audatex] Se alcanzó el límite de 300 páginas, deteniendo paginación");
                break;
            }
        }
    }

    /** Resultado de un POST de navegación (paginación). */
    private record PostNavigationResult(
            boolean success, Document document, Map<String, String> cookies,
            String url, String message) {}

    /** Compara dos páginas por cotizacionId para detectar duplicados del portal. */
    private boolean mismasFilas(List<Map<String, Object>> a, List<Map<String, Object>> b) {
        if (a.size() != b.size() || a.isEmpty()) return false;
        for (int i = 0; i < a.size(); i++) {
            Object idA = a.get(i).get("cotizacionId");
            Object idB = b.get(i).get("cotizacionId");
            if (idA == null || !idA.equals(idB)) return false;
        }
        return true;
    }

    private List<Map<String, Object>> buscarTodasOportunidadesFallback(String desde, String hasta, Exception exception) throws IOException {
        log.warn("[Audatex] Circuit breaker activado para desde={}, hasta={} - propagando error: {}", desde, hasta, exception.getMessage());
        if (exception instanceof IOException) {
            throw (IOException) exception;
        }
        throw new IOException("Error consultando portal Audatex", exception);
    }

    // ── ROD-27: Enviar Cotización ───────────────────────────────────────────────────

    /**
     * Envía una cotización al portal Audatex InPart.
     * Este es el método más crítico del proyecto porque implica form submit con ViewState.
     *
     * Flujo:
     * 1. Navega a la página de detalle de la cotización usando el WAN
     * 2. Extrae ViewState y otros hidden inputs del formulario
     * 3. Llena los campos del formulario (precio, tiempo, condición)
     * 4. Submit el formulario via POST
     * 5. Verifica que el envío fue exitoso
     *
     * @param wan ID del siniestro (WAN-like) para identificar la cotización
     * @param precio Precio ofrecido en colones
     * @param tiempo Tiempo de entrega (ej: "24h", "48h")
     * @param condicion Condición de la pieza (ej: "Usado en buen estado")
     * @return true si el envío fue exitoso, false en caso contrario
     * @throws IOException si falla la comunicación con el portal
     */
    @CircuitBreaker(name = "audatexClient", fallbackMethod = "enviarCotizacionFallback")
    @Retry(name = "audatexClient")
    @TimeLimiter(name = "audatexClient")
    public boolean enviarCotizacion(String wan, List<Map<String, Object>> items) throws IOException {
        Map<String, String> cookies = sessionManager.getActiveCookies();

        // URL de detalle de cotización (ejemplo basado en estructura típica de ASP.NET)
        String detalleUrl = props.getQuotationSearchUrl().replace("frmQuotationSupplierSearch.aspx", "frmQuotationSupplierAnswer.aspx") 
                + "?IdQuotation=" + java.net.URLEncoder.encode(wan, "UTF-8") + "&CalledPage=QuotationSupplierSearch";
        log.info("[Audatex] Enviando cotización para WAN {} - URL: {}", wan, detalleUrl);

        // 1. Navegar a la página de detalle
        Connection.Response resp = Jsoup.connect(detalleUrl)
                .cookies(cookies)
                .timeout(300000)
                .header("Referer", props.getQuotationSearchUrl())
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
                .header("Accept-Language", "es-419,es;q=0.9")
                .header("sec-ch-ua", "\"Google Chrome\";v=\"147\", \"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"147\"")
                .header("sec-ch-ua-mobile", "?0")
                .header("sec-ch-ua-platform", "\"Linux\"")
                .header("sec-fetch-dest", "document")
                .header("sec-fetch-mode", "navigate")
                .header("sec-fetch-site", "same-origin")
                .header("Upgrade-Insecure-Requests", "1")
                .followRedirects(true)
                .method(Connection.Method.GET)
                .userAgent(USER_AGENT)
                .execute();

        // Verificar si la sesión expiró
        if (resp.url().toString().contains("frmLogin") || resp.url().toString().contains("AudaPartsSite")) {
            log.warn("[Audatex] Sesión expirada al intentar enviar cotización - re-autenticando");
            sessionManager.invalidate();
            cookies = sessionManager.getActiveCookies();
            resp = Jsoup.connect(detalleUrl)
                    .cookies(cookies)
                    .timeout(300000)
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
                    .header("Accept-Language", "es-419,es;q=0.9")
                    .header("sec-ch-ua", "\"Google Chrome\";v=\"147\", \"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"147\"")
                    .header("sec-ch-ua-mobile", "?0")
                    .header("sec-ch-ua-platform", "\"Linux\"")
                    .header("sec-fetch-dest", "document")
                    .header("sec-fetch-mode", "navigate")
                    .header("sec-fetch-site", "same-origin")
                    .header("Upgrade-Insecure-Requests", "1")
                    .followRedirects(true)
                    .method(Connection.Method.GET)
                    .userAgent(USER_AGENT)
                    .execute();
        }

        Document doc = resp.parse();

        // 2. Extraer ViewState y hidden inputs
        Map<String, String> formData = extractFormFields(doc);

        // 3. Llenar campos del formulario iterando la lista de items
        if (items != null) {
            for (Map<String, Object> item : items) {
                if (!item.containsKey("idx")) continue;
                
                int idx = ((Number) item.get("idx")).intValue();
                String aspIdx = String.format("%02d", idx);
                
                String tipoPiezaStr = (String) item.get("tipoPieza");
                String partTypeCtl;
                if ("Original".equalsIgnoreCase(tipoPiezaStr)) {
                    partTypeCtl = "ctl02";
                } else if ("Genérica".equalsIgnoreCase(tipoPiezaStr) || "Generica".equalsIgnoreCase(tipoPiezaStr)) {
                    partTypeCtl = "ctl03";
                } else {
                    partTypeCtl = "ctl04"; // Usada u otro
                }
                
                String prefix = "ctl00$cphBody$tbcAnswerQuotation$tabItems$ucQuotationSupplierAnswerItems$dtlAnswerPendingItem$ctl" + aspIdx + "$gdvPart$" + partTypeCtl + "$";
                
                String precioStr = item.get("precioOfrecido") != null ? item.get("precioOfrecido").toString() : "";
                String plazoStr = item.get("diasEntrega") != null ? item.get("diasEntrega").toString() : "";
                
                formData.put(prefix + "txtItemPrice", precioStr);
                formData.put(prefix + "ddlDeliveryDeadLine", plazoStr);
            }
        }
        
        // Simular click en botón Enviar
        formData.put("ctl00$cphBody$btnSend", "Enviar");

        // 4. Submit el formulario
        humanDelay(); // Delay humano antes de submit

        String submitUrl = resp.url().toString();
        Connection.Response submitResp = Jsoup.connect(submitUrl)
                .cookies(cookies)
                .timeout(300000)
                .data(formData)
                .header("Referer", submitUrl)
                .header("Origin", "https://inpart-la.audatex.com.mx")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
                .header("Accept-Language", "es-419,es;q=0.9")
                .header("sec-ch-ua", "\"Google Chrome\";v=\"147\", \"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"147\"")
                .header("sec-ch-ua-mobile", "?0")
                .header("sec-ch-ua-platform", "\"Linux\"")
                .header("sec-fetch-dest", "document")
                .header("sec-fetch-mode", "navigate")
                .header("sec-fetch-site", "same-origin")
                .header("Upgrade-Insecure-Requests", "1")
                .followRedirects(true)
                .method(Connection.Method.POST)
                .userAgent(USER_AGENT)
                .execute();

        // 5. Verificar que el envío fue exitoso
        Document resultDoc = submitResp.parse();
        boolean exito = verificarEnvioExitoso(resultDoc);

        if (exito) {
            log.info("[Audatex] Cotización enviada exitosamente para WAN {}", wan);
        } else {
            log.warn("[Audatex] No se pudo verificar el envío para WAN {}", wan);
        }

        return exito;
    }

    /**
     * Verifica si el envío de cotización fue exitoso analizando la respuesta.
     * Busca indicadores de éxito como mensajes de confirmación o redirección.
     */
    private boolean verificarEnvioExitoso(Document doc) {
        // Buscar mensaje de éxito típico de ASP.NET
        String bodyText = doc.body().text().toLowerCase();
        
        // Indicadores de éxito (ajustar según la respuesta real del portal)
        if (bodyText.contains("enviado") || bodyText.contains("enviada") || 
            bodyText.contains("exitoso") || bodyText.contains("éxito")) {
            return true;
        }

        // Verificar si hay mensajes de error
        if (bodyText.contains("error") || bodyText.contains("fallo")) {
            return false;
        }

        // Por defecto, asumir éxito si no hay errores evidentes
        // Esto debe refinarse con pruebas reales contra el portal
        return true;
    }

    /**
     * Fallback method para enviarCotizacion.
     * Se ejecuta cuando el circuito está abierto o hay fallos repetidos.
     */
    private boolean enviarCotizacionFallback(String wan, List<Map<String, Object>> items, Exception exception) {
        log.warn("[Audatex] Circuit breaker activado en enviarCotizacion - usando fallback. Error: {}", exception.getMessage());
        return false;
    }

    // ── ROD-27b: Ver Detalle de Cotización ─────────────────────────────────────────

    /**
     * Obtiene solo la lista de repuestos de una cotización para su uso en el stream.
     * Hace el GET a frmQuotationSupplierAnswer.aspx y parsea los repuestos.
     * Retorna una lista vacía si hay error o no se encuentran repuestos.
     */
    public Map<String, Object> obtenerDetallesDeCotizacion(String wan) {
        Map<String, Object> result = new java.util.HashMap<>();
        List<Map<String, String>> repuestos = new ArrayList<>();
        Map<String, String> datosCotizacion = new java.util.LinkedHashMap<>();
        result.put("repuestos", repuestos);
        result.put("datosCotizacion", datosCotizacion);
        try {
            // Delay corto para no saturar el portal con requests simultáneos
            // (el hilo de stream ya tiene una conexión HTTP activa)
            Thread.sleep(500 + (long)(Math.random() * 300));

            Map<String, String> cookies = sessionManager.getActiveCookies();
            String detalleUrl = props.getQuotationSearchUrl()
                    .replace("frmQuotationSupplierSearch.aspx", "frmQuotationSupplierAnswer.aspx")
                    + "?IdQuotation=" + java.net.URLEncoder.encode(wan, "UTF-8")
                    + "&CalledPage=QuotationSupplierSearch";

            Connection.Response resp = Jsoup.connect(detalleUrl)
                    .cookies(cookies)
                    .header("Referer", props.getQuotationSearchUrl())
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                    .header("Accept-Language", "es-419,es;q=0.9")
                    .header("sec-fetch-dest", "document")
                    .header("sec-fetch-mode", "navigate")
                    .header("sec-fetch-site", "same-origin")
                    .header("Upgrade-Insecure-Requests", "1")
                    .followRedirects(true)
                    .timeout(300_000)   // 300 s — el portal puede tardar muchísimo
                    .method(Connection.Method.GET)
                    .userAgent(USER_AGENT)
                    .execute();

            if (resp.url().toString().contains("frmLogin") || resp.url().toString().contains("AudaPartsSite")) {
                log.warn("[Audatex] Sesión expirada al obtener repuestos para WAN {} - re-autenticando", wan);
                sessionManager.invalidate();
                cookies = sessionManager.getActiveCookies();
                resp = Jsoup.connect(detalleUrl)
                        .cookies(cookies)
                        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                        .header("Accept-Language", "es-419,es;q=0.9")
                        .followRedirects(true)
                        .timeout(300_000)
                        .method(Connection.Method.GET)
                        .userAgent(USER_AGENT)
                        .execute();
            }

            Document doc = resp.parse();
            repuestos.addAll(parsearRepuestosDeDoc(doc));
            
            // Extracción inicial por si acaso
            datosCotizacion.putAll(parsearDatosCotizacion(doc));
            
            // Si la pestaña de datos viene vacía (AJAX TabContainer de ASP.NET) simulamos el clic en la pestaña
            boolean requiresTabPost = datosCotizacion.getOrDefault("Marca", "").isEmpty() || 
                                      datosCotizacion.getOrDefault("Matricula", "").isEmpty() || 
                                      datosCotizacion.getOrDefault("Año Modelo", "").isEmpty();
                                      
            if (requiresTabPost) {
                try {
                    java.util.Map<String, String> formData = extractFormFields(doc);
                    formData.put("__EVENTTARGET", "ctl00$cphBody$tbcAnswerQuotation");
                    formData.put("__EVENTARGUMENT", "activeTabChanged:1");
                    
                    String clientStateKey = "ctl00_cphBody_tbcAnswerQuotation_ClientState";
                    if (formData.containsKey("ctl00$cphBody$tbcAnswerQuotation_ClientState")) {
                        clientStateKey = "ctl00$cphBody$tbcAnswerQuotation_ClientState";
                    }
                    formData.put(clientStateKey, "{\"ActiveTabIndex\":1,\"TabEnabledState\":[true,true],\"TabWasLoadedOnceState\":[true,false]}");
                    formData.put("ctl00$smMain", "ctl00$smMain|ctl00$cphBody$tbcAnswerQuotation");
                    
                    Connection.Response postResp = Jsoup.connect(detalleUrl)
                            .cookies(cookies)
                            .header("Referer", detalleUrl)
                            .header("Accept", "*/*")
                            .header("Accept-Language", "es-419,es;q=0.9")
                            .header("X-MicrosoftAjax", "Delta=true")
                            .header("X-Requested-With", "XMLHttpRequest")
                            .header("Cache-Control", "no-cache")
                            .userAgent(USER_AGENT)
                            .method(Connection.Method.POST)
                            .data(formData)
                            .timeout(300_000)
                            .execute();
                    
                    String postBody = postResp.body();
                    log.info("[Audatex] POST res.length={} | Snippet: {}", postBody.length(), postBody.length() > 500 ? postBody.substring(0, 500) : postBody);
                    
                    Document postDoc = Jsoup.parse(postBody);
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
            
            return result;
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            return result;
        } catch (Exception e) {
            log.warn("[Audatex] No se pudieron obtener repuestos para WAN {}: {}", wan, e.getMessage());
            return result;
        }
    }

    /**
     * Parsea los repuestos de un documento frmQuotationSupplierAnswer.
     *
     * El portal Audatex usa un ASP.NET DataList (dtlAnswerPendingItem) donde cada
     * pieza se renderiza con spans de IDs predecibles:
     *   dtlAnswerPendingItem_ctl<N>_lblPartNumber
     *   dtlAnswerPendingItem_ctl<N>_lblPartDescription
     *   dtlAnswerPendingItem_ctl<N>_lblPartSerialNumber
     *   dtlAnswerPendingItem_ctl<N>_lblPartGroup
     *
     * Buscar por atributo de ID (endsWith) es inmune a cambios en tabla/estructura.
     */
    
    private Map<String, String> parsearDatosCotizacion(Document doc) {
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
            idMap.put("Nombre Taller", "lblBodyshop"); // El nombre principal suele estar aquí
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
    }
private List<Map<String, String>> parsearRepuestosDeDoc(Document doc) {
        List<Map<String, String>> filasRepuestos = new ArrayList<>();

        // Dump HTML para diagnostico (sobrescribe en cada llamada)
        try {
            java.nio.file.Files.writeString(
                java.nio.file.Paths.get("AudaPartsWebApp_Detalle.html"),
                doc.outerHtml()
            );
        } catch (Exception ignored) { }

        // Buscar todos los spans cuyo id termina en "_lblPartNumber"
        // -> cada uno es un item distinto del DataList
        Elements partNumberSpans = doc.select("span[id$=_lblPartNumber]");
        log.info("[Audatex][ParseRepuestos] Items DataList detectados: {}", partNumberSpans.size());

        for (Element pnSpan : partNumberSpans) {
            String baseId = pnSpan.id().replace("_lblPartNumber", "");

            String partNumber  = pnSpan.text().trim();
            String descripcion = textoDe(doc, baseId + "_lblPartDescription");
            String serial      = textoDe(doc, baseId + "_lblPartSerialNumber");
            String grupo       = textoDe(doc, baseId + "_lblPartGroup");

            if (partNumber.isEmpty() && descripcion.isEmpty()) continue;

            Map<String, String> repuesto = new java.util.LinkedHashMap<>();
            if (!grupo.isEmpty())       repuesto.put("Grupo Pieza",        grupo);
            if (!partNumber.isEmpty())  repuesto.put("PartNumber",          partNumber);
            if (!serial.isEmpty())      repuesto.put("Part Serial Number",  serial);
            if (!descripcion.isEmpty()) repuesto.put("Descripcion Pieza",   descripcion);

            filasRepuestos.add(repuesto);
        }

        log.info("[Audatex][ParseRepuestos] Repuestos extraidos: {}", filasRepuestos.size());
        return filasRepuestos;
    }

    /** Extrae el texto de un elemento por su id exacto; retorna "" si no existe. */
    private String textoDe(Document doc, String id) {
        Element el = doc.getElementById(id);
        return el != null ? el.text().trim() : "";
    }



    public Map<String, Object> obtenerDetalleCotizacion(String wan) throws IOException {
        Map<String, String> cookies = sessionManager.getActiveCookies();
        String detalleUrl = props.getQuotationSearchUrl().replace("frmQuotationSupplierSearch.aspx", "frmQuotationSupplierAnswer.aspx") 
                + "?IdQuotation=" + java.net.URLEncoder.encode(wan, "UTF-8") + "&CalledPage=QuotationSupplierSearch";
        
        log.info("[Audatex] Obteniendo detalles para WAN {} - URL: {}", wan, detalleUrl);

        Connection.Response resp = Jsoup.connect(detalleUrl)
                .cookies(cookies)
                .header("Referer", props.getQuotationSearchUrl())
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
                .header("Accept-Language", "es-419,es;q=0.9")
                .header("sec-fetch-dest", "document")
                .header("sec-fetch-mode", "navigate")
                .header("sec-fetch-site", "same-origin")
                .header("Upgrade-Insecure-Requests", "1")
                .followRedirects(true)
                .method(Connection.Method.GET)
                .userAgent(USER_AGENT)
                .execute();

        if (resp.url().toString().contains("frmLogin") || resp.url().toString().contains("AudaPartsSite")) {
            log.warn("[Audatex] Sesión expirada al intentar ver detalle - re-autenticando");
            sessionManager.invalidate();
            cookies = sessionManager.getActiveCookies();
            resp = Jsoup.connect(detalleUrl)
                    .cookies(cookies)
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8")
                    .header("Accept-Language", "es-419,es;q=0.9")
                    .followRedirects(true)
                    .method(Connection.Method.GET)
                    .userAgent(USER_AGENT)
                    .execute();
        }

        Document doc = resp.parse();
        Map<String, Object> resultado = new java.util.LinkedHashMap<>();
        resultado.put("wan", wan);
        resultado.put("formFields", extractFormFields(doc));

        List<Map<String, String>> filasRepuestos = parsearRepuestosDeDoc(doc);
        
        Map<String, String> datosCotizacion = parsearDatosCotizacion(doc);
        if (datosCotizacion.getOrDefault("Marca", "").isEmpty() && datosCotizacion.getOrDefault("Matricula", "").isEmpty()) {
            try {
                java.util.Map<String, String> formData = extractFormFields(doc);
                formData.put("__EVENTTARGET", "ctl00$cphBody$tbcAnswerQuotation");
                formData.put("__EVENTARGUMENT", "activeTabChanged:1");
                
                String clientStateKey = "ctl00_cphBody_tbcAnswerQuotation_ClientState";
                if (formData.containsKey("ctl00$cphBody$tbcAnswerQuotation_ClientState")) {
                    clientStateKey = "ctl00$cphBody$tbcAnswerQuotation_ClientState";
                }
                formData.put(clientStateKey, "{\"ActiveTabIndex\":1,\"TabEnabledState\":[true,true],\"TabWasLoadedOnceState\":[true,false]}");
                formData.put("ctl00$smMain", "ctl00$smMain|ctl00$cphBody$tbcAnswerQuotation");
                
                Connection.Response postResp = Jsoup.connect(detalleUrl)
                        .cookies(cookies)
                        .header("Referer", detalleUrl)
                        .header("Accept", "*/*")
                        .header("Accept-Language", "es-419,es;q=0.9")
                        .header("X-MicrosoftAjax", "Delta=true")
                        .header("X-Requested-With", "XMLHttpRequest")
                        .header("Cache-Control", "no-cache")
                        .userAgent(USER_AGENT)
                        .method(Connection.Method.POST)
                        .data(formData)
                        .timeout(300_000)
                        .execute();
                
                String postBody = postResp.body();
                log.info("[Audatex] POST res.length={} | Snippet: {}", postBody.length(), postBody.length() > 500 ? postBody.substring(0, 500) : postBody);
                
                Document postDoc = Jsoup.parse(postBody);
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
        resultado.put("datosCotizacion", datosCotizacion);

        List<Map<String, Object>> tablas = new ArrayList<>();
        if (!filasRepuestos.isEmpty()) {
            Map<String, Object> t = new java.util.LinkedHashMap<>();
            t.put("id", "Lista de Repuestos");
            t.put("data", filasRepuestos);
            tablas.add(t);
        }
        resultado.put("tablas", tablas);

        return resultado;
    }

    // ── Parsing ─────────────────────────────────────────────────────────────────

    /**
     * Parsea la tabla de cotizaciones ctl00_cphBody_gdvResult del documento HTML.
     * Columnas (0-indexed):
     *   0 Aseguradora | 1 CotizaciónId | 2 Taller | 3 Póliza | 4 Siniestro
     *   5 Matrícula   | 6 Armadora     | 7 Fecha   | 8 Pendientes
     */
    private List<Map<String, Object>> parsearTablaOportunidades(Document doc) {
        List<Map<String, Object>> lista = new ArrayList<>();

        Element table = doc.getElementById("ctl00_cphBody_gdvResult");
        if (table == null) {
            table = doc.select("table[id$=gdvResult]").first();
        }
        if (table == null) {
            log.debug("[Audatex] Tabla gdvResult no encontrada en el documento");
            return lista;
        }

        Elements rows = table.select("tr");
        // Saltar fila de encabezado (índice 0)
        for (int i = 1; i < rows.size(); i++) {
            Elements cols = rows.get(i).select("td");
            if (cols.size() < 9) continue;

            Map<String, Object> oportunidad = new LinkedHashMap<>();
            oportunidad.put("aseguradora", cols.get(0).text().trim());
            oportunidad.put("cotizacionId", cols.get(1).text().trim());
            oportunidad.put("taller", cols.get(2).text().trim());
            oportunidad.put("poliza", cols.get(3).text().trim());
            oportunidad.put("siniestro", cols.get(4).text().trim());
            oportunidad.put("matricula", cols.get(5).text().trim());
            oportunidad.put("armadora", cols.get(6).text().trim());
            oportunidad.put("fechaCotizacion", cols.get(7).text().trim());

            try {
                oportunidad.put("pendientes", Integer.parseInt(cols.get(8).text().trim()));
            } catch (NumberFormatException e) {
                oportunidad.put("pendientes", 0);
            }

            // Extract the actual base64 ID from anywhere in the row's HTML
            String base64Wan = null;
            String rowHtml = rows.get(i).outerHtml();
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?:IdQuotation|WAN)=([^&\"'>]+)").matcher(rowHtml);
            if (m.find()) {
                base64Wan = m.group(1);
            } else {
                // Respaldo agresivo: buscar una cadena Base64 válida (min 10 caracteres, puede terminar en =)
                m = java.util.regex.Pattern.compile("['\"]([A-Za-z0-9+/]{10,60}=*)['\"]").matcher(rowHtml);
                if (m.find()) {
                    base64Wan = m.group(1);
                }
            }
            
            if (base64Wan != null) {
                oportunidad.put("wan", base64Wan);
            } else {
                oportunidad.put("wan", oportunidad.get("cotizacionId")); // fallback
            }

            lista.add(oportunidad);
        }

        // Dump HTML for debugging
        try {
            java.nio.file.Files.writeString(
                java.nio.file.Paths.get("AudaPartsWebApp_Search.html"),
                table.outerHtml()
            );
        } catch (Exception e) {
            log.error("Failed to dump HTML", e);
        }

        return lista;
    }

    // ── Pagination ───────────────────────────────────────────────────────────────

    private static final String SCRIPT_MANAGER = "ctl00$ToolkitScriptManager1";
    private static final String PANEL_PAGER   = "ctl00$cphBody$ucNeoPager$updPager";
    private static final String PANEL_GDV     = "ctl00$cphBody$updGdvResult";

    /**
     * Avanza una página usando el botón Siguiente del paginador (postback AJAX real del portal).
     */
    private PostNavigationResult irSiguientePagina(Document currentDoc, String currentUrl,
            Map<String, String> cookies, String startDate, String endDate, String status) throws IOException {

        int paginaActual = obtenerPaginaActual(currentDoc);
        String idAnterior = primeraCotizacionId(currentDoc);
        int siguiente = paginaActual + 1;

        PostNavigationResult r = intentarPaginacionSync(currentDoc, currentUrl, cookies,
                startDate, endDate, status, siguiente, paginaActual, idAnterior);
        if (r != null) return r;

        r = intentarGridViewPage(currentDoc, currentUrl, cookies,
                startDate, endDate, status, siguiente, paginaActual, idAnterior);
        if (r != null) return r;

        Element ibtNext = currentDoc.getElementById("ctl00_cphBody_ucNeoPager_ibtNext");
        if (ibtNext == null) {
            ibtNext = currentDoc.select("input[type=image][name*=ucNeoPager$ibtNext]").first();
        }
        if (ibtNext != null && !ibtNext.hasAttr("disabled")) {
            r = intentarPaginacionAjax(currentDoc, currentUrl, cookies,
                    startDate, endDate, status, "next",
                    ibtNext.attr("name"), null, paginaActual, idAnterior);
            if (r != null) return r;
        }

        r = intentarPaginacionAjax(currentDoc, currentUrl, cookies,
                startDate, endDate, status, "ddl",
                "ctl00$cphBody$ucNeoPager$ddlGoToPage",
                String.valueOf(siguiente), paginaActual, idAnterior);
        if (r != null) return r;

        return new PostNavigationResult(false, currentDoc, cookies, currentUrl,
                "ninguna estrategia avanzó desde página " + paginaActual);
    }

    /**
     * Navega a la página N del GridView. Prueba AJAX Siguiente, ddl, GridView sync.
     */
    private PostNavigationResult irAPagina(Document currentDoc, String currentUrl,
            Map<String, String> cookies, int numeroPagina,
            String startDate, String endDate, String status) throws IOException {

        int paginaActual = obtenerPaginaActual(currentDoc);
        String idAnterior = primeraCotizacionId(currentDoc);

        PostNavigationResult r = intentarGridViewPage(currentDoc, currentUrl, cookies,
                startDate, endDate, status, numeroPagina, paginaActual, idAnterior);
        if (r != null) return r;

        r = intentarPaginacionSync(currentDoc, currentUrl, cookies,
                startDate, endDate, status, numeroPagina, paginaActual, idAnterior);
        if (r != null) return r;

        r = intentarPaginacionAjax(currentDoc, currentUrl, cookies,
                startDate, endDate, status, "ddl",
                "ctl00$cphBody$ucNeoPager$ddlGoToPage",
                String.valueOf(numeroPagina), paginaActual, idAnterior);
        if (r != null) return r;

        Element ibtNext = currentDoc.select("input[type=image][name*=ibtNext]").first();
        if (ibtNext != null && !ibtNext.hasAttr("disabled")) {
            r = intentarPaginacionAjax(currentDoc, currentUrl, cookies,
                    startDate, endDate, status, "next",
                    ibtNext.attr("name"), null, paginaActual, idAnterior);
            if (r != null) return r;
        }

        return new PostNavigationResult(false, currentDoc, cookies, currentUrl,
                "ninguna estrategia alcanzó página " + numeroPagina);
    }

    /** Postback síncrono estándar: __EVENTTARGET=gdvResult, __EVENTARGUMENT=Page$N */
    private PostNavigationResult intentarGridViewPage(Document currentDoc, String currentUrl,
            Map<String, String> cookies, String startDate, String endDate, String status,
            int numeroPagina, int paginaActual, String idAnterior) throws IOException {

        Map<String, String> form = extractFormFields(currentDoc);
        form.put("__EVENTTARGET", "ctl00$cphBody$gdvResult");
        form.put("__EVENTARGUMENT", "Page$" + numeroPagina);
        form.remove("__ASYNCPOST");
        form.remove(SCRIPT_MANAGER);
        form.remove("ctl00$cphBody$btnSearch");
        form.keySet().removeIf(k -> k.endsWith(".x") || k.endsWith(".y"));
        
        aplicarFiltros(form, startDate, endDate, status);

        Connection.Response postResp = postForm(currentUrl, cookies, form);
        cookies.putAll(postResp.cookies());
        return evaluarRespuestaPaginacion(currentDoc, postResp.body(), postResp.url().toString(),
                cookies, paginaActual, idAnterior, "grid-page-" + numeroPagina);
    }

    private PostNavigationResult intentarPaginacionAjax(Document currentDoc, String currentUrl,
            Map<String, String> cookies, String startDate, String endDate, String status,
            String modo, String controlName, String controlValue,
            int paginaActual, String idAnterior) throws IOException {

        String[] scriptManagers = {
                PANEL_PAGER + "|" + controlName,
                PANEL_GDV + "|" + PANEL_PAGER + "|" + controlName,
                PANEL_GDV + "|" + controlName
        };

        for (String scriptTarget : scriptManagers) {
            Map<String, String> form = extractFormFields(currentDoc);
            form.put("__EVENTTARGET", "ddl".equals(modo) ? controlName : "");
            form.put("__EVENTARGUMENT", "");
            form.put("__ASYNCPOST", "true");
            form.put(SCRIPT_MANAGER, scriptTarget);
            form.remove("ctl00$cphBody$btnSearch");
            form.remove("__LASTFOCUS");
            form.keySet().removeIf(k -> k.endsWith(".x") || k.endsWith(".y"));
            if ("ddl".equals(modo)) {
                form.put(controlName, controlValue);
            } else {
                form.put(controlName + ".x", "8");
                form.put(controlName + ".y", "8");
            }
            
            aplicarFiltros(form, startDate, endDate, status);

            Connection.Response postResp = postFormAjax(currentUrl, cookies, form);
            cookies.putAll(postResp.cookies());
            PostNavigationResult r = evaluarRespuestaPaginacion(currentDoc, postResp.body(),
                    postResp.url().toString(), cookies, paginaActual, idAnterior,
                    "ajax-" + modo + "-" + scriptTarget.hashCode());
            if (r != null) return r;
        }
        return null;
    }

    private PostNavigationResult intentarPaginacionSync(Document currentDoc, String currentUrl,
            Map<String, String> cookies, String startDate, String endDate, String status,
            int numeroPagina, int paginaActual, String idAnterior) throws IOException {

        Map<String, String> form = extractFormFields(currentDoc);
        form.put("__EVENTTARGET", "ctl00$cphBody$ucNeoPager$ddlGoToPage");
        form.put("__EVENTARGUMENT", "");
        form.put("ctl00$cphBody$ucNeoPager$ddlGoToPage", String.valueOf(numeroPagina));
        form.remove("__ASYNCPOST");
        form.remove(SCRIPT_MANAGER);
        form.remove("ctl00$cphBody$btnSearch");
        form.keySet().removeIf(k -> k.endsWith(".x") || k.endsWith(".y"));
        
        aplicarFiltros(form, startDate, endDate, status);

        Connection.Response postResp = postForm(currentUrl, cookies, form);
        cookies.putAll(postResp.cookies());
        return evaluarRespuestaPaginacion(currentDoc, postResp.body(), postResp.url().toString(),
                cookies, paginaActual, idAnterior, "sync-ddl");
    }

    private PostNavigationResult evaluarRespuestaPaginacion(Document currentDoc, String body, String newUrl,
            Map<String, String> cookies, int paginaActual, String idAnterior, String estrategia) {

        if (body == null || body.isBlank()) return null;
        if (body.contains("Error.aspx") || body.contains("Error en Proceso")) {
            log.warn("[Audatex] {} → portal devolvió Error.aspx", estrategia);
            return null;
        }
        if (body.contains("pageRedirect") && body.contains("Error")) {
            log.warn("[Audatex] {} → redirect a Error", estrategia);
            return null;
        }

        Document merged;
        if (body.contains("<html") || body.contains("<!DOCTYPE")) {
            merged = Jsoup.parse(body);
            if (merged.select("table[id*=gdvResult]").isEmpty()) return null;
        } else {
            merged = mergeAjaxResponse(currentDoc, body);
        }
        if (merged == null) {
            log.warn("[Audatex] {} — respuesta no parseable ({} bytes)", estrategia, body.length());
            return null;
        }

        int paginaNueva = obtenerPaginaActual(merged);
        String idNuevo = primeraCotizacionId(merged);
        boolean avanzo = (paginaNueva > paginaActual)
                || (idAnterior != null && idNuevo != null && !idAnterior.equals(idNuevo));

        log.info("[Audatex] {} → página {}→{}, id {}→{}, avanzó={}",
                estrategia, paginaActual, paginaNueva, idAnterior, idNuevo, avanzo);

        if (!avanzo) return null;
        return new PostNavigationResult(true, merged, cookies, newUrl,
                "ok " + estrategia + " página " + paginaNueva);
    }

    private String primeraCotizacionId(Document doc) {
        List<Map<String, Object>> filas = parsearTablaOportunidades(doc);
        return filas.isEmpty() ? null : String.valueOf(filas.get(0).get("cotizacionId"));
    }

    /**
     * Parsea respuesta Microsoft AJAX (delta) o HTML completo y fusiona en el documento base.
     * Retorna null si no se pudo extraer la tabla de resultados.
     */
    private Document mergeAjaxResponse(Document base, String body) {
        if (body == null || body.isBlank()) return null;

        // HTML completo (postback síncrono)
        if (body.contains("<html") || body.contains("<!DOCTYPE")) {
            Document full = Jsoup.parse(body);
            return parsearTablaOportunidades(full).isEmpty() ? null : full;
        }

        // Delta AJAX: segmentos con longitud prefijada (1|#||4|...)
        if (!body.matches("(?s)^\\d+\\|.*")) {
            return null;
        }

        Map<String, String> panels = new LinkedHashMap<>();
        Map<String, String> hidden = new LinkedHashMap<>();
        parseAjaxDelta(body, panels, hidden);
        log.debug("[Audatex] Delta: {} panels, {} hidden fields", panels.size(), hidden.size());

        if (panels.isEmpty() && hidden.isEmpty()) {
            return null;
        }

        Document merged = base.clone();

        for (Map.Entry<String, String> e : hidden.entrySet()) {
            String name = e.getKey();
            Element input = merged.select("input[name='" + name.replace("'", "\\'") + "']").first();
            if (input != null) {
                input.attr("value", e.getValue());
            } else {
                Element form = merged.select("form").first();
                if (form != null) {
                    form.appendElement("input").attr("type", "hidden").attr("name", name).attr("value", e.getValue());
                }
            }
        }

        for (Map.Entry<String, String> e : panels.entrySet()) {
            String key = e.getKey();
            String html = e.getValue();
            String panelId = key.replace('$', '_');

            if (key.contains("updGdvResult") || html.contains("gdvResult")) {
                Document frag = Jsoup.parse("<div>" + html + "</div>");
                Element newTable = frag.select("table[id*=gdvResult]").first();
                Element oldTable = merged.select("table[id*=gdvResult]").first();
                if (newTable != null && oldTable != null) {
                    oldTable.replaceWith(newTable);
                } else {
                    Element panel = merged.getElementById("ctl00_cphBody_updGdvResult");
                    if (panel != null) panel.html(html);
                }
            } else if (key.contains("ucNeoPager") || html.contains("ucNeoPager") || html.contains("lblPage")) {
                Element panel = merged.select("[id*=ucNeoPager_updPager]").first();
                if (panel != null) {
                    Document frag = Jsoup.parse("<div>" + html + "</div>");
                    Element inner = frag.select(".pager, [id*=pnlPager]").first();
                    panel.html(inner != null ? inner.outerHtml() : html);
                }
            } else {
                Element target = merged.getElementById(panelId);
                if (target != null) target.html(html);
            }
        }

        return parsearTablaOportunidades(merged).isEmpty() ? null : merged;
    }

    /** Parser de respuestas delta de Sys.WebForms.PageRequestManager. */
    private void parseAjaxDelta(String body, Map<String, String> panels, Map<String, String> hidden) {
        int pos = 0;
        while (pos < body.length()) {
            int pipe = body.indexOf('|', pos);
            if (pipe < 0) break;
            int len;
            try {
                len = Integer.parseInt(body.substring(pos, pipe).trim());
            } catch (NumberFormatException ex) {
                pos = pipe + 1;
                continue;
            }
            pos = pipe + 1;
            if (pos + len > body.length()) break;
            String segment = body.substring(pos, pos + len);
            pos += len;
            if (pos < body.length() && body.charAt(pos) == '|') pos++;

            if (segment.startsWith("updatePanel|")) {
                String rest = segment.substring("updatePanel|".length());
                int sep = rest.indexOf('|');
                if (sep > 0) {
                    panels.put(rest.substring(0, sep), rest.substring(sep + 1));
                }
            } else if (segment.startsWith("hiddenField|")) {
                String rest = segment.substring("hiddenField|".length());
                int sep = rest.indexOf('|');
                if (sep > 0) {
                    hidden.put(rest.substring(0, sep), rest.substring(sep + 1));
                }
            }
        }
    }

    /**
     * Parsea el total de páginas de la etiqueta del paginador personalizado (1 De N).
     */
    private int obtenerTotalPaginas(Document doc) {
        Element lblPage = doc.getElementById("ctl00_cphBody_ucNeoPager_lblPage");
        if (lblPage == null) {
            lblPage = doc.select("span[id$=ucNeoPager_lblPage]").first();
        }
        if (lblPage != null) {
            String text = lblPage.text().trim();
            Matcher matcher = Pattern.compile("(\\d+)\\s*De\\s*(\\d+)", Pattern.CASE_INSENSITIVE).matcher(text);
            if (matcher.find()) {
                try {
                    return Integer.parseInt(matcher.group(2));
                } catch (NumberFormatException e) {
                    log.warn("[Audatex] Error convirtiendo total de páginas '{}': {}", matcher.group(2), e.getMessage());
                }
            }
        }
        return 1;
    }

    /** Parsea "Resultado de la Búsqueda: 217 registro(s)" del legend. */
    private int obtenerTotalRegistros(Document doc) {
        Element legend = doc.select("#ctl00_cphBody_pnlResult legend, fieldset legend").first();
        if (legend != null) {
            Matcher m = Pattern.compile("(\\d+)\\s*registro", Pattern.CASE_INSENSITIVE).matcher(legend.text());
            if (m.find()) {
                try { return Integer.parseInt(m.group(1)); } catch (NumberFormatException ignored) {}
            }
        }
        return -1;
    }

    /** Agrega las fechas y el status al mapa de form data, sobreescribiendo los valores del doc. */
    private void aplicarFiltros(Map<String, String> formData, String startDate, String endDate, String status) {
        if (startDate != null) formData.put("ctl00$cphBody$txtStartDate", startDate);
        if (endDate   != null) formData.put("ctl00$cphBody$txtEndDate",   endDate);
        if (status    != null) formData.put("ctl00$cphBody$ddlStatusQuotation", status);
    }

    /** Retorna el número de página actual según ucNeoPager_lblPage ("1 De 10" o "1De 10" → 1). */
    private int obtenerPaginaActual(Document doc) {
        Element lbl = doc.getElementById("ctl00_cphBody_ucNeoPager_lblPage");
        if (lbl == null) lbl = doc.select("span[id$=ucNeoPager_lblPage]").first();
        if (lbl != null) {
            Matcher m = Pattern.compile("(\\d+)\\s*De\\s*(\\d+)", Pattern.CASE_INSENSITIVE).matcher(lbl.text().trim());
            if (m.find()) {
                try { return Integer.parseInt(m.group(1)); } catch (NumberFormatException ignored) {}
            }
        }
        return -1;
    }

    /** POST AJAX (UpdatePanel) — igual que el navegador al paginar. */
    private Connection.Response postFormAjax(String url, Map<String, String> cookies,
                                             Map<String, String> formData) throws IOException {
        return Jsoup.connect(url)
                .cookies(cookies)
                .data(formData)
                .header("Referer", url)
                .header("Origin", "https://inpart-la.audatex.com.mx")
                .header("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8")
                .header("Accept", "*/*")
                .header("Accept-Language", "es-419,es;q=0.9")
                .header("Cache-Control", "no-cache")
                .header("X-MicrosoftAjax", "Delta=true")
                .header("X-Requested-With", "XMLHttpRequest")
                .header("sec-ch-ua", "\"Google Chrome\";v=\"147\", \"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"147\"")
                .header("sec-ch-ua-mobile", "?0")
                .header("sec-ch-ua-platform", "\"Linux\"")
                .header("sec-fetch-dest", "empty")
                .header("sec-fetch-mode", "cors")
                .header("sec-fetch-site", "same-origin")
                .followRedirects(true)
                .timeout(60_000)
                .method(Connection.Method.POST)
                .userAgent(USER_AGENT)
                .execute();
    }

    /** POST formulario completo (búsqueda inicial, envío cotización). */
    private Connection.Response postForm(String url, Map<String, String> cookies,
                                         Map<String, String> formData) throws IOException {
        return Jsoup.connect(url)
                .cookies(cookies)
                .data(formData)
                .header("Referer", url)
                .header("Origin", "https://inpart-la.audatex.com.mx")
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "es-419,es;q=0.9")
                .header("sec-ch-ua", "\"Google Chrome\";v=\"147\", \"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"147\"")
                .header("sec-ch-ua-mobile", "?0")
                .header("sec-ch-ua-platform", "\"Linux\"")
                .header("sec-fetch-dest", "document")
                .header("sec-fetch-mode", "navigate")
                .header("sec-fetch-site", "same-origin")
                .header("Upgrade-Insecure-Requests", "1")
                .followRedirects(true)
                .timeout(60_000)
                .method(Connection.Method.POST)
                .userAgent(USER_AGENT)
                .execute();
    }

    private String formatToPortalDate(String isoDate) {
        if (isoDate == null || isoDate.trim().isEmpty()) {
            return null;
        }
        try {
            LocalDate localDate = LocalDate.parse(isoDate.trim());
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd/MM/yyyy");
            return localDate.format(formatter);
        } catch (Exception e) {
            log.warn("[Audatex] No se pudo formatear la fecha ISO '{}' a formato portal (dd/MM/yyyy): {}", isoDate, e.getMessage());
            return null;
        }
    }

    // ── Helpers ──────────────────────────────────────────────────────────────────

    /**
     * Extrae todos los campos del formulario principal (hidden inputs, text inputs y selects)
     * para que el VIEWSTATE y el estado del buscador se mantengan en los POST de paginación.
     * Antes solo se extraían los <input> ocultos; los <select> se perdían y el portal reseteaba
     * a página 1 en cada navegación.
     */
    private java.util.Map<String, String> extractFormFields(Document doc) {
        java.util.Map<String, String> data = new java.util.HashMap<>();

        // Solo campos del formulario principal aspnetForm
        for (Element input : doc.select("#aspnetForm input")) {
            String name = input.attr("name");
            if (name.isEmpty()) continue;
            String type = input.attr("type").toLowerCase();
            if ("submit".equals(type) || "image".equals(type) || "button".equals(type)) continue;
            if ("checkbox".equals(type) || "radio".equals(type)) {
                if (input.hasAttr("checked")) data.put(name, input.attr("value"));
            } else {
                data.put(name, input.attr("value"));
            }
        }

        // Selects: tomar la opción seleccionada (o la primera como fallback)
        for (Element select : doc.select("#aspnetForm select")) {
            String name = select.attr("name");
            if (name.isEmpty()) continue;
            Element chosen = select.select("option[selected]").first();
            if (chosen == null) chosen = select.select("option").first();
            if (chosen != null) data.put(name, chosen.attr("value"));
        }

        return data;
    }


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
            
            resp = postFormAjax(orderSearchUrl, cookies, pageForm);
            doc = resp.parse();
            
            List<Map<String, Object>> pagSig = parsearTablaPedidos(doc);
            if (pagSig.isEmpty()) break;
            onPage.accept(pagSig);
            humanDelay();
        }
    }

    public Map<String, Object> buscarDetallePedido(String wan) {
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        List<Map<String, String>> repuestos = new ArrayList<>();
        Map<String, String> datosCotizacion = new java.util.LinkedHashMap<>();
        result.put("repuestos", repuestos);
        result.put("datosCotizacion", datosCotizacion);

        if (wan == null || wan.isEmpty()) {
            return result;
        }
        
        String url = props.getQuotationSearchUrl().replace("frmQuotationSupplierSearch.aspx", "frmOrderSupplierRegister.aspx") + "?IdOrder=" + java.net.URLEncoder.encode(wan, java.nio.charset.StandardCharsets.UTF_8) + "&CalledPage=OrderSupplierSearch";
        String referer = props.getQuotationSearchUrl().replace("frmQuotationSupplierSearch.aspx", "frmOrderSupplierSearch.aspx");
        try {
            Thread.sleep(500 + (long)(Math.random() * 300));
            Map<String, String> cookies = sessionManager.getActiveCookies();
            org.jsoup.Connection.Response resp = Jsoup.connect(url)
                    .cookies(cookies)
                    .header("Referer", referer)
                    .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                    .header("Accept-Language", "es-419,es;q=0.9")
                    .header("sec-fetch-dest", "document")
                    .header("sec-fetch-mode", "navigate")
                    .header("sec-fetch-site", "same-origin")
                    .header("Upgrade-Insecure-Requests", "1")
                    .followRedirects(true)
                    .timeout(300_000)
                    .userAgent(USER_AGENT)
                    .method(org.jsoup.Connection.Method.GET)
                    .execute();

            if (resp.url().toString().contains("frmLogin") || resp.url().toString().contains("AudaPartsSite")) {
                log.warn("[AudatexClient] Sesión expirada al buscar detalle de pedido - re-autenticando");
                sessionManager.invalidate();
                cookies = sessionManager.getActiveCookies();
                resp = Jsoup.connect(url)
                        .cookies(cookies)
                        .header("Referer", referer)
                        .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                        .header("Accept-Language", "es-419,es;q=0.9")
                        .followRedirects(true)
                        .timeout(300_000)
                        .userAgent(USER_AGENT)
                        .method(org.jsoup.Connection.Method.GET)
                        .execute();
            }
            
            Document doc = resp.parse();
            datosCotizacion.putAll(parsearDatosCotizacion(doc));

            boolean requiresTabPost = datosCotizacion.getOrDefault("Marca", "").isEmpty() || 
                                      datosCotizacion.getOrDefault("Matricula", "").isEmpty() || 
                                      datosCotizacion.getOrDefault("Año Modelo", "").isEmpty();
                                      
            if (requiresTabPost) {
                try {
                    java.util.Map<String, String> formData = extractFormFields(doc);
                    formData.put("__EVENTTARGET", "ctl00$cphBody$tbcRegisterOrder");
                    formData.put("__EVENTARGUMENT", "activeTabChanged:1");
                    
                    String clientStateKey = "ctl00_cphBody_tbcRegisterOrder_ClientState";
                    if (formData.containsKey("ctl00$cphBody$tbcRegisterOrder_ClientState")) {
                        clientStateKey = "ctl00$cphBody$tbcRegisterOrder_ClientState";
                    }
                    formData.put(clientStateKey, "{\"ActiveTabIndex\":1,\"TabEnabledState\":[true,true],\"TabWasLoadedOnceState\":[true,false]}");
                    formData.put("ctl00$smMain", "ctl00$smMain|ctl00$cphBody$tbcRegisterOrder");
                    
                    org.jsoup.Connection.Response postResp = Jsoup.connect(url)
                            .cookies(cookies)
                            .header("Referer", url)
                            .header("Accept", "*/*")
                            .header("Accept-Language", "es-419,es;q=0.9")
                            .header("X-MicrosoftAjax", "Delta=true")
                            .header("X-Requested-With", "XMLHttpRequest")
                            .header("Cache-Control", "no-cache")
                            .userAgent(USER_AGENT)
                            .method(org.jsoup.Connection.Method.POST)
                            .data(formData)
                            .timeout(300_000)
                            .execute();
                    
                    Document postDoc = Jsoup.parse(postResp.body());
                    java.util.Map<String, String> datosPost = parsearDatosCotizacion(postDoc);
                    for (java.util.Map.Entry<String, String> entry : datosPost.entrySet()) {
                        if (entry.getValue() != null && !entry.getValue().isEmpty() && !entry.getValue().equals("-")) {
                            datosCotizacion.put(entry.getKey(), entry.getValue());
                        }
                    }
                } catch (Exception postEx) {
                    log.warn("[Audatex] Error al hacer POST para tab de datos (Pedido): {}", postEx.getMessage());
                }
            }

            Element table = doc.getElementById("ctl00_cphBody_tbcRegisterOrder_tabItemsOrder_ucOrderSupplierRegisterItems_gdvItemSupplier_ctl00");
            if (table == null) table = doc.select("table[id*=gdvItemSupplier]").first();
            if (table == null) {
                log.warn("[AudatexClient] No se encontro la tabla de items para el pedido WAN {}", wan);
                try {
                    java.nio.file.Files.writeString(
                        java.nio.file.Paths.get("debug_pedido_" + wan.replaceAll("[^a-zA-Z0-9_-]", "") + ".html"),
                        doc.outerHtml()
                    );
                } catch (Exception ignored) {}
                return result;
            }
            
            Elements rows = table.select("tr");
            for (int i = 1; i < rows.size(); i++) {
                Element row = rows.get(i);
                if (row.hasClass("grid-footer")) continue;
                Elements cols = row.select("td");
                if (cols.size() < 6) continue;
                
                Map<String, String> item = new LinkedHashMap<>();
                item.put("Estado", cols.get(0).text().trim());
                item.put("No. Parte", cols.get(1).text().trim());
                item.put("Descripción", cols.get(3).text().trim());
                item.put("Precio", cols.get(5).text().trim());
                
                repuestos.add(item);
            }
            
        } catch (Exception e) {
            log.error("[AudatexClient] Error buscando detalle de pedido WAN {}: {}", wan, e.getMessage());
        }
        return result;
    }

    private List<Map<String, Object>> parsearTablaPedidos(Document doc) {
        List<Map<String, Object>> lista = new ArrayList<>();
        Element table = doc.getElementById("ctl00_cphBody_gdvResult");
        if (table == null) table = doc.select("table[id$=gdvResult]").first();
        if (table == null) return lista;

        Elements rows = table.select("tr");
        for (int i = 1; i < rows.size(); i++) {
            Elements cols = rows.get(i).select("td");
            if (cols.size() < 8) continue;

            Map<String, Object> pedido = new LinkedHashMap<>();
            // Columnas reales del portal frmOrderSupplierSearch.aspx:
            // 0=Aseguradora, 1=Pedido, 2=Cotización, 3=PrevisiónEntrega,
            // 4=Siniestro, 5=TallerMecánico, 6=Matrícula, 7=Armadora,
            // 8=TotalDelPedido, 9=Fecha/HoraPedido, 10=Duración, 11=Estatus, 12=Acciones
            pedido.put("aseguradora", cols.get(0).text().trim());
            pedido.put("numeroPedido", cols.get(1).text().trim());
            pedido.put("cotizacionId", cols.get(2).text().trim());
            pedido.put("previsionEntrega", cols.get(3).text().trim());
            pedido.put("siniestro", cols.get(4).text().trim());
            pedido.put("taller", cols.get(5).text().trim());
            pedido.put("matricula", cols.get(6).text().trim());
            pedido.put("armadora", cols.get(7).text().trim());
            
            if (cols.size() > 8) {
                // Total del Pedido — viene como "₡ 230 000,00" o "230,000.00"
                String rawTotal = cols.get(8).text().trim().replace("₡", "").trim();
                rawTotal = rawTotal.replace(" ", ""); // quitar separadores de miles con espacio

                int lastComma = rawTotal.lastIndexOf(',');
                int lastDot = rawTotal.lastIndexOf('.');

                if (lastComma > lastDot) {
                    // La coma es el separador decimal ("230.000,00" o "230000,00")
                    rawTotal = rawTotal.replace(".", "");
                    rawTotal = rawTotal.replace(",", ".");
                } else if (lastDot > lastComma) {
                    // El punto es el separador decimal ("230,000.00" o "230000.00")
                    rawTotal = rawTotal.replace(",", "");
                }

                try {
                    pedido.put("totalPedido", Double.parseDouble(rawTotal));
                } catch (NumberFormatException e) {
                    pedido.put("totalPedido", 0.0);
                }
            }
            if (cols.size() > 9) {
                pedido.put("fecha", cols.get(9).text().trim());
            }
            if (cols.size() > 10) {
                pedido.put("duracion", cols.get(10).text().trim());
            }
            if (cols.size() > 11) {
                pedido.put("estatus", cols.get(11).text().trim());
            }

            String rowHtml = rows.get(i).outerHtml();
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("(?:IdQuotation|IdOrder|WAN)=([^&\\\"'>]+)").matcher(rowHtml);
            if (m.find()) {
                pedido.put("wan", m.group(1));
            } else {
                m = java.util.regex.Pattern.compile("['\\\"]([A-Za-z0-9+/]{10,60}=*)['\\\"]").matcher(rowHtml);
                if (m.find()) pedido.put("wan", m.group(1));
            }
            lista.add(pedido);
        }
        return lista;
    }


    private void humanDelay() {
        try {
            long delay = props.getHumanDelayMs() + (long)(Math.random() * 400);
            Thread.sleep(delay);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
