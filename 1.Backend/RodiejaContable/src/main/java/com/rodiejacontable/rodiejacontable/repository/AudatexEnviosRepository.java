package com.rodiejacontable.rodiejacontable.repository;

import com.rodiejacontable.database.jooq.tables.pojos.AudatexEnvios;
import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;

import static com.rodiejacontable.database.jooq.Tables.AUDATEX_ENVIOS;

@Repository
public class AudatexEnviosRepository {

    @Autowired
    private DSLContext dsl;

    public List<AudatexEnvios> findByRepuestoId(Integer repuestoId) {
        return dsl.selectFrom(AUDATEX_ENVIOS)
                .where(AUDATEX_ENVIOS.REPUESTO_ID.eq(repuestoId))
                .orderBy(AUDATEX_ENVIOS.FECHA_ENVIO.desc())
                .fetchInto(AudatexEnvios.class);
    }

    public AudatexEnvios save(AudatexEnvios envio) {
        return dsl.insertInto(AUDATEX_ENVIOS)
                .set(AUDATEX_ENVIOS.REPUESTO_ID, envio.getRepuestoId())
                .set(AUDATEX_ENVIOS.COTIZACION_ID, envio.getCotizacionId())
                .set(AUDATEX_ENVIOS.WAN, envio.getWan())
                .set(AUDATEX_ENVIOS.PRECIO_OFRECIDO, envio.getPrecioOfrecido())
                .set(AUDATEX_ENVIOS.TIEMPO_ENTREGA, envio.getTiempoEntrega())
                .set(AUDATEX_ENVIOS.CONDICION_PIEZA, envio.getCondicionPieza())
                .set(AUDATEX_ENVIOS.ESTADO, envio.getEstado())
                .set(AUDATEX_ENVIOS.USUARIO_ENVIO, envio.getUsuarioEnvio())
                .set(AUDATEX_ENVIOS.NOTAS, envio.getNotas())
                .returning()
                .fetchOneInto(AudatexEnvios.class);
    }
}
