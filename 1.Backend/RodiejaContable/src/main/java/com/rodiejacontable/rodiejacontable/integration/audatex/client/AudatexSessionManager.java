package com.rodiejacontable.rodiejacontable.integration.audatex.client;

import com.rodiejacontable.rodiejacontable.integration.audatex.config.AudatexProperties;
import org.jsoup.Connection;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;

/**
 * ROD-16 — Mantiene UNA sesión autenticada con el portal Audatex InPart.
 *
 * Responsabilidades:
 *  - Login inicial (con manejo del popup de sesión concurrente)
 *  - Renovación automática cuando el TTL expira
 *  - Lock para evitar logins paralelos en concurrencia
 *  - Exposición de las cookies de sesión activas para que AudatexClient las use
 */
@Component
public class AudatexSessionManager {

    private static final Logger log = LoggerFactory.getLogger(AudatexSessionManager.class);

    private static final String USER_AGENT =
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";

    private final AudatexProperties props;

    /** Cookies activas de la sesión actual */
    private Map<String, String> sessionCookies = new HashMap<>();

    /** Momento en que se realizó el último login exitoso */
    private Instant lastLoginTime = Instant.EPOCH;

    /** URL actual del panel de control después del login */
    private String currentPanelUrl = "";

    /** Lock para evitar logins paralelos */
    private final ReentrantLock loginLock = new ReentrantLock();

    /** Usuario con el que se abrió la sesión activa (para logs). */
    private String activeUsername = "";

    public AudatexSessionManager(AudatexProperties props) {
        this.props = props;
    }

    /**
     * Devuelve las cookies de sesión vigentes.
     * Si el TTL expiró o la sesión nunca se inició, realiza un re-login.
     */
    public Map<String, String> getActiveCookies() throws IOException {
        if (isSessionExpired()) {
            ensureLogin();
        }
        return new HashMap<>(sessionCookies);
    }

    /**
     * Devuelve la URL actual del panel de control después del login.
     */
    public String getCurrentPanelUrl() throws IOException {
        if (isSessionExpired()) {
            ensureLogin();
        }
        return currentPanelUrl;
    }

    /**
     * Invalida la sesión actual y fuerza un nuevo login en la siguiente solicitud.
     */
    public void invalidate() {
        loginLock.lock();
        try {
            sessionCookies.clear();
            lastLoginTime = Instant.EPOCH;
            currentPanelUrl = "";
            activeUsername = "";
            log.info("[Audatex] Sesión invalidada manualmente");
        } finally {
            loginLock.unlock();
        }
    }

    // ── Internal ────────────────────────────────────────────────────────────────

    private boolean isSessionExpired() {
        long ttlMs = (long) props.getSessionTtlMin() * 60 * 1000;
        return sessionCookies.isEmpty() ||
               Instant.now().isAfter(lastLoginTime.plusMillis(ttlMs));
    }

    private void ensureLogin() throws IOException {
        loginLock.lock();
        try {
            // Double-checked: otro hilo pudo haber iniciado sesión mientras esperábamos
            if (!isSessionExpired()) return;

            log.info("[Audatex] Iniciando login en {}", props.getPortalUrl());
            doLogin();
        } finally {
            loginLock.unlock();
        }
    }

    private void doLogin() throws IOException {
        List<AudatexProperties.AudatexCredential> credentials = props.loginCredentialChain();
        if (credentials.isEmpty()) {
            throw new IOException("[Audatex] No hay credenciales configuradas (audatex.username / audatex.password)");
        }

        IOException lastError = null;
        for (AudatexProperties.AudatexCredential credential : credentials) {
            try {
                log.info("[Audatex] Intentando login con usuario {}", credential.username());
                attemptLoginWithCredential(credential.username(), credential.password());
                activeUsername = credential.username();
                return;
            } catch (IOException ex) {
                lastError = ex;
                log.warn("[Audatex] Login fallido con {} — probando siguiente credencial si existe: {}",
                        credential.username(), ex.getMessage());
                humanDelay();
            }
        }

        throw lastError != null
                ? lastError
                : new IOException("[Audatex] Login fallido con todas las credenciales configuradas");
    }

