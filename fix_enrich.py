import re

with open("1.Backend/RodiejaContable/src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/service/AudatexService.java", "r", encoding="utf-8") as f:
    content = f.read()

new_enrich = """    private List<Map<String, Object>> cacheRepVehiculo = null;
    private List<Map<String, Object>> cacheRepGenerico = null;
    private long lastCacheLoad = 0;

    private void loadInventarioCache() {
        if (System.currentTimeMillis() - lastCacheLoad > 60000 || cacheRepVehiculo == null) {
            cacheRepVehiculo = inventarioRepuestosRepository.getRepuestosConVehiculoOrigen();
            cacheRepGenerico = inventarioRepuestosRepository.getRepuestosGenericos();
            lastCacheLoad = System.currentTimeMillis();
        }
    }

    private void enrichConMatchInventario(List<Map<String, Object>> oportunidades) {
        if (oportunidades == null || oportunidades.isEmpty())
            return;

        loadInventarioCache();

        // Convertir a mapas para búsqueda O(1)
        Set<String> exactosSet = new java.util.HashSet<>();
        for (var r : cacheRepVehiculo) {
            String k = ((String) r.get("marca_nombre")).toLowerCase() + "|" 
                     + ((String) r.get("modelo_nombre")).toLowerCase() + "|" 
                     + r.get("anio_exacto");
            exactosSet.add(k);
        }

        Map<String, List<int[]>> genericosMap = new java.util.HashMap<>();
        for (var r : cacheRepGenerico) {
            String k = ((String) r.get("marca_nombre")).toLowerCase() + "|" 
                     + ((String) r.get("modelo_nombre")).toLowerCase();
            Number aInNum = (Number) r.get("anio_inicio");
            Number aFiNum = (Number) r.get("anio_fin");
            int aIn = aInNum != null ? aInNum.intValue() : 0;
            int aFi = aFiNum != null ? aFiNum.intValue() : 9999;
            genericosMap.computeIfAbsent(k, x -> new java.util.ArrayList<>()).add(new int[]{aIn, aFi});
        }

        for (Map<String, Object> o : oportunidades) {
            boolean hasMatch = false;
            
            String opMarca = (texto(o, "marca") != null ? texto(o, "marca") : texto(o, "armadora"));
            String opModelo = texto(o, "modelo");
            Integer opAnio = -1;
            try {
                opAnio = Integer.parseInt(texto(o, "anio"));
            } catch (Exception e) {}

            if (opMarca != null && opModelo != null) {
                String kExact = opMarca.toLowerCase() + "|" + opModelo.toLowerCase() + "|" + opAnio;
                if (exactosSet.contains(kExact)) {
                    hasMatch = true;
                } else {
                    String kGen = opMarca.toLowerCase() + "|" + opModelo.toLowerCase();
                    List<int[]> rangos = genericosMap.get(kGen);
                    if (rangos != null) {
                        for (int[] rango : rangos) {
                            if (opAnio >= rango[0] && opAnio <= rango[1]) {
                                hasMatch = true;
                                break;
                            }
                        }
                    }
                }
            }
            
            // Si no funcionó con los campos directos, intentar con coincideVehiculo() antiguo como fallback
            if (!hasMatch) {
                for (var r : cacheRepVehiculo) {
                    if (coincideVehiculo(o, (String) r.get("marca_nombre"), (String) r.get("modelo_nombre"), (Integer) r.get("anio_exacto"))) {
                        hasMatch = true;
                        break;
                    }
                }
                if (!hasMatch) {
                    for (var r : cacheRepGenerico) {
                        Number aInNum = (Number) r.get("anio_inicio");
                        Number aFiNum = (Number) r.get("anio_fin");
                        Integer aIn = aInNum != null ? aInNum.intValue() : null;
                        Integer aFi = aFiNum != null ? aFiNum.intValue() : null;
                        if (coincideVehiculoRango(o, (String) r.get("marca_nombre"), (String) r.get("modelo_nombre"), aIn, aFi)) {
                            hasMatch = true;
                            break;
                        }
                    }
                }
            }

            o.put("matchInventario", hasMatch);
        }
    }"""

content = re.sub(r'    private void enrichConMatchInventario.*?o\.put\("matchInventario", hasMatch\);\n        }\n    }', new_enrich, content, flags=re.DOTALL)

with open("1.Backend/RodiejaContable/src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/service/AudatexService.java", "w", encoding="utf-8") as f:
    f.write(content)

