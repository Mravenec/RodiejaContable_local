import axios from './axios';

export const geoAPI = {
  getProvincias: () => {
    return axios.get('/geo/provincias');
  },
  
  getCantones: (provinciaId) => {
    return axios.get(`/geo/provincias/${provinciaId}/cantones`);
  },
  
  getDistritos: (cantonId) => {
    return axios.get(`/geo/cantones/${cantonId}/distritos`);
  }
};

export default geoAPI;
