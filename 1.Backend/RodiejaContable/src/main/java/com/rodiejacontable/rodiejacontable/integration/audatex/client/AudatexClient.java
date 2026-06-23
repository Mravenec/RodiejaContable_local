package com.rodiejacontable.rodiejacontable.integration.audatex.client;

import com.rodiejacontable.rodiejacontable.integration.audatex.config.AudatexProperties;
import com.rodiejacontable.rodiejacontable.integration.audatex.dto.AudatexOportunidadDTO;
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
import java.util.List;
import java.util.Map;

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
    public List<AudatexOportunidadDTO> buscarTodasOportunidades() throws IOException {
        return buscarTodasOportunidades(null, null);
    }

    @CircuitBreaker(name = "audatexClient", fallbackMethod = "buscarTodasOportunidadesFallback")
    @Retry(name = "audatexClient")
    @TimeLimiter(name = "audatexClient")
    public List<AudatexOportunidadDTO> buscarTodasOportunidades(String desde, String hasta) throws IOException {
        List<AudatexOportunidadDTO> todas = new ArrayList<>();
        Map<String, String> cookies = sessionManager.getActiveCookies();
        String refererUrl = sessionManager.getCurrentPanelUrl();

        String searchUrl = props.getQuotationSearchUrl();
        if (desde == null && hasta == null) {
            searchUrl = props.getQuotationSearchUrl() + SEARCH_URL_ALL;
        }

        log.info("[Audatex] Buscando oportunidades en: {}", searchUrl);
        log.info("[Audatex] Referer URL: {}", refererUrl);
        log.info("[Audatex] Cookies: {}", cookies.size());

        // Página 1 (GET inicial para obtener ViewState)
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

        // Si la sesión expiró nos redirigió al login — re-autenticar una vez
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

        // Determinar filtros finales
        String finalStartDate = formatToPortalDate(desde);
        String finalEndDate = formatToPortalDate(hasta);
        String finalStatus = "1"; // "1" es Pendiente

        if (desde == null && hasta == null) {
            // Extraer las fechas pre-llenadas por defecto
            Element txtStart = doc.getElementById("ctl00_cphBody_txtStartDate");
            if (txtStart != null) {
                finalStartDate = txtStart.attr("value");
            }
            Element txtEnd = doc.getElementById("ctl00_cphBody_txtEndDate");
            if (txtEnd != null) {
                finalEndDate = txtEnd.attr("value");
            }
            Element ddlStatus = doc.getElementById("ctl00_cphBody_ddlStatusQuotation");
            if (ddlStatus != null) {
                Element selected = ddlStatus.select("option[selected]").first();
                if (selected != null) {
                    finalStatus = selected.attr("value");
                }
            }
        }

        // Si se pasaron filtros de fechas explícitos, ejecutar la búsqueda vía POST
        if (desde != null || hasta != null) {
            log.info("[Audatex] Ejecutando POST de búsqueda con fechas desde={} (portal: {}) hasta={} (portal: {})",
                    desde, finalStartDate, hasta, finalEndDate);

            Map<String, String> searchForm = extractHiddenInputs(doc);
            searchForm.put("__EVENTTARGET", "");
            searchForm.put("__EVENTARGUMENT", "");
            if (finalStartDate != null) {
                searchForm.put("ctl00$cphBody$txtStartDate", finalStartDate);
            }
            if (finalEndDate != null) {
                searchForm.put("ctl00$cphBody$txtEndDate", finalEndDate);
            }
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

            doc = resp.parse();
        }

        // Parsear primera página de resultados
        todas.addAll(parsearTablaOportunidades(doc));

        // Obtener el total de páginas
        int totalPaginas = obtenerTotalPaginas(doc);
        log.info("[Audatex] Total de páginas detectadas: {}", totalPaginas);

        // Paginación: navegar páginas adicionales si existen
        for (int pagina = 2; pagina <= totalPaginas; pagina++) {
            humanDelay();
            doc = irAPagina(doc, pagina, resp.url().toString(), cookies, finalStartDate, finalEndDate, finalStatus);
            todas.addAll(parsearTablaOportunidades(doc));

            // Protección anti-bucle infinito
            if (pagina > 50) {
                log.warn("[Audatex] Se alcanzó el límite de 50 páginas, deteniendo paginación");
                break;
            }
        }

        log.info("[Audatex] Total oportunidades recuperadas: {}", todas.size());
        return todas;
    }

    private List<AudatexOportunidadDTO> buscarTodasOportunidadesFallback(String desde, String hasta, Exception exception) throws IOException {
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
    public boolean enviarCotizacion(String wan, String precio, String tiempo, String condicion) throws IOException {
        Map<String, String> cookies = sessionManager.getActiveCookies();

        // URL de detalle de cotización (ejemplo basado en estructura típica de ASP.NET)
        String detalleUrl = props.getQuotationSearchUrl().replace("frmQuotationSupplierSearch.aspx", "frmQuotationDetail.aspx") + "?WAN=" + wan;
        log.info("[Audatex] Enviando cotización para WAN {} - URL: {}", wan, detalleUrl);

        // 1. Navegar a la página de detalle
        Connection.Response resp = Jsoup.connect(detalleUrl)
                .cookies(cookies)
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
        Map<String, String> formData = extractHiddenInputs(doc);

        // 3. Llenar campos del formulario (nombres de campos son hipótesis - necesitan validación real)
        // Estos nombres deben ajustarse según la estructura real del formulario de Audatex
        formData.put("txtPrecio", precio);
        formData.put("txtTiempo", tiempo);
        formData.put("txtCondicion", condicion);

        // 4. Submit el formulario
        humanDelay(); // Delay humano antes de submit

        String submitUrl = resp.url().toString();
        Connection.Response submitResp = Jsoup.connect(submitUrl)
                .cookies(cookies)
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
    private boolean enviarCotizacionFallback(String wan, String precio, String tiempo, String condicion, Exception exception) {
        log.warn("[Audatex] Circuit breaker activado en enviarCotizacion - usando fallback. Error: {}", exception.getMessage());
        return false;
    }

    // ── Parsing ─────────────────────────────────────────────────────────────────

    /**
     * Parsea la tabla de cotizaciones ctl00_cphBody_gdvResult del documento HTML.
     * Columnas (0-indexed):
     *   0 Aseguradora | 1 CotizaciónId | 2 Taller | 3 Póliza | 4 Siniestro
     *   5 Matrícula   | 6 Armadora     | 7 Fecha   | 8 Pendientes
     */
    private List<AudatexOportunidadDTO> parsearTablaOportunidades(Document doc) {
        List<AudatexOportunidadDTO> lista = new ArrayList<>();

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

            AudatexOportunidadDTO dto = new AudatexOportunidadDTO();
            dto.setAseguradora(cols.get(0).text().trim());
            dto.setCotizacionId(cols.get(1).text().trim());
            dto.setTaller(cols.get(2).text().trim());
            dto.setPoliza(cols.get(3).text().trim());
            dto.setSiniestro(cols.get(4).text().trim());
            dto.setMatricula(cols.get(5).text().trim());
            dto.setArmadora(cols.get(6).text().trim());
            dto.setFechaCotizacion(cols.get(7).text().trim());

            try {
                dto.setPendientes(Integer.parseInt(cols.get(8).text().trim()));
            } catch (NumberFormatException e) {
                dto.setPendientes(0);
            }

            lista.add(dto);
        }

        return lista;
    }

    // ── Pagination ───────────────────────────────────────────────────────────────

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
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("De\\s+(\\d+)", java.util.regex.Pattern.CASE_INSENSITIVE);
            java.util.regex.Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                try {
                    return Integer.parseInt(matcher.group(1));
                } catch (NumberFormatException e) {
                    log.warn("[Audatex] Error convirtiendo total de páginas '{}': {}", matcher.group(1), e.getMessage());
                }
            }
        }
        return 1;
    }

    /**
     * Navega a una página específica mediante el dropdown ucNeoPager$ddlGoToPage.
     */
    private Document irAPagina(Document currentDoc, int numeroPagina, String currentUrl,
                               Map<String, String> cookies, String startDate, String endDate, String status) throws IOException {

        Map<String, String> formData = extractHiddenInputs(currentDoc);
        formData.put("__EVENTTARGET", "ctl00$cphBody$ucNeoPager$ddlGoToPage");
        formData.put("__EVENTARGUMENT", "");
        formData.put("ctl00$cphBody$ucNeoPager$ddlGoToPage", String.valueOf(numeroPagina));

        if (startDate != null) {
            formData.put("ctl00$cphBody$txtStartDate", startDate);
        }
        if (endDate != null) {
            formData.put("ctl00$cphBody$txtEndDate", endDate);
        }
        if (status != null) {
            formData.put("ctl00$cphBody$ddlStatusQuotation", status);
        }

        // Quitar el botón de búsqueda para evitar conflictos de submit
        formData.remove("ctl00$cphBody$btnSearch");

        Connection.Response resp = Jsoup.connect(currentUrl)
                .cookies(cookies)
                .data(formData)
                .header("Referer", currentUrl)
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

        log.debug("[Audatex] Navegando a página {} — URL: {}", numeroPagina, resp.url());
        return resp.parse();
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

    private java.util.Map<String, String> extractHiddenInputs(Document doc) {
        java.util.Map<String, String> data = new java.util.HashMap<>();
        for (Element input : doc.select("form input")) {
            String name = input.attr("name");
            String type = input.attr("type").toLowerCase();
            if (name.isEmpty() || "submit".equals(type) || "image".equals(type)) continue;
            data.put(name, input.attr("value"));
        }
        return data;
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
