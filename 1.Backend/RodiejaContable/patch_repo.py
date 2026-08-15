import re

with open("src/main/java/com/rodiejacontable/rodiejacontable/repository/AudatexPedidosRepository.java", "r") as f:
    content = f.read()

new_methods = """
    public AudatexPedidos buscarPorWan(String wan) {
        return dsl.selectFrom(AUDATEX_PEDIDOS)
                .where(AUDATEX_PEDIDOS.WAN.eq(wan))
                .fetchOptionalInto(AudatexPedidos.class)
                .orElse(null);
    }

    public void insertarSync(AudatexPedidos pedido) {
        dsl.insertInto(AUDATEX_PEDIDOS)
                .set(AUDATEX_PEDIDOS.WAN, pedido.getWan())
                .set(AUDATEX_PEDIDOS.NUMERO_PEDIDO, pedido.getNumeroPedido())
                .set(AUDATEX_PEDIDOS.COTIZACION_ID, pedido.getCotizacionId())
                .set(AUDATEX_PEDIDOS.SINIESTRO, pedido.getSiniestro())
                .set(AUDATEX_PEDIDOS.ASEGURADORA, pedido.getAseguradora())
                .set(AUDATEX_PEDIDOS.ESTADO, pedido.getEstado())
                .set(AUDATEX_PEDIDOS.ULTIMA_VEZ_VISTO, pedido.getUltimaVezVisto())
                .set(AUDATEX_PEDIDOS.DETALLE_JSON, pedido.getDetalleJson())
                .execute();
    }

    public void actualizarSync(AudatexPedidos pedido) {
        dsl.update(AUDATEX_PEDIDOS)
                .set(AUDATEX_PEDIDOS.NUMERO_PEDIDO, pedido.getNumeroPedido())
                .set(AUDATEX_PEDIDOS.ULTIMA_VEZ_VISTO, pedido.getUltimaVezVisto())
                .set(AUDATEX_PEDIDOS.DETALLE_JSON, pedido.getDetalleJson())
                .where(AUDATEX_PEDIDOS.ID.eq(pedido.getId()))
                .execute();
    }
}
"""

content = content.replace("}", new_methods)

with open("src/main/java/com/rodiejacontable/rodiejacontable/repository/AudatexPedidosRepository.java", "w") as f:
    f.write(content)

