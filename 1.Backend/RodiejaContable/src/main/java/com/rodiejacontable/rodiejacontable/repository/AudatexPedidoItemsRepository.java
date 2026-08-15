package com.rodiejacontable.rodiejacontable.repository;

import com.rodiejacontable.database.jooq.tables.pojos.AudatexPedidoItems;
import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;

import static com.rodiejacontable.database.jooq.Tables.AUDATEX_PEDIDO_ITEMS;

@Repository
public class AudatexPedidoItemsRepository {

    @Autowired
    private DSLContext dsl;

    public void saveAll(List<AudatexPedidoItems> items) {
        if (items == null || items.isEmpty()) return;

        var insert = dsl.insertInto(AUDATEX_PEDIDO_ITEMS)
                .columns(AUDATEX_PEDIDO_ITEMS.PEDIDO_ID, AUDATEX_PEDIDO_ITEMS.REPUESTO_ID, AUDATEX_PEDIDO_ITEMS.PRECIO_OFRECIDO, AUDATEX_PEDIDO_ITEMS.CANTIDAD,
                        AUDATEX_PEDIDO_ITEMS.DESCRIPCION, AUDATEX_PEDIDO_ITEMS.TIPO_PIEZA, AUDATEX_PEDIDO_ITEMS.DIAS_ENTREGA);

        for (AudatexPedidoItems item : items) {
            insert = insert.values(item.getPedidoId(), item.getRepuestoId(), item.getPrecioOfrecido(), item.getCantidad(),
                    item.getDescripcion(), item.getTipoPieza(), item.getDiasEntrega());
        }

        insert.execute();
    }

    public List<AudatexPedidoItems> findByPedidoId(Integer pedidoId) {
        return dsl.selectFrom(AUDATEX_PEDIDO_ITEMS)
                .where(AUDATEX_PEDIDO_ITEMS.PEDIDO_ID.eq(pedidoId))
                .fetchInto(AudatexPedidoItems.class);
    }

    public void deleteByPedidoId(Integer pedidoId) {
        dsl.deleteFrom(AUDATEX_PEDIDO_ITEMS)
                .where(AUDATEX_PEDIDO_ITEMS.PEDIDO_ID.eq(pedidoId))
                .execute();
    }
}
