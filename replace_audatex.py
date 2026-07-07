import re

with open("1.Backend/RodiejaContable/src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/service/AudatexService.java", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = re.sub(
    r'import org.jooq.DSLContext;\n',
    'import com.rodiejacontable.rodiejacontable.repository.AudatexOportunidadesSyncRepository;\nimport com.rodiejacontable.rodiejacontable.repository.TransaccionesFinancierasRepository;\n',
    content
)

content = re.sub(
    r'import static com\.rodiejacontable\.database\.jooq\.Tables\.[A-Z_]+;\n',
    '',
    content
)

# 2. Fields and Constructor
content = re.sub(
    r'private final DSLContext dsl;',
    'private final AudatexOportunidadesSyncRepository audatexOportunidadesSyncRepository;\n    private final TransaccionesFinancierasRepository transaccionesFinancierasRepository;',
    content
)

content = re.sub(
    r'MarcasRepository marcasRepository,\s*DSLContext dsl\)',
    'MarcasRepository marcasRepository,\n            AudatexOportunidadesSyncRepository audatexOportunidadesSyncRepository,\n            TransaccionesFinancierasRepository transaccionesFinancierasRepository)',
    content
)

content = re.sub(
    r'this\.marcasRepository = marcasRepository;\s*this\.dsl = dsl;',
    'this.marcasRepository = marcasRepository;\n        this.audatexOportunidadesSyncRepository = audatexOportunidadesSyncRepository;\n        this.transaccionesFinancierasRepository = transaccionesFinancierasRepository;',
    content
)

# 3. Transacciones Financieras
tf_old = """            var tf = dsl.select(TRANSACCIONES_FINANCIERAS.GENERACION_ID)
                    .from(TRANSACCIONES_FINANCIERAS)
                    .where(TRANSACCIONES_FINANCIERAS.REPUESTO_ID.eq(repuestoId))
                    .and(TRANSACCIONES_FINANCIERAS.GENERACION_ID.isNotNull())
                    .orderBy(TRANSACCIONES_FINANCIERAS.ID.asc())
                    .limit(1)
                    .fetchOne();
            if (tf != null) {
                generacionId = tf.get(TRANSACCIONES_FINANCIERAS.GENERACION_ID);
            }"""
tf_new = """            Integer genId = transaccionesFinancierasRepository.findGeneracionIdByRepuestoId(repuestoId);
            if (genId != null) {
                generacionId = genId;
            }"""
content = content.replace(tf_old, tf_new)

# 4. obtenerOportunidadesBatch repuestosConVehiculo
rep1_old = """        var repuestosConVehiculo = dsl.select(
                INVENTARIO_REPUESTOS.ID,
                MARCAS.NOMBRE.as("marca_nombre"),
                MODELOS.NOMBRE.as("modelo_nombre"),
                VEHICULOS.ANIO.as("anio_exacto"))
                .from(INVENTARIO_REPUESTOS)
                .join(VEHICULOS).on(INVENTARIO_REPUESTOS.VEHICULO_ORIGEN_ID.eq(VEHICULOS.ID))
                .join(GENERACIONES).on(VEHICULOS.GENERACION_ID.eq(GENERACIONES.ID))
                .join(MODELOS).on(GENERACIONES.MODELO_ID.eq(MODELOS.ID))
                .join(MARCAS).on(MODELOS.MARCA_ID.eq(MARCAS.ID))
                .where(INVENTARIO_REPUESTOS.ESTADO.ne(InventarioRepuestosEstado.VENDIDO))
                .fetch();

        for (var r : repuestosConVehiculo) {
            Integer id = r.get(INVENTARIO_REPUESTOS.ID);
            String marca = r.get("marca_nombre", String.class);
            String modelo = r.get("modelo_nombre", String.class);
            Integer anioExacto = r.get("anio_exacto", Integer.class);"""
rep1_new = """        var repuestosConVehiculo = inventarioRepuestosRepository.getRepuestosConVehiculoOrigen();

        for (var r : repuestosConVehiculo) {
            Integer id = (Integer) r.get("id");
            String marca = (String) r.get("marca_nombre");
            String modelo = (String) r.get("modelo_nombre");
            Integer anioExacto = (Integer) r.get("anio_exacto");"""
content = content.replace(rep1_old, rep1_new)

# 5. obtenerOportunidadesBatch repuestosGenericos
rep2_old = """        var repuestosGenericos = dsl.select(
                INVENTARIO_REPUESTOS.ID,
                MARCAS.NOMBRE.as("marca_nombre"),
                MODELOS.NOMBRE.as("modelo_nombre"),
                GENERACIONES.ANIO_INICIO.as("anio_inicio"),
                GENERACIONES.ANIO_FIN.as("anio_fin"))
                .from(INVENTARIO_REPUESTOS)
                .join(TRANSACCIONES_FINANCIERAS).on(TRANSACCIONES_FINANCIERAS.REPUESTO_ID.eq(INVENTARIO_REPUESTOS.ID))
                .join(GENERACIONES).on(TRANSACCIONES_FINANCIERAS.GENERACION_ID.eq(GENERACIONES.ID))
                .join(MODELOS).on(GENERACIONES.MODELO_ID.eq(MODELOS.ID))
                .join(MARCAS).on(MODELOS.MARCA_ID.eq(MARCAS.ID))
                .where(INVENTARIO_REPUESTOS.ESTADO.ne(InventarioRepuestosEstado.VENDIDO))
                .and(INVENTARIO_REPUESTOS.VEHICULO_ORIGEN_ID.isNull())
                .fetch();

        for (var r : repuestosGenericos) {
            Integer id = r.get(INVENTARIO_REPUESTOS.ID);
            String marca = r.get("marca_nombre", String.class);
            String modelo = r.get("modelo_nombre", String.class);
            Short anioIn = r.get("anio_inicio", Short.class);
            Short anioFi = r.get("anio_fin", Short.class);"""
rep2_new = """        var repuestosGenericos = inventarioRepuestosRepository.getRepuestosGenericos();

        for (var r : repuestosGenericos) {
            Integer id = (Integer) r.get("id");
            String marca = (String) r.get("marca_nombre");
            String modelo = (String) r.get("modelo_nombre");
            Short anioIn = (Short) r.get("anio_inicio");
            Short anioFi = (Short) r.get("anio_fin");"""
content = content.replace(rep2_old, rep2_new)

# 6. markStaleInRangeNotSeenSince
stale1_old = """        var condition = AUDATEX_OPORTUNIDADES_SYNC.ESTADO.eq(
                com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstado.ACTIVA)
                .and(AUDATEX_OPORTUNIDADES_SYNC.ULTIMA_VEZ_VISTO.lt(syncInicio));

        List<Map<String, Object>> candidatas = dsl.selectFrom(AUDATEX_OPORTUNIDADES_SYNC)
                .where(condition)
                .fetchMaps();

        int cerrados = 0;
        for (Map<String, Object> row : candidatas) {
            String fechaCot = row.get("fecha_cotizacion") != null ? row.get("fecha_cotizacion").toString() : null;
            java.time.LocalDate fecha = parsePortalDate(fechaCot);
            if (fecha == null)
                continue;
            if (desdeDate != null && fecha.isBefore(desdeDate))
                continue;
            if (hastaDate != null && fecha.isAfter(hastaDate))
                continue;

            String wan = row.get("wan").toString();
            int n = dsl.update(AUDATEX_OPORTUNIDADES_SYNC)
                    .set(AUDATEX_OPORTUNIDADES_SYNC.ESTADO,
                            com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstado.CERRADA)
                    .where(AUDATEX_OPORTUNIDADES_SYNC.WAN.eq(wan))
                    .execute();
            if (n > 0) {"""
stale1_new = """        List<Map<String, Object>> candidatas = audatexOportunidadesSyncRepository.findCandidatasStale(syncInicio);

        int cerrados = 0;
        for (Map<String, Object> row : candidatas) {
            String fechaCot = row.get("fecha_cotizacion") != null ? row.get("fecha_cotizacion").toString() : null;
            java.time.LocalDate fecha = parsePortalDate(fechaCot);
            if (fecha == null)
                continue;
            if (desdeDate != null && fecha.isBefore(desdeDate))
                continue;
            if (hastaDate != null && fecha.isAfter(hastaDate))
                continue;

            String wan = row.get("wan").toString();
            int n = audatexOportunidadesSyncRepository.markAsClosed(wan);
            if (n > 0) {"""
content = content.replace(stale1_old, stale1_new)

# 7. upsertOportunidad
upsert_old = """        return dsl
                .insertInto(
                        com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC)
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.WAN,
                        wan)
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ASEGURADORA,
                        aseguradora)
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.COTIZACION_ID,
                        cotizacionId)
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.TALLER,
                        taller)
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.POLIZA,
                        poliza)
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.SINIESTRO,
                        siniestro)
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.MATRICULA,
                        matricula)
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ARMADORA,
                        armadora)
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.MODELO,
                        modelo)
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ANIO,
                        anio)
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.FECHA_COTIZACION,
                        fechaCotizacion)
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.PENDIENTES,
                        pendientes)
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ESTADO,
                        com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstado.ACTIVA)
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ULTIMA_VEZ_VISTO,
                        java.time.LocalDateTime.now())
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.DETALLE_JSON,
                        repuestosJson)
                .onDuplicateKeyUpdate()
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ULTIMA_VEZ_VISTO,
                        java.time.LocalDateTime.now())
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.PENDIENTES,
                        pendientes)
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.DETALLE_JSON,
                        repuestosJson)
                .execute();"""
upsert_new = """        return audatexOportunidadesSyncRepository.upsertOportunidad(
                wan, armadora, aseguradora, cotizacionId, taller, poliza, siniestro,
                matricula, modelo, anio, fechaCotizacion, pendientes, repuestosJson);"""
content = content.replace(upsert_old, upsert_new)

# 8. markStaleAsClosed
stale_closed_old = """        return dsl.update(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC)
                .set(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ESTADO,
                        com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstado.CERRADA)
                .where(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ESTADO
                        .eq(com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstado.ACTIVA))
                .and(com.rodiejacontable.database.jooq.tables.AudatexOportunidadesSync.AUDATEX_OPORTUNIDADES_SYNC.ULTIMA_VEZ_VISTO
                        .lt(java.time.LocalDateTime.now().minusHours(hours)))
                .execute();"""
stale_closed_new = """        return audatexOportunidadesSyncRepository.markStaleAsClosed(hours);"""
content = content.replace(stale_closed_old, stale_closed_new)

# 9. getOportunidadesFromDb
getops_old = """        var query = dsl.selectFrom(AUDATEX_OPORTUNIDADES_SYNC)
                .where(AUDATEX_OPORTUNIDADES_SYNC.ESTADO.eq(
                        com.rodiejacontable.database.jooq.enums.AudatexOportunidadesSyncEstado.ACTIVA));

        if (aseguradora != null && !aseguradora.trim().isEmpty()) {
            query = query.and(AUDATEX_OPORTUNIDADES_SYNC.ASEGURADORA.containsIgnoreCase(aseguradora.trim()));
        }
        if (armadora != null && !armadora.trim().isEmpty()) {
            query = query.and(AUDATEX_OPORTUNIDADES_SYNC.ARMADORA.containsIgnoreCase(armadora.trim()));
        }
        if (minPendientes != null) {
            query = query.and(AUDATEX_OPORTUNIDADES_SYNC.PENDIENTES.ge(minPendientes));
        }

        List<Map<String, Object>> records = query
                .orderBy(AUDATEX_OPORTUNIDADES_SYNC.ULTIMA_VEZ_VISTO.desc())
                .fetchMaps();"""
getops_new = """        List<Map<String, Object>> records = audatexOportunidadesSyncRepository.getOportunidadesActivas(armadora, aseguradora, minPendientes);"""
content = content.replace(getops_old, getops_new)


# 10. enrichConMatchInventario
enrich_old = """        var repuestosConVehiculo = dsl.select(
                MARCAS.NOMBRE.as("marca_nombre"),
                MODELOS.NOMBRE.as("modelo_nombre"),
                VEHICULOS.ANIO.as("anio_exacto"))
                .from(INVENTARIO_REPUESTOS)
                .join(VEHICULOS).on(INVENTARIO_REPUESTOS.VEHICULO_ORIGEN_ID.eq(VEHICULOS.ID))
                .join(GENERACIONES).on(VEHICULOS.GENERACION_ID.eq(GENERACIONES.ID))
                .join(MODELOS).on(GENERACIONES.MODELO_ID.eq(MODELOS.ID))
                .join(MARCAS).on(MODELOS.MARCA_ID.eq(MARCAS.ID))
                .where(INVENTARIO_REPUESTOS.ESTADO.ne(InventarioRepuestosEstado.VENDIDO))
                .fetch();

        var repuestosGenericos = dsl.select(
                MARCAS.NOMBRE.as("marca_nombre"),
                MODELOS.NOMBRE.as("modelo_nombre"),
                GENERACIONES.ANIO_INICIO.as("anio_inicio"),
                GENERACIONES.ANIO_FIN.as("anio_fin"))
                .from(INVENTARIO_REPUESTOS)
                .join(TRANSACCIONES_FINANCIERAS).on(TRANSACCIONES_FINANCIERAS.REPUESTO_ID.eq(INVENTARIO_REPUESTOS.ID))
                .join(GENERACIONES).on(TRANSACCIONES_FINANCIERAS.GENERACION_ID.eq(GENERACIONES.ID))
                .join(MODELOS).on(GENERACIONES.MODELO_ID.eq(MODELOS.ID))
                .join(MARCAS).on(MODELOS.MARCA_ID.eq(MARCAS.ID))
                .where(INVENTARIO_REPUESTOS.ESTADO.ne(InventarioRepuestosEstado.VENDIDO))
                .and(INVENTARIO_REPUESTOS.VEHICULO_ORIGEN_ID.isNull())
                .fetch();

        for (Map<String, Object> o : oportunidades) {
            boolean hasMatch = false;

            for (var r : repuestosConVehiculo) {
                if (coincideVehiculo(o, r.get("marca_nombre", String.class), r.get("modelo_nombre", String.class),
                        r.get("anio_exacto", Integer.class))) {"""
enrich_new = """        var repuestosConVehiculo = inventarioRepuestosRepository.getRepuestosConVehiculoOrigen();
        var repuestosGenericos = inventarioRepuestosRepository.getRepuestosGenericos();

        for (Map<String, Object> o : oportunidades) {
            boolean hasMatch = false;

            for (var r : repuestosConVehiculo) {
                if (coincideVehiculo(o, (String) r.get("marca_nombre"), (String) r.get("modelo_nombre"),
                        (Integer) r.get("anio_exacto"))) {"""
content = content.replace(enrich_old, enrich_new)

enrich_old2 = """            if (!hasMatch) {
                for (var r : repuestosGenericos) {
                    Short aInObj = r.get("anio_inicio", Short.class);
                    Short aFiObj = r.get("anio_fin", Short.class);
                    Integer aIn = aInObj != null ? aInObj.intValue() : null;
                    Integer aFi = aFiObj != null ? aFiObj.intValue() : null;
                    if (coincideVehiculoRango(o, r.get("marca_nombre", String.class),
                            r.get("modelo_nombre", String.class), aIn, aFi)) {"""
enrich_new2 = """            if (!hasMatch) {
                for (var r : repuestosGenericos) {
                    Short aInObj = (Short) r.get("anio_inicio");
                    Short aFiObj = (Short) r.get("anio_fin");
                    Integer aIn = aInObj != null ? aInObj.intValue() : null;
                    Integer aFi = aFiObj != null ? aFiObj.intValue() : null;
                    if (coincideVehiculoRango(o, (String) r.get("marca_nombre"),
                            (String) r.get("modelo_nombre"), aIn, aFi)) {"""
content = content.replace(enrich_old2, enrich_new2)

with open("1.Backend/RodiejaContable/src/main/java/com/rodiejacontable/rodiejacontable/integration/audatex/service/AudatexService.java", "w", encoding="utf-8") as f:
    f.write(content)