    private void attemptLoginWithCredential(String username, String password) throws IOException {
        // 1. GET para obtener el ViewState
        Connection.Response getResp = Jsoup.connect(props.getPortalUrl())
                .followRedirects(true)
                .method(Connection.Method.GET)
                .userAgent(USER_AGENT)
                .header("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7")
                .header("Accept-Language", "es-419,es;q=0.9")
                .header("sec-ch-ua", "\"Google Chrome\";v=\"147\", \"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"147\"")
                .header("sec-ch-ua-mobile", "?0")
                .header("sec-ch-ua-platform", "\"Linux\"")
                .header("sec-fetch-dest", "document")
                .header("sec-fetch-mode", "navigate")
                .header("sec-fetch-site", "none")
                .header("Upgrade-Insecure-Requests", "1")
                .execute();

        Map<String, String> cookies = new HashMap<>(getResp.cookies());
        String currentUrl = getResp.url().toString();
        Document loginDoc = getResp.parse();

        String formAction = resolveFormAction(loginDoc, currentUrl);

        // 2. Armar payload de login
        Map<String, String> formData = extractHiddenInputs(loginDoc);
        formData.put("ctl00$cphBody$ucLogin$txtLogin", username);
        formData.put("ctl00$cphBody$ucLogin$txtPassword", password);
        formData.put("ctl00$cphBody$ucLogin$chkTermsConditions", "on");
        formData.put("ctl00$cphBody$ucLogin$btnSignIn", "Sign In");

        // 3. POST de login
        Connection.Response postResp = Jsoup.connect(formAction)
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

        cookies.putAll(postResp.cookies());
        currentUrl = postResp.url().toString();
        Document postDoc = postResp.parse();

        log.debug("[Audatex] URL post-login: {}", currentUrl);

        // 4. Si llegamos al panel — login exitoso sin sesión concurrente
        if (currentUrl.contains("frmControlPanelSupplier.aspx") && !currentUrl.contains("ReturnUrl")) {
            this.sessionCookies = cookies;
            this.lastLoginTime = java.time.Instant.now();
            this.currentPanelUrl = currentUrl;
            log.info("[Audatex] Login exitoso con {} (sin sesión concurrente). Sesión válida por {} min",
                    username, props.getSessionTtlMin());
            return;
        }

        // 5. Si seguimos en el login page — verificar si es el popup de sesión concurrente
        if (hasConcurrentSessionWarning(postDoc)) {
            log.warn("[Audatex] Sesión concurrente detectada — confirmando terminación");
            humanDelay();

            String confirmUrl = resolveFormAction(postDoc, currentUrl);
            Map<String, String> confirmData = extractHiddenInputs(postDoc);
            confirmData.put("ctl00$cphBody$ucLogin$txtLogin", username);
            confirmData.put("ctl00$cphBody$ucLogin$txtPassword", password);
            confirmData.put("ctl00$cphBody$ucLogin$chkTermsConditions", "on");
            confirmData.put("ctl00$cphBody$ucLogin$ucNeoMessageRemoveConcurrentLogin$btnYes", "Si");

            Connection.Response confirmResp = Jsoup.connect(confirmUrl)
                    .cookies(cookies)
                    .data(confirmData)
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

            cookies.putAll(confirmResp.cookies());
            currentUrl = confirmResp.url().toString();
            log.debug("[Audatex] URL post-confirmación de sesión: {}", currentUrl);

            // Si aún no estamos en el panel, intentar un GET directo al panel
            if (!currentUrl.contains("frmControlPanelSupplier.aspx") || currentUrl.contains("ReturnUrl")) {
                log.debug("[Audatex] Redirect no llegó al panel, navegando explícitamente...");
                String panelUrl = "https://inpart-la.audatex.com.mx/AudaPartsWebApp/frmControlPanelSupplier.aspx";
                Connection.Response panelResp = Jsoup.connect(panelUrl)
                        .cookies(cookies)
                        .header("Referer", currentUrl)
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
                cookies.putAll(panelResp.cookies());
                currentUrl = panelResp.url().toString();
                log.debug("[Audatex] URL tras GET explícito al panel: {}", currentUrl);
            }

            if (!currentUrl.contains("frmControlPanelSupplier.aspx") || currentUrl.contains("ReturnUrl")) {
                throw new IOException("[Audatex] Login fallido después de confirmar sesión concurrente. URL: " + currentUrl);
            }

            this.sessionCookies = cookies;
            this.lastLoginTime = java.time.Instant.now();
            this.currentPanelUrl = currentUrl;
            log.info("[Audatex] Login exitoso con {} (post-sesión-concurrente). Sesión válida por {} min",
                    username, props.getSessionTtlMin());
            return;
        }

        // 6. Cualquier otra URL es un fallo (frmError.aspx, etc.)
        throw new IOException("[Audatex] Login fallido. URL final: " + currentUrl +
                " | Response preview: " + postDoc.body().text().substring(0, Math.min(200, postDoc.body().text().length())));
    }

