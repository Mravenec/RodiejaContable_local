package com.rodiejacontable.rodiejacontable;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import com.rodiejacontable.rodiejacontable.integration.audatex.client.AudatexClient;
import com.fasterxml.jackson.databind.ObjectMapper;

@SpringBootTest
public class TestAudatexWan {
    @Autowired
    private AudatexClient client;
    @Autowired
    private ObjectMapper mapper;

    @Test
    public void test() throws Exception {
        java.util.Map<String, Object> detalles = client.obtenerDetallesDeCotizacion("+oIiiJoBOlM=");
        System.out.println("====== JSON EXTRAIDO PARA 12941 ======");
        System.out.println(mapper.writerWithDefaultPrettyPrinter().writeValueAsString(detalles));
        System.out.println("======================================");
    }
}
