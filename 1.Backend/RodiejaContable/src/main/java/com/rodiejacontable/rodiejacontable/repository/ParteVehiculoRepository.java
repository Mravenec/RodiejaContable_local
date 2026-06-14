package com.rodiejacontable.rodiejacontable.repository;

import com.rodiejacontable.database.jooq.tables.pojos.ParteVehiculo;
import org.jooq.DSLContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

import static com.rodiejacontable.database.jooq.Tables.PARTE_VEHICULO;

@Repository
public class ParteVehiculoRepository {

    private final DSLContext dsl;

    @Autowired
    public ParteVehiculoRepository(DSLContext dsl) {
        this.dsl = dsl;
    }

    public List<ParteVehiculo> findAll() {
        return dsl.selectFrom(PARTE_VEHICULO)
                .orderBy(PARTE_VEHICULO.NOMBRE.asc())
                .fetchInto(ParteVehiculo.class);
    }

    public List<ParteVehiculo> findAllActivos() {
        return dsl.selectFrom(PARTE_VEHICULO)
                .where(PARTE_VEHICULO.ACTIVO.eq((byte) 1))
                .orderBy(PARTE_VEHICULO.NOMBRE.asc())
                .fetchInto(ParteVehiculo.class);
    }

    public Optional<ParteVehiculo> findById(Integer id) {
        return dsl.selectFrom(PARTE_VEHICULO)
                .where(PARTE_VEHICULO.ID.eq(id))
                .fetchOptionalInto(ParteVehiculo.class);
    }

    public ParteVehiculo save(ParteVehiculo parteVehiculo) {
        return dsl.insertInto(PARTE_VEHICULO)
                .set(dsl.newRecord(PARTE_VEHICULO, parteVehiculo))
                .returning()
                .fetchOneInto(ParteVehiculo.class);
    }

    public ParteVehiculo update(ParteVehiculo parteVehiculo) {
        return dsl.update(PARTE_VEHICULO)
                .set(PARTE_VEHICULO.NOMBRE, parteVehiculo.getNombre())
                .set(PARTE_VEHICULO.ACTIVO, parteVehiculo.getActivo())
                .where(PARTE_VEHICULO.ID.eq(parteVehiculo.getId()))
                .returning()
                .fetchOneInto(ParteVehiculo.class);
    }

    public void delete(Integer id) {
        dsl.update(PARTE_VEHICULO)
                .set(PARTE_VEHICULO.ACTIVO, (byte) 0)
                .where(PARTE_VEHICULO.ID.eq(id))
                .execute();
    }
}