    // ── Helpers ─────────────────────────────────────────────────────────────────

    private void navigateToQuotationSearch(Map<String, String> cookies, String refererUrl) {
        try {
            String searchUrl = "https://inpart-la.audatex.com.mx/AudaPartsWebApp/frmQuotationSupplierSearch.aspx?preloadfilter=true&IdStatus=0";
            log.info("[Audatex] Navegando a búsqueda de cotizaciones desde: {}", refererUrl);
            log.info("[Audatex] Cookies antes de navegar: {}", cookies.size());
            
            Connection.Response searchResp = Jsoup.connect(searchUrl)
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
            
            cookies.putAll(searchResp.cookies());
            String finalUrl = searchResp.url().toString();
            int statusCode = searchResp.statusCode();
            
            log.info("[Audatex] Navegado a búsqueda de cotizaciones - Status: {}, URL: {}", statusCode, finalUrl);
            log.info("[Audatex] Cookies después de navegar: {}", cookies.size());
            
            // Verificar si fuimos redirigidos al login (sesión expirada)
            if (finalUrl.contains("Login.aspx") || finalUrl.contains("AudaPartsSite")) {
                log.warn("[Audatex] Redirigido al login después de navegar a búsqueda - sesión puede estar expirada");
            } else {
                // Actualizar la URL del panel a la URL de búsqueda si no fuimos redirigidos al login
                this.currentPanelUrl = finalUrl;
                log.info("[Audatex] URL del panel actualizada a: {}", finalUrl);
            }
        } catch (IOException e) {
            log.warn("[Audatex] Error navegando a búsqueda de cotizaciones: {}", e.getMessage());
            // No lanzar excepción, el login fue exitoso aunque la navegación falle
        }
    }

    private Map<String, String> extractHiddenInputs(Document doc) {
        Map<String, String> data = new HashMap<>();
        for (Element input : doc.select("form input")) {
            String name = input.attr("name");
            String type = input.attr("type").toLowerCase();
            if (name.isEmpty() || "submit".equals(type) || "image".equals(type)) continue;
            data.put(name, input.attr("value"));
        }
        return data;
    }

    private String resolveFormAction(Document doc, String currentUrl) throws IOException {
        String action = doc.select("form").attr("action");
        if (action.isEmpty()) return currentUrl;
        if (action.startsWith("http")) return action;
        return new java.net.URL(new java.net.URL(currentUrl), action).toString();
    }

    private boolean hasConcurrentSessionWarning(Document doc) {
        // Detectar el popup verificando la presencia del input de confirmación Si/No
        // Este input solo aparece cuando hay una sesión activa de otro cliente
        return doc.select("input[name*=ucNeoMessageRemoveConcurrentLogin][name*=btnYes]").size() > 0
               || (doc.html().contains("ucNeoMessageRemoveConcurrentLogin")
                   && doc.html().contains("btnYes"));
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
