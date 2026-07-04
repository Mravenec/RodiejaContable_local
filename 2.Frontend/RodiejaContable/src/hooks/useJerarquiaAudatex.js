import { useQuery } from 'react-query';
import { message } from 'antd';
import vehiculoService from '../api/vehiculos';
import { audatexAPI } from '../api/audatex';

const isNullish = (v) => v === null || v === undefined || v === '{null}';
const toStr = (v, d = '') => (isNullish(v) ? d : String(v));
const toNum = (v, d = 0) => (isNullish(v) || v === '' ? d : Number(v));

const normalizarJerarquia = (data) => {
  const marcas = Array.isArray(data?.marcas) ? data.marcas : (Array.isArray(data) ? data : []);
  return marcas.map(m => ({
    key: `marca_${m.id}`,
    id: m.id,
    nombre: toStr(m.nombre, 'Sin marca'),
    tipo: 'marca',
    children: (Array.isArray(m.modelos) ? m.modelos : []).map(mo => ({
      key: `modelo_${mo.id}`,
      id: mo.id,
      nombre: toStr(mo.nombre, 'Sin modelo'),
      marca_nombre: m.nombre,
      tipo: 'modelo',
      children: (Array.isArray(mo.generaciones) ? mo.generaciones : []).map(g => ({
        key: `gen_${g.id || g.generacion_id}`,
        id: g.id || g.generacion_id,
        nombre: toStr(g.nombre, 'Generación'),
        marca_nombre: m.nombre,
        modelo_nombre: mo.nombre,
        anio_inicio: toNum(g.anio_inicio || g.anioInicio),
        anio_fin: toNum(g.anio_fin || g.anioFin),
        tipo: 'generacion',
        vehiculos: Array.isArray(g.vehiculos) ? g.vehiculos.map(v => ({
          id: v.id,
          codigo: v.codigo_vehiculo || v.codigoVehiculo,
          estado: v.estado,
          anio: v.anio,
          inversion_total: toNum(v.inversion_total || v.inversionTotal)
        })) : []
      })).sort((a, b) => a.anio_inicio - b.anio_inicio)
    })).sort((a, b) => a.nombre.localeCompare(b.nombre))
  })).sort((a, b) => a.nombre.localeCompare(b.nombre));
};

export function useJerarquiaAudatex() {
  const query = useQuery(
    ['jerarquiaAudatex'],
    async () => {
      try {
        const [vehResp, audResp] = await Promise.all([
          vehiculoService.getVehiculosAgrupados(),
          audatexAPI.obtenerOportunidadesSync()
        ]);

        const vehData = vehResp?.data ?? vehResp;
        const opts = audResp?.data?.oportunidades || [];

        return {
          jerarquia: normalizarJerarquia(vehData),
          oportunidades: opts
        };
      } catch (error) {
        console.error('Error fetching jerarquia audatex:', error);
        message.error('Error al cargar la jerarquía o las oportunidades');
        throw error;
      }
    },
    {
      staleTime: 5 * 60 * 1000,
      cacheTime: 30 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  return {
    ...query,
    jerarquia: query.data?.jerarquia || [],
    oportunidades: query.data?.oportunidades || [],
  };
}
