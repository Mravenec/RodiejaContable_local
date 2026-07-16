package com.rodiejacontable.rodiejacontable.controller;

import com.rodiejacontable.rodiejacontable.service.GeoService;
import com.rodiejacontable.rodiejacontable.service.GeoService.GeoItem;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/geo")
public class GeoController {

    private final GeoService geoService;

    @Autowired
    public GeoController(GeoService geoService) {
        this.geoService = geoService;
    }

    @GetMapping("/provincias")
    public List<GeoItem> getProvincias() {
        return geoService.getProvincias();
    }

    @GetMapping("/provincias/{provinciaId}/cantones")
    public List<GeoItem> getCantones(@PathVariable String provinciaId) {
        return geoService.getCantones(provinciaId);
    }

    @GetMapping("/cantones/{cantonId}/distritos")
    public List<GeoItem> getDistritos(@PathVariable String cantonId) {
        return geoService.getDistritos(cantonId);
    }
}
