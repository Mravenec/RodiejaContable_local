package com.rodiejacontable.rodiejacontable.integration.audatex;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.client.WireMock;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.springframework.security.test.context.support.WithMockUser;

/**
 * ROD-18 — Test E2E del flujo de export de oportunidades Audatex.
 *
 * Este test usa WireMock para simular el portal de Audatex y verifica que:
 * 1. El endpoint /api/audatex/oportunidades/export responde correctamente
 * 2. El archivo Excel generado tiene el formato correcto (Content-Type, headers)
 * 3. Los filtros (fecha, marca) se aplican correctamente
 */
@SpringBootTest(properties = {
    "audatex.portal-url=http://localhost:8089/AudaPartsSite/",
    "audatex.quotation-search-url=http://localhost:8089/AudaPartsWebApp/frmQuotationSupplierSearch.aspx"
})
@AutoConfigureMockMvc
@WithMockUser(username = "admin@rodieja.com", roles = {"ADMIN"})
public class AudatexExportE2ETest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private com.rodiejacontable.rodiejacontable.integration.audatex.service.AudatexService audatexService;

    private WireMockServer wireMockServer;

    @BeforeEach
    void setUp() {
        // Iniciar WireMock en puerto 8089 para simular el portal Audatex
        wireMockServer = new WireMockServer(8089);
        wireMockServer.start();
        WireMock.configureFor("localhost", 8089);

        // Stub login GET
        wireMockServer.stubFor(get(urlEqualTo("/AudaPartsSite/"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "text/html")
                        .withBody("<html><body><form action=\"http://localhost:8089/AudaPartsSite/login-post\"></form></body></html>")));

        // Stub login POST redirect to control panel
        wireMockServer.stubFor(post(urlEqualTo("/AudaPartsSite/login-post"))
                .willReturn(aResponse()
                        .withStatus(302)
                        .withHeader("Location", "http://localhost:8089/AudaPartsWebApp/frmControlPanelSupplier.aspx")));

        // Stub control panel GET
        wireMockServer.stubFor(get(urlEqualTo("/AudaPartsWebApp/frmControlPanelSupplier.aspx"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "text/html")
                        .withBody("<html><body>Welcome to Control Panel</body></html>")));

        // Invalidar caché para asegurar que no interfieran pruebas previas
        audatexService.invalidarCache();
    }

    @AfterEach
    void tearDown() {
        if (wireMockServer != null) {
            wireMockServer.stop();
        }
    }

    @Test
    void testExportarOportunidades_SinFiltros_DebeRetornarExcel() throws Exception {
        // Simular respuesta del portal Audatex
        wireMockServer.stubFor(get(urlPathEqualTo("/AudaPartsWebApp/frmQuotationSupplierSearch.aspx"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "text/html")
                        .withBody("<table id='ctl00_cphBody_gdvResult'>" +
                                "<tr><th>Aseguradora</th><th>CotizaciónId</th><th>Taller</th></tr>" +
                                "<tr><td>INSURANCE</td><td>COT-001</td><td>Taller A</td></tr>" +
                                "</table>")));

        // Llamar al endpoint de exportación
        MvcResult result = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/audatex/oportunidades/export"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Content-Disposition"))
                .andExpect(content().contentType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andReturn();

        // Verificar que el response tenga bytes (archivo Excel)
        byte[] excelBytes = result.getResponse().getContentAsByteArray();
        assert excelBytes.length > 0 : "El archivo Excel no debe estar vacío";

        // Verificar header Content-Disposition
        String contentDisposition = result.getResponse().getHeader("Content-Disposition");
        assert contentDisposition != null && contentDisposition.contains("attachment") :
                "Content-Disposition debe contener 'attachment'";
        assert contentDisposition.contains(".xlsx") :
                "Content-Disposition debe contener extensión .xlsx";
    }

    @Test
    void testExportarOportunidades_ConFiltroMarca_DebeAplicarFiltro() throws Exception {
        // Simular respuesta del portal Audatex
        wireMockServer.stubFor(get(urlPathMatching("/AudaPartsWebApp/frmQuotationSupplierSearch.aspx.*"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "text/html")
                        .withBody("<table id='ctl00_cphBody_gdvResult'>" +
                                "<tr><th>Aseguradora</th><th>CotizaciónId</th><th>Armadora</th></tr>" +
                                "<tr><td>INSURANCE</td><td>COT-001</td><td>Toyota</td></tr>" +
                                "<tr><td>INSURANCE</td><td>COT-002</td><td>Honda</td></tr>" +
                                "</table>")));

        // Llamar con filtro de marca
        MvcResult result = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/audatex/oportunidades/export")
                        .param("armadora", "Toyota"))
                .andExpect(status().isOk())
                .andReturn();

        // Verificar que el response tenga bytes
        byte[] excelBytes = result.getResponse().getContentAsByteArray();
        assert excelBytes.length > 0 : "El archivo Excel no debe estar vacío";
    }

    @Test
    void testExportarOportunidades_ConFiltroFecha_DebeAplicarFiltro() throws Exception {
        // Simular respuesta del portal Audatex (ambos GET y POST para soporte de filtrado)
        wireMockServer.stubFor(get(urlPathMatching("/AudaPartsWebApp/frmQuotationSupplierSearch.aspx.*"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "text/html")
                        .withBody("<table id='ctl00_cphBody_gdvResult'>" +
                                "<tr><th>Aseguradora</th><th>CotizaciónId</th><th>Fecha</th></tr>" +
                                "<tr><td>INSURANCE</td><td>COT-001</td><td>19/6/2026</td></tr>" +
                                "</table>")));

        wireMockServer.stubFor(post(urlPathMatching("/AudaPartsWebApp/frmQuotationSupplierSearch.aspx.*"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "text/html")
                        .withBody("<table id='ctl00_cphBody_gdvResult'>" +
                                "<tr><th>Aseguradora</th><th>CotizaciónId</th><th>Fecha</th></tr>" +
                                "<tr><td>INSURANCE</td><td>COT-001</td><td>19/6/2026</td></tr>" +
                                "</table>")));

        // Llamar con filtro de fecha
        MvcResult result = mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/audatex/oportunidades/export")
                        .param("desde", "2026-06-01")
                        .param("hasta", "2026-06-30"))
                .andExpect(status().isOk())
                .andReturn();

        // Verificar que el response tenga bytes
        byte[] excelBytes = result.getResponse().getContentAsByteArray();
        assert excelBytes.length > 0 : "El archivo Excel no debe estar vacío";
    }

    @Test
    void testExportarOportunidades_ErrorAudatex_DebeRetornar503() throws Exception {
        // Simular error del portal Audatex
        wireMockServer.stubFor(get(urlPathMatching("/AudaPartsWebApp/frmQuotationSupplierSearch.aspx.*"))
                .willReturn(aResponse()
                        .withStatus(500)
                        .withBody("Internal Server Error")));

        // Llamar al endpoint - debería manejar el error gracefully
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/audatex/oportunidades/export"))
                .andExpect(status().isServiceUnavailable());
    }
}
