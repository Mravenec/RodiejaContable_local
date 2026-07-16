import { useState, useCallback } from 'react';
import { geoService } from '../api';
import { message } from 'antd';

export const useGeo = () => {
  const [provincias, setProvincias] = useState([]);
  const [cantones, setCantones] = useState([]);
  const [distritos, setDistritos] = useState([]);
  
  const [loadingProvincias, setLoadingProvincias] = useState(false);
  const [loadingCantones, setLoadingCantones] = useState(false);
  const [loadingDistritos, setLoadingDistritos] = useState(false);

  const fetchProvincias = useCallback(async () => {
    setLoadingProvincias(true);
    try {
      const response = await geoService.getProvincias();
      setProvincias(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching provincias:', error);
      message.error('No se pudieron cargar las provincias');
      setProvincias([]);
    } finally {
      setLoadingProvincias(false);
    }
  }, []);

  const fetchCantones = useCallback(async (provinciaId) => {
    if (!provinciaId) {
      setCantones([]);
      return;
    }
    setLoadingCantones(true);
    try {
      const response = await geoService.getCantones(provinciaId);
      setCantones(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(`Error fetching cantones for province ${provinciaId}:`, error);
      message.error('No se pudieron cargar los cantones');
      setCantones([]);
    } finally {
      setLoadingCantones(false);
    }
  }, []);

  const fetchDistritos = useCallback(async (cantonId) => {
    if (!cantonId) {
      setDistritos([]);
      return;
    }
    setLoadingDistritos(true);
    try {
      const response = await geoService.getDistritos(cantonId);
      setDistritos(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error(`Error fetching distritos for canton ${cantonId}:`, error);
      message.error('No se pudieron cargar los distritos');
      setDistritos([]);
    } finally {
      setLoadingDistritos(false);
    }
  }, []);

  return {
    provincias,
    cantones,
    distritos,
    loadingProvincias,
    loadingCantones,
    loadingDistritos,
    fetchProvincias,
    fetchCantones,
    fetchDistritos,
    setProvincias,
    setCantones,
    setDistritos
  };
};

export default useGeo;
