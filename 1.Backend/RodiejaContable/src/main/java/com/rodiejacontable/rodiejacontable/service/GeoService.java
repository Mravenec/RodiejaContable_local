package com.rodiejacontable.rodiejacontable.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class GeoService {

    private final RestTemplate restTemplate;
    private static final String GEO_API_BASE_URL = "https://api-geo-cr.vercel.app";

    public GeoService() {
        this.restTemplate = new RestTemplate();
    }

    public record GeoItem(String id, String nombre) {}

    public List<GeoItem> getProvincias() {
        try {
            String url = GEO_API_BASE_URL + "/provincias?limit=100";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            List<Map<String, Object>> data = extractData(response.getBody());

            return data.stream().map(p -> {
                int id = ((Number) p.get("idProvincia")).intValue();
                String nombre = (String) p.get("descripcion");

                // Corrección de la API interna
                if (id == 3) nombre = "Cartago";
                if (id == 4) nombre = "Heredia";

                return new GeoItem(String.valueOf(id), nombre);
            }).collect(Collectors.toList());
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }

    public List<GeoItem> getCantones(String provinciaId) {
        if (provinciaId == null || provinciaId.isEmpty()) return new ArrayList<>();
        try {
            String url = GEO_API_BASE_URL + "/provincias/" + provinciaId + "/cantones?limit=100";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            List<Map<String, Object>> data = extractData(response.getBody());

            return data.stream().map(c -> {
                int id = ((Number) c.get("idCanton")).intValue();
                String nombre = (String) c.get("descripcion");
                return new GeoItem(String.valueOf(id), nombre);
            }).collect(Collectors.toList());
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }

    public List<GeoItem> getDistritos(String cantonId) {
        if (cantonId == null || cantonId.isEmpty()) return new ArrayList<>();
        try {
            String url = GEO_API_BASE_URL + "/cantones/" + cantonId + "/distritos?limit=100";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            List<Map<String, Object>> data = extractData(response.getBody());

            return data.stream().map(d -> {
                int id = ((Number) d.get("idDistrito")).intValue();
                String nombre = (String) d.get("descripcion");
                return new GeoItem(String.valueOf(id), nombre);
            }).collect(Collectors.toList());
        } catch (Exception e) {
            e.printStackTrace();
            return new ArrayList<>();
        }
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> extractData(Map<String, Object> body) {
        if (body != null && body.containsKey("data")) {
            return (List<Map<String, Object>>) body.get("data");
        }
        return new ArrayList<>();
    }
}
