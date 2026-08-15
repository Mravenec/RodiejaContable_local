import re

with open("src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/service/AudatexService.java", "r") as f:
    content = f.read()

new_methods = """
    private final java.util.concurrent.atomic.AtomicBoolean syncPedidosIncrementalEnCurso = new java.util.concurrent.atomic.AtomicBoolean(false);

    public boolean iniciarSyncPedidosIncremental() {
        if (!syncPedidosIncrementalEnCurso.compareAndSet(false, true)) {
            log.info("[AudatexService] Sync de pedidos incremental ya en curso");
            return false;
        }
        java.time.LocalDate hoy = java.time.LocalDate.now();
        java.time.LocalDate desde = hoy.minusDays(SYNC_INCREMENTAL_DIAS);
        java.time.format.DateTimeFormatter fmt = java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy");
        String desdeStr = desde.format(fmt);
        String hastaStr = hoy.format(fmt);

        Thread t = new Thread(() -> {
            try {
                log.info("[AudatexService] Sync pedidos incremental iniciado ({} → {})", desdeStr, hastaStr);
                syncPedidosRange(desdeStr, hastaStr);
            } finally {
                syncPedidosIncrementalEnCurso.set(false);
            }
        }, "audatex-sync-pedidos");
        t.setDaemon(true);
        t.start();
        return true;
    }

    private void syncPedidosRange(String desde, String hasta) {
        try {
            audatexClient.buscarTodosPedidosStreaming(desde, hasta, page -> {
                for (Map<String, Object> pedido : page) {
                    try {
                        String wan = (String) pedido.get("wan");
                        if (wan == null || wan.isEmpty()) continue;
                        
                        String aseguradora = (String) pedido.get("aseguradora");
                        String numeroPedido = (String) pedido.get("numeroPedido");
                        String cotizacionId = (String) pedido.get("cotizacionId");
                        String siniestro = (String) pedido.get("siniestro");
                        
                        // Check if it exists
                        com.rodiejacontable.database.jooq.tables.pojos.AudatexPedidos existing = audatexPedidosRepository.buscarPorWan(wan);
                        
                        if (existing != null) {
                            existing.setUltimaVezVisto(java.time.LocalDateTime.now());
                            if (numeroPedido != null && !numeroPedido.isEmpty()) {
                                existing.setNumeroPedido(numeroPedido);
                            }
                            existing.setDetalleJson(com.rodiejacontable.database.jooq.JSON.json(mapper.writeValueAsString(pedido)));
                            audatexPedidosRepository.actualizarSync(existing);
                        } else {
                            com.rodiejacontable.database.jooq.tables.pojos.AudatexPedidos nuevo = new com.rodiejacontable.database.jooq.tables.pojos.AudatexPedidos();
                            nuevo.setWan(wan);
                            nuevo.setAseguradora(aseguradora);
                            nuevo.setNumeroPedido(numeroPedido);
                            nuevo.setCotizacionId(cotizacionId != null ? cotizacionId : "COT-DESC");
                            nuevo.setSiniestro(siniestro);
                            nuevo.setEstado(com.rodiejacontable.database.jooq.enums.AudatexPedidosEstado.Aguardando_Confirmaci_f3n);
                            nuevo.setUltimaVezVisto(java.time.LocalDateTime.now());
                            nuevo.setDetalleJson(com.rodiejacontable.database.jooq.JSON.json(mapper.writeValueAsString(pedido)));
                            audatexPedidosRepository.insertarSync(nuevo);
                        }
                        
                        // Prepare map for SSE
                        Map<String, Object> delta = new java.util.HashMap<>(pedido);
                        delta.put("isNew", existing == null);
                        com.rodiejacontable.rodiejacontable.integration.audatex.controller.AudatexController.emitirDeltaPedido(delta);
                        
                    } catch (Exception ex) {
                        log.error("[AudatexService] Error procesando pedido WAN={}: {}", pedido.get("wan"), ex.getMessage());
                    }
                }
            });
        } catch (Exception e) {
            log.error("[AudatexService] Error en syncPedidosRange: {}", e.getMessage(), e);
        }
    }

"""

# Insert before iniciarSyncIncremental
content = content.replace("    public boolean iniciarSyncIncremental() {", new_methods + "\n    public boolean iniciarSyncIncremental() {")

with open("src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/service/AudatexService.java", "w") as f:
    f.write(content)

