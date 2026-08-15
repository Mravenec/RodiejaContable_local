import re

with open("src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/controller/AudatexController.java", "r") as f:
    content = f.read()

new_methods = """
    @PostMapping("/pedidos/sync/incremental")
    public ResponseEntity<?> syncIncrementalPedidos() {
        boolean iniciado = audatexService.iniciarSyncPedidosIncremental();
        if (!iniciado) {
            return ResponseEntity.ok(Map.of("mensaje", "Sincronización incremental ya en curso", "enCurso", true));
        }
        return ResponseEntity.accepted().body(Map.of("mensaje", "Sincronización incremental iniciada en background", "enCurso", true));
    }

    private static final java.util.List<SseEmitter> pedidosEmitters = new java.util.concurrent.CopyOnWriteArrayList<>();

    @GetMapping(value = "/pedidos/sync/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamPedidosSyncDeltas() {
        SseEmitter emitter = new SseEmitter(3600_000L); // 1 hora de timeout
        pedidosEmitters.add(emitter);
        emitter.onCompletion(() -> pedidosEmitters.remove(emitter));
        emitter.onTimeout(() -> pedidosEmitters.remove(emitter));
        emitter.onError((e) -> pedidosEmitters.remove(emitter));
        return emitter;
    }

    public static void emitirDeltaPedido(Map<String, Object> pedido) {
        if (pedidosEmitters.isEmpty()) return;
        java.util.List<SseEmitter> muertos = new java.util.ArrayList<>();
        for (SseEmitter emitter : pedidosEmitters) {
            try {
                String json = SSE_MAPPER.writeValueAsString(pedido);
                emitter.send(SseEmitter.event().name("deltaPedido").data(json));
            } catch (Exception e) {
                muertos.add(emitter);
            }
        }
        pedidosEmitters.removeAll(muertos);
    }
"""

content = content.replace("    private static final java.util.List<SseEmitter> deltaEmitters", new_methods + "\n    private static final java.util.List<SseEmitter> deltaEmitters")

with open("src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/controller/AudatexController.java", "w") as f:
    f.write(content)

